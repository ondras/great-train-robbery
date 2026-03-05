import ItemTable from "./item-table.ts";
import { createDialog, show } from "./dialog.ts";
import { world, Entity, Item, Named } from "../world.ts";


export const itemGroups = {
	"weapon": "Weapons",
	"horse": "Horses",
	"aid": "Healing",
	"other": "Other"
}

interface InventoryItem {
	id: number;
	item: Item;
	named: Named;
}

function buildInventoryRow(row: HTMLTableRowElement, iitem: InventoryItem) {
	const { named, item } = iitem;
	row.insertCell().textContent = named.name;
}

function getAvailableItems(groupIndex: number): Entity[] {
	let allItems = new Set(world.findEntities("item").keys());
	let filterType = Object.keys(itemGroups)[groupIndex];

	let persons = world.findEntities("person");
	for (let entity of persons.keys()) {
		let person = world.requireComponent(entity, "person");
		for (let item of person.items) { allItems.delete(item); }
	}

	for (let entity of allItems) {
		let item = world.requireComponent(entity, "item");
		if (item.type in itemGroups) { // explicitly grouped item
			if (item.type != filterType) { allItems.delete(entity); }
		} else { // others
			if (filterType != "other") { allItems.delete(entity); }
		}
	}

	return [...allItems];
}

async function pickItemInGroup(dialog: HTMLDialogElement, groupIndex: number): Promise<Entity | false | "back"> {
	let options = { rowBuilder: buildInventoryRow };
	let inventoryTable = new ItemTable<InventoryItem>(options);

	let items = getAvailableItems(groupIndex).map(entity => {
		let { item, named } = world.requireComponents(entity, "item", "named");
		return { id: entity, item, named };
	});

	function handleKey(e: KeyboardEvent) {
		let id = inventoryTable.keyToId(e);
		if (id != undefined) { return id; }

		if (e.key == "Escape") { return false; }
		if (e.key.toLowerCase() == "b") { return "back" as const; }
	}

	let p = document.createElement("p");
	let cat = Object.values(itemGroups)[groupIndex];
	p.innerHTML = (items.length > 0 ? `Items for sale in category "${cat}":` : `There are no items for sale in category "${cat}".`);

	let menu = document.createElement("menu");
	menu.innerHTML = "<li><kbd>B</kbd>ack</li><li>[<kbd>Esc</kbd>] to cancel</li>";

	dialog.replaceChildren(p, inventoryTable.build(items), menu);

	return show(dialog, handleKey);
}

interface GroupItem {
	id: number;
	label: string;
}

function buildGroupRow(row: HTMLTableRowElement, item: GroupItem) {
	row.insertCell().textContent = item.label;
}

async function pickGroup(dialog: HTMLDialogElement): Promise<number | false> {
	let options = { rowBuilder: buildGroupRow };
	let groupTable = new ItemTable<GroupItem>(options);

	let items = Object.values(itemGroups).map((label, id) => ({ id, label }));

	function handleKey(e: KeyboardEvent) {
		let id = groupTable.keyToId(e);
		if (id != undefined) { return id; }

		if (e.key == "Escape") { return false; }
	}

	let p = document.createElement("p");
	p.innerHTML = "To buy an item, first choose a category:";

	let menu = document.createElement("menu");
	menu.innerHTML = "<li>[<kbd>Esc</kbd>] to cancel</li>";

	dialog.replaceChildren(p, groupTable.build(items), menu);

	return show(dialog, handleKey);
}

export async function pickItem(): Promise<Entity | false> {
	let dialog = createDialog();

	while (true) {
		let groupIndex = await pickGroup(dialog);
		if (groupIndex === false) { return false; }

		let task = await pickItemInGroup(dialog, groupIndex);
		if (task === false) { return false; }

		if (task == "back") { continue; }

		return task;
	}
}
