import { world, Entity } from "../world.ts";
import { moveFurther } from "./tasks.ts";
import * as log from "../ui/log.ts";


function isItemGold(entity: Entity) {
	let item = world.requireComponent(entity, "item");
	return (item.type == "gold");
}

export async function escape(entity: Entity) {
	let { items } = world.requireComponent(entity, "person");
	if (!items.some(isItemGold)) { return 0; }

	let { town } = world.findEntities("town").values().next().value!;
	let center = [town.width/2, town.height/2];

	let duration = await moveFurther(entity, center);
	if (!world.hasComponents(entity, "position")) { // moved outside: remove the actor component
		world.removeComponents(entity, "actor");
		let str = log.format("%A escapes the town!", entity);
		log.add(str);
		log.newline();
	}

	return duration;
}
