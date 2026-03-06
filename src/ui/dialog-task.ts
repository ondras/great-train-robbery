import ItemTable from "./item-table.ts";
import { createDialog, show } from "./dialog.ts";
import { Task } from "../npc/tasks.ts";


interface AllowedTask {
	task: Task;
	label: string;
}

const allowedTasks: AllowedTask[] = [
	{task: {type:"attack", target:"locomotive"}, label: "Attack the locomotive"} ,
	{task: {type:"attack", target:"wagon"}, label: "Attack wagons with gold"},
	{task: {type:"attack", target:"guard"}, label: "Attack train guards"},

	{task: {type:"escape", withGold: true}, label: "Escape once there is nothing to collect"},
	{task: {type:"move", target:"center"}, label: "Move towards the town center"},
	{task: {type:"move", target:"locomotive"}, label: "Move towards the locomotive"},

	{task: {type:"collect"}, label: "Collect gold looted from the train"},
	{task: {type:"dynamite"}, label: "Place a dynamite on a railroad track"},
];

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

function buildTaskRow(row: HTMLTableRowElement, item: TaskItem) {
	row.insertCell().textContent = item.task.label;
}

export async function pickTask(): Promise<Task | false> {
	let dialog = createDialog();

	let options = { rowBuilder: buildTaskRow };
	let taskTable = new ItemTable<TaskItem>(options);

	let items = allowedTasks.map((task, id) => ({ id, task }));

	function handleKey(e: KeyboardEvent) {
		let id = taskTable.keyToId(e);
		if (id != undefined) { return id; }

		if (e.key == "Escape") { return false; }
	}

	let p = document.createElement("p");
	p.innerHTML = `Pick a task:`;

	let menu = document.createElement("menu");
	menu.innerHTML = "<li>[<kbd>Esc</kbd>] to cancel</li>";

	dialog.replaceChildren(p, taskTable.build(items), menu);

	let taskIndex = await show(dialog, handleKey);
	if (taskIndex === false) { return false; }
	return allowedTasks[taskIndex].task;
}
