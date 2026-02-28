import { spatialIndex, world, Entity } from "./world.ts";
import { PathPart } from "./town/renderer.ts";
import display from "./display.ts";
import { Task } from "./npc/tasks.ts";
import * as util from "./util.ts";


interface Wagon {
	parts: Entity[];
}

export interface TrainPart {
	wagon: Wagon;
	pathIndex: number;
}

export interface Train {
	wagons: Wagon[];
	path: PathPart[];
}

const WAGONS = 3;
const WAGON = {
	size: 3,
	horizontal: "o=o",
	vertical: "o|o"
};

export function create(path: PathPart[]) {
	const LENGTH = WAGONS * WAGON.size;

	let wagons: Wagon[] = [];
	let pathIndex = LENGTH-1;

	for (let i=0;i<WAGONS;i++) {
		let wagon: Wagon = {parts: []};
		wagons.push(wagon);

		for (let j=0;j<WAGON.size;j++) {
			let trainPart: TrainPart = { wagon, pathIndex };

			let {x, y, nextDirection} = path[pathIndex];
			let position = {x, y, blocks: {sight: false, movement: true}};

			let wagonPart = world.createEntity({trainPart, position});
			wagon.parts.push(wagonPart);

			let visual = createWagonPartVisual(j, nextDirection!); // FIXME undefined

			spatialIndex.update(wagonPart);
			display.draw(position.x, position.y, visual, {id:wagonPart, zIndex:1});

			pathIndex--;
		}
	}

	let train: Train = { wagons, path };
	let actor = {
		wait: 0,
		tasks: ["train"] as Task[]
	};
	world.createEntity({ train, actor });
}

export async function move(entity: Entity) {
	let train = world.requireComponent(entity, "train");
	let { path, wagons } = train;

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

			let visual = createWagonPartVisual(j, nextDirection!); // FIXME undefined
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

function createWagonPartVisual(wagonIndex: number, nextDirection: number) {
	let template = (nextDirection % 2 ? WAGON.horizontal : WAGON.vertical);
	return {
		ch: template[wagonIndex],
	}
}