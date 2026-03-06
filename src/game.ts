import * as keyboard from "./ui/keyboard.ts";
import * as ui from "./ui/ui.ts";
import * as log from "./ui/log.ts";
import * as random from "./random.ts";
import * as rules from "./rules.ts";
import display from "./display.ts";

import { rasterize } from "./town/rasterizer.ts";
import * as townGenerator from "./town/generator.ts";
import * as npcGenerator from "./npc/generator.ts";
import * as itemGenerator from "./items/generator.ts";

import { scheduler, spatialIndex, world, Entity } from "./world.ts";
import * as tasks from "./npc/tasks.ts";
import * as train from "./npc/train.ts";
import { gameOver, GameOverResult } from "./ui/dialog-gameover.ts";
import { sleep } from "./npc/util.ts";

import { getAvailableItems } from "./ui/dialog-buy.ts";


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
	itemGenerator.generateItems();
}

export async function runAction() {
	let failedActors = new Set<Entity>();
	let actors = world.query("actor");

	while (true) {
		if (actionPaused) {
			await sleep(50);
			continue;
		}

		if (isGameFinished()) { return; }

		let entity = scheduler.next();
		if (!entity) { break; }

		let time = await tasks.run(entity);

		if (!time) { // failed to perform a task: 1) mark, 2) commit with a default duration
			failedActors.add(entity);
			time = rules.baseTaskDuration;
		} else { // remove from failures
			failedActors.delete(entity);
		}

		// delete failed actors that are no longer actors
		for (let failedActor of failedActors) {
			if (!actors.entities.has(failedActor)) { failedActors.delete(failedActor); }
		}

		if (world.hasComponents(entity, "actor")) { // important: the actor might have been removed during the task
			scheduler.commit(entity, time);
		}

		if (failedActors.size == actors.entities.size) { break; }
	}

	// weird situation: no actors are able to act (or we have none)
}


function isGameFinished(): boolean {
	let activePartyMembers = 0;
	let enemies = 0;

	for (let entity of rules.personQuery.entities) {
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

	// something to do: (attackable) train parts on the map
	let trainParts = world.findEntities("trainPart", "position"); // FIXME query
	if (trainParts.size > 0) { return false; }

	// something to do: enemies are alive
	if (enemies > 0) { return false; } // FIXME nemuze nastat nekonecna honicka?

	// something to do: gold on the map, some party members can pick them up
	let items = world.findEntities("item", "position"); // FIXME query
	let types = [...items.keys()].map(entity => world.requireComponent(entity, "item").type);
	let gold = types.filter(t => t == "gold");
	if (gold.length > 0) { return false; }

	return true;
}


function removePersons() {
	for (let entity of rules.personQuery.entities) {
		display.delete(entity);
		world.removeComponents(entity, "position");
		spatialIndex.update(entity);
	}
}

function buildDebugParty() {
	function getItemByName(name: string): Entity | undefined {
		let all = getAvailableItems();
		return all.find(e => {
			let named = world.requireComponent(e, "named");
			return (named.name == name);
		});
	}

	let buildings = world.findEntities("building");

	let entities = [...rules.personQuery.entities];

	{
		let { person, actor } = world.requireComponents(entities[0], "person", "actor");
		person.relation = "party";
		person.building = [...buildings.keys()][0];

		actor.tasks = [{type:"attack", target:"guard"}, {type:"attack", target:"locomotive"}, {type:"attack", target:"wagon"}];

		person.items = [getItemByName("Sniper rifle")!];
	}

	{
		let { person, actor } = world.requireComponents(entities[1], "person", "actor");
		person.relation = "party";
		person.building = [...buildings.keys()][1];

		actor.tasks = [{type:"collect"}];

//		person.items = [getItemByName("Sniper rifle")!];
	}
}

async function trainArrival() {
	let entity = train.create(0);
	log.add("The train arrives!");

	let delay = (DEBUG ? 0 : 200);

	for (let i=0; i<11; i++) {
		train.move(entity);
		await sleep(delay);
	}
}

function processGameOverResult(result: GameOverResult) {
	switch (result) {
		case "restart": {
			let url = new URL(location.href);
			url.search = `seed=${seed.toString(16).toUpperCase()}`;
			location.href = url.href;
		} break;

		case "retry": {
			ui.startPlanning();
		} break;

		case "new": {
			let url = new URL(location.href);
			url.search = "";
			location.href = url.href;
		} break;

		case "github": {
			window.open("https://github.com/ondras/great-train-robbery", "_blank");
		} break;
	}
}

export async function startAction() {
	let worldState = world.toString();

	let partyEntities: Entity[] = [];
	let otherEntities: Entity[] = [];
	for (let entity of rules.personQuery.entities) {
		let person = world.requireComponent(entity, "person");
		(person.relation == "party" ? partyEntities : otherEntities).push(entity);
	}

	otherEntities.forEach(e => {
		let actor = world.requireComponent(e, "actor");
		actor.tasks = [{type:"wander"}];
	});

	random.seed(seed); // reset because the gameplay may change its state
	removePersons();
	ui.startAction();

	npcGenerator.placeRandomly(otherEntities);

	await trainArrival();
	await npcGenerator.placeIntoBuildings(partyEntities, DEBUG ? 0 : 700);

	keyboard.pushHandler(actionKeyboardHandler);
	await runAction();
	keyboard.popHandler();

	let gameOverResult = await gameOver();

	// cleanup: gold+dynamite, train parts
	world.findEntities("item", "position").forEach((_, entity) => {
		display.delete(entity);
	});
	world.findEntities("town").values().next().value!.town.track.forEach(({x, y}) => {
		display.deleteAt(x, y, 2);
	});

	world.fromString(worldState);
	spatialIndex.reset();

	processGameOverResult(gameOverResult);
}

const DEBUG = false;

export async function init(s: number) {
	seed = s;
	random.seed(seed);
	createTown(4, 4);

	await ui.init();
	keyboard.on();

	ui.startPlanning();


	if (DEBUG) {
		buildDebugParty();

		startAction();
	}
}
