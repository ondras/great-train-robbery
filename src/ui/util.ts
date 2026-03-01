import { Person, Visual } from "../world.ts";


export function fillPerson(parent: Element, person: Person, visual: Visual) {
	let ch = document.createElement("span");
	ch.textContent = visual.ch;
	if (visual.fg) { ch.style.color = visual.fg; }
	parent.append(ch, " ", person.name);
}
