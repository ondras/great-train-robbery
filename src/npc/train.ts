import { spatialIndex, world, Entity, Train, Wagon } from "../world.ts";
import display from "../display.ts";
import * as conf from "../conf.ts";
import { sleep, Position } from "./util.ts";
import { TrainTask } from "./tasks.ts";
import * as rules from "../rules.ts";


const WAGONS = 3;
const WAGON_LENGTH = 3;
const WAGON = ["|oo", "-oo", "|oo", "-oo"];
const LOCOMOTIVE = [["🠉", "◼", "O"], ["🠊", "◼", "O"], ["🠋", "◼", "O"], ["🠈", "◼", "O"]];

export function create(trackOffset: number) {
	let actor = {
		wait: 0,
		tasks: [{type:"train"} as TrainTask]
	};
	let train = world.createEntity({ actor });

	let wagons: Entity[] = [];

	for (let i=0;i<WAGONS+1;i++) {
		let parts: Entity[] = [];
		let wagon = { train, parts, connected: true, hp: rules.wagonHp, locomotive: (i==0) };
		let wagonEntity = world.createEntity({ wagon });
		wagons.push(wagonEntity);

		for (let j=0;j<WAGON_LENGTH;j++) {
			let trainPart = { wagon: wagonEntity };
			let trainPartEntity = world.createEntity({ trainPart });
			parts.push(trainPartEntity);
		}
	}

	let trainComponent = { wagons, trackOffset };
	world.addComponent(train, "train", trainComponent);

	updateTrainPositions(trainComponent);
}

function updateTrainPositions(train: Train) {
	const { town } = world.findEntities("town").values().next().value!;

	let index = train.trackOffset;

	train.wagons.forEach((wagonEntity, i) => {
		let { parts } = world.requireComponent(wagonEntity, "wagon");

		parts.forEach((partEntity, j) => {
			let position = world.getComponent(partEntity, "position");
			if (index < 0 || index >= town.track.length) { // not visible
				if (position) { // remove
					world.removeComponents(partEntity, "position");
					spatialIndex.update(partEntity);
					display.delete(partEntity);
				}
				index--;
				return;
			}

			let {x, y, nextDirection} = town.track[index];
			if (position) { // update
				position.x = x;
				position.y = y;
			} else { // create
				let position = {x, y, blocks: {sight: false, movement: true}};
				world.addComponent(partEntity, "position", position);
			}

			let visual = createWagonPartVisual(i, j, nextDirection!); // FIXME undefined
			display.draw(x, y, visual, {id: partEntity, zIndex:2});
			spatialIndex.update(partEntity);

			index--;
		});
	});
}

function createWagonPartVisual(wagonIndex: number, partIndex: number,nextDirection: number) {
	let templates = (wagonIndex == 0 ? LOCOMOTIVE : WAGON);
	return {
		ch: templates[nextDirection][partIndex]
	}
}

export async function move(entity: Entity) {
	let train = world.requireComponent(entity, "train");
	train.trackOffset++;

	updateTrainPositions(train);
	await sleep(conf.MOVE_DELAY);
	return rules.baseTaskDuration;
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

export function disconnectLastWagon(train: Train) {
	let wagonEntity = train.wagons.at(-1)!;

	// no longer a train part
	let { parts } = world.requireComponent(wagonEntity, "wagon");
	parts.forEach(partEntity => world.removeComponents(partEntity, "trainPart"));

	train.wagons.pop();
}