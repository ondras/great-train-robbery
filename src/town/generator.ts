import { Town, Path, Plot, Crossing, addBuilding } from "./town.ts";
import { DIRS_4, id } from "../util.ts";
import * as random from "../random.ts"


const NAMES = [
	"bank", "sheriff", "saloon", "church", "station", "hotel", "brothel",
	"jail", "eatery", "general\nstore", "barber", "doctor's",
	"undertaker", "post\noffice", "town\hall", "water tower",
	"cattle\npen", "stable"
];

const EMPTY_PERCENTAGE = 0.26; // FIXME +- random
const DOUBLE_CHANCE = 0.33; // FIXME +- random


export function generateBuildings(town: Town) {
	let totalPlots = town.plots.length;
	let namePool = [...NAMES];

	while (true) {
		let emptyPlots = town.plots.filter(p => !p.building);
		if (emptyPlots.length / totalPlots < EMPTY_PERCENTAGE) {
			break;
		}

		let name = namePool.random();
		let index = namePool.indexOf(name);
		namePool.splice(index, 1);

		let plot = emptyPlots.random();
		let neighbors = getNeighborPlots(plot, emptyPlots);

		if (neighbors.length > 0 && random.float() < DOUBLE_CHANCE) {
			let secondaryPlot = neighbors.random();
			addBuilding(town, name, plot, secondaryPlot);
		} else {
			addBuilding(town, name, plot);
		}
	}

	/*
	addBuilding(town, "a", town.plots[4], town.plots[5]);
	addBuilding(town, "b", town.plots[6], town.plots[10]);
	addBuilding(town, "c", town.plots[2], town.plots[3]);
	*/
}

export function generateAllPaths(town: Town): Path[] {
	let width = town.plots.reduce((maxX, plot) => Math.max(maxX, plot.x), 0) + 1;
	let height = town.plots.reduce((maxY, plot) => Math.max(maxY, plot.y), 0) + 1;
	let initialCrossings = town.crossings.filter(c => isEdgeCrossing(c, width, height));

	function generatePaths(partialPath: Path): Path[] {
		let lastCrossing = partialPath[partialPath.length - 1];
		if (isEdgeCrossing(lastCrossing, width, height) && partialPath.length > 1) { return [partialPath]; }

		let nextCrossings = lastCrossing.neighbors.filter(n => n && !partialPath.includes(n)) as Crossing[];
		return nextCrossings.flatMap(nextCrossing => generatePaths([...partialPath, nextCrossing]));
	}

	return initialCrossings.flatMap(crossing => generatePaths([crossing]));
}


export function generateCrossings(width: number, height: number): Crossing[]	{
	let crossingsById = new Map<string, Crossing>();

	let crossings: Crossing[] = [];
	for (let x = 0; x <= width; x++) {
		for (let y = 0; y <= height; y++) {
			let crossing: Crossing = { x, y, neighbors: [] };
			crossings.push(crossing);
			crossingsById.set(id(crossing), crossing);
		}
	}

	crossings.forEach(crossing => {
		let { x, y } = crossing;
		crossing.neighbors = DIRS_4.map(([dx, dy]) => {
			let neighbor = { x: x + dx, y: y + dy };

			// forbid near-edge crossings
			if (isEdgeCrossing(crossing, width, height) && isEdgeCrossing(neighbor, width, height)) { return; }

			return crossingsById.get(id(neighbor));
		});
	});

	function hasNeighbor(crossing: Crossing): boolean { return crossing.neighbors.some(n => n); }

	return crossings.filter(hasNeighbor);
}

export function deduplicatePaths(paths: Path[]): Path[] {
	function stringify(path: Path): string {
		let crossings = path.map(c => id(c));
		if (crossings.at(0)!.localeCompare(crossings.at(-1)!) > 0) {
			crossings.reverse();
		}
		return crossings.join(";");
	}

	let pathMap = new Map<string, Path>();
	paths.forEach(path => {
		let key = stringify(path);
		if (!pathMap.has(key)) { pathMap.set(key, path); }
	});

	return [...pathMap.values()];
}

function isEdgeCrossing(crossing: {x:number, y:number}, width: number, height: number): boolean {
	return (crossing.x == 0 || crossing.x == width || crossing.y == 0 || crossing.y == height);
}

function getNeighborPlots(plot: Plot, plots: Plot[]): Plot[] {
	return DIRS_4.map(dir => {
		let x = plot.x + dir[0];
		let y = plot.y + dir[1];
		return plots.find(p => p.x == x && p.y == y);
	}).filter(p => p) as Plot[];
}
