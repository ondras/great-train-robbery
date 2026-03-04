import ItemTable from "./item-table.ts";
import { world, Entity, Building } from "../world.ts";
import { fillPerson } from "./util.ts";
import { createDialog, show } from "./dialog.ts";


interface BuildingItem {
	id: number;
	building: Building;
	name: string;
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
	fillPerson(p, named, visual);

	function handleKey(e: KeyboardEvent) {
		let id = itemTable.keyToId(e);
		if (id != undefined) { return id; }

		if (e.key == "Escape") { return false; }
	}

	dialog.append(p, itemTable.build(items));

	return show(dialog, handleKey);
}

function buildBuildingRow(row: HTMLTableRowElement, item: BuildingItem) {
	let text = item.name;
	if (item.building.roof) { text += " (roof)"; }
	row.insertCell().textContent = text;
}
