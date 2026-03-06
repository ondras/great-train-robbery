import { world, spatialIndex, Train, Person, Entity } from "../world.ts";
import { Position, sleep } from "./util.ts";
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
		world.removeComponents(entity, "position", "actor");
		spatialIndex.update(entity);
		display.delete(entity);

		let str = log.format("%The is killed!", entity);
		log.add(str);
		log.newline();
	}

	status.update();
}

async function drawExplosion(position: Position, radius: number) {
	let ids: number[] = [];
	const COLORS = ["#ff0", "#f00", "#f80"]

	for (let i=-radius; i<=radius; i++) {
		for (let j=-radius; j<=radius; j++) {
			let x = position[0] + i;
			let y = position[1] + j;

			let id = display.draw(x, y, {ch: "*", fg: COLORS.random()}, {zIndex: 3});
			ids.push(id);
		}
	}

	await sleep(500);
	ids.forEach(id => display.delete(id));
}

export async function damagePosition(position: Position, damage: Damage) {
	if (damage.explosionRadius > 0) {
		let r = damage.explosionRadius;
		await drawExplosion(position, r);

		for (let i=-r; i<=r; i++) {
			for (let j=-r; j<=r; j++) {
				let x = position[0] + i;
				let y = position[1] + j;
				damagePosition([x, y], {amount: damage.amount, explosionRadius: 0});
			}
		}

		return;
	}

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

		let item = world.getComponent(entity, "item");
		if (item && item.type == "dynamite") {
			world.removeComponents(entity, "position");
			spatialIndex.update(entity);

			log.newline();
			log.add("The dynamite explodes!");
			damage = {
				amount: item.damage,
				explosionRadius: 2			}
			await damagePosition(position, damage);
		}
	}
}
