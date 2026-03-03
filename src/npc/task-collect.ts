import { world, Entity, spatialIndex } from "../world.ts";
import { dist4, Position } from "./util.ts";
import { moveCloser } from "./tasks.ts";
import * as log from "../ui/log.ts";
import display from "../display.ts";


function sortPositions(positions: Position[], target: Position): Position[] {
	function CMP_DIST(a: Position, b: Position) {
		let da = dist4(a, target);
		let db = dist4(b, target);
		return da - db;
	}

	return positions.sort(CMP_DIST);
}

function doCollect(entity: Entity, item: Entity) {
	let { person, actor } = world.requireComponents(entity, "person", "actor");
	person.items.push(item);

	let str = log.format("%s picks up %s.", entity, item);
	log.add(str);
	log.newline();

	display.delete(item);
	world.removeComponents(item, "position");
	spatialIndex.update(item);

	return actor.duration;
}

export async function collect(entity: Entity): Promise<number> {
	const { position } = world.requireComponents(entity, "position");

	let entitiesHere = [...spatialIndex.list(position.x, position.y)]
						.filter(e => world.hasComponents(e, "item"));
	if (entitiesHere.length > 0) {
		return doCollect(entity, entitiesHere[0]);
	}

	let results = world.findEntities("item", "position");
	if (!results.size) { return 0; }

	const currentPosition = [position.x, position.y];
	let positions = [...results.values()].map(result => [result.position.x, result.position.y]);
	sortPositions(positions, currentPosition);

	let targetPosition = positions[0];
	return moveCloser(entity, targetPosition);
}
