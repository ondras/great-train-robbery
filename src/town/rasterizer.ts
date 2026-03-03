import { Town, Crossing, Plot, Building, Path } from "./town.ts";
import display from "../display.ts";
import { spatialIndex, world } from "../world.ts";
import { DIRS_4 } from "../dirs.ts";


interface RasterizerOptions {
	roadWidth: number;
	plotWidth: number;
	plotHeight: number;
}

export function rasterize(town: Town, path: Path, options: RasterizerOptions) {
	let g = gutter(options);
	let fp = getFurthestPlot(town)!;

	let width = 2*g + (fp.x+1) * options.plotWidth + (fp.x) * options.roadWidth;
	let height = 2*g + (fp.y+1) * options.plotHeight + (fp.y) * options.roadWidth;

	rasterizeGround(width, height, options);
	rasterizeBuildings(town, options);
	let track = rasterizePath(path, options);

	let t = { width, height, track };
	return world.createEntity({town: t});
}

function rasterizeGround(width: number, height: number, options: RasterizerOptions) {
	let offset = gutter(options) - Math.ceil(options.roadWidth / 2);

	const roadSpacingHorizontal = options.plotWidth + options.roadWidth;
	const roadSpacingVertical = options.plotHeight + options.roadWidth;

	for (let i=0;i<width;i++) {
		for (let j=0;j<height;j++) {
			let isRoadX = ((i - offset) % roadSpacingHorizontal == 0);
			let isRoadY = ((j - offset) % roadSpacingVertical == 0);
			let isRoad = isRoadX || isRoadY;

			display.draw(i, j, {
				ch: ".",
				fg: isRoad ? "#841" : "#ed5"
			});
		}
	}
}

function rasterizeBuildings(town: Town, options: RasterizerOptions) {
	town.buildings.forEach(building => rasterizeBuilding(building, options));
}

function rasterizeBuilding(building: Building, options: RasterizerOptions) {
	let bbox = computeBuildingBbox(building, options);
	let { corners, edges } = BUILDING_DESIGNS.random();

	let b = {
		...bbox,
		type: building.name
	}
	world.createEntity({building: b});

	for (let i = 0; i < bbox.width; i++) {
		for (let j = 0; j < bbox.height; j++) {
			let left = (i == 0);
			let right = (i == bbox.width-1);
			let top = (j == 0);
			let bottom = (j == bbox.height-1);
			let ch = " ";
			let x = bbox.x + i;
			let y = bbox.y + j;

			if (left || right || top || bottom) { // corner/edge
				switch (true) {
					case left && top: ch = corners[0]; break;
					case right && top: ch = corners[1]; break;
					case right && bottom: ch = corners[2]; break;
					case left && bottom: ch = corners[3]; break;
					case top: ch = edges[0]; break;
					case right: ch = edges[1]; break;
					case bottom: ch = edges[2]; break;
					case left: ch = edges[3]; break;
				}

				let blocks = {sight: false, movement: true};
				let position = {x, y};
				let entity = world.createEntity({position, blocks});
				spatialIndex.update(entity);
			}

			display.draw(x, y, { ch });
		}
	}

	let nameRows = building.name.split("\n");
	let cx = Math.floor(bbox.x + bbox.width / 2);
	let cy = Math.floor(bbox.y + bbox.height / 2);
	nameRows.forEach((nameRow, i) => {
//		let y = cy - Math.floor(nameRows.length / 2) + i;
		let y = bbox.y + i + 1;
		nameRow.split("").forEach((ch, j) => {
			let x = cx - Math.ceil(nameRow.length / 2) + j;
			display.draw(x, y, { ch });
		});
	});
}

interface Position {
	x: number;
	y: number;
	nextDirection?: number;
}

function rasterizePath(path: Path, options: RasterizerOptions) {
	let track: Position[] = [];

	path.forEach((crossing, i) => {
		let segment = rasterizePathSegment(crossing, i, path, options);
		track = track.concat(segment);
	});

	return track;
}

function rasterizePathSegment(crossing: Crossing, i: number, path: Path, options: RasterizerOptions) {
	let positions: Position[] = [];
	if (i == 0) { return positions; }

	let current = crossingToXY(crossing, options);
	let prev = crossingToXY(path[i-1], options);

	let dx = Math.sign(current[0] - prev[0]);
	let dy = Math.sign(current[1] - prev[1]);
	let dist = Math.abs(current[0] - prev[0]) + Math.abs(current[1] - prev[1]);
	if (i+1 == path.length) { dist += 1; } // last explicit step

	let direction = DIRS_4.findIndex(d => d[0] == dx && d[1] == dy)!;

	for (let j=0; j<dist; j++) {
		let x = prev[0] + dx*j;
		let y = prev[1] + dy*j;

		let position = { x, y, nextDirection: direction };
		positions.push(position);

		display.draw(x, y, {
			ch: "#",
			fg: "#777",
			bg: "rgb(80 40 0)"
		});
	}

	return positions;
}

function computeBuildingBbox(building: Building, options: RasterizerOptions) {
	let g = gutter(options);

	let plotX = [Infinity, -Infinity];
	let plotY = [Infinity, -Infinity];
	building.plots.forEach(plot => {
		plotX[0] = Math.min(plotX[0], plot.x);
		plotY[0] = Math.min(plotY[0], plot.y);
		plotX[1] = Math.max(plotX[1], plot.x);
		plotY[1] = Math.max(plotY[1], plot.y);
	});

	const spacingH = options.plotWidth + options.roadWidth;
	const spacingV = options.plotHeight + options.roadWidth;

	return {
		x: g + plotX[0] * spacingH,
		y: g + plotY[0] * spacingV,
		width: (plotX[1]-plotX[0]) * spacingH + options.plotWidth,
		height: (plotY[1]-plotY[0]) * spacingV + options.plotHeight
	}
}

function crossingToXY(crossing: Crossing, options: RasterizerOptions): [number, number] {
	let offset = gutter(options) - Math.ceil(options.roadWidth / 2);

	return [
		offset + crossing.x * (options.plotWidth + options.roadWidth),
		offset + crossing.y * (options.plotHeight + options.roadWidth)
	];
}

function gutter(options: RasterizerOptions): number {
	return Math.ceil(options.roadWidth / 2);
}

function getFurthestPlot(town: Town) {
	let maxX = -Infinity;
	let maxY = -Infinity;

	let furthestPlot: Plot | undefined;
	town.plots.forEach(plot => {
		if (plot.x > maxX) { maxX = plot.x; }
		if (plot.y > maxY) { maxY = plot.y; }
		if (plot.x == maxX && plot.y == maxY) { furthestPlot = plot; }
	});

	return furthestPlot;
}

interface BuildingDesign {
	corners: string[];
	edges: string[];
}
const BUILDING_DESIGNS: BuildingDesign[] = [
	{
		corners: ["┌", "┐", "┘", "└"],
		edges: ["─", "│", "─", "│"]
	},

	{
		corners: ["╔", "╗", "╝", "╚"],
		edges: ["═", "║", "═", "║"]
	},

	{
		corners: ["┏", "┓", "┛", "┗"],
		edges: ["━", "┃", "━", "┃"]
	}
];
