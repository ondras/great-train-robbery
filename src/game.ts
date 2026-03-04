import * as keyboard from "./ui/keyboard.ts";
import * as ui from "./ui/ui.ts";
import * as random from "./random.ts";
import * as rules from "./rules.ts";
import display from "./display.ts";

import { rasterize } from "./town/rasterizer.ts";
import * as townGenerator from "./town/generator.ts";
import * as npcGenerator from "./npc/generator.ts";

import { scheduler, spatialIndex, world, Entity } from "./world.ts";
import * as tasks from "./npc/tasks.ts";
import * as train from "./npc/train.ts";
import { gameOver } from "./ui/dialog-gameover.ts";
import { sleep } from "./npc/util.ts";


let actionPaused = false;
let seed: number;

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

		if (isGameFinished()) { return gameOver(seed); }

		let entity = scheduler.next();
		if (!entity) { break; }
		let time = await tasks.run(entity);

		if (world.hasComponents(entity, "actor")) { // important: the actor might have been removed during the task
			scheduler.commit(entity, time);
		}
	}
}

export const personQuery = world.query("person");

function isGameFinished(): boolean {
	let activePartyMembers = 0;
	let enemies = 0;

	for (let entity of personQuery.entities) {
		let person = world.requireComponent(entity, "person");
		switch (person.relation) {
			case "enemy": enemies++; break;
			case "party":
				let actor = world.getComponent(entity, "actor");
				if (actor) { activePartyMembers++; }
			break;
		}
	}

	// all party members inactive (dead or away)
	if (activePartyMembers == 0) { return true; }

	// train away (all connected wagons gone) + all enemies dead + nothing to pick

	let trainParts = world.findEntities("trainPart", "position");
	if (trainParts.size > 0) { return false; }

	if (enemies > 0) { return false; } // FIXME nemuze nastat nekonecna honicka?

	let items = world.findEntities("item", "position");
	if (items.size > 0) { return false; } // FIXME splnuje tohle pouze zlato?

	return true;
}

export function currentMoney() {
	let money = rules.initialMoney;

	let entities = personQuery.entities;
	for (let entity of entities) {
		let person = world.requireComponent(entity, "person");
		if (person.relation != "party") { continue; }
		money -= person.price;
	}

	// FIXME predmety
	return money;
}

function removePersons() {
	for (let entity of personQuery.entities) {
		display.delete(entity);
		world.removeComponents(entity, "position");
		spatialIndex.update(entity);
	}
}

export async function startAction() {
	removePersons();

	let partyEntities: Entity[] = [];
	let otherEntities: Entity[] = [];

	for (let entity of personQuery.entities) {
		let person = world.requireComponent(entity, "person");
		(person.relation == "party" ? partyEntities : otherEntities).push(entity);
	}

	/* */
	let buildings = world.findEntities("building");
	partyEntities.forEach(entity => {
		let person = world.requireComponent(entity, "person");
		person.building = [...buildings.keys()].random();
	});
	/* */

	ui.startAction();

	npcGenerator.placeRandomly(otherEntities);
	npcGenerator.placeIntoBuildings(partyEntities);

	train.create(15);

	keyboard.pushHandler(actionKeyboardHandler);
	runAction();
}

export async function init(s: number) {
	seed = s;
	random.seed(seed);
	createTown(4, 4);

	await ui.init();

//	gameOver(seed);
	ui.activate("hotel");
//	startAction();
}
