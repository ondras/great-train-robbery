import { Town, Crossing, Plot, Building, Path } from "./town.ts";
import display from "../display.ts";
import { spatialIndex, world } from "../world.ts";
import { DIRS_4 } from "../dirs.ts";
import * as buildings from "./buildings.ts";
import * as random from "../random.ts";


const WINDOW_COLOR = "#338"; // FIXME
const DOOR_COLOR = "saddlebrown"; // FIXME
const INTERIOR_COLOR = "#888"; // FIXME
const TREE_COLOR = ["#653", "#353", "#9a6"];
const TREE_CH = ["T", "Y"];
const TREE_CHANCE = 0.05;

const TRACK_VISUAL = {
	ch: "#",
	fg: "#777",
	bg: "rgb(80 40 0)"
};


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
	rasterizeTrees(town, options);
	let track = rasterizePath(path, options);

	for (let i=0; i<3; i++) {
		let tp = track[i];
		let ch = ["^", ">", "v", "<"][tp.nextDirection!];
		let visual = { ...TRACK_VISUAL, ch };
		display.draw(tp.x, tp.y, visual);
	}
	for (let i=track.length-3; i<track.length; i++) {
		let tp = track[i];
		let ch = ["^", ">", "v", "<"][tp.nextDirection!];
		let visual = { ...TRACK_VISUAL, ch };
		display.draw(tp.x, tp.y, visual);
	}

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

function rasterizeTrees(town: Town, options: RasterizerOptions) {
	let g = gutter(options);
	town.plots.filter(plot => !plot.building).forEach(plot => {
		let x = g + plot.x * (options.plotWidth + options.roadWidth);
		let y = g + plot.y * (options.plotHeight + options.roadWidth);

		for (let i=0; i<options.plotWidth; i++) {
			for (let j=0; j<options.plotHeight; j++) {
				if (random.float() < TREE_CHANCE) {
					let position = { x: x+i, y: y+j };
					let blocks = { projectile: true, movement: true };
					let entity = world.createEntity({position, blocks});
					spatialIndex.update(entity);
					display.draw(position.x, position.y, { ch: TREE_CH.random(), fg: TREE_COLOR.random() });
				}
			}
		}
	})
}

function rasterizeBuildings(town: Town, options: RasterizerOptions) {
	town.buildings.forEach(building => rasterizeBuilding(building, options));
}

function isDoor(i: number, j: number, bbox: ReturnType<typeof computeBuildingBbox>) {
	let cx = Math.round(bbox.width / 2);
	let cy = Math.round(bbox.height / 2);
	if (i != cx && j != cy) { return false; }
	return random.float() < 0.5;
}

function isWindow(i: number, j: number, bbox: ReturnType<typeof computeBuildingBbox>) {
	let edgeX = (i == 0) || (i == bbox.width-1);
	let edgeY = (j == 0) || (j == bbox.height-1);

	if (edgeX && edgeY)	{ return false; } // no windows in corners

	let chance = (random.float() < 0.8);

	if (!edgeX) { // horizontal walls
		return (i % 2 == 0) && chance;
	}

	if (!edgeY) { // vertical walls
		return (j % 2 == 0) && chance;
	}

	return false;
}

function rasterizeBuildingDoor(x: number, y: number) {
	display.draw(x, y, { ch: "/", fg: DOOR_COLOR });
}

function rasterizeBuildingWindow(x: number, y: number, edges: Record<string, boolean>, design: buildings.WallDesign) {
	let ch = "";
	let { left, right, top, bottom } = edges;

	switch (true) {
		case top: ch = design.edges[0]; break;
		case right: ch = design.edges[1]; break;
		case bottom: ch = design.edges[2]; break;
		case left: ch = design.edges[3]; break;
	}

	display.draw(x, y, { ch, fg: WINDOW_COLOR });
}

function rasterizeBuildingWall(x: number, y: number, edges: Record<string, boolean>, design: buildings.WallDesign, color: string, roof: boolean) {
	let ch = "";
	let { left, right, top, bottom } = edges;

	switch (true) {
		case left && top: ch = design.corners[0]; break;
		case right && top: ch = design.corners[1]; break;
		case right && bottom: ch = design.corners[2]; break;
		case left && bottom: ch = design.corners[3]; break;
		case top: ch = design.edges[0]; break;
		case right: ch = design.edges[1]; break;
		case bottom: ch = design.edges[2]; break;
		case left: ch = design.edges[3]; break;
	}

	let blocks = {projectile: roof ? false : true, movement: true}; // roofs do not block projectiles, so you can shoot from them
	let position = {x, y};
	let entity = world.createEntity({position, blocks});
	spatialIndex.update(entity);
	display.draw(x, y, { ch, fg: color })
}

function rasterizeBuildingInterior(x: number, y: number, color: string) {
	display.draw(x, y, { ch: ".", fg: color });
}

function rasterizeBuilding(building: Building, options: RasterizerOptions) {
	let bbox = computeBuildingBbox(building, options);

	let design = buildings.getWallDesign(building.type);
	let name = buildings.getBuildingName(building.type);
	let color = buildings.getBuildingColor();
	let roof = (random.float() < 0.5);

	let b = { ...bbox, type: building.type, roof };
	let named = { name };
	world.createEntity({building: b, named});

	for (let i = 0; i < bbox.width; i++) {
		for (let j = 0; j < bbox.height; j++) {
			let edges = {
				left: (i == 0),
				right: (i == bbox.width-1),
				top: (j == 0),
				bottom: (j == bbox.height-1)
			}
			let x = bbox.x + i;
			let y = bbox.y + j;

			if (edges.left || edges.right || edges.top || edges.bottom) {
				if (roof) {
					rasterizeBuildingWall(x, y, edges, design, color, roof);
				} else if (isDoor(i, j, bbox)) {
					rasterizeBuildingDoor(x, y);
				} else if (isWindow(i, j, bbox)) {
					rasterizeBuildingWindow(x, y, edges, design);
				} else {
					rasterizeBuildingWall(x, y, edges, design, color, roof);
				}
			} else {
				rasterizeBuildingInterior(x, y, roof ? color : INTERIOR_COLOR);
			}
		}
	}

	let cx = Math.floor(bbox.x + bbox.width / 2);
	name.split("\n").forEach((nameRow, i) => {
		let y = bbox.y + i + 1;
		nameRow.split("").forEach((ch, j) => {
			let x = cx - Math.ceil(nameRow.length / 2) + j;
			display.draw(x, y, { ch, fg: color });
		});
	});
}

interface Position {
	x: number;
	y: number;
	nextDirection: number;
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

		display.draw(x, y, TRACK_VISUAL);
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

