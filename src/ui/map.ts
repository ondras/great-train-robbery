import Pane from "./pane.ts";
import { scheduler } from "../world.ts";
import * as tasks from "../npc/tasks.ts";
import * as log from "./log.ts";


export default class Map extends Pane {
	protected ac?: AbortController;

	constructor() {
		super("map");
	}

	runDemo() {
		let ac = new AbortController();
		this.ac = ac;

		runDemo(ac.signal);
	}

	activate() {
		super.activate();
		log.clear();
		log.add("Welcome! As you can see, the townsfolk are busy running their daily errands. Feel free to look around.");
		log.newline();
	}

	deactivate() {
		this.ac?.abort();
		this.ac = undefined;

		super.deactivate();
	}
}

async function runDemo(signal: AbortSignal) {
	while (!signal.aborted) {
		let entity = scheduler.next();
		if (!entity) { break; }
		let time = await tasks.runTask({type:"wander"}, entity);
		scheduler.commit(entity, time);
	}
}
