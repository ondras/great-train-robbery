import * as keyboard from "./keyboard.ts";
import * as viewport from "./viewport.ts";
import * as status from "./status.ts";
import display from "../display.ts";

import Pane from "./pane.ts";

import Map from "./map.ts";
import Saloon from "./saloon.ts";
import Hotel from "./hotel.ts";
import Store from "./store.ts";
import Action from "./action.ts";
import Help from "./help.ts";


const dom = {
	game: document.querySelector<HTMLElement>("#game")!,
	map: document.querySelector("#map")!,
	tabs: [] as HTMLElement[]
}
dom.tabs = [...document.querySelectorAll<HTMLElement>("#nav [data-content]")];

const panes = {
	map: new Map(),
	saloon: new Saloon(),
	hotel: new Hotel(),
	store: new Store(),
	action: new Action(),
	help: new Help()
}
type PaneName = keyof typeof panes;

let activePane: Pane | undefined;

function showNav(id: PaneName) {
	dom.tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.content == id));
}

function navKeyboardHandler(e: KeyboardEvent): boolean {
	let tab = dom.tabs.find(tab => {
		let kbd = tab.querySelector<HTMLElement>("kbd");
		if (!kbd) { return false; }
		return (kbd.textContent.toLowerCase() == e.key.toLowerCase());
	});
	if (!tab) { return false; }

	activate(tab.dataset.content as PaneName);
	return true;
}

export function activate(pane: PaneName) {
	if (activePane) { activePane.deactivate(); }

	activePane = panes[pane];
	activePane.activate();
	showNav(pane);
	if (pane == "map") { panes.map.runDemo(); }
}

export function startAction() {
	if (activePane) { activePane.deactivate(); }

	keyboard.popHandler(); // FIXME disable tabs visually?
	status.setMode("action");

	showNav("map");
	panes.map.activate();
}

export async function init() {
	dom.map.append(display);
	await document.fonts.ready;

	dom.game.hidden = false;
	viewport.init();

	status.setMode("planning");

	keyboard.pushHandler(navKeyboardHandler);
	keyboard.on();
}
