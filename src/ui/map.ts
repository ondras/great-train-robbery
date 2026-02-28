import Pane from "./pane.ts";
import { scheduler } from "../world.ts";
import * as tasks from "../npc/tasks.ts";
import * as util from "../util.ts";


export default class Map extends Pane {
	protected ac?: AbortController;

	constructor() {
		super("map");
	}

	activate() {
		super.activate();

		let ac = new AbortController();
		this.ac = ac;

		run(ac.signal);
	}

	deactivate() {
		this.ac?.abort();
		this.ac = undefined

		super.deactivate();
	}
}

async function run(signal: AbortSignal) {
	while (!signal.aborted) {
		let entity = scheduler.next();
		if (!entity) { break; }
//		await tasks.run(entity);
		await tasks.runTask({type:"wander"}, entity);
	}
}
