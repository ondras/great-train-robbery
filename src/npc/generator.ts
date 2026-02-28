import { spatialIndex, world } from "../world.ts";
import display from "../display.ts";


export function generatePeople() {
	let position = {x: 1, y: 1, blocks: {sight: false, movement: true}};
	let visual = {ch: "@", fg: "red"};
	let pc = world.createEntity({
		position,
		actor: { wait: 0, tasks:[] },
		visual
	});
	display.draw(position.x, position.y, visual, {id:pc, zIndex:1});
	spatialIndex.update(pc);
}
