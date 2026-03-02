import * as keyboard from "./keyboard.ts";
import * as random from "../random.ts";
import display from "../display.ts";
import Pane from "./pane.ts";

import Map from "./map.ts";
import Saloon from "./saloon.ts";
import Hotel from "./hotel.ts";
import Store from "./store.ts";
import Action from "./action.ts";
import Help from "./help.ts";

import Renderer from "../town/renderer.ts";
import * as townGenerator from "../town/generator.ts";
import * as npcGenerator from "../npc/generator.ts";


const dom = {
	game: document.querySelector<HTMLElement>("#game")!,
	nav: document.querySelector("#nav")!,
	main: document.querySelector<HTMLElement>("#main")!,
	map: document.querySelector("#map")!,
	tabs: [] as HTMLElement[],
}
dom.tabs = [...dom.nav.querySelectorAll<HTMLElement>("[data-content]")];

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


function syncFontSize() {
	let game = document.querySelector<HTMLElement>("#game")!;
	let currentFontSize = parseInt(getComputedStyle(game).getPropertyValue("font-size"));

	const { offsetWidth, offsetHeight } = game;
	const { innerWidth, innerHeight } = window;

	let scaleVertical = innerHeight / offsetHeight;
	let scaleHorizontal = innerWidth / offsetWidth;

	let fontSizeVertical = Math.floor(currentFontSize * scaleVertical);
	let fontSizeHorizontal = Math.floor(currentFontSize * scaleHorizontal);
	let fontSize = Math.min(fontSizeVertical, fontSizeHorizontal);

	document.documentElement.style.fontSize = `${fontSize}px`;
}

function syncDisplaySize() {
	let cs = getComputedStyle(display);
	let tileWidth = cs.getPropertyValue("--tile-width");
	let tileHeight = cs.getPropertyValue("--tile-height");
	dom.main.style.width = `calc(${display.cols + 2} * ${tileWidth})`;
	dom.main.style.height = `calc(${display.rows + 2} * ${tileHeight})`;
}

function showNav(id: PaneName) {
	dom.tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.content == id));
}

export function activate(pane: PaneName | "map-action") {
	if (activePane) { activePane.deactivate(); }

	if (pane == "map-action") {
		keyboard.popHandler(); // FIXME disable tabs visually?
		showNav("map");
		panes.map.activate(true);
	} else {
		showNav(pane);
		activePane = panes[pane];
		activePane.activate();
	}
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

function createTown(W: number, H: number) {
	let t = townGenerator.emptyTown(W, H);

	let options = {roadWidth: 3, plotWidth: 12, plotHeight: 6};
	let renderer = new Renderer(t, options);
	renderer.renderGround();

	display.cols = renderer.width;
	display.rows = renderer.height;

	townGenerator.generateBuildings(t);
	renderer.renderBuildings();

	let paths = townGenerator.generateAllPaths(t)
	paths = townGenerator.deduplicatePaths(paths);
	paths = paths.toSorted((a, b) => a.length - b.length);
	let q = Math.floor(paths.length / 4);
	paths = paths.slice(2*q, 3*q);
	let path = paths.random();

	renderer.renderPath(path);

	npcGenerator.generatePeople();
}


export async function init(seed: number) {
	random.seed(seed);

	createTown(4, 4);

	dom.game.hidden = false;
	dom.map.append(display);
	await document.fonts.ready;

	syncDisplaySize();
	syncFontSize();
	window.addEventListener("resize", syncFontSize);

	keyboard.pushHandler(navKeyboardHandler);
	keyboard.on();

//	activate("map");
	activate("saloon");
}
