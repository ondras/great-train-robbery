import ItemTable from "./item-table.ts";
import { world, Entity } from "../world.ts";
import { fillPerson } from "./util.ts";
import { createDialog, show } from "./dialog.ts";


interface BuildingItem {
	id: number;
}

export async function pickLocation(entity: Entity): Promise<Entity | false> {
	const { person, named, visual } = world.requireComponents(entity, "person", "named", "visual");

	let dialog = createDialog();

	let result = world.findEntities("building", "named");
	let items = [...result.entries()].map(entry => {
		return {
			id: entry[0],
			building: entry[1].building,
			name: entry[1].named.name
		}
	});

	let options = { rowBuilder: buildBuildingRow, activeId: person.building };
	let itemTable = new ItemTable<BuildingItem>(options);

	let p = document.createElement("p");
	p.innerHTML = "Choose a starting location for ";
	fillPerson(p, named, visual);
	p.append(":");

	function handleKey(e: KeyboardEvent) {
		let id = itemTable.keyToId(e);
		if (id != undefined) { return id; }

		if (e.key == "Escape") { return false; }
	}

	let menu = document.createElement("menu");
	menu.innerHTML = "<li>[<kbd>Esc</kbd>] to cancel</li>";

	dialog.append(p, itemTable.build(items), menu);


	return show(dialog, handleKey);
}

export function getBuildingName(entity: Entity) {
	let { building, named } = world.requireComponents(entity, "building", "named");
	let name = named.name;
	if (building.roof) { name += " (roof)"; }
	return name;
}

function buildBuildingRow(row: HTMLTableRowElement, item: BuildingItem) {
	row.insertCell().textContent = getBuildingName(item.id);
}
