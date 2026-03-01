import * as keyboard from "./keyboard.ts";


interface KeyHandler {
	cb: Function;
	key?: string;
	code?: string;
}

export default class Pane extends keyboard.KeyboardHandler {
	protected node: HTMLElement;
	protected activeKeyHandlers: KeyHandler[] = [];

	constructor(id: string) {
		super();
		this.node = document.querySelector<HTMLElement>(`#${id}`)!;
		this.node.hidden = true;
	}

	handleKey(e: KeyboardEvent): boolean {
		let handler = this.activeKeyHandlers.find(h => {
			if (h.key && h.key.toLowerCase() == e.key.toLowerCase()) { return true; }
			if (h.code && h.code == e.code) { return true; }
			return false;
		});

		if (!handler) { return false; }

		handler.cb(e);
		return true;
	}

	activate() {
		this.node.hidden = false;
		keyboard.pushHandler(this);
	}

	deactivate() {
		keyboard.popHandler();
		this.node.hidden = true;
	}
}

