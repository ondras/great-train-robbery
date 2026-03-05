import { spatialIndex, world, Entity, Building, Person, Actor, Named } from "../world.ts";
import display from "../display.ts";
import * as random from "../random.ts";
import * as rules from "../rules.ts";
import { Position } from "./util.ts";


function createPerson(name: string) {
	let blocks = {projectile: true, movement: true};
	let visual = {ch: "@", fg: color(), zIndex: 2};
	let named = {name};

	let actor: Actor = {
		wait: 0,
		tasks: [{type:"escape", withGold: true}, {type:"collect"}, {type:"attack", target:"wagon"}, {type:"wander"}],
//		tasks: [{type:"attack", target:"locomotive"}] as Task[],
		duration: rules.baseTaskDuration,
	};

	let person: Person = {
		items: [],
		price: rules.personPrice,
		relation: random.float() > 0.5 ? "npc" : "party",
		building: undefined,
		hp: rules.personHp
	}

	if (random.float() < rules.personBonusChance) { applyBonus(person, actor, named); }

	let components = {
		actor,
		visual,
		person,
		blocks,
		named
	}

	let entity = world.createEntity(components);
	spatialIndex.update(entity);

	let item = world.createEntity({item: {type: "horse", price: 10, duration: 5}, named: {name: "Look at my Horse"}});
	person.items.push(item);

	return entity;
}


const COUNT = 10;
const NAMES = ["Bodie","Boone","Briggs","Buck","Billy","Colt","Emmett","Emily","Flint","Gideon","Gonzales","Harlan",
		    "Jasper","Knox","Luther","Mercer","Nash","Quincy","Remy","Rhett","Rowdy","Sawyer","Silas",
			"Stetson","Trace","Tucker","Virgil","Wade","Wyatt"];

interface Bonus {
	names: string[];
	values: {
		hp?: number;
		price?: number;
		speed?: number;
	}
}

const BONUSES: Bonus[] = [
	{
		names: ["Healthy %s", "%s the Healthy", "Big %s", "%s the Tough"],
		values: {
			hp: Math.ceil(rules.personHp * 0.5)
		}
	},	{
		names: ["Weak %s", "%s the Sick"],
		values: {
			hp: -Math.floor(rules.personHp * 0.5)
		}
	},	{
		names: ["Cheap %s", "%s the Cheap"],
		values: {
			price: -Math.floor(rules.personPrice * 0.4)
		}
	},	{
		names: ["Expensive %s", "%s the Luxurious"],
		values: {
			price: Math.floor(rules.personPrice * 0.4)
		}
	},	{
		names: ["Speedy %s", "%s the Lightning"],
		values: {
			speed: 0.5
		}
	},	{
		names: ["Slow %s", "%s the Snail"],
		values: {
			speed: 2
		}
	}
];

function applyBonus(person: Person, actor: Actor, named: Named) {
	let bonus = BONUSES.random();
	Object.entries(bonus.values).forEach(([key, value]) => {
		if (key == "hp") { person.hp += value; }
		if (key == "price") { person.price += value; }
		if (key == "speed") { actor.duration = Math.round(actor.duration * value); }
	});

	let template = bonus.names.random();
	named.name = template.replace("%s", named.name);
}

export function placeRandomly(entities: Entity[]) {
	let freePositions = computeFreePositions();

	entities.forEach(entity => {
		let index = random.arrayIndex(freePositions);
		let pos = freePositions.splice(index, 1)[0];
		let visual = world.requireComponent(entity, "visual");

		world.addComponents(entity, {position: {x: pos[0], y: pos[1]}});
		spatialIndex.update(entity);
		display.draw(pos[0], pos[1], visual, {id:entity, zIndex:visual.zIndex});
	});
}

export function placeIntoBuildings(entities: Entity[]) {
	function getFreePositions(building: Building): Position[] {
		let positions: Position[] = [];
		for (let i=1; i<building.width-1; i++) {
			for (let j=1; j<building.height-1; j++) {
				let x = building.x + i;
				let y = building.y + j;
				let entities = spatialIndex.list(x, y);
				if (entities.size == 0) { positions.push([x, y]); }
			}
		}
		let cx = building.x + Math.ceil(building.width / 2);
		let cy = building.y + Math.ceil(building.height / 2);
		positions.sort((a, b) => {
			let da = Math.abs(a[1]-cy);
			let db = Math.abs(b[1]-cy);
			if (da != db) { return da-db; } // prioritize verical centering
			da = Math.abs(a[0]-cx);
			db = Math.abs(b[0]-cx);
			return da - db;
		});

		return positions;
	}

	entities.forEach(entity => {
		let { person, visual } = world.requireComponents(entity, "person", "visual");
		let building = world.requireComponent(person.building!, "building");
		let pos = getFreePositions(building).shift()!;

		world.addComponents(entity, {position: {x: pos[0], y: pos[1]}});
		spatialIndex.update(entity);
		display.draw(pos[0], pos[1], visual, {id:entity, zIndex:visual.zIndex});
	});
}

export function generatePeople() {
	let names = NAMES.slice();
	let entities: Entity[] = [];

	for (let i=0;i<COUNT;i++) {
		let nameIndex = random.arrayIndex(names);
		let name = names.splice(nameIndex, 1)[0];

		let entity = createPerson(name);
		entities.push(entity);
	}

	placeRandomly(entities);
}

function color() {
	let h = Math.round(random.float() * 360);
	let l = random.float() * 0.5 + 0.25;
	return `hsl(${h | 0} 100% ${(l*100) | 0}%)`;
}

function isInsideBuilding(x: number, y: number, buildings: Building[]): boolean {
	return buildings.some(b => {
		return (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height);
	});
}

function computeFreePositions(): number[][] {
	const { town } = world.findEntities("town").values().next().value!;

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
