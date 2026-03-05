import { world } from "../world.ts";
import Pane from "./pane.ts";
import { confirm } from "./dialog.ts";
import * as game from "../game.ts";
import * as rules from "../rules.ts";
import { template } from "./util.ts";


export default class Action extends Pane {
	protected ready = false;

	constructor() {
		super("action");
	}

	activate() {
		super.activate();

		const { node } = this;

		this.ready = false;

		let messages: string[] = [];

		let { entities } = rules.personQuery;
		let party = [...entities].map(e => world.requireComponents(e, "person", "actor")).filter(item => {
			return item.person.relation == "party";
		});

		let itemCount = 0;
		party.forEach(item => itemCount += item.person.items.length);
		let tasks = party.every(item => item.actor.tasks.length > 0);
		let locations = party.every(item => item.person.building);

		if (party.length == 0) {
			messages.push("You have not hired any people yet. Hire some in the Saloon.");
		} else {
			messages.push(`You hired a party of ${party.length} people.`);

			if (itemCount == 0) {
				messages.push(`You have not equipped your party with any items. You can do that in the General Store.`);
			} else {
				messages.push(`Your party is equipped with ${itemCount} items.`);
			}

			if (!tasks) {
				messages.push(`Every member of your party needs to have at least one task assigned. Plan their tasks in the Hotel.`);
			} else {
				messages.push(`Every member of your party has at least one task assigned.`);

				if (!locations) {
					messages.push(`Every member of your party needs to have a starting location assigned. Do that in the Hotel.`);
				} else {
					messages.push(`Every member of your party has a starting location assigned.`);
					this.ready = true;
				}
			}
		}

		let paragraphs = messages.map(m => {
			let p = document.createElement("p");
			p.textContent = m;
			return p;
		});

		node.replaceChildren(...paragraphs);

		if (this.ready) {
			let p = document.createElement("p");
			p.innerHTML = "Press [<kbd>Enter</kbd>] to start the heist!";
			node.append(p);
		}
	}

	handleKey(e: KeyboardEvent) {
		if (!this.ready) { return false; }

		switch (e.key) {
			case "Enter":
				this.tryStart();
				return true;
			break;
		}

		return false;
	}

	protected async tryStart() {
		let content = template(".confirm-action");
		let ok = await confirm(content);
		if (!ok) { return; }

		game.startAction();
	}
}
