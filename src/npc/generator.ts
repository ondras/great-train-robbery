import { spatialIndex, world, Building, Person, Actor } from "../world.ts";
import display from "../display.ts";
import * as random from "../random.ts";
import * as rules from "../rules.ts";
import { Task } from "./tasks.ts";


function createPerson(x: number, y: number) {
	let position = {x, y, blocks: {sight: false, movement: true}};
	let visual = {ch: "@", fg: color()};

	let actor: Actor = {
		wait: 0,
		tasks: [{type:"collect"}, {type:"attack", target:"wagon"}, {type:"wander"}] as Task[],
		duration: rules.baseTaskDuration
	};

	let person: Person = {
		name: NAMES.random(),
		items: [],
		price: rules.personPrice,
		relation: random.float() > 0.5 ? "npc" : "party",
		location: undefined,
		hp: rules.personHp
	}

	if (random.float() < rules.personBonusChance) { applyBonus(person, actor); }

	let components = {
		position,
		actor,
		visual,
		person
	}

	let entity = world.createEntity(components);
	display.draw(position.x, position.y, visual, {id:entity, zIndex:2});
	spatialIndex.update(entity);
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


function applyBonus(person: Person, actor: Actor) {
	let bonus = BONUSES.random();
	Object.entries(bonus.values).forEach(([key, value]) => {
		if (key == "hp") { person.hp += value; }
		if (key == "price") { person.price += value; }
		if (key == "speed") { actor.duration = Math.round(actor.duration * value); }
	});

	let template = bonus.names.random();
	person.name = template.replace("%s", person.name);
}

export function generatePeople() {
	let freePositions = computeFreePositions();

	for (let i=0;i<COUNT;i++) {
		let index = random.arrayIndex(freePositions);
		let pos = freePositions.splice(index, 1)[0];
		createPerson(pos[0], pos[1]);
	}
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

// fixme volne pozice spis jako atribut komponenty "town"
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
