import { spatialIndex, world, Entity, Track } from "../world.ts";
import display from "../display.ts";
import * as util from "../util.ts";
import * as conf from "../conf.ts";


export interface Wagon {
	parts: Entity[];
}

const WAGONS = 3;
const WAGON = {
	size: 3,
	horizontal: "o=o",
	vertical: "o|o"
};

export function create() {
	const LENGTH = WAGONS * WAGON.size;
	let [trackEntity, { track }] = world.findEntities("track").entries().next().value!

	let wagons: Wagon[] = [];
	let pathIndex = LENGTH-1;

	for (let i=0;i<WAGONS;i++) {
		let wagon: Wagon = {parts: []};
		wagons.push(wagon);

		for (let j=0;j<WAGON.size;j++) {
			let trainPart = { wagon, pathIndex };

			let {x, y, nextDirection} = track.positions[pathIndex];
			let position = {x, y, blocks: {sight: false, movement: true}};

			let wagonPart = world.createEntity({trainPart, position});
			wagon.parts.push(wagonPart);

			let visual = createWagonPartVisual(j, nextDirection!); // FIXME undefined

			spatialIndex.update(wagonPart);
			display.draw(position.x, position.y, visual, {id:wagonPart, zIndex:1});

			pathIndex--;
		}
	}

	let train = { wagons, track: trackEntity };
	let actor = {
		wait: 0,
		tasks: [{type:"train"} as const]
	};
	world.createEntity({ train, actor });
}


function createWagonPartVisual(wagonIndex: number, nextDirection: number) {
	let template = (nextDirection % 2 ? WAGON.horizontal : WAGON.vertical);
	return {
		ch: template[wagonIndex],
	}
}

function movePart(entity: Entity, wagonIndex: number, positions: Track["positions"]) {
	let { position, trainPart } = world.requireComponents(entity, "position", "trainPart");

	trainPart.pathIndex++;
	if (trainPart.pathIndex >= positions.length) {
		display.delete(entity);
		return;
	}

	let {x, y, nextDirection} = positions[trainPart.pathIndex];

	let visual = createWagonPartVisual(wagonIndex, nextDirection!); // FIXME undefined

	position.x = x;
	position.y = y;
	display.draw(x, y, visual, {id: entity, zIndex:1});
	spatialIndex.update(entity);
}

export function isInTown() {
	let { train } = world.findEntities("train").values().next().value!;
	let { positions } = world.requireComponent(train.track, "track");

	function isPartInTown(part: Entity) {
		let { pathIndex } = world.requireComponent(part, "trainPart");
		return (pathIndex < positions.length);
	}

	function isWagonInTown(wagon: Wagon) {
		return wagon.parts.some(isPartInTown);
	}

	return train.wagons.some(isWagonInTown);
}

export async function move(entity: Entity) {
	let { track, wagons } = world.requireComponent(entity, "train");
	let { positions } = world.requireComponent(track, "track");

	wagons.forEach(wagon => {
		wagon.parts.forEach((entity, j) => {
			movePart(entity, j, positions);
		});
	});

	return util.sleep(conf.MOVE_DELAY);
}
