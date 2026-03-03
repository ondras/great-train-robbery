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
	let { items } = world.requireComponent(entity, "person");
	items.push(item);

	log.add(`Entity ${entity} picked up ${item}`)

	display.delete(item);
	world.removeComponents(item, "position");
	spatialIndex.update(item);
}

export async function collect(entity: Entity): Promise<boolean> {
	const { position } = world.requireComponents(entity, "position");

	let entitiesHere = [...spatialIndex.list(position.x, position.y)]
						.filter(e => world.hasComponents(e, "item"));
	if (entitiesHere.length > 0) {
		doCollect(entity, entitiesHere[0]);
		return true;
	}

	let results = world.findEntities("item", "position");
	if (!results.size) { return false; }

	const currentPosition = [position.x, position.y];
	let positions = [...results.values()].map(result => [result.position.x, result.position.y]);
	sortPositions(positions, currentPosition);

	let targetPosition = positions[0];
	if (entity == 379 && window.debug) debugger;
	return moveCloser(entity, targetPosition);
}
