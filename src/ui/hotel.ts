import Pane from "./pane.ts";
import { world, Entity, Person, Visual } from "../world.ts";
import ItemTable from "./item-table.ts";
import { Task } from "../npc/tasks.ts";
import { confirm } from "./dialog.ts";
import { pickLocation } from "./dialog-location.ts";
import { pickTask } from "./dialog-task.ts";
import { fillPerson, template } from "./util.ts";


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

	protected async editLocation(activePerson: Entity) {
		let entity = await pickLocation(activePerson);
		if (entity) {
			let { person } = world.requireComponents(activePerson, "person");
			person.location = entity;
		}
		this.renderPerson(activePerson);
	}

	protected async editTask(activePerson: Entity, taskIndex?: number) {
		let { tasks } = world.requireComponents(activePerson, "actor").actor;
		let currentTask = (taskIndex != undefined) ? tasks[taskIndex] : undefined;

		let result = await pickTask(currentTask);
		if (!result) { return; }

		if (taskIndex != undefined) {
			tasks[taskIndex] = result;
		} else {
			tasks.push(result);
		}
		this.renderPerson(activePerson, taskIndex);
	}

	protected moveTask(activePerson: Entity, taskIndex: number, offset: number) {
		let { tasks } = world.requireComponents(activePerson, "actor").actor;

		let task = tasks[taskIndex];
		let newIndex = taskIndex + offset;

		tasks.splice(taskIndex, 1);
		tasks.splice(newIndex, 0, task);

		this.renderPerson(activePerson, newIndex);
	}

	protected async removeTask(activePerson: Entity, taskIndex: number) {
		let { tasks } = world.requireComponents(activePerson, "actor").actor;
		let task = tasks[taskIndex];

		let content = template(".confirm-remove-task", {task:task.type});
		let ok = await confirm(content);
		if (!ok) { return; }

		tasks.splice(taskIndex, 1);
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
		activeKeyHandlers.push({key:"l", cb: () => this.editLocation(activePerson)});

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

		if (taskIndex != undefined) {
			activeKeyHandlers.push(
				{key:"e", cb: () => this.editTask(activePerson, taskIndex)},
				{key:"r", cb: () => this.removeTask(activePerson, taskIndex)}
			);

			if (taskIndex > 0) {
				activeKeyHandlers.push({code:"ArrowUp", cb: () => this.moveTask(activePerson, taskIndex, -1)});
			}

			if (taskIndex < items.length - 1) {
				activeKeyHandlers.push({code:"ArrowDown", cb: () => this.moveTask(activePerson, taskIndex, 1)});
			}
		}

		node.append(taskTable.build(items));

		if (actor.tasks.length < 10) {
			let p = document.createElement("p");
			p.innerHTML = `<kbd>A</kbd>dd new task`;
			node.append(p);
			activeKeyHandlers.push({key:"a", cb: () => this.editTask(activePerson)});
		}

		this.activeKeyHandlers = activeKeyHandlers;
	}
}

function buildPersonRow(row: HTMLTableRowElement, item: PersonItem, isActive: boolean) {
	let { person, visual } = item;

	let ch = document.createElement("span");
	ch.textContent = visual.ch;
	if (visual.fg) { ch.style.color = visual.fg; }

	row.insertCell().append(ch, " ", person.name);
}

function buildTaskRow(row: HTMLTableRowElement, item: TaskItem, isActive: boolean, items: TaskItem[]) {
	row.insertCell().textContent = item.task.type;

	if (isActive) {
		row.insertCell().innerHTML = `<kbd>E</kbd>dit`;
		row.insertCell().innerHTML = `<kbd>R</kbd>emove`;
		let movements: string[] = [];
		if (items.indexOf(item) > 0) { movements.push(`<kbd>↑</kbd>`); }
		if (items.indexOf(item) < items.length - 1) { movements.push(`<kbd>↓</kbd>`); }
		if (movements.length > 0) {
			row.insertCell().innerHTML = `[${movements.join("")}]`;
		}
	}
}
