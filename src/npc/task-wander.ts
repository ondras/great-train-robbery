import { spatialIndex, world, Entity } from "../world.ts";
import { getFreeNeighbors } from "./util.ts";
import display from "../display.ts";
import * as conf from "../conf.ts";


export async function wander(entity: Entity) {
	let pos = world.requireComponent(entity, "position");
	let neighbors = getFreeNeighbors([pos.x, pos.y]);

	if (neighbors.length == 0) { return; }
	let neighbor = neighbors.random();
	pos.x = neighbor[0];
	pos.y = neighbor[1];
	spatialIndex.update(entity);
	await display.move(entity, pos.x, pos.y, conf.MOVE_DELAY);
}
