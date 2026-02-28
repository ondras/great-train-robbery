import * as keyboard from "./keyboard.ts";
import display from "../display.ts";
import Pane from "./pane.ts";
import Map from "./map.ts";
import Saloon from "./saloon.ts";
import Hotel from "./hotel.ts";


const dom = {
	nav: document.querySelector("#nav")!,
	main: document.querySelector<HTMLElement>("#main")!,
	map: document.querySelector("#map")!,
	tabs: [] as HTMLElement[],
}
dom.tabs = [...dom.nav.querySelectorAll<HTMLElement>("[data-content]")];


const panes = {
	map: new Map(),
	saloon: new Saloon(),
	hotel: new Hotel()
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
	dom.tabs.forEach(tab => tab.classList.toggle("border", tab.dataset.content == id));
}

export function activate(pane: PaneName) {
	if (activePane) { activePane.deactivate(); }

	activePane = panes[pane];
	activePane.activate();

	showNav(pane);
}

let navHandler = {
	handleKey(e: KeyboardEvent): boolean {
		if (e.type != "keydown") { return false; }

		let tab = dom.tabs.find(tab => {
			let kbd = tab.querySelector<HTMLElement>("kbd");
			if (!kbd) { return false; }
			return (kbd.textContent.toLowerCase() == e.key.toLowerCase());
		});
		if (!tab) { return false; }

		activate(tab.dataset.content as PaneName);
		return true;
}
}

export async function init() {
	dom.map.append(display);

	await document.fonts.ready;
	syncDisplaySize();
	syncFontSize();
	window.addEventListener("resize", syncFontSize);

	keyboard.pushHandler(navHandler);
	keyboard.on();

	activate("map");
}
