import { world, Entity, spatialIndex } from "../world.ts";
import * as log from "../ui/log.ts";
import * as conf from "../conf.ts";
import { dist8, Position, sleep } from "./util.ts";
import { moveCloser } from "./tasks.ts";
import display from "../display.ts";


function sortPositions(positions: Position[], target: Position): Position[] {
	function CMP_DIST(a: Position, b: Position) {
		let da = dist8(a, target);
		let db = dist8(b, target);
		return da - db;
	}

	return positions.sort(CMP_DIST);
}

function getClosestTrack(position: Position) {
	let { town } = world.findEntities("town").values().next().value!;

	let positions = town.track.map(track => [track.x, track.y]);
	sortPositions(positions, position);

	return positions[0];
}

export async function dynamite(entity: Entity): Promise<number> {
	let { person, actor, position } = world.requireComponents(entity, "person", "actor", "position");

	let dynamiteEntity = person.items.find(e => world.requireComponent(e, "item").type == "dynamite");
	if (!dynamiteEntity) { return 0; }

	let closest = getClosestTrack([position.x, position.y]);
	if (!closest) { return 0; }

	let dist = dist8([position.x, position.y], closest);
	if (dist <= 1) {
		let dynamitePosition = {x: closest[0], y: closest[1]};

		let str = log.format(`%A carefully plants a dynamite...`, entity);
		log.add(str);

		// remove from the person
		person.items = person.items.filter(e => e != dynamiteEntity);

		// put on the track
		let visual = world.requireComponent(dynamiteEntity, "visual");

		world.addComponent(dynamiteEntity, "position", dynamitePosition);
		spatialIndex.update(dynamiteEntity);
		display.draw(dynamitePosition.x, dynamitePosition.y, visual, {id: dynamiteEntity, zIndex: visual.zIndex});

		await sleep(conf.ATTACK_DELAY);

		return actor.duration;
	} else {
		return moveCloser(entity, closest);
	}
}
