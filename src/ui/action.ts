import Pane from "./pane.ts";
import { confirm } from "./dialog.ts";
import * as ui from "./ui.ts";
import * as util from "../util.ts";


export default class Action extends Pane {
	protected ready = false;

	constructor() {
		super("action");
	}

	activate() {
		super.activate();

		// FIXME preflight check
		this.ready = true;


	}

	handleKey(e: KeyboardEvent) {
		if (!this.ready) { return false; }

		switch (e.key.toLowerCase()) {
			case "g":
				this.tryStart();
				return true;
			break;
		}

		return false;
	}

	protected async tryStart() {
		let content = util.template(".confirm-action");
		let ok = await confirm(content);
		if (!ok) { return; }

		ui.activate("map-action");
	}
}
