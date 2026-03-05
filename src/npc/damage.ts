import { world, spatialIndex, Train, Person, Entity } from "../world.ts";
import { Position } from "./util.ts";
import * as train from "./train.ts";
import * as log from "../ui/log.ts";
import * as status from "../ui/status.ts";
import * as rules from "../rules.ts";
import display from "../display.ts";


export interface Damage {
	amount: number;
	explosionRadius: number;
}

function damageTrain(trainComponent: Train, isLocomotive: boolean, damage: Damage) {
	if (isLocomotive) {
		let wagon = world.requireComponent(trainComponent.wagons[0], "wagon");
		wagon.hp -= damage.amount;
		train.updateSpeed(trainComponent);
	} else {
		let lastWagon = world.requireComponent(trainComponent.wagons.at(-1)!, "wagon");

		lastWagon.hp -= damage.amount;

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

function damagePerson(person: Person, entity: Entity, damage: Damage) {
	person.hp -= damage.amount;

	if (person.hp <= 0) {
		let position = world.requireComponent(entity, "position");

		world.removeComponents(entity, "position", "actor");
		spatialIndex.update(entity);
		display.delete(entity);

		// had gold? place it on the ground.
		person.items.forEach(e => {
			let item = world.requireComponent(e, "item");
			if (item.type != "gold") { return; }

			let visual = world.requireComponent(e, "visual");

			world.addComponent(e, "position", { ...position });
			spatialIndex.update(e);
			display.draw(position.x, position.y, visual, {id: e, zIndex: visual.zIndex});
		});

		let str = log.format("%The is killed!", entity);
		log.add(str);
		log.newline();
	}

	status.update();
}

export function damagePosition(position: Position, damage: Damage) {
	let entities = spatialIndex.list(position[0], position[1]);

	for (let entity of entities) {
		let trainPart = world.getComponent(entity, "trainPart");
		if (trainPart) {
			let wagon = world.requireComponent(trainPart.wagon, "wagon");
			let train = world.requireComponent(wagon.train, "train");
			damageTrain(train, wagon.locomotive, damage);
		}

		let person = world.getComponent(entity, "person");
		person && damagePerson(person, entity, damage);
	}
}
