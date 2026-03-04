import ItemTable from "./item-table.ts";
import { createDialog, show } from "./dialog.ts";
import { Task } from "../npc/tasks.ts";


const taskGroups = {
	"attack": "Attacking",
	"movement": "Movement",
	"other": "Other"
}

interface AllowedTask {
	task: Task;
	label: string;
	group: keyof typeof taskGroups;
}

const allowedTasks: AllowedTask[] = [
	{task: {type:"attack", target:"locomotive"}, label: "Attack the locomotive", group: "attack"} ,
	{task: {type:"attack", target:"wagon"}, label: "Attack wagons with gold", group: "attack"},
	{task: {type:"attack", target:"guard"}, label: "Attack train guards", group: "attack"},
	{task: {type:"wander"}, label: "Wander around cluelessly", group: "movement"},
	{task: {type:"escape"}, label: "Escape once there is nothing to collect", group: "movement"},
	{task: {type:"collect"}, label: "Collect gold looted from the train", group: "other"}
];

/** FIXME
 * Place dynamite
 * Heal self
 * Heal others
 * Smoke a cigar
 */

function objectsEqual(a: any, b: any): boolean {
	let keys = new Set<string>();
	Object.keys(a).forEach(k => keys.add(k));
	Object.keys(b).forEach(k => keys.add(k));

	for (let key of keys) {
		if (a[key] != b[key]) { return false; }
	}

	return true;
}

export function getTaskLabel(task: Task): string {
	let found = allowedTasks.find(t => objectsEqual(t.task, task));
	return (found ? found.label : "(unknown task)");
}

interface TaskItem {
	id: number;
	task: AllowedTask;
}

async function pickTaskInGroup(dialog: HTMLDialogElement, groupIndex: number): Promise<Task | false | "back"> {
	let options = { rowBuilder: buildTaskRow };
	let taskTable = new ItemTable<TaskItem>(options);

	let groupId = Object.keys(taskGroups)[groupIndex] as keyof typeof taskGroups;
	let groupTasks = allowedTasks.filter(task => task.group == groupId);
	let items = groupTasks.map((task, id) => ({ id, task }));

	function handleKey(e: KeyboardEvent) {
		let id = taskTable.keyToId(e);
		if (id != undefined) { return id; }

		if (e.key == "Escape") { return false; }
		if (e.key.toLowerCase() == "b") { return "back" as const; }
	}

	let p = document.createElement("p");
	p.innerHTML = `Chosen task group: ${taskGroups[groupId]}`;

	let menu = document.createElement("menu");
	menu.innerHTML = "<li><kbd>B</kbd>ack</li><li>[<kbd>Esc</kbd>] to cancel</li>";

	dialog.replaceChildren(p, taskTable.build(items), menu);

	let taskIndex = await show(dialog, handleKey);

	if (taskIndex === false) { return false; }
	if (taskIndex == "back") { return "back"; }

	return groupTasks[taskIndex].task;
}

function buildTaskRow(row: HTMLTableRowElement, item: TaskItem) {
	row.insertCell().textContent = item.task.label;
}

interface GroupItem {
	id: number;
	label: string;
}

async function pickGroup(dialog: HTMLDialogElement): Promise<number | false> {
	let options = { rowBuilder: buildGroupRow };
	let groupTable = new ItemTable<GroupItem>(options);

	let items = Object.values(taskGroups).map((label, id) => ({ id, label }));

	function handleKey(e: KeyboardEvent) {
		let id = groupTable.keyToId(e);
		if (id != undefined) { return id; }

		if (e.key == "Escape") { return false; }
	}

	let p = document.createElement("p");
	p.innerHTML = "To pick a task, first choose a group:";

	let menu = document.createElement("menu");
	menu.innerHTML = "<li>[<kbd>Esc</kbd>] to cancel</li>";

	dialog.replaceChildren(p, groupTable.build(items), menu);

	return show(dialog, handleKey);
}

function buildGroupRow(row: HTMLTableRowElement, item: GroupItem) {
	row.insertCell().textContent = item.label;
}

export async function pickTask(): Promise<Task | false> {
	let dialog = createDialog();

	while (true) {
		let groupIndex = await pickGroup(dialog);
		if (groupIndex === false) { return false; }

		let task = await pickTaskInGroup(dialog, groupIndex);
		if (task === false) { return false; }

		if (task == "back") { continue; }

		return task;
	}
}


