import { spatialIndex, world, Entity } from "../world.ts";
import display from "../display.ts";
import { sleep } from "./util.ts";
import * as train from "./train.ts";
import * as conf from "../conf.ts";
import * as util from "../util.ts";


interface TrainTask {
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

export type Task = TrainTask | WanderTask | TestTask | ATask | BTask;

type Condition = string;


async function wander(entity: Entity) {
	let { town } = world.findEntities("town").values().next().value!;

	let pos = world.requireComponent(entity, "position");
	let availableDirs = util.DIRS_8.filter(dir => {
		let x = pos.x + dir[0];
		let y = pos.y + dir[1];
		if (x < 0 || y < 0 || x >= town.width || y >= town.height) { return false; }

		let targetEntities = spatialIndex.list(x, y);
		return [...targetEntities].every(e => {
			let position = world.requireComponent(e, "position");
			return !position.blocks.movement;
		});
	});

	if (availableDirs.length == 0) { return; }
	let dir = availableDirs.random();
	pos.x += dir[0];
	pos.y += dir[1];
	spatialIndex.update(entity);
	await display.move(entity, pos.x, pos.y, conf.MOVE_DELAY);
}

export function runTask(task: Task, entity: Entity) {
	switch (task.type) {
		case "wander": return wander(entity);
		case "train": return train.move(entity);
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
