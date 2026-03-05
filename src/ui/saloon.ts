import Pane from "./pane.ts";
import { world, Entity, Person, Visual, Named } from "../world.ts";
import { confirm, alert } from "./dialog.ts";
import ItemTable from "./item-table.ts";
import { fillPerson, template } from "./util.ts";
import * as status from "./status.ts";
import * as rules from "../rules.ts";
import * as log from "./log.ts";


interface PersonItem {
	id: number;
	person: Person;
	visual: Visual;
	named: Named;
}

export default class Saloon extends Pane {
	protected personTable?: ItemTable<PersonItem>;

	constructor() {
		super("saloon");
	}

	activate() {
		super.activate();
		this.render();
		log.clear();
		log.add("Welcome to the Saloon! Here you can hire people for your heist, or fire them if you change your mind.");
		log.newline();
	}

	handleKey(e: KeyboardEvent): boolean {
		const { personTable } = this;

		if (personTable) {
			let entity = personTable.keyToId(e);
			if (entity) {
				this.render(entity);
				return true;
			}
		}

		return super.handleKey(e);
	}

	protected async tryHire(entity: Entity) {
		const { person, named } = world.requireComponents(entity, "person", "visual", "named");

		if (rules.currentMoney() < person.price) {
			await alert("You do not have enough money :-(");
			return;
		}

		let content = template(".confirm-hire", {name: named.name, price: String(person.price)});
		let ok = await confirm(content);
		if (!ok) { return; }

		person.relation = "party";
		status.update();
		log.add(`You hired ${named.name} for ${person.price}$.`);
		log.newline();

		this.render(entity);
	}

	protected async tryFire(entity: Entity) {
		const { person, named, actor } = world.requireComponents(entity, "person", "visual", "named", "actor");

		let content = template(".confirm-fire", {name: named.name, price: String(person.price)});
		let ok = await confirm(content);
		if (!ok) { return; }

		person.relation = "npc";
		person.items = [];
		person.building = undefined;
		actor.tasks = [];

		status.update();
		log.add(`You fired ${named.name} and got your ${person.price}$ back.`);
		log.newline();

		this.render(entity);
	}

	protected render(activePerson?: Entity) {
		let { node } = this;

		node.replaceChildren();
		this.activeKeyHandlers = [];

		let results = world.findEntities("person", "visual", "named");
		let allItems = [...results.entries()].map(entry => {
			return {
				id: entry[0],
				person: entry[1].person,
				visual: entry[1].visual,
				named: entry[1].named,
			};
		});

		let activeItems = allItems.filter(item => item.person.relation == "party");
		let inactiveItems = allItems.filter(item => item.person.relation == "npc");

		let options = { rowBuilder: buildPersonRow, activeId: activePerson };
		let personTable = new ItemTable<PersonItem>(options);
		this.personTable = personTable;

		if (activeItems.length) {
			let p = document.createElement("p");
			p.textContent = "Robbery members:"
			node.append(p, personTable.build(activeItems));
		}

		if (inactiveItems.length) {
			let p = document.createElement("p");
			p.textContent = "Available people:"
			node.append(p, personTable.build(inactiveItems));
		}

		if (activePerson) {
			const person = world.requireComponent(activePerson, "person");
			if (person.relation == "party") {
				this.activeKeyHandlers = [{key: "f", cb: () => this.tryFire(activePerson)}];
			} else {
				this.activeKeyHandlers = [{key: "h", cb: () => this.tryHire(activePerson)}];
			}
		}
	}
}

function buildPersonRow(row: HTMLTableRowElement, item: PersonItem, isActive: boolean) {
	let { person, visual, named } = item;

	fillPerson(row.insertCell(), named, visual);

	let price = row.insertCell();
	price.innerHTML = `price: <span class="gold">${person.price}</span>`;

	let action = row.insertCell();

	if (isActive) {
		if (person.relation == "party") {
			action.innerHTML = "<kbd>F</kbd>ire";
		} else {
			action.innerHTML = "<kbd>H</kbd>ire";
		}
	}
}
