import * as keyboard from "./keyboard.ts";


async function show(dialog: HTMLDialogElement): Promise<boolean> {
	let { promise, resolve } = Promise.withResolvers<boolean>();

	function close(result: boolean) {
		keyboard.popHandler();
		dialog.close();
		dialog.remove();
		resolve(result);
	}

	let keyboardHandler = {
		handleKey(e: KeyboardEvent) {
			if (e.key.toLowerCase() == "k" || e.key == "Enter") { close(true); }
			if (e.key.toLowerCase() == "x" || e.key == "Escape") { close(false); }
			return true;
		}
	}

	document.querySelector("#game")!.append(dialog); // fixme
	dialog.showModal();
	keyboard.pushHandler(keyboardHandler);

	return promise;
}


export async function alert(content: Node | string): Promise<boolean> {
	let dialog = document.createElement("dialog");
	dialog.classList.add("border-double");

	let footer = document.createElement("footer")

	let ok = document.createElement("span");
	ok.classList.add("button");
	ok.innerHTML = `O<kbd>K</kbd>`;

	footer.append(ok);
	dialog.append(content, footer);

	return show(dialog);
}

export async function confirm(content: Node | string): Promise<boolean> {
	let dialog = document.createElement("dialog");
	dialog.classList.add("border", "double", "inside");

	let footer = document.createElement("footer")

	let ok = document.createElement("span");
	ok.classList.add("button");
	ok.innerHTML = `O<kbd>K</kbd>`;

	let ko = document.createElement("span");
	ko.classList.add("button");
	ko.innerHTML = `E<kbd>x</kbd>it`;

	footer.append(ko, ok);
	dialog.append(content, footer);

	return show(dialog);
}

export async function gameOver(reason: string) {
	alert(reason);
}