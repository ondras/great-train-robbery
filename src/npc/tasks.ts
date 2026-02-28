import { spatialIndex, world, Entity } from "../world.ts";
import display from "../display.ts";
import * as util from "../util.ts";

export type Task = "train";

export async function moveRandomly(entity: Entity) {
	let pos = world.requireComponent(entity, "position");
	let availableDirs = util.DIRS_8.filter(dir => {
		let x = pos.x + dir[0];
		let y = pos.y + dir[1];
		if (x < 0 || y < 0) { return false; }

		let targetEntities = spatialIndex.list(x, y);
		return [...targetEntities].every(e => {
			let position = world.requireComponent(e, "position");
			return !position.blocks.movement;
		});
	});

	if (availableDirs.length == 0) { return; }
	let dir = availableDirs.random();
	pos.x += dir[0];
	pos.y += dir[1];
	spatialIndex.update(entity);
	await display.move(entity, pos.x, pos.y);
	await util.sleep(200);
}
