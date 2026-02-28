import { spatialIndex, world } from "../world.ts";
import display from "../display.ts";
import * as random from "../random.ts";
import Renderer from "../town/renderer.ts";


function createPerson(x: number, y: number) {
	let position = {x, y, blocks: {sight: false, movement: true}};
	let visual = {ch: "@", fg: color()};
	let actor = {wait: 0, tasks: [{type:"wander"} as const]};
	let person = {
		name: name(),
		items: [],
		price: 100,
		active: false
	}

	let components = {
		position,
		actor,
		visual,
		person
	}

	let entity = world.createEntity(components);
	display.draw(position.x, position.y, visual, {id:entity, zIndex:1});
	spatialIndex.update(entity);
}


const COUNT = 10;

export function generatePeople(renderer: Renderer) {
	let freePositions = computeFreePositions(renderer);

	for (let i=0;i<COUNT;i++) {
		let index = random.arrayIndex(freePositions);
		let pos = freePositions.splice(index, 1)[0];
		createPerson(pos[0], pos[1]);
	}
}

function color() {
	let h = random.float() * 360;
	return `hsl(${h} 100% 50%)`;
}

function name() {
	return ["John", "Jane", "Jack", "Jill", "James", "Jenny", "Joe", "Jessica"].random();
}

function computeFreePositions(renderer: Renderer): number[][] {
	console.time("free positions");
	let positions: number[][] = [];

	for (let x=0;x<renderer.width;x++) {
		for (let y=0;y<renderer.height;y++) {
			let items = spatialIndex.list(x, y);
			if (items.size == 0) { positions.push([x, y]); }
		}
	}

	console.timeEnd("free positions");
	return positions;
}
