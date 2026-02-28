export abstract class KeyboardHandler {
	abstract handleKey(e: KeyboardEvent): boolean;
}

let handlerStack: KeyboardHandler[] = [];
let enabled = false;

export function pushHandler(handler: KeyboardHandler) {
	handlerStack.push(handler);
}

export function popHandler() {
	handlerStack.pop();
}

function handleEvent(e: KeyboardEvent) {
	let index = handlerStack.length;
	while (index --> 0) {
		let handled = handlerStack[index].handleKey(e);
		if (handled) { return; }
	}
}

export function on() { enabled = true; }
export function off() { enabled = false; }

window.addEventListener("keydown", e => {
	if (!enabled) { return; }
	handleEvent(e);
});
