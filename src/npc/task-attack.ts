import { world, spatialIndex, Entity, Building } from "../world.ts";
import display from "../display.ts";
import { AttackTask, moveCloser } from "./tasks.ts";
import { dist8, distEuclidean, Position, computePath } from "./util.ts";
import { Damage, damagePosition } from "./damage.ts";
import * as train from "./train.ts";
import * as rules from "../rules.ts";
import * as log from "../ui/log.ts";


interface Weapon {
	damage: Damage;
	range: number;
	verb: string;
	duration: number;
}

const SHOT_VISUAL = {ch: "*", fg: "#fff", zIndex: 3};

function getTargetPositions(task: AttackTask, weapon?: Weapon): Position[] {
	let positions: Position[] = [];
	switch (task.target) {

		case "guard": {
			for (let entity of rules.personQuery.entities) {
				let result = world.getComponents(entity, "position", "person");
				if (!result) { continue; } // without position
				if (result.person.relation != "enemy") { continue; } // not enemy
				positions.push([result.position.x, result.position.y]);
			}
			return positions;
		}

		case "locomotive": return train.getAllPositions(true);

		case "wagon": return train.getAllPositions(false);

		case "party": {
			for (let entity of rules.personQuery.entities) {
				let result = world.getComponents(entity, "position", "person");
				if (!result) { continue; } // without position

				const { person, position } = result;
				if (person.relation != "party") { continue; } // not party

				if (person.building) {
					let building = world.requireComponent(person.building, "building");
					if (building.roof && !weapon) { continue; } // target on roof and no ranged weapon
				}
				positions.push([position.x, position.y]);
			}
			return positions;
		}
	}
}

function sortPositions(positions: Position[], target: Position): Position[] {
	function CMP_DIST(a: Position, b: Position) {
		let da = dist8(a, target);
		let db = dist8(b, target);
		return da - db;
	}

	return positions.sort(CMP_DIST);
}

function getBlockerAt(pos: Position) {
	let entities = spatialIndex.list(pos[0], pos[1]);
	return [...entities].find(e => {
		let blocks = world.getComponent(e, "blocks");
		return (blocks && blocks.projectile);
	});
}

async function doAttack(entity: Entity, target: Position, weapon: Weapon): Promise<number> {
	let { position, actor } = world.requireComponents(entity, "position", "actor");
	let currentPosition = [position.x, position.y];

	let targetEntity = getBlockerAt(target);
	if (targetEntity) {
		let str = log.format(`%A ${weapon.verb} %a.`, entity, targetEntity);
		log.add(str);
	}

	let dist = distEuclidean(currentPosition, target);
	if (dist > 2) {
		let visual = SHOT_VISUAL;
		let id = "shot";
		display.draw(currentPosition[0], currentPosition[1], visual, {id, zIndex:visual.zIndex});
		await display.move(id, target[0], target[1], 10*dist);
		display.delete(id);
	}

	await damagePosition(target, weapon.damage);

	return actor.duration + weapon.duration;
}

function canBeAttacked(target: Position, current: Position, weapon: Weapon, building?: Building): boolean {
	let dist = distEuclidean(current, target);
	if (dist > weapon.range) { return false; }

	if (building && building.roof) { return true; }

	// blockers along the path
	let path = computePath(current, target);
	path.shift(); // current position
	path.pop(); // target position

	if (path.some(pos => getBlockerAt(pos))) {
		return false;
	}

	return true;
}

function canBeReached(target: Position, current: Position, weapon: Weapon, building?: Building): boolean {
	if (!building || building.roof) { return true; } // not roof-limited

	// roof: if at least one roof corner is within range, we can move there
	let { x, y, width, height } = building;
	let corners = [
		[x+1, y+1],
		[x+width-2, y+1],
		[x+1, y+height-2],
		[x+width-2, y+height-2],
	];

	return corners.some(corner => {
		let dist = distEuclidean(corner, target);
		return dist <= weapon.range;
	});
}

export async function attack(entity: Entity, task: AttackTask): Promise<number> {
	let weapon: Weapon | undefined = undefined;

	let building: Building | undefined = undefined;

	let person = world.getComponent(entity, "person");
	if (person) {
		if (person.building) { building = world.requireComponent(person.building, "building"); }

		person.items.forEach(e => {
			let item = world.requireComponent(e, "item");
			if (item.type == "weapon") {
				weapon = {
					verb: "shoots at",
					range: item.range + (building && building.roof ? rules.roofRangeBonus : 0),
					damage: { amount: item.damage, explosionRadius: item.explosionRadius || 0 },
					duration: item.duration
				}
			}
		});
	}

	const { position } = world.requireComponents(entity, "position");
	const currentPosition = [position.x, position.y];

	// multiple cells can be a target
	let candidatePositions = getTargetPositions(task, weapon);
	sortPositions(candidatePositions, currentPosition);

	// NOW we assign a default weapon
	if (!weapon) {
		weapon = { // fist
			verb: "punches",
			damage: { amount: rules.punchDamage, explosionRadius: 0 },
			range: 1.5, // allow punching diagonally where distEuclidean is ~1.4
			duration: 0
		}
	}

	let attackablePositions: Position[] = [];
	let reachablePositions: Position[] = [];

	candidatePositions.forEach(pos => {
		if (canBeAttacked(pos, currentPosition, weapon as Weapon, building)) { attackablePositions.push(pos); }
		if (canBeReached(pos, currentPosition, weapon as Weapon, building)) { reachablePositions.push(pos); }
	});

	// these can be attacked immediately -> attack
	if (attackablePositions.length > 0) {
		let target = attackablePositions[0];
		return doAttack(entity, target, weapon);
	}

	// these can be reached eventually -> move closer
	if (reachablePositions.length > 0) {
		let target = reachablePositions[0];
		return moveCloser(entity, target);
	}

	return 0;
}
