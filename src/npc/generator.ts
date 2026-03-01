import { spatialIndex, world, Building } from "../world.ts";
import display from "../display.ts";
import * as random from "../random.ts";


function createPerson(x: number, y: number) {
	let position = {x, y, blocks: {sight: false, movement: true}};
	let visual = {ch: "@", fg: color()};
	let actor = {wait: 0, tasks: [{type:"wander"} as const]};
	let person = {
		name: name(),
		items: [],
		price: 100,
		active: false,
		hp: 10
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

export function generatePeople() {
	let freePositions = computeFreePositions();

	for (let i=0;i<COUNT;i++) {
		let index = random.arrayIndex(freePositions);
		let pos = freePositions.splice(index, 1)[0];
		createPerson(pos[0], pos[1]);
	}
}

function color() {
	let h = random.float() * 360;
	let l = random.float() * 0.5 + 0.25;
	return `hsl(${h} 100% ${l * 100}%)`;
}

function name() {
	return ["John", "Jane", "Jack", "Jill", "James", "Jenny", "Joe", "Jessica"].random();
}

function isInsideBuilding(x: number, y: number, buildings: Building[]): boolean {
	return buildings.some(b => {
		return (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height);
	});
}

function computeFreePositions(): number[][] {
	const { town } = world.findEntities("town").values().next().value!;

	// FIXME building asi nemusi byt komponenta, staci pridat k town?
	let buildings = [...world.findEntities("building").values()].map(e => e.building);
	let positions: number[][] = [];

	for (let x=0;x<town.width;x++) {
		for (let y=0;y<town.height;y++) {
			if (isInsideBuilding(x, y, buildings)) { continue; }
			let items = spatialIndex.list(x, y);
			if (items.size == 0) { positions.push([x, y]); }
		}
	}

	return positions;
}
