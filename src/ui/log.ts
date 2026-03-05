import { Entity, world } from "../world.ts";


const node = document.querySelector("#log")!;


let lastParagraphNode: HTMLElement | null = null;
let lastMessageNode: HTMLElement | null = null;
let lastMessage = "";
let lastMessageCount = 0;

export function newline() {
	lastParagraphNode = null;
	lastMessageNode = null;
	lastMessage = "";
	lastMessageCount = 0;
}

export function add(message: string) {
	if (!lastParagraphNode) {
		lastParagraphNode = document.createElement("p");
		node.append(lastParagraphNode);
	}

	if (message == lastMessage) {
		lastMessageCount++;
		lastMessageNode!.innerHTML = `${message}(x${lastMessageCount})`;
	} else {
		lastMessage = message;
		lastMessageCount = 1;
		lastMessageNode = document.createElement("span");
		lastMessageNode.innerHTML = message;
		lastParagraphNode.append(lastMessageNode, " ");
	}

	node.scrollTop = node.scrollHeight;
}

export function clear() {
	node.replaceChildren();
	newline();
}

function extractName(entity: Entity, type: string) {
	let named = world.getComponent(entity, "named");
	if (!named) { return `entity ${entity}`; }

	let { name } = named;
	if (name.charAt(0) == name.charAt(0).toUpperCase()) { return `<i>${name}</i>`; } // given name

	if (named.unique) { return `the ${name}`; }

	switch (type.toLowerCase()) {
		case "a": return `a ${name}`;
		case "the": return `the ${name}`;
		default: return name;
	}
}

function s(e: Entity, type: string) {
	let name = extractName(e, type);

	if (type.charAt(0) == type.charAt(0).toUpperCase()) {
		name = name.charAt(0).toUpperCase() + name.slice(1);
	}

	return name;
}

export function format(message: string, ...entities: Entity[]) {
	entities = entities.slice();
	return message.replace(/%(\w+)/g, (_, type) => s(entities.shift()!, type));
}
