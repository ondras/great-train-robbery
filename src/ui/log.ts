import { Entity, world } from "../world.ts";


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

export function format(message: string, ...entities: Entity[]) {
	function s(e: Entity) {
		let named = world.getComponent(e, "named");
		return (named ? named.name : `Entity ${e}`);
	}

	entities = entities.slice();

	return message.replace(/%s/g, _ => s(entities.shift()!));
}
