import ItemTable from "./item-table.ts";
import { createDialog, show } from "./dialog.ts";
import { world, Entity, Item, Named } from "../world.ts";


// FIXME detailnejsi vypis predmetu?

interface InventoryItem {
	id: number;
	item: Item;
	named: Named;
}

function buildInventoryRow(row: HTMLTableRowElement, iitem: InventoryItem) {
	const { named, item } = iitem;
	row.insertCell().textContent = named.name;
}

function getAvailableItems(): Entity[] {
	let allItems = new Set(world.findEntities("item").keys());

	let persons = world.findEntities("person");
	for (let entity of persons.keys()) {
		let person = world.requireComponent(entity, "person");
		for (let item of person.items) { allItems.delete(item); }
	}

	return [...allItems];
}

export async function buyItem(): Promise<Entity | false> {
	let dialog = createDialog();

	let options = { rowBuilder: buildInventoryRow };
	let inventoryTable = new ItemTable<InventoryItem>(options);

	let items = getAvailableItems().map(entity => {
		let { item, named } = world.requireComponents(entity, "item", "named");
		return { id: entity, item, named };
	});

	function handleKey(e: KeyboardEvent) {
		let id = inventoryTable.keyToId(e);
		if (id != undefined) { return id; }

		if (e.key == "Escape") { return false; }
	}

	let p = document.createElement("p");
	p.innerHTML = "Items for sale:";

	let menu = document.createElement("menu");
	menu.innerHTML = "<li>[<kbd>Esc</kbd>] to cancel</li>";

	dialog.replaceChildren(p, inventoryTable.build(items), menu);

	return show(dialog, handleKey);
}
