import Pane from "./pane.ts";
import { world, Entity, Person, Visual, Named, Item } from "../world.ts";
import { confirm, alert } from "./dialog.ts";
import { pickItem } from "./dialog-buy.ts";
import ItemTable from "./item-table.ts";
import { fillPerson, template } from "./util.ts";
import * as status from "./status.ts";
import * as log from "./log.ts";
import * as rules from "../rules.ts";


interface PersonItem {
	id: number;
	person: Person;
	visual: Visual;
	named: Named;
}

interface InventoryItem {
	id: number;
	item: Item;
	named: Named;
}

export default class Store extends Pane {
	protected personTable?: ItemTable<PersonItem>;
	protected inventoryTable?: ItemTable<InventoryItem>;
	protected activePerson?: Entity;

	constructor() {
		super("store");
	}

	activate() {
		super.activate();
		this.renderPersons();
		log.clear();
		log.add("Welcome to the General Store! Here you can buy various helpful items for your party members.");
		log.newline();
	}

	handleKey(e: KeyboardEvent): boolean {
		const { personTable, inventoryTable } = this;

		if (inventoryTable) {
			let item = inventoryTable.keyToId(e);
			if (item != undefined) {
				this.renderPerson(this.activePerson!, item);
				return true;
			}
		}

		if (personTable) {
			let entity = personTable.keyToId(e);
			if (entity) {
				this.activePerson = entity;
				this.renderPerson(entity);
				return true;
			}
		}

		return super.handleKey(e);
	}

	protected renderPersons() {
		let { node } = this;

		node.replaceChildren();
		this.activeKeyHandlers = [];

		let results = world.findEntities("person", "visual", "named");
		let entries = [...results.entries()].filter(entry => entry[1].person.relation == "party");
		let items = entries.map(entry => {
			return {
				id: entry[0],
				person: entry[1].person,
				visual: entry[1].visual,
				named: entry[1].named,
			};
		});

		if (items.length == 0) {
			node.append("You have not hired any people yet. Hire some in the Saloon and come back to buy their equipment.");
			return;
		}

		let personTable = new ItemTable<PersonItem>({ rowBuilder: buildPersonRow });

		this.personTable = personTable;
		this.inventoryTable = undefined;
		this.activePerson = undefined;

		let p = document.createElement("p");
		p.textContent = "Select a party member to view their inventory and buy them new items.";
		node.append(p, personTable.build(items));
	}

	protected renderPerson(activePerson: Entity, item?: Entity) {
		let { node } = this;

		node.replaceChildren();

		let activeKeyHandlers = [];

		let { person, visual, named } = world.requireComponents(activePerson, "person", "visual", "actor", "named");

		let p1 = document.createElement("p");
		fillPerson(p1, named, visual);
		p1.append("'s inventory:")
		node.append(p1);

		let options = { rowBuilder: buildInventoryRow, activeId: item };
		let inventoryTable = new ItemTable<InventoryItem>(options);
		this.inventoryTable = inventoryTable;
		this.personTable = undefined;

		let items = person.items.map(entity => {
			let { item, named } = world.requireComponents(entity, "item", "named");
			return { id: entity, item, named };
		});

		if (item) {
			activeKeyHandlers.push(
				{key:"s", cb: () => this.trySell(activePerson, item)}
			);
		}

		let menu = document.createElement("menu");
		menu.innerHTML = `
			<li><kbd>P</kbd>urchase new item</li>
			<li><kbd>B</kbd>ack to your party</li>
		`;
		activeKeyHandlers.push({key:"p", cb: () => this.purchase(activePerson)});
		activeKeyHandlers.push({key:"b", cb: () => this.renderPersons()});

		node.append(inventoryTable.build(items), menu);
		this.activeKeyHandlers = activeKeyHandlers;
	}

	protected async trySell(personEntity: Entity, itemEntity: Entity) {
		const { named, item } = world.requireComponents(itemEntity, "named", "item");

		let content = template(".confirm-sell", {name: named.name, price: String(item.price)});
		let ok = await confirm(content);
		if (!ok) { return; }

		let { items } = world.requireComponent(personEntity, "person");
		let index = items.indexOf(itemEntity);
		if (index != -1) {
			items.splice(index, 1);
			status.update();
			log.add(`You sold ${named.name} and got your ${item.price}$ back.`);
			log.newline();
		}

		this.renderPerson(personEntity);
	}

	protected async purchase(person: Entity) {
		let itemEntity = await pickItem();
		if (!itemEntity) { return; }

		const { named, item } = world.requireComponents(itemEntity, "named", "item");
		if (item.price > rules.currentMoney()) {
			await alert("You do not have enough money :-(");
			return;
		}

		const uniqueGroups = new Set(["weapon", "horse"]);

		let { items } = world.requireComponent(person, "person");
		if (uniqueGroups.has(item.type)) {
			if (items.some(entity => world.requireComponent(entity, "item").type == item.type)) {
				await alert(`You already have a ${item.type}. Sell it first if you want to buy another one.`);
				return;
			}
		}

		let content = template(".confirm-buy", {name: named.name, price: String(item.price)});
		let ok = await confirm(content);
		if (!ok) { return; }

		items.push(itemEntity);
		status.update();
		log.add(`You bought ${named.name} for ${item.price}$.`);
		log.newline();

		this.renderPerson(person);
	}
}

function buildPersonRow(row: HTMLTableRowElement, item: PersonItem, isActive: boolean) {
	let { person, visual, named } = item;

	fillPerson(row.insertCell(), named, visual);

	let str = "(no items)";
	let count = person.items.length;
	if (count == 1) {
		str = "1 item";
	} else if (count > 1) {
		str = `${count} items`;
	}
	row.insertCell().innerHTML = str;
}

function buildInventoryRow(row: HTMLTableRowElement, item: InventoryItem, isActive: boolean) {
	const { named } = item;
	row.insertCell().textContent = named.name;

	let actions = row.insertCell();
	if (isActive) {
		actions.innerHTML = `<kbd>S</kbd>ell`;
	}
}
