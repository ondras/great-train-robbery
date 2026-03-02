import { world, Train } from "../world.ts";
import { Position } from "./util.ts";


function damageTrain(train: Train) {
	let connectedWagons = train.wagons
							.map(entity => world.requireComponent(entity, "wagon"))
							.filter(wagon => wagon.connected);
	if (connectedWagons.length < 2) { return; }

	let lastWagon = connectedWagons.at(-1)!;
	lastWagon.hp--;
	if (lastWagon.hp <= 0) { lastWagon.connected = false; }
}

export function damage(position: Position) {
	let result = world.findEntities("position");

	for (let entity of result.keys()) {
		let trainPart = world.getComponent(entity, "trainPart");
		if (trainPart) {
			let wagon = world.requireComponent(trainPart.wagon, "wagon");
			if (!wagon.connected) { return; } // FIXME divny, strelba do odpojeneho vagonu

			let train = world.requireComponent(wagon.train, "train");
			return damageTrain(train);
		}

	}
}
