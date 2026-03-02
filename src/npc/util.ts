import { spatialIndex, world } from "../world.ts";
import { DIRS_8 } from "../dirs.ts";


export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function dist4(a: number[], b: number[]): number {
	const dx = Math.abs(a[0] - b[0]);
	const dy = Math.abs(a[1] - b[1]);
	return dx + dy;
}

export function dist8(a: number[], b: number[]): number {
	const dx = Math.abs(a[0] - b[0]);
	const dy = Math.abs(a[1] - b[1]);
	return Math.max(dx, dy);
}

export function distEuclidean(a: number[], b: number[]): number {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	return Math.sqrt(dx*dx + dy*dy);
}

export type Position = number[];

export function computePath(a: Position, b: Position): Position[] {
	let dx = b[0] - a[0];
	let dy = b[1] - a[1];
	let dist = dist8(a, b);

	let path: Position[] = [];

	for (let i=0;i<=dist;i++) {
		let x = a[0] + Math.round(dx * i / dist);
		let y = a[1] + Math.round(dy * i / dist);
		path.push([x, y]);
	}

	return path;
}

export function getFreeNeighbors(center: Position): Position[] {
	let { town } = world.findEntities("town").values().next().value!;

	return DIRS_8.map(dir => [center[0] + dir[0], center[1] + dir[1]]).filter(([x, y]) => {
		if (x < 0 || y < 0 || x >= town.width || y >= town.height) { return false; }

		let targetEntities = spatialIndex.list(x, y);
		return [...targetEntities].every(e => {
			let position = world.requireComponent(e, "position");
			return !position.blocks.movement;
		});
	});
}
