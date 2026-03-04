import { world, spatialIndex, Train, Person, Entity } from "../world.ts";
import { Position } from "./util.ts";
import * as train from "./train.ts";
import * as log from "../ui/log.ts";
import * as status from "../ui/status.ts";
import * as rules from "../rules.ts";
import display from "../display.ts";


function damageTrain(trainComponent: Train, isLocomotive: boolean) {
	if (isLocomotive) {
		// FIXME
	} else {
		let lastWagon = world.requireComponent(trainComponent.wagons.at(-1)!, "wagon");

		lastWagon.hp--;

		let fraction = lastWagon.hp / rules.wagonHp;
		let color = train.color(fraction);
		for (let part of lastWagon.parts) {
			let visual = world.requireComponent(part, "visual");
			visual.fg = color;

			// might be away already
			let position = world.getComponent(part, "position");
			position && display.draw(position.x, position.y, visual, {id: part, zIndex:visual.zIndex});
		}

		if (lastWagon.hp <= 0) { train.disconnectLastWagon(trainComponent); }
	}
}

function damagePerson(person: Person, entity: Entity) {
	person.hp--; // fixme weapon type

	if (person.hp <= 0) {
		world.removeComponents(entity, "position", "actor");
		spatialIndex.update(entity);
		display.delete(entity);

		let str = log.format("%The is killed!", entity);
		log.add(str);
		log.newline();
	}

	status.update();
}

export function damage(position: Position) {
	let entities = spatialIndex.list(position[0], position[1]);

	for (let entity of entities) {
		let trainPart = world.getComponent(entity, "trainPart");
		if (trainPart) {
			let wagon = world.requireComponent(trainPart.wagon, "wagon");
			let train = world.requireComponent(wagon.train, "train");
			damageTrain(train, wagon.locomotive);
		}

		let person = world.getComponent(entity, "person");
		if (person) {
			damagePerson(person, entity);
		}
	}
}
