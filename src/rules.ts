import { world, } from "./world.ts";


export const initialMoney = 500;

export const personHp = 5;
export const personPrice = 100;
export const personBonusChance = 0.67;

export const wagonHp = 10;
export const baseTaskDuration = 10;
export const trainTaskDuration = 10;

export const goldPrice = 1000;
export const droppedGoldCount = 2;
export const droppedGuardCount = 2;

export const roofRangeBonus = 3;

export const punchDamage = 1;
export const guardHp = 3;
export const guardGun = {
	range: 3,
	damage: 2,
	explosionRadius: 0
}


export const personQuery = world.query("person");

export function currentMoney() {
	let money = initialMoney;

	let entities = personQuery.entities;
	for (let entity of entities) {
		let person = world.requireComponent(entity, "person");
		if (person.relation != "party") { continue; }
		money -= person.price;

		person.items.forEach(entity => {
			let item = world.requireComponent(entity, "item");
			if (item.type == "gold") { return; } // we did not buy this
			money -= item.price;
		});
	}

	return money;
}
