import { spatialIndex, world, Entity, Train, Wagon, Town, Visual } from "../world.ts";
import display from "../display.ts";
import * as conf from "../conf.ts";
import { sleep, Position, getFreeNeighbors } from "./util.ts";
import { Task } from "./tasks.ts";
import * as rules from "../rules.ts";
import * as log from "../ui/log.ts";
import { damagePosition } from "./damage.ts";


const WAGONS = 3;
const WAGON_LENGTH = 3;
const WAGON = ["┇oo", "┅oo", "┇oo", "┅oo"];
const LOCOMOTIVE = [["🠉", "◼", "T"], ["🠊", "◼", "T"], ["🠋", "◼", "T"], ["🠈", "◼", "T"]];
const GUARD_VISUAL = {ch: "@", fg: "#666", zIndex: 2};
const GOLD_VISUAL = {ch: "$", fg: "gold", zIndex: 1};


export function color(hpFraction: number) {
	let hue = 0;
	let saturation = 80;
	let lightness = (1-hpFraction) * 40;
	return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function create(trackOffset: number) {
	let actor = {
		wait: 0,
		tasks: [{type:"train"}] as Task[],
		duration: rules.trainTaskDuration
	};
	let train = world.createEntity({ actor });

	let wagons: Entity[] = [];

	for (let i=0;i<WAGONS+1;i++) {
		let parts: Entity[] = [];
		let locomotive = (i==0);
		let hp = (locomotive ? rules.locomotiveHp : rules.wagonHp);
		let wagon: Wagon = { train, parts, hp, locomotive };
		let wagonEntity = world.createEntity({ wagon });
		wagons.push(wagonEntity);
		let named = { name: (i==0 ? "locomotive" : "train"), unique:true };

		for (let j=0;j<WAGON_LENGTH;j++) {
			let trainPart = { wagon: wagonEntity };
			let blocks = {projectile: true, movement: true};
			let part: string | undefined = "train";
			if (i > 0 && j == 0) { part = undefined; } // no bold for connectors
			let visual = { ch:"", fg:color(1), part, zIndex: 2 } as Visual;
			let trainPartEntity = world.createEntity({ trainPart, blocks, visual, named });
			parts.push(trainPartEntity);
		}
	}

	let trainComponent = { wagons, trackOffset };
	world.addComponent(train, "train", trainComponent);

	updateTrainPositions(trainComponent);
}

function updateTrainPartPosition(partEntity: Entity, index: number, town: Town, wagonIndex: number, partIndex: number) {
	let position = world.getComponent(partEntity, "position");
	if (index < 0 || index >= town.track.length) { // not visible
		if (position) { // remove
			world.removeComponents(partEntity, "position");
			spatialIndex.update(partEntity);
			display.delete(partEntity);
		}
		return;
	}

	let {x, y, nextDirection} = town.track[index];
	if (position) { // update
		position.x = x;
		position.y = y;
	} else { // create
		world.addComponent(partEntity, "position", {x, y});
	}

	let visual = world.requireComponent(partEntity, "visual");
	updateTrainPartVisual(visual, wagonIndex, partIndex, nextDirection!); // FIXME undefined
	display.draw(x, y, visual, {id: partEntity, zIndex:visual.zIndex, part:visual.part});
	spatialIndex.update(partEntity);
}

function updateTrainPositions(train: Train) {
	const { town } = world.findEntities("town").values().next().value!;

	let index = train.trackOffset;
	train.wagons.forEach((wagonEntity, i) => {
		let { parts } = world.requireComponent(wagonEntity, "wagon");
		parts.forEach((partEntity, j) => {
			updateTrainPartPosition(partEntity, index, town, i, j);
			index--;
		});
	});
}

function updateTrainPartVisual(visual: Visual, wagonIndex: number, partIndex: number, nextDirection: number) {
	let templates = (wagonIndex == 0 ? LOCOMOTIVE : WAGON);
	visual.ch = templates[nextDirection][partIndex];
}

export async function move(entity: Entity) {
	let { train, actor } = world.requireComponents(entity, "train", "actor");
	train.trackOffset++;

	const { town } = world.findEntities("town").values().next().value!;
	if (train.trackOffset < town.track.length) {
		let {x, y} = town.track[train.trackOffset];
		let damage = { amount: 10, explosionRadius: 0 };
		damagePosition([x, y], damage);
	}

	updateTrainPositions(train);
	await sleep(conf.MOVE_DELAY);
	return actor.duration;
}

export function getAllPositions(isLocomotive: boolean): Position[] {
	let results = world.findEntities("trainPart", "position");
	let positions: Position[] = [];

	for (let result of results.values()) {
		let wagon = world.requireComponent(result.trainPart.wagon, "wagon");
		if (wagon.locomotive != isLocomotive) { continue; }

		positions.push([result.position.x, result.position.y]);
	}
	return positions;
}

function createGuard(x: number, y: number) {
	// FIXME gun jen nekteri
	let gun = world.createEntity({
		item: {type: "weapon", price: 0, ...rules.guardGun},
	});

	let items: Entity[] = [];
	if (1) { items.push(gun); }

	let visual = GUARD_VISUAL;
	let tasks = [{type:"attack", target:"party"} as const, {type:"escape", withGold: false} as const];
	let guard = world.createEntity({
		person: { items, price: 0, relation: "enemy", hp:rules.guardHp },
		actor: { wait: 0, duration: rules.baseTaskDuration, tasks },
		position: {x, y},
		blocks: {projectile: true, movement: true},
		visual,
		named: {name: "guard"}
	});
	spatialIndex.update(guard);
	display.draw(x, y, visual, {id:guard, zIndex: visual.zIndex});
}

function dropGoldAndGuards(positions: Position[]) {
	// careful: "positions" might contain duplicates

	function removePosition(pos: Position) {
		let i = positions.length;
		while (i --> 0) {
			if (positions[i][0] == pos[0] && positions[i][1] == pos[1]) { positions.splice(i, 1); }
		}
	}

	for (let i=0; i<rules.droppedGuardCount; i++) {
		let position = positions.random();
		removePosition(position);
		createGuard(position[0], position[1]);
	}
	log.add("Security guards jump out of the damaged wagon.");

	for (let i=0; i<rules.droppedGoldCount; i++) {
		let position = positions.random();
		removePosition(position);

		let visual = GOLD_VISUAL;
		let gold = world.createEntity({
			position: {x: position[0], y: position[1]},
			item: {type: "gold", price: rules.goldPrice},
			visual,
			named: {name: "Gold"}
		});
		spatialIndex.update(gold);
		display.draw(position[0], position[1], visual, {id:gold, zIndex: visual.zIndex});
	}
	log.add("Several bags with money are scattered on the ground!");
}

export function disconnectLastWagon(train: Train) {
	let wagonEntity = train.wagons.at(-1)!;

	let forceInsideTown = true;
	let freePositions: Position[] = [];

	// no longer a train part
	let { parts } = world.requireComponent(wagonEntity, "wagon");
	parts.forEach(partEntity => {
		world.removeComponents(partEntity, "trainPart");
		let position = world.getComponent(partEntity, "position");
		if (position) {
			freePositions.push(...getFreeNeighbors([position.x, position.y], forceInsideTown));
		}
	});

	train.wagons.pop();
	log.add("The last wagon is so damaged that it disconnects from the train.");

	dropGoldAndGuards(freePositions);

	log.newline();
}

export function getLocomotivePosition(): Position | undefined {
	// FIXME podobne jako getAllPositions
	let results = world.findEntities("wagon");
	for (let { wagon } of results.values()) {
		if (!wagon.locomotive) { continue; }
		let parts = wagon.parts.slice().reverse(); // start from the last to prevent getting ran over
		for (let part of parts) {
			let position = world.getComponent(part, "position");
			if (position) { return [position.x, position.y]; }
		}
	}
}


export function updateSpeed(train: Train) {
	let locomotive = world.requireComponent(train.wagons[0], "wagon");

	// 100% hp -> add 0 to duration
	// 0% hp -> add 30 to duration
	let actor = world.requireComponent(locomotive.train, "actor");
	let hpFraction = locomotive.hp / rules.locomotiveHp;
	actor.duration = rules.trainTaskDuration + (1-hpFraction) * 10;

	if (locomotive.hp <= 0) {
		world.removeComponents(locomotive.train, "actor");

		// no longer a train part
		locomotive.parts.forEach(part => world.removeComponents(part, "trainPart"));

		log.add("The locomotive is completely broken. The train is stopped!");
		log.newline();
	} else {
		log.add("The train slows down a bit.");
	}
}