import ItemTable from "./item-table.ts";
import { world, Entity, Building } from "../world.ts";
import { fillPerson } from "./util.ts";
import { createDialog, show } from "./dialog.ts";


interface BuildingItem {
	id: number;
	building: Building;
}

export async function pickLocation(entity: Entity): Promise<Entity | false> {
	const { person, visual } = world.requireComponents(entity, "person", "visual");

	let dialog = createDialog();

	// FIXME filtr na ty, co maji strechu
	let result = world.findEntities("building");
	let items = [...result.entries()].map(entry => {
		return {
			id: entry[0],
			building: entry[1].building
		}
	});

	let options = { rowBuilder: buildBuildingRow, activeId: person.location };
	let itemTable = new ItemTable<BuildingItem>(options);

	let p = document.createElement("p");
	fillPerson(p, person, visual);

	function handleKey(e: KeyboardEvent) {
		let id = itemTable.keyToId(e);
		if (id != undefined) { return id; }

		if (e.key == "Escape") { return false; }
	}

	dialog.append(p, itemTable.build(items));

	return show(dialog, handleKey);
}

function buildBuildingRow(row: HTMLTableRowElement, item: BuildingItem) {
	row.insertCell().textContent = `${item.building.type}`;
}
