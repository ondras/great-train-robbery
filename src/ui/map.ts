import Pane from "./pane.ts";


export default class Map extends Pane {
	protected ac?: AbortController;

	constructor() {
		super("map");
	}

	activate() {
		super.activate();

		let ac = new AbortController();
		this.ac = ac;
	}

	deactivate() {
		this.ac?.abort();
		this.ac = undefined

		super.deactivate();
	}
}

async function run() {
	while (true) {
		let entity = scheduler.next();
		if (!entity) { break; }

		switch (world.requireComponent(entity, "actor").type) {
			case "npc": {
				await npcGenerator.moveRandomly(entity);
				break;
			}
			case "train": {
				await train.move(entity);
			}
		}
	}
}
