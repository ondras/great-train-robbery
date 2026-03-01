import Pane from "./pane.ts";
import { Entity, scheduler, world } from "../world.ts";
import * as tasks from "../npc/tasks.ts";
import * as train from "../npc/train.ts";
import { gameOver } from "./dialog.ts";


export default class Map extends Pane {
	protected ac?: AbortController;

	constructor() {
		super("map");
	}

	activate(action = false) {
		super.activate();

		if (action) {
			runAction();
		} else {
			let ac = new AbortController();
			this.ac = ac;
			runDemo(ac.signal);
		}
	}

	deactivate() {
		this.ac?.abort();
		this.ac = undefined

		super.deactivate();
	}
}

async function runAction() {
	train.create();

	while (true) {
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

async function runDemo(signal: AbortSignal) {
	while (!signal.aborted) {
		let entity = scheduler.next();
		if (!entity) { break; }
		await tasks.runTask({type:"wander"}, entity);
	}
}

let personQuery = world.query("person");

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
