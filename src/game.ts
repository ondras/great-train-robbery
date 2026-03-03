import * as keyboard from "./ui/keyboard.ts";
import * as random from "./random.ts";
import * as rules from "./rules.ts";
import display from "./display.ts";

import { rasterize } from "./town/rasterizer.ts";
import * as townGenerator from "./town/generator.ts";
import * as npcGenerator from "./npc/generator.ts";

import { Entity, scheduler, world } from "./world.ts";
import * as tasks from "./npc/tasks.ts";
import * as train from "./npc/train.ts";
import { gameOver } from "./ui/dialog.ts";
import { sleep } from "./npc/util.ts";

import * as ui from "./ui/ui.ts";


let actionPaused = false;

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

export const personQuery = world.query("person");

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

export function currentMoney() {
	let money = rules.initialMoney;

	let entities = personQuery.entities;
	for (let entity of entities) {
		let person = world.requireComponent(entity, "person");
		if (!person.active) { continue; }
		money -= person.price;
	}

	// FIXME predmety
	return money;
}

export async function startAction() {
	ui.startAction();

	keyboard.pushHandler(actionKeyboardHandler);

	train.create(15);

	runAction();
}

export async function init(seed: number) {
	random.seed(seed);
	createTown(4, 4);

	await ui.init();

	ui.activate("saloon");
//	startAction();
}
