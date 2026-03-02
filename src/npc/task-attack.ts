import { world, Entity, spatialIndex } from "../world.ts";
import display from "../display.ts";
import { AttackTask } from "./tasks.ts";
import { dist8, sleep, Position, computePath, getFreeNeighbors } from "./util.ts";
import * as conf from "../conf.ts";
import { damage } from "./damage.ts";


function getTargetPositions(task: AttackTask): Position[] {
	switch (task.target) {
		case "sheriff": return [];

		case "guard": return [];

		case "locomotive": return [];

		case "wagon": {
			// FIXME mozna radeji pres trainPart+position
			let result = world.findEntities("wagon");
			let wagons = [...result.values()]
							.map(({ wagon }) => wagon)
							.filter((wagon, i) => (i > 0 && wagon.connected));
			let positions: Position[] = [];
			wagons.forEach(wagon => {
				wagon.parts.forEach(part => {
					let position = world.getComponent(part, "position");
					if (position) { positions.push([position.x, position.y]); }
				});
			});
			return positions;
		}

		case "enemy": return [];
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

async function doAttack(entity: Entity, target: Position) {
	let { position } = world.requireComponents(entity, "position");
	let currentPosition = [position.x, position.y];

	let path = computePath(currentPosition, target);

	let visual = {
		ch: "*"
	}
	let id = "shot";

	for (let i=0;i<path.length;i++) { // fixme perhaps straight line?
		let pos = path[i];
		if (i) {
			display.move(id, pos[0], pos[1], 0);
		} else {
			display.draw(pos[0], pos[1], visual, {id, zIndex:2});
		}
		await sleep(2);
	}

	display.delete(id);
	return damage(target);
}

async function moveCloser(entity: Entity, target: Position) {
	let { position } = world.requireComponents(entity, "position");
	let neighbors = getFreeNeighbors([position.x, position.y]);
	if (neighbors.length == 0) { return; }

	function CMP_DIST(a: Position, b: Position) {
		let da = dist8(a, target);
		let db = dist8(b, target);
		return da - db;
	}
	neighbors.sort(CMP_DIST);
	let neighbor = neighbors[0];

	position.x = neighbor[0];
	position.y = neighbor[1];
	spatialIndex.update(entity);
	display.move(entity, position.x, position.y, 0);

	await sleep(conf.MOVE_DELAY);
}

function canBeAttacked(target: Position, current: Position): boolean {
	// FIXME check blockers, range, gun, roof
	return true;
}

function canBeReached(target: Position, current: Position): boolean {
	return true;
}

export async function attack(entity: Entity, task: AttackTask) {
	// FIXME pick a gun


	const { position } = world.requireComponents(entity, "position");
	const currentPosition = [position.x, position.y];

	// multiple cells can be a target
	let candidatePositions = getTargetPositions(task);
	sortPositions(candidatePositions, currentPosition);

	let attackablePositions: Position[] = [];
	let reachablePositions: Position[] = [];

	candidatePositions.forEach(pos => {
		if (canBeAttacked(pos, currentPosition)) { attackablePositions.push(pos); }
		if (canBeReached(pos, currentPosition)) { reachablePositions.push(pos); }
	});

	// these can be attacked immediately -> attack
	if (attackablePositions.length > 0) {
		let target = attackablePositions[0];
		return doAttack(entity, target);
	}

	// these can be reached eventually -> move closer
	if (reachablePositions.length > 0) {
		let target = reachablePositions[0];
		return moveCloser(entity, target);
	}
}
