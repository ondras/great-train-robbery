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

export interface AttackTask {
	type: "attack";
	target: "sheriff" | "guard" | "locomotive" | "wagon" | "enemy";
}

export type Task = TrainTask | WanderTask | AttackTask | CollectTask;


export async function runTask(task: Task, entity: Entity): Promise<number> {
	switch (task.type) {
		case "wander": return wander(entity);
		case "train": return train.move(entity);
		case "attack": return attack(entity, task);
		case "collect": return collect(entity);
	}
}

export async function run(entity: Entity): Promise<number> {
	let { tasks, duration } = world.requireComponent(entity, "actor");

	for (let task of tasks) {
		let time = await runTask(task, entity);
		if (time) { return time; }
	}

	console.log("!!!", entity);
	await sleep(100);
	return duration;
}

export async function moveCloser(entity: Entity, target: Position): Promise<number> {
	let { position, actor } = world.requireComponents(entity, "position", "actor");

	let neighbors = getFreeNeighbors([position.x, position.y]);
	if (neighbors.length == 0) { return 0; }

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
	return actor.duration;
}
