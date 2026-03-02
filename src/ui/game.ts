import * as keyboard from "./keyboard.ts";
import * as random from "../random.ts";
import display from "../display.ts";

import { rasterize } from "../town/rasterizer.ts";
import * as townGenerator from "../town/generator.ts";
import * as npcGenerator from "../npc/generator.ts";

import { Entity, scheduler, world } from "../world.ts";
import * as tasks from "../npc/tasks.ts";
import * as train from "../npc/train.ts";
import { gameOver } from "./dialog.ts";
import { sleep } from "../npc/util.ts";

import * as panes from "./panes.ts";


const dom = {
	game: document.querySelector<HTMLElement>("#game")!,
	main: document.querySelector<HTMLElement>("#main")!,
	map: document.querySelector("#map")!
}

let actionPaused = false;

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
	dom.main.style.width = `calc(${display.cols + 1} * ${tileWidth})`;
	dom.main.style.height = `calc(${display.rows + 1} * ${tileHeight})`;
}


export function activate(pane: panes.PaneName | "map-action") {
	panes.deactivate();

	if (pane == "map-action") {
		keyboard.popHandler(); // FIXME disable tabs visually?
		keyboard.pushHandler(actionKeyboardHandler);

		train.create(15);
		panes.activate("map")

		runAction();

	} else {
		panes.activate(pane);
		if (pane == "map") { panes.map.runDemo(); }
	}
}

function actionKeyboardHandler(e: KeyboardEvent): boolean {
	if (e.code == "Space") { actionPaused = !actionPaused; }
	return true;
}

function createTown(W: number, H: number) {
	let town = townGenerator.emptyTown(W, H);
	townGenerator.generateBuildings(town);

	let paths = townGenerator.generateAllPaths(town)
	paths = townGenerator.deduplicatePaths(paths);
	paths = paths.toSorted((a, b) => a.length - b.length);
	let q = Math.floor(paths.length / 4);
	paths = paths.slice(2*q, 3*q);
	let path = paths.random();

	let options = {roadWidth: 3, plotWidth: 12, plotHeight: 6};
	let townEntity = rasterize(town, path, options);

	let { width, height } = world.requireComponent(townEntity, "town");
	display.cols = width;
	display.rows = height;

	npcGenerator.generatePeople();
}

export async function runAction() {
	while (true) {
		if (actionPaused) {
			await sleep(50);
			continue;
		}

		let finished = isGameFinished();
		if (finished) {
			gameOver(finished);
			return;
		}

		let entity = scheduler.next();
		if (!entity) { break; }
		await tasks.run(entity);
	}
}

const personQuery = world.query("person");

function arePersonsDead(entities: Set<Entity>) {
	for (let entity of entities) {
		if (world.requireComponent(entity, "person").hp > 0) { return false; }
	}
	return false;
}

function isGameFinished() {
	if (arePersonsDead(personQuery.entities)) { return "dead"; }
	if (!train.isInTown()) { return "gone"; }

	return false;
}

export async function init(seed: number) {
	random.seed(seed);
	createTown(4, 4);

	dom.map.append(display);
	await document.fonts.ready;

	dom.game.hidden = false;
	syncDisplaySize();
	syncFontSize();
	window.addEventListener("resize", syncFontSize);

	keyboard.pushHandler(panes.navKeyboardHandler);
	keyboard.on();

	activate("saloon");
}

