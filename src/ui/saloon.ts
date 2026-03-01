import Pane from "./pane.ts";
import { world, Entity, Person, Visual } from "../world.ts";
import { confirm } from "./dialog.ts";
import ItemTable from "./item-table.ts";
import * as util from "../util.ts";
import { fillPerson } from "./util.ts";


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

		let content = util.template(".confirm-hire", {name: person.name, gold: String(person.price)});
		let ok = await confirm(content);
		if (!ok) { return; }

		person.active = true;
		// FIXME update status

		this.render(entity);
	}

	protected async tryFire(entity: Entity) {
		const { person } = world.requireComponents(entity, "person", "visual");

		let content = util.template(".confirm-fire", {name: person.name, gold: String(person.price)});
		let ok = await confirm(content);
		if (!ok) { return; }

		person.active = false;
		// FIXME zahodit tasky
		// FIXME zahodit predmety
		// FIXME update status
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
	price.classList.add("price");
	price.textContent = `price: ${person.price}$`;

	if (isActive) {
		let action = row.insertCell();

		if (person.active) {
			action.innerHTML = "<kbd>F</kbd>ire";
		} else {
			action.innerHTML = "<kbd>H</kbd>ire";
		}
	}
}
