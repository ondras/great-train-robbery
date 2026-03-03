const node = document.querySelector("#log")!;


let lastParagraph: HTMLElement | null = null;

export function newline() {
	lastParagraph = null;
}

export function add(message: string) {
	if (!lastParagraph) {
		lastParagraph = document.createElement("p");
		node.append(lastParagraph);
	}
	lastParagraph.textContent += message + " ";
	node.scrollTop = node.scrollHeight;
}

export function clear() {
	node.textContent = "";
	newline();
}
