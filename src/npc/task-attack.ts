import { world, spatialIndex, Entity } from "../world.ts";
import display from "../display.ts";
import { AttackTask, moveCloser } from "./tasks.ts";
import { dist8, distEuclidean, Position, computePath } from "./util.ts";
import { damage } from "./damage.ts";
import * as train from "./train.ts";
import * as game from "../game.ts";
import * as log from "../ui/log.ts";


function getTargetPositions(task: AttackTask): Position[] {
	switch (task.target) {
		case "guard": return [];

		case "locomotive": return train.getAllPositions(true);

		case "wagon": return train.getAllPositions(false);

		case "party": {
			let positions: Position[] = [];
			for (let entity of game.personQuery.entities) {
				let result = world.getComponents(entity, "position", "person");
				if (!result) { continue; } // without position
				if (result.person.relation != "party") { continue; } // not party
				positions.push([result.position.x, result.position.y]);
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

async function doAttack(entity: Entity, target: Position): Promise<number> {
	let { position, actor } = world.requireComponents(entity, "position", "actor");
	let currentPosition = [position.x, position.y];

	let entities = spatialIndex.list(target[0], target[1]);
	let targetEntity = [...entities].find(e => {
		let blocks = world.getComponent(e, "blocks");
		return (blocks && blocks.movement);
	});
	if (targetEntity) {
		let str = log.format("%A shoots at %a.", entity, targetEntity);
		log.add(str);
	}

	let path = computePath(currentPosition, target);
	// FIXME detect first obstacle

	let visual = {
		ch: "*"
	}
	let id = "shot";
	display.draw(currentPosition[0], currentPosition[1], visual, {id, zIndex:3});
	let dist = distEuclidean(currentPosition, target);
	await display.move(id, target[0], target[1], 10*dist);

/*
	for (let i=0;i<path.length;i++) {
		let pos = path[i];
		if (i) {
			display.move(id, pos[0], pos[1], 0);
		} else {
			display.draw(pos[0], pos[1], visual, {id, zIndex:3});
		}
		await sleep(2);
	}
*/
	display.delete(id);
	damage(target);

	// FIXME weapon duration
	return actor.duration;
}

function canBeAttacked(target: Position, current: Position): boolean {
	// FIXME check blockers, range, gun, roof
	return true;
}

function canBeReached(target: Position, current: Position): boolean {
	return true;
}

export async function attack(entity: Entity, task: AttackTask): Promise<number> {
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

	return 0;
}
