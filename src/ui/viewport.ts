import display from "../display.ts";


const main = document.querySelector<HTMLElement>("#main")!;
const log = document.querySelector<HTMLElement>("#log")!;

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
	main.style.width = `calc(${display.cols + 1} * ${tileWidth})`;
	main.style.height = `calc(${display.rows + 1} * ${tileHeight})`;
	log.style.height = main.style.height;
}

export function init() {
	syncDisplaySize();
	syncFontSize();
	window.addEventListener("resize", syncFontSize);
}
