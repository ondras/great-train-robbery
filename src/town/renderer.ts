import { Town, Crossing, Plot, Building, Path } from "./town.ts";
import display from "../display.ts";
import { spatialIndex, world, Track } from "../world.ts";
import * as util from "../util.ts";


interface RendererOptions {
	roadWidth: number;
	plotWidth: number;
	plotHeight: number;
}

interface Cell {
	ch: string;
	fg?: string;
	bg?: string;
}

export default class CharRenderer {
	readonly width: number;
	readonly height: number;

	constructor(protected town: Town, protected options: RendererOptions) {
		let g = gutter(options);
		let fp = getFurthestPlot(town)!;
		this.width = 2*g + (fp.x+1) * options.plotWidth + (fp.x) * options.roadWidth;
		this.height = 2*g + (fp.y+1) * options.plotHeight + (fp.y) * options.roadWidth;
		console.log("size", this.width, this.height);
	}

	renderGround() {
		const { width, height } = this;
		for (let i=0;i<width;i++) {
			for (let j=0;j<height;j++) {
				display.draw(i, j, {
					ch: ".",
					fg: "#ed5"
				});
			}
		}
	}

	renderBuildings() {
		const { town, options } = this;
		town.buildings.forEach(building => renderBuilding(building, options));
	}

	renderPath(path: Path) {
		const { options } = this;

		let positions: Track["positions"] = [];

		path.forEach((crossing, i) => {
			let segment = renderPathSegment(crossing, i, path, options);
			positions = positions.concat(segment);
		});

		let track = { positions };
		world.createEntity({track});
	}
}

function renderPathSegment(crossing: Crossing, i: number, path: Path, options: RendererOptions) {
	let positions: Track["positions"] = [];
	if (i == 0) { return positions; }

	let current = crossingToXY(crossing, options);
	let prev = crossingToXY(path[i-1], options);

	let dx = Math.sign(current[0] - prev[0]);
	let dy = Math.sign(current[1] - prev[1]);
	let dist = Math.abs(current[0] - prev[0]) + Math.abs(current[1] - prev[1]);
	if (i+1 == path.length) { dist += 1; } // last explicit step

	let direction = util.DIRS_4.findIndex(d => d[0] == dx && d[1] == dy)!;

	for (let j=0; j<dist; j++) {
		let x = prev[0] + dx*j;
		let y = prev[1] + dy*j;

		let position = { x, y, nextDirection: direction };
		positions.push(position);

		display.draw(x, y, {
			ch: "#",
			fg: "#777",
			bg: "#630"
		}, {part:"track"});
	}

	return positions;
}

function renderBuilding(building: Building, options: RendererOptions) {
	let bbox = computeBuildingBbox(building, options);
	let { corners, edges } = BUILDING_DESIGNS.random();

	for (let i = 0; i < bbox.width; i++) {
		for (let j = 0; j < bbox.height; j++) {
			let left = (i == 0);
			let right = (i == bbox.width-1);
			let top = (j == 0);
			let bottom = (j == bbox.height-1);
			let ch = " ";
			let zIndex = 0;
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

				zIndex = 1;
				let position = {x, y, blocks: {sight: false, movement: true}};
				let entity = world.createEntity({position});
				spatialIndex.update(entity);
			}

			display.draw(x, y, { ch }, {zIndex});
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

function computeBuildingBbox(building: Building, options: RendererOptions) {
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

function crossingToXY(crossing: Crossing, options: RendererOptions): [number, number] {
	return [
		crossing.x * (options.plotWidth + options.roadWidth),
		crossing.y * (options.plotHeight + options.roadWidth)
	];
}

function renderToConsole(rows: Cell[][]) {
	function renderRow(row: Cell[]) {
		let chars: string[] = [];
		let styles: string[] = [];
		row.forEach(cell => {
			chars.push(`%c${cell.ch}`);
			let style = "";
			if (cell.fg) { style += `color: ${cell.fg};`; }
			if (cell.bg) { style += `background-color: ${cell.bg};`; }
			styles.push(style);
		});
		console.log(chars.join(""), ...styles);

	}
	rows.forEach(renderRow);
}

function gutter(options: RendererOptions): number {
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
		corners: ["┌", "┐", "┘", "└"],
		edges: ["-", "|", "-", "|"]
	}
];
