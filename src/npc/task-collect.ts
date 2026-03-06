import { world, Entity, spatialIndex } from "../world.ts";
import { distEuclidean, getDurationWithHorse, Position } from "./util.ts";
import { moveCloser } from "./tasks.ts";
import * as log from "../ui/log.ts";
import display from "../display.ts";


function sortPositions(positions: Position[], target: Position): Position[] {
	function CMP_DIST(a: Position, b: Position) {
		let da = distEuclidean(a, target);
		let db = distEuclidean(b, target);
		return da - db;
	}

	return positions.sort(CMP_DIST);
}

function doCollect(entity: Entity, item: Entity) {
	let person = world.requireComponent(entity, "person");
	person.items.push(item);

	let str = log.format("%A picks up %a.", entity, item);
	log.add(str);

	display.delete(item);
	world.removeComponents(item, "position");
	spatialIndex.update(item);

	return getDurationWithHorse(entity);
}

export async function collect(entity: Entity): Promise<number> {
	const { position } = world.requireComponents(entity, "position");

	let entitiesHere = [...spatialIndex.list(position.x, position.y)]
						.filter(e => world.hasComponents(e, "item"));
	if (entitiesHere.length > 0) {
		return doCollect(entity, entitiesHere[0]);
	}

	let results = world.findEntities("item", "position");
	let positions = [...results.values()]
						.filter(result => result.item.type == "gold")
						.map(result => [result.position.x, result.position.y]);
	if (!positions.length) { return 0; }

	const currentPosition = [position.x, position.y];
	sortPositions(positions, currentPosition);

	let targetPosition = positions[0];
	return moveCloser(entity, targetPosition);
}
