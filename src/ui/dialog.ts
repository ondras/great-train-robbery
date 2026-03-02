import * as keyboard from "./keyboard.ts";
import ItemTable from "./item-table.ts";
import { world, Entity, Building } from "../world.ts";
import { fillPerson } from "./util.ts";


function createDialog() {
	let dialog = document.createElement("dialog");
	dialog.classList.add("border", "double", "inside");
	return dialog;
}

async function show<T>(dialog: HTMLDialogElement, handleKey: (e: KeyboardEvent) => T | undefined): Promise<T> {
	let { promise, resolve } = Promise.withResolvers<T>();

	function close(result: T) {
		keyboard.popHandler();
		dialog.close();
		dialog.remove();
		resolve(result);
	}

	function handle(e: KeyboardEvent) {
		let result = handleKey(e);
		if (result != undefined) { close(result); }
		return true;
	}

	document.querySelector("#game")!.append(dialog); // fixme
	dialog.showModal();
	keyboard.pushHandler(handle);

	return promise;
}


export async function alert(content: Node | string): Promise<true> {
	let dialog = createDialog();
	let footer = document.createElement("footer")

	let ok = document.createElement("span");
	ok.classList.add("button");
	ok.innerHTML = `OK`;

	function handleKey(e: KeyboardEvent) {
		if (e.key == "Enter") { return true; }
	}

	footer.append(ok);
	dialog.append(content, footer);

	return show(dialog, handleKey);
}

export async function confirm(content: Node | string): Promise<boolean> {
	let dialog = createDialog();

	let footer = document.createElement("footer")

	let ok = document.createElement("span");
	ok.classList.add("button");
	ok.innerHTML = `Yes [<kbd>Enter</kbd>]`;

	let ko = document.createElement("span");
	ko.classList.add("button");
	ko.innerHTML = `[<kbd>Esc</kbd>] No`;
	function handleKey(e: KeyboardEvent) {
		if (e.key == "Enter") { return true; }
		if (e.key == "Escape") { return false; }
	}

	footer.append(ko, ok);
	dialog.append(content, footer);

	return show(dialog, handleKey);
}

export async function gameOver(reason: string) {
	if (reason == "win") {

	} else {
		let content = document.createDocumentFragment();

		let strong = document.createElement("strong");
		strong.textContent = "💀 GAME OVER";
		content.append(strong);
		alert(content);
	}
}

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
