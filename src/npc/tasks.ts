import { world, spatialIndex, Entity } from "../world.ts";
import { sleep, Position, dist4, getFreeNeighbors } from "./util.ts";
import { attack } from "./task-attack.ts";
import { wander } from "./task-wander.ts";
import { collect } from "./task-collect.ts";
import display from "../display.ts";
import * as train from "./train.ts";
import * as conf from "../conf.ts";


export interface CollectTask {
	type: "collect";
}

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

export type Task = TrainTask | WanderTask | TestTask | ATask | BTask | AttackTask | CollectTask;

type Condition = string;



export async function runTask(task: Task, entity: Entity) {
	// FIXME kdyz to nedopadne, je treba zkouset dalsi
	switch (task.type) {
		case "wander": return wander(entity);
		case "train": return train.move(entity);
		case "attack": return attack(entity, task);
		case "collect": return collect(entity);
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

export async function moveCloser(entity: Entity, target: Position): Promise<boolean> {
	let { position } = world.requireComponents(entity, "position");
	let neighbors = getFreeNeighbors([position.x, position.y]);
	if (neighbors.length == 0) { return false; }

	function CMP_DIST(a: Position, b: Position) {
		let da = dist4(a, target);
		let db = dist4(b, target);
		return da - db;
	}
	neighbors.sort(CMP_DIST);
	let neighbor = neighbors[0];

	position.x = neighbor[0];
	position.y = neighbor[1];
	spatialIndex.update(entity);
	display.move(entity, position.x, position.y, 0);

	await sleep(conf.MOVE_DELAY);
	return true;
}
