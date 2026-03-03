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


export async function alert(content: Node | string): Promise<true> {
	let dialog = createDialog();
	let footer = document.createElement("footer")

	let ok = document.createElement("span");
	ok.classList.add("button");
	ok.innerHTML = `OK`;

	function handleKey(e: KeyboardEvent) {
		if (e.key == "Enter") { return true; }
	}

	footer.append(ok);
	dialog.append(content, footer);

	return show(dialog, handleKey);
}

export async function confirm(content: Node | string): Promise<boolean> {
	let dialog = createDialog();

	let footer = document.createElement("footer")

	let ok = document.createElement("span");
	ok.classList.add("button");
	ok.innerHTML = `Yes [<kbd>Enter</kbd>]`;

	let ko = document.createElement("span");
	ko.classList.add("button");
	ko.innerHTML = `[<kbd>Esc</kbd>] No`;

	footer.append(ko, ok);
	dialog.append(content, footer);

	function handleKey(e: KeyboardEvent) {
		if (e.key == "Enter") { return true; }
		if (e.key == "Escape") { return false; }
	}
	return show(dialog, handleKey);
}

export async function gameOver() {
	let content = document.createDocumentFragment();

	let strong = document.createElement("strong");
	strong.textContent = "💀 GAME OVER";
	content.append(strong);
	alert(content);
}

