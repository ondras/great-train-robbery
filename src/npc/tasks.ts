import { world, spatialIndex, Entity } from "../world.ts";
import { sleep, Position, dist4, getFreeNeighbors } from "./util.ts";
import { attack } from "./task-attack.ts";
import { wander, move } from "./task-move.ts";
import { collect } from "./task-collect.ts";
import { escape } from "./task-escape.ts";
import display from "../display.ts";
import * as train from "./train.ts";
import * as conf from "../conf.ts";


export interface CollectTask {
	type: "collect";
}

export interface TrainTask {
	type: "train";
}

export interface EscapeTask {
	type: "escape";
}

interface WanderTask {
	type: "wander";
}

export interface AttackTask {
	type: "attack";
	target: "guard" | "locomotive" | "wagon" | "party";
}

export interface MoveTask {
	type: "move";
	target: "center" | "locomotive";
}

export type Task = TrainTask | WanderTask | AttackTask | CollectTask | EscapeTask | MoveTask;

export async function runTask(task: Task, entity: Entity): Promise<number> {
	switch (task.type) {
		case "wander": return wander(entity);
		case "train": return train.move(entity);
		case "attack": return attack(entity, task);
		case "collect": return collect(entity);
		case "escape": return escape(entity);
		case "move": return move(entity, task);
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

async function moveTowardsDistance(entity: Entity, target: Position, idealDistance: number): Promise<number> {
	let { town } = world.findEntities("town").values().next().value!;

	let { position, actor } = world.requireComponents(entity, "position", "actor");

	let forceInsideTown = false;
	let neighbors = getFreeNeighbors([position.x, position.y], forceInsideTown);
	if (neighbors.length == 0) { return 0; }

	function CMP_DIST(a: Position, b: Position) {
		let aToTarget = dist4(a, target);
		let bToTarget = dist4(b, target);
		let aToIdeal = Math.abs(aToTarget - idealDistance);
		let bToIdeal = Math.abs(bToTarget - idealDistance);
		return aToIdeal - bToIdeal;
	}
	neighbors.sort(CMP_DIST);
	let neighbor = neighbors[0];

	// moved outside: remove the position + actor components
	if (neighbor[0] < 0 || neighbor[1] < 0 || neighbor[0] >= town.width || neighbor[1] >= town.height) {
		world.removeComponents(entity, "position", "actor");
		spatialIndex.update(entity);
		display.delete(entity);
	} else {
		position.x = neighbor[0];
		position.y = neighbor[1];
		spatialIndex.update(entity);
		display.move(entity, position.x, position.y, 0);
	}

	await sleep(conf.MOVE_DELAY);
	return actor.duration;
}

export async function moveCloser(entity: Entity, target: Position): Promise<number> {
	return moveTowardsDistance(entity, target, 0);
}

export async function moveFurther(entity: Entity, target: Position): Promise<number> {
	return moveTowardsDistance(entity, target, 1000);
}
