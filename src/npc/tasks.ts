import { spatialIndex, world, Entity } from "../world.ts";
import display from "../display.ts";
import * as util from "../util.ts";
import * as train from "./train.ts";


interface TrainTask {
	type: "train";
}

interface WanderTask {
	type: "wander";
}

interface TestTask {
	type: "test";
	condition: "aaa";
}

export type Task = TrainTask | WanderTask | TestTask;

type Condition = string;


async function wander(entity: Entity) {
	let pos = world.requireComponent(entity, "position");
	let availableDirs = util.DIRS_8.filter(dir => {
		let x = pos.x + dir[0];
		let y = pos.y + dir[1];
		if (x < 0 || y < 0) { return false; }

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
	await display.move(entity, pos.x, pos.y, 50);
}

export function runTask(task: Task, entity: Entity) {
	switch (task.type) {
		case "wander": return wander(entity);
		case "train": return moveTrain(entity);
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
	if (!task) { console.log("!!!", entity); return util.sleep(100); }

	return runTask(task, entity);
}

export async function moveTrain(entity: Entity) {
	let { path, wagons } = world.requireComponent(entity, "train");

	let promises: Promise<unknown>[] = [];

	wagons.forEach(wagon => {
		wagon.parts.forEach((entity, j) => {
			let { position, trainPart } = world.requireComponents(entity, "position", "trainPart");

			trainPart.pathIndex++;
			if (trainPart.pathIndex >= path.length) {
				display.delete(entity);
				world.removeEntity(entity);
				// FIXME remove from wagon/train
				return;
			}

			let {x, y, nextDirection} = path[trainPart.pathIndex];

			let visual = train.createWagonPartVisual(j, nextDirection!); // FIXME undefined
			display.draw(x, y, visual, {id: entity, zIndex:1});

			position.x = x;
			position.y = y;

			spatialIndex.update(entity);
//			let promise = display.move(entity, position.x, position.y);

//			promises.push(promise);
		});
	});

	return util.sleep(300);

//	return Promise.all(promises);
}

function isConditionFulfilled(condition: Condition, entity: Entity): boolean {
	return false;
}
