import Pane from "./pane.ts";
import { world, Entity, Visual, Named } from "../world.ts";
import ItemTable from "./item-table.ts";
import { Task } from "../npc/tasks.ts";
import { confirm } from "./dialog.ts";
import { pickLocation, getBuildingName } from "./dialog-location.ts";
import { pickTask, getTaskLabel } from "./dialog-task.ts";
import { fillPerson, template } from "./util.ts";
import * as log from "./log.ts";


// FIXME vic logovani

interface PersonItem {
	id: number;
	visual: Visual;
	named: Named;
	building?: Entity;
	taskCount: number;
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
		log.clear();
		log.add("Welcome to the Hotel! This is the best place to decide on the robbery plan and set up starting locations for your party members.");
		log.newline();
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
			person.building = entity;
		}
		this.renderPerson(activePerson);
	}

	protected async addTask(activePerson: Entity) {
		let result = await pickTask();
		if (!result) { return; }

		let { tasks } = world.requireComponent(activePerson, "actor");
		tasks.push(result);
		this.renderPerson(activePerson);
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

		let label = getTaskLabel(task);
		let content = template(".confirm-remove-task", {task:label});
		let ok = await confirm(content);
		if (!ok) { return; }

		tasks.splice(taskIndex, 1);
		this.renderPerson(activePerson);
	}

	protected renderPersons() {
		let { node } = this;

		node.replaceChildren();

		let results = world.findEntities("person", "visual", "named", "actor");
		let entries = [...results.entries()].filter(entry => entry[1].person.relation == "party");
		let items = entries.map(entry => {
			return {
				id: entry[0],
				visual: entry[1].visual,
				named: entry[1].named,
				taskCount: entry[1].actor.tasks.length,
				building: entry[1].person.building
			}
		});

		if (items.length == 0) {
			node.append("You have not hired any people yet. Hire some in the Saloon and come back to plan the robbery.");
			return;
		}

		let options = { rowBuilder: buildPersonRow };
		let personTable = new ItemTable<PersonItem>(options);

		this.personTable = personTable;
		this.taskTable = undefined;
		this.activePerson = undefined;

		let p = document.createElement("p");
		p.textContent = "Select a party member to set their starting location and organize their tasks.";
		node.append(p, personTable.build(items));
	}

	protected renderPerson(activePerson: Entity, taskIndex?: number) {
		let { node } = this;

		node.replaceChildren();

		let activeKeyHandlers = [];

		let { person, visual, actor, named } = world.requireComponents(activePerson, "person", "visual", "actor", "named");

		let p1 = document.createElement("p");
		fillPerson(p1, named, visual);
		p1.append("'s plans:")
		node.append(p1);

		let location = (person.building ? getBuildingName(person.building) : "(unset)");

		let p2 = document.createElement("p");
		p2.innerHTML = `<kbd>L</kbd>ocation: ${location}`;
		node.append(p2);
		activeKeyHandlers.push({key:"l", cb: () => this.editLocation(activePerson)});

		let p3 = document.createElement("p");
		p3.innerHTML = `Tasks:`;
		node.append(p3);

		if (actor.tasks.length == 0) {
			p3.innerHTML += " (none)";
		}

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
				{key:"r", cb: () => this.removeTask(activePerson, taskIndex)}
			);

			if (taskIndex > 0) {
				activeKeyHandlers.push({code:"ArrowUp", cb: () => this.moveTask(activePerson, taskIndex, -1)});
			}

			if (taskIndex < items.length - 1) {
				activeKeyHandlers.push({code:"ArrowDown", cb: () => this.moveTask(activePerson, taskIndex, 1)});
			}
		}

		let menu = document.createElement("menu");

		if (actor.tasks.length < 10) {
			let item = document.createElement("li");
			item.innerHTML = `<kbd>A</kbd>dd new task`;
			menu.append(item);
			activeKeyHandlers.push({key:"a", cb: () => this.addTask(activePerson)});
		}

		let item = document.createElement("li");
		item.innerHTML = `<kbd>B</kbd>ack to your party`;
		menu.append(item);
		activeKeyHandlers.push({key:"b", cb: () => this.renderPersons()});

		node.append(taskTable.build(items), menu);


		this.activeKeyHandlers = activeKeyHandlers;
	}
}

function buildPersonRow(row: HTMLTableRowElement, item: PersonItem, isActive: boolean) {
	let { visual, named } = item;

	fillPerson(row.insertCell(), named, visual);

	let loc = (item.building ? getBuildingName(item.building) : "location not set")
	row.insertCell().textContent = `${item.taskCount} task(s), ${loc}`;
}

function buildTaskRow(row: HTMLTableRowElement, item: TaskItem, isActive: boolean, items: TaskItem[]) {
	row.insertCell().textContent = getTaskLabel(item.task);

	if (isActive) {
		row.insertCell().innerHTML = `<kbd>R</kbd>emove`;
		let movements: string[] = [];
		if (items.indexOf(item) > 0) { movements.push(`<kbd>↑</kbd>`); }
		if (items.indexOf(item) < items.length - 1) { movements.push(`<kbd>↓</kbd>`); }
		if (movements.length > 0) {
			row.insertCell().innerHTML = `[${movements.join("")}]`;
		}
	}
}
