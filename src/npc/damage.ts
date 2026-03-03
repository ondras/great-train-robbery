import { world, spatialIndex, Train } from "../world.ts";
import { Position } from "./util.ts";
import * as train from "./train.ts";


function damageTrain(trainComponent: Train, isLocomotive: boolean) {
	let lastWagon = world.requireComponent(trainComponent.wagons.at(-1)!, "wagon");

	lastWagon.hp--;
	// FIXME update color

	if (lastWagon.hp <= 0) { train.disconnectLastWagon(trainComponent); }
}

export function damage(position: Position) {
	let entities = spatialIndex.list(position[0], position[1]);

	for (let entity of entities) {
		let trainPart = world.getComponent(entity, "trainPart");
		if (trainPart) {
			let wagon = world.requireComponent(trainPart.wagon, "wagon");
			let train = world.requireComponent(wagon.train, "train");
			return damageTrain(train, wagon.locomotive);
		}
	}
}
