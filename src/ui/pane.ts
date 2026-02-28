import * as keyboard from "./keyboard.ts";


export default class Pane extends keyboard.KeyboardHandler {
	node: HTMLElement;

	constructor(id: string) {
		super();
		this.node = document.querySelector<HTMLElement>(`#${id}`)!;
		this.node.hidden = true;
	}

	handleKey(e: KeyboardEvent): boolean {
		return false;
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
