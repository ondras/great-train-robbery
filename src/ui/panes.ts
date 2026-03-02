import Pane from "./pane.ts";

import Map from "./map.ts";
import Saloon from "./saloon.ts";
import Hotel from "./hotel.ts";
import Store from "./store.ts";
import Action from "./action.ts";
import Help from "./help.ts";

import * as game from "./game.ts";


const panes = {
	map: new Map(),
	saloon: new Saloon(),
	hotel: new Hotel(),
	store: new Store(),
	action: new Action(),
	help: new Help()
}

const tabs = [...document.querySelectorAll<HTMLElement>("#nav [data-content]")];

let activePane: Pane | undefined;

export type PaneName = keyof typeof panes;

function showNav(id: PaneName) {
	tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.content == id));
}

export function deactivate() {
	if (activePane) { activePane.deactivate(); }
}

export function activate(pane: PaneName) {
	activePane = panes[pane];
	activePane.activate();
	showNav(pane);
}

export let map = panes.map;

export function navKeyboardHandler(e: KeyboardEvent): boolean {
	let tab = tabs.find(tab => {
		let kbd = tab.querySelector<HTMLElement>("kbd");
		if (!kbd) { return false; }
		return (kbd.textContent.toLowerCase() == e.key.toLowerCase());
	});
	if (!tab) { return false; }

	game.activate(tab.dataset.content as PaneName);
	return true;
}
