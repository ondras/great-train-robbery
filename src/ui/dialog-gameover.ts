import * as dialog from "./dialog.ts";
import * as rules from "../rules.ts";
import { template } from "./util.ts";
import { world, Person } from "../world.ts";


function computeScore(money: number, loot: number, party: Person[]) {
	let dead = party.filter(p => p.hp <= 0).length;
	if (dead == party.length || loot == 0) { return 0; }

	return Math.round((money + loot) / party.length);
}

function formatParty(party: Person[]): string {
	let alive = 0;
	let dead = 0;
	party.forEach(p => {
		(p.hp > 0 ? alive++ : dead++);
	});

	let components = [];
	if (alive > 0) { components.push(`${alive} alive`); }
	if (dead > 0) {
		if (dead == party.length) {
			components.push("💀 All dead!");
		} else {
			components.push(`${dead} dead`);
		}
	}

	return components.join(", ");
}

export async function gameOver(seed: number) {
	let node = dialog.createDialog();

	let party: Person[] = [];
	let loot = 0;

	for (let entity of rules.personQuery.entities) {
		let { person } = world.requireComponents(entity, "person");
		if (person.relation == "party") {
			party.push(person);
			person.items.forEach(e => {
				let item = world.requireComponent(e, "item");
				if (item.type == "gold") { loot += item.price; }
			});
		}
	}

	let money = rules.currentMoney();
	let score = computeScore(money, loot, party);
	let title = (score > 0 ? "The robbery is over. Good job!" : "The robbery is over!");

	let data = {
		title,
		money: String(money),
		party: formatParty(party),
		loot: String(loot),
		score: String(score)
	};
	node.append(template(".game-over", data));

	function handleKey(e: KeyboardEvent) {
		switch (e.code) {
			case "Digit1":
			case "Numpad1": {
				let url = new URL(location.href);
				url.search = `seed=${seed.toString(16).toUpperCase()}`;
				location.href = url.href;
			} break;

			case "Digit2":
			case "Numpad2": {
				let url = new URL(location.href);
				url.search = "";
				location.href = url.href;
			} break;

			case "Digit3":
			case "Numpad3":
				window.open("https://github.com/ondras/great-train-robbery", "_blank");
			break;
		}
	}

	return dialog.show(node, handleKey);
}
