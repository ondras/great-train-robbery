import * as keyboard from "./keyboard.ts";


export function createDialog() {
	let dialog = document.createElement("dialog");
	dialog.classList.add("border", "double", "inside");
	return dialog;
}

export async function show<T>(dialog: HTMLDialogElement, handleKey: (e: KeyboardEvent) => T | undefined): Promise<T> {
	let { promise, resolve } = Promise.withResolvers<T>();

	function close(result: T) {
		keyboard.popHandler();
		dialog.close();
		dialog.remove();
		resolve(result);
	}

	function handle(e: KeyboardEvent) {
		let result = handleKey(e);
		if (result != undefined) { close(result); }
		return true;
	}

	document.querySelector("#game")!.append(dialog); // fixme
	dialog.showModal();
	keyboard.pushHandler(handle);

	return promise;
}


export async function confirm(content: Node | string): Promise<boolean> {
	let dialog = createDialog();

	let menu = document.createElement("menu")

	let ok = document.createElement("li");
	ok.innerHTML = `Yes [<kbd>Enter</kbd>]`;

	let ko = document.createElement("li");
	ko.innerHTML = `[<kbd>Esc</kbd>] No`;

	menu.append(ko, ok);
	dialog.append(content, menu);

	function handleKey(e: KeyboardEvent) {
		if (e.key == "Enter") { return true; }
		if (e.key == "Escape") { return false; }
	}
	return show(dialog, handleKey);
}

export async function alert(message: string): Promise<unknown> {
	let dialog = createDialog();

	let menu = document.createElement("menu")

	let ok = document.createElement("li");
	ok.innerHTML = `[<kbd>Enter</kbd>] Ok`;

	menu.append(ok);
	dialog.append(message, menu);

	function handleKey(e: KeyboardEvent) {
		if (e.key == "Enter") { return true; }
	}
	return show(dialog, handleKey);
}
