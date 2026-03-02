import { emptyTown } from "./town/town.ts";
import * as random from "./random.ts";
import Renderer from "./town/renderer.ts";
import display from "./display.ts";
import * as townGenerator from "./town/generator.ts";
import * as npcGenerator from "./npc/generator.ts";
import * as game from "./ui/game.ts";
import * as intro from "./ui/intro.ts";


declare global {
    interface Array<T> {
        random(): T;
    }
}

let seed = (Math.random() * 1000000) | 0;
seed = 454036;
console.log("seed", seed);
random.seed(seed);

function createTown(W: number, H: number) {
	let t = emptyTown(W, H);

	townGenerator.generateBuildings(t);
	let paths = townGenerator.generateAllPaths(t)
	paths = townGenerator.deduplicatePaths(paths);
	paths = paths.toSorted((a, b) => a.length - b.length);
	let q = Math.floor(paths.length / 4);
	paths = paths.slice(2*q, 3*q);
	let path = paths.random();

	let options = {roadWidth: 3, plotWidth: 12, plotHeight: 6};
	let renderer = new Renderer(t, options);

	display.cols = renderer.width;
	display.rows = renderer.height;

	renderer.renderGround();
	renderer.renderBuildings();
	renderer.renderPath(path);

	npcGenerator.generatePeople();
}

async function init() {
	await intro.init();
	createTown(4, 4);
	await game.init();
}

init();
