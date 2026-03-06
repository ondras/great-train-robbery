import * as rules from "../rules.ts";
import { world } from "../world.ts";


const node = document.querySelector("#status")!;
const dom = {
	node,
	status: node.querySelector(".status")!,
	party: node.querySelector(".party")!,
	money: node.querySelector(".money")!,
	hp: node.querySelector(".hp")!
}

function updateMoney() {
	let current = rules.currentMoney();
	dom.money.innerHTML = `<span class="gold">${current}</span>`;
}

function updateParty() {
	let results = [...rules.personQuery.entities]
					.map(entity => world.requireComponents(entity, "person", "visual"))
					.filter(result => result.person.relation == "party");

	if (results.length == 0) {
		dom.party.textContent = "(no members)";
		dom.hp.textContent = "(no members)";
		return;
	}

	let party: string[] = [];
	let hp: string[] = [];
	results.forEach(result => {
		party.push(`<span style="color:${result.visual.fg}">@</span>`);
		hp.push(`${Math.max(0, result.person.hp)}`);
	});

	dom.party.innerHTML = party.join(" ");
	dom.hp.innerHTML = hp.join(" ");
}

export function update() {
	updateMoney();
	updateParty();
}

export function setMode(mode: "planning" | "action" | "paused") {
	switch (mode) {
		case "planning":
			dom.status.innerHTML = "<strong>planning the robbery</strong>";
		break;

		case "action":
			dom.status.innerHTML = "<strong>the heist is on!</strong> Press [<kbd>Space</kbd>] to pause.";
		break;

		case "paused":
			dom.status.innerHTML = "<strong>the heist is paused!</strong> Press [<kbd>Space</kbd>] to continue, [<kbd>A</kbd>] to abort.";
		break;
	}
	update();
}
