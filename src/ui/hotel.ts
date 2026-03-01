import Pane from "./pane.ts";
import { world, Entity, Person, Visual } from "../world.ts";
import ItemTable from "./item-table.ts";
import { Task } from "../npc/tasks.ts";
import { pickLocation } from "./dialog.ts";
import { fillPerson } from "./util.ts";


interface PersonItem {
	id: number;
	person: Person;
	visual: Visual;
}

interface TaskItem {
	id: number;
	task: Task;
}

export default class Hotel extends Pane {
	/**
	 * Initial state: yes personTable,  no (taskTable + activePerson)
	 * Picked person:  no personTable, yes (taskTable + activePerson)
	 */

	protected personTable?: ItemTable<PersonItem>;
	protected taskTable?: ItemTable<TaskItem>;
	protected activePerson?: Entity;

	constructor() {
		super("hotel");
	}

	activate() {
		super.activate();
		this.renderPersons();
	}

	handleKey(e: KeyboardEvent): boolean {
		const { personTable, taskTable } = this;

		if (taskTable) {
			let taskIndex = taskTable.keyToId(e);
			if (taskIndex != undefined) {
				this.renderPerson(this.activePerson!, taskIndex);
				return true;
			}
		}

		if (personTable) {
			let entity = personTable.keyToId(e);
			if (entity) {
				this.activePerson = entity;
				this.renderPerson(entity);
				return true;
			}
		}

		return super.handleKey(e);
	}

	protected async tryLocation(activePerson: Entity) {
		let entity = await pickLocation(activePerson);
		if (entity) {
			let { person } = world.requireComponents(activePerson, "person");
			person.location = entity;
		}
		this.renderPerson(activePerson);
	}

	protected renderPersons() {
		let { node } = this;

		node.replaceChildren();

		let results = world.findEntities("person", "visual");
		let entries = [...results.entries()].filter(entry => entry[1].person.active);
		let items = entries.map(entry => {
			return {
				id: entry[0],
				person: entry[1].person,
				visual: entry[1].visual
			}
		});

		if (items.length == 0) {
			node.append("No active members. Hire some in the saloon!");
			return;
		}

		let options = { rowBuilder: buildPersonRow };
		let personTable = new ItemTable<PersonItem>(options);

		this.personTable = personTable;
		this.taskTable = undefined;
		this.activePerson = undefined;

		node.append(personTable.build(items));
	}

	protected renderPerson(activePerson: Entity, taskIndex?: number) {
		let { node } = this;

		node.replaceChildren();

		let activeKeyHandlers = [];

		let { person, visual, actor } = world.requireComponents(activePerson, "person", "visual", "actor");

		let p1 = document.createElement("p");
		fillPerson(p1, person, visual);
		p1.innerHTML += ` [<kbd>Esc</kbd>] back to your party`;
		node.append(p1);
		activeKeyHandlers.push({key:"escape", cb: () => this.renderPersons()});

		let location = "(unset)";
		if (person.location) {
			let building = world.requireComponent(person.location, "building");
			location = building.type;
		}

		let p2 = document.createElement("p");
		p2.innerHTML = `<kbd>L</kbd>ocation: ${location}`;
		node.append(p2);
		activeKeyHandlers.push({key:"l", cb: () => this.tryLocation(activePerson)});

		this.activeKeyHandlers = activeKeyHandlers;

		let p3 = document.createElement("p");
		p3.innerHTML = `Tasks:`;
		node.append(p3);

		let options = { rowBuilder: buildTaskRow, activeId: taskIndex };
		let taskTable = new ItemTable<TaskItem>(options);
		this.taskTable = taskTable;
		this.personTable = undefined;

		let items = actor.tasks.map((task, index) => {
			return {
				id: index,
				task
			}
		});

		node.append(taskTable.build(items));
	}
}

function buildPersonRow(row: HTMLTableRowElement, item: PersonItem, isActive: boolean) {
	let { person, visual } = item;

	let ch = document.createElement("span");
	ch.textContent = visual.ch;
	if (visual.fg) { ch.style.color = visual.fg; }

	row.insertCell().append(ch, " ", person.name);
}

function buildTaskRow(row: HTMLTableRowElement, item: TaskItem, isActive: boolean) {
	row.insertCell().textContent = item.task.type;
}
