import { spatialIndex, world, Entity } from "../world.ts";
import { getDurationWithHorse, getFreeNeighbors, Position } from "./util.ts";
import { MoveTask, moveCloser } from "./tasks.ts";
import display from "../display.ts";
import * as train from "./train.ts";
import * as conf from "../conf.ts";


export async function wander(entity: Entity) {
	let position = world.requireComponent(entity, "position");

	let forceInsideTown = true;
	let neighbors = getFreeNeighbors([position.x, position.y], forceInsideTown);

	if (neighbors.length == 0) { return 0; }
	let neighbor = neighbors.random();
	position.x = neighbor[0];
	position.y = neighbor[1];
	spatialIndex.update(entity);
	await display.move(entity, position.x, position.y, conf.MOVE_DELAY);
	return getDurationWithHorse(entity);
}

export async function move(entity: Entity, task: MoveTask) {
	let position: Position | undefined;

	switch (task.target) {
		case "center": {
			let { town } = world.findEntities("town").values().next().value!;
			position = [town.width/2, town.height/2];
		} break;
		case "locomotive": {
			position = train.getLocomotivePosition();
			if (!position) { return 0; }
		} break;
	}

	return moveCloser(entity, position);
}
