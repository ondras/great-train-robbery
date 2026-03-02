import { world, Entity } from "../world.ts";
import { sleep } from "./util.ts";
import { attack } from "./task-attack.ts";
import { wander } from "./task-wander.ts";
import * as train from "./train.ts";


export interface TrainTask {
	type: "train";
}

interface WanderTask {
	type: "wander";
}

interface ATask {
	type: "a";
}

interface BTask {
	type: "b";
}

interface TestTask {
	type: "test";
	condition: "aaa";
}

export interface AttackTask {
	type: "attack";
	target: "sheriff" | "guard" | "locomotive" | "wagon" | "enemy";
}

export type Task = TrainTask | WanderTask | TestTask | ATask | BTask | AttackTask;

type Condition = string;



export async function runTask(task: Task, entity: Entity) {
	switch (task.type) {
		case "wander": return wander(entity);
		case "train": return train.move(entity);
		case "attack": return attack(entity, task);
	}
}

function pickTask(tasks: Task[], entity: Entity): Task | undefined {
	return tasks.find(task => {
		if ("condition" in task) { return isConditionFulfilled(task.condition, entity); }
		return true;
	});
}

export function run(entity: Entity) {
	let { tasks } = world.requireComponent(entity, "actor");

	let task = pickTask(tasks, entity);
	if (!task) { console.log("!!!", entity); return sleep(100); }

	return runTask(task, entity);
}

function isConditionFulfilled(condition: Condition, entity: Entity): boolean {
	return false;
}
