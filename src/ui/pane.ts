import * as keyboard from "./keyboard.ts";
import { confirm } from "./dialog.ts";
import { Entity, world } from "../world.ts";


type PersonBuilder = (row: HTMLTableRowElement, entity: Entity) => void;


export default class Pane extends keyboard.KeyboardHandler {
	protected node: HTMLElement;
	protected activePerson?: Entity;
	protected numberToPerson = new Map<number, Entity>();
	protected personTable = document.createElement("table");

	constructor(id: string) {
		super();
		this.node = document.querySelector<HTMLElement>(`#${id}`)!;
		this.node.hidden = true;

		this.personTable.classList.add("persons");
	}

	handleKey(e: KeyboardEvent): boolean {
		return false;
	}

	activate() {
		this.node.hidden = false;
		this.activePerson = undefined;
		keyboard.pushHandler(this);
	}

	deactivate() {
		keyboard.popHandler();
		this.node.hidden = true;
	}

	protected keyToEntity(e: KeyboardEvent): Entity | undefined {
		const { numberToPerson } = this;

		let r = e.code.match(/^(Digit|Numpad)(\d)$/);
		if (r) {
			let num = Number(r[2]);
			let entity = numberToPerson.get(num);
			if (entity) { return entity; }
		}
	}

	protected renderPersons(entities: Entity[], builder: PersonBuilder) {
		const { activePerson, numberToPerson, personTable } = this;

		numberToPerson.clear();
		personTable.replaceChildren();

		entities.forEach((entity, index) => {
			let number = (index + 1) % 10;
			numberToPerson.set(number, entity);

			let row = personTable.insertRow();

			this.buildPerson(row, entity, number);
			row.classList.toggle("active", entity == activePerson);

			builder(row, entity);

			return row;
		});
	}

	protected buildPerson(row: HTMLTableRowElement, entity: Entity, num: number) {
		let { person, visual } = world.requireComponents(entity, "person", "visual");

		let number = document.createElement("kbd");
		number.classList.add("number");
		number.textContent = String(num);
		row.insertCell().append(number);

		let ch = row.insertCell();
		ch.textContent = visual.ch;
		if (visual.fg) { ch.style.color = visual.fg; }

		let name = row.insertCell();
		name.classList.add("name");
		name.textContent = person.name;
	}

	protected template(selector: string, values: Record<string, string> = {}) {
		let d = this.node.querySelector<HTMLTemplateElement>(selector)!;

		let frag = d.content.cloneNode(true) as DocumentFragment;
		Object.entries(values).forEach(([key, value]) => {
			frag.querySelector(`.${key}`)!.textContent = value;
		});

		return frag;
	}
}
