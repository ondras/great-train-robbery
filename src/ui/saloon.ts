import Pane from "./pane.ts";
import { world, Entity, Person, Visual } from "../world.ts";
import { confirm } from "./dialog.ts";
import ItemTable from "./item-table.ts";
import { fillPerson, template } from "./util.ts";
import * as status from "./status.ts";
import * as log from "./log.ts";


interface PersonItem {
	id: number;
	person: Person;
	visual: Visual;
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
		log.add("Welcome to the saloon! Here you can hire people for your heist, or fire them if you change your mind.");
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
		const { person } = world.requireComponents(entity, "person", "visual");

		let content = template(".confirm-hire", {name: person.name, gold: String(person.price)});
		let ok = await confirm(content);
		if (!ok) { return; }

		person.active = true;
		status.update();
		log.newline();
		log.add(`You hired ${person.name} for ${person.price}$.`);

		this.render(entity);
	}

	protected async tryFire(entity: Entity) {
		const { person } = world.requireComponents(entity, "person", "visual");

		let content = template(".confirm-fire", {name: person.name, gold: String(person.price)});
		let ok = await confirm(content);
		if (!ok) { return; }

		person.active = false;
		status.update();
		log.newline();
		log.add(`You fired ${person.name} and got your ${person.price}$ back.`);
		// FIXME zahodit tasky
		// FIXME zahodit predmety
		// FIXME zahodit location

		this.render(entity);
	}

	protected render(activePerson?: Entity) {
		let { node } = this;

		node.replaceChildren();
		this.activeKeyHandlers = [];

		let results = world.findEntities("person", "visual");
		let allItems = [...results.entries()].map(entry => {
			return {
				id: entry[0],
				person: entry[1].person,
				visual: entry[1].visual,
			};
		});

		let activeItems = allItems.filter(item => item.person.active);
		let inactiveItems = allItems.filter(item => !item.person.active);

		let options = { rowBuilder: buildPersonRow, activeId: activePerson };
		let personTable = new ItemTable<PersonItem>(options);
		this.personTable = personTable;

		if (activeItems.length) {
			node.append("Heist members:");
			node.append(personTable.build(activeItems));
		}

		if (inactiveItems.length) {
			node.append("Available people:");
			node.append(personTable.build(inactiveItems));
		}

		if (activePerson) {
			const person = world.requireComponent(activePerson, "person");
			if (person.active) {
				this.activeKeyHandlers = [{key: "f", cb: () => this.tryFire(activePerson)}];
			} else {
				this.activeKeyHandlers = [{key: "h", cb: () => this.tryHire(activePerson)}];
			}
		}
	}
}

function buildPersonRow(row: HTMLTableRowElement, item: PersonItem, isActive: boolean) {
	let { person, visual } = item;

	fillPerson(row.insertCell(), person, visual);

	let price = row.insertCell();
	price.innerHTML = `price: ${person.price}<span class="gold">$</span>`;

	let action = row.insertCell();

	if (isActive) {
		if (person.active) {
			action.innerHTML = "<kbd>F</kbd>ire";
		} else {
			action.innerHTML = "<kbd>H</kbd>ire";
		}
	}
}
