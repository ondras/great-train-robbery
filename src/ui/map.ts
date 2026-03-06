import Pane from "./pane.ts";
import { scheduler } from "../world.ts";
import * as tasks from "../npc/tasks.ts";
import * as rules from "../rules.ts";
import * as log from "./log.ts";
import { placeRandomly } from "../npc/generator.ts";


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
		log.add("You can learn more about playing this game by pressing the [<kbd>?</kbd>] key.");
		log.newline();
	}

	deactivate() {
		this.ac?.abort();
		this.ac = undefined;

		super.deactivate();
	}
}

async function runDemo(signal: AbortSignal) {
	placeRandomly([...rules.personQuery.entities]);

	while (!signal.aborted) {
		let entity = scheduler.next();
		if (!entity) { break; }
		await tasks.runTask({type:"wander"}, entity);
		scheduler.commit(entity, rules.baseTaskDuration);
	}
}
