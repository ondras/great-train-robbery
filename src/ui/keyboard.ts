type KeyboardHandlerFunction = (e: KeyboardEvent) => boolean;

interface KeyboardHandlerObject {
	handleKey: KeyboardHandlerFunction;
}

type KeyboardHandler = KeyboardHandlerFunction | KeyboardHandlerObject;

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
		let handler = handlerStack[index];
		let handled = (typeof(handler) == "function" ? handler(e) : handler.handleKey(e));
		if (handled) { return; }
	}
}

export function on() { enabled = true; }
export function off() { enabled = false; }

window.addEventListener("keydown", e => {
	if (!enabled) { return; }
	handleEvent(e);
});
