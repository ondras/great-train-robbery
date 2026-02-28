import { createCanvas } from "jsr:@gfx/canvas@0.5.6";
import { Town, Plot, Path } from "./town.ts";


const ROAD_WIDTH = 10;


export function createContext(width: number, height: number) {
	return createCanvas(width, height).getContext("2d");
}

export interface RendererOptions {
	offset: [number, number];
	plotSize: number;
}

export default class Renderer {
	constructor(protected ctx: CanvasRenderingContext2D, protected options: RendererOptions) {
	}

	renderTown(town: Town) {
		const { ctx, options } = this;

		ctx.resetTransform();
		ctx.translate(...options.offset);

		ctx.fillStyle = "lightgray";
		town.plots.forEach(plot => {
			let px = plotToPx(plot, options.plotSize);
			ctx.fillRect(px[0], px[1], options.plotSize, options.plotSize);
		});

		town.buildings.forEach(building => {
			let plotBBoxes = building.plots.map(plot => {
				let px = plotToPx(plot, options.plotSize);
				return [px[0], px[1], px[0] + options.plotSize, px[1] + options.plotSize];
			});

			let x = [Infinity, -Infinity];
			let y = [Infinity, -Infinity];

			plotBBoxes.forEach(bbox => {
				x[0] = Math.min(x[0], bbox[0]);
				y[0] = Math.min(y[0], bbox[1]);
				x[1] = Math.max(x[1], bbox[2]);
				y[1] = Math.max(y[1], bbox[3]);
			});

			ctx.fillStyle = "lime";
			ctx.fillRect(x[0], y[0], x[1] - x[0], y[1] - y[0]);

			ctx.fillStyle = "black";
			ctx.textAlign = "center";
			ctx.fillText(building.name, x[0]/2+x[1]/2, y[0]/2+y[1]/2);
		});
	}

	renderPath(path: Path) {
		const { ctx, options } = this;

		ctx.resetTransform();
		ctx.translate(...options.offset);

		ctx.strokeStyle = "red";
		ctx.lineWidth = 2;
		ctx.beginPath();
		path.forEach((crossing, i) => {
			let x = crossing.x * (options.plotSize + ROAD_WIDTH) + ROAD_WIDTH / 2;
			let y = crossing.y * (options.plotSize + ROAD_WIDTH) + ROAD_WIDTH / 2;
			if (i == 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});
		ctx.stroke();
	}
}

function plotToPx(plot: Plot, plotSize: number) {
	let x = (plot.x * plotSize) + (plot.x + 1) * ROAD_WIDTH;
	let y = (plot.y * plotSize) + (plot.y + 1) * ROAD_WIDTH;
	return [x, y];
}
