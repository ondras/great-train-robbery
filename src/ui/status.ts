import * as game from "../game.ts";
import { world, Entity } from "../world.ts";


const node = document.querySelector("#status")!;
const dom = {
	node,
	status: node.querySelector(".status")!,
	party: node.querySelector(".party")!,
	money: node.querySelector(".money")!,
	hp: node.querySelector(".hp")!
}

function updateMoney() {
	let current = game.currentMoney();
	dom.money.innerHTML = `${current}<span class="gold">$<span>`;
}

function updateParty() {
	let results = [...game.personQuery.entities]
					.map(entity => world.requireComponents(entity, "person", "visual"))
					.filter(result => result.person.relation == "party");
	console.log(game.personQuery.entities, results);

	if (results.length == 0) {
		dom.party.textContent = "(no members)";
		dom.hp.textContent = "(no members)";
		return;
	}

	let party: string[] = [];
	let hp: string[] = [];
	results.forEach(result => {
		party.push(`<span style="color:${result.visual.fg}">@</span>`);
		hp.push(`${result.person.hp}`);
	});

	dom.party.innerHTML = party.join(" ");
	dom.hp.innerHTML = hp.join(" ");
}

export function update() {
	updateMoney();
	updateParty();
}

export function setMode(mode: "planning" | "action") {
	switch (mode) {
		case "planning":
			dom.status.innerHTML = "<strong>planning</strong>";
		break;

		case "action":
			dom.status.innerHTML = "<strong>the heist is on!</strong> Press [<kbd>Space</kbd>] to pause/continue.";
		break;
	}
	update();
}
