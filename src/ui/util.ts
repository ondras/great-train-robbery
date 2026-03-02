import { Person, Visual } from "../world.ts";


export function fillPerson(parent: Element, person: Person, visual: Visual) {
	let ch = document.createElement("span");
	ch.textContent = visual.ch;
	if (visual.fg) { ch.style.color = visual.fg; }
	parent.append(ch, " ", person.name);
}

export function template(selector: string, values: Record<string, string> = {}) {
	let d = document.querySelector<HTMLTemplateElement>(selector)!;

	let frag = d.content.cloneNode(true) as DocumentFragment;
	Object.entries(values).forEach(([key, value]) => {
		frag.querySelector(`.${key}`)!.textContent = value;
	});

	return frag;
}
