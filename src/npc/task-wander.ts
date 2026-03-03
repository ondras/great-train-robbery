import { spatialIndex, world, Entity } from "../world.ts";
import { getFreeNeighbors } from "./util.ts";
import display from "../display.ts";
import * as conf from "../conf.ts";


export async function wander(entity: Entity) {
	let { position, actor } = world.requireComponents(entity, "position", "actor");
	let neighbors = getFreeNeighbors([position.x, position.y]);

	if (neighbors.length == 0) { return 0; }
	let neighbor = neighbors.random();
	position.x = neighbor[0];
	position.y = neighbor[1];
	spatialIndex.update(entity);
	await display.move(entity, position.x, position.y, conf.MOVE_DELAY);
	return actor.duration;
}
