import ItemTable from "./item-table.ts";
import { createDialog, show } from "./dialog.ts";
import { world, Entity, Named, Item } from "../world.ts";


interface InventoryItem {
	id: number;
	named: Named;
	item: Item;
}

function buildInventoryRow(row: HTMLTableRowElement, item: InventoryItem) {
	row.insertCell().textContent = item.named.name;
	row.insertCell().innerHTML = `<span class="gold">${item.item.price}</span>`;
}

export function getAvailableItems(): Entity[] {
	let allItems = new Set(world.findEntities("item").keys());

	let persons = world.findEntities("person");
	for (let entity of persons.keys()) {
		let person = world.requireComponent(entity, "person");
		for (let item of person.items) { allItems.delete(item); }
	}

	return [...allItems];
}


export async function pickItem(): Promise<Entity | false> {
	let dialog = createDialog();

	let options = { rowBuilder: buildInventoryRow };
	let inventoryTable = new ItemTable<InventoryItem>(options);

	let items = getAvailableItems().map(entity => {
		let { named, item } = world.requireComponents(entity, "named", "item");
		return { id: entity, named, item };
	});

	function handleKey(e: KeyboardEvent) {
		let id = inventoryTable.keyToId(e);
		if (id != undefined) { return id; }

		if (e.key == "Escape") { return false; }
	}

	let p = document.createElement("p");
	p.innerHTML = "Pick an item to buy it:";

	let menu = document.createElement("menu");
	menu.innerHTML = "<li>[<kbd>Esc</kbd>] to cancel</li>";

	dialog.replaceChildren(p, inventoryTable.build(items), menu);

	return show(dialog, handleKey);
}
