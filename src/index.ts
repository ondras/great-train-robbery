import { emptyTown } from "./town/town.ts";
//import DebugRenderer, { createContext } from "./debug-renderer.ts";
import Renderer from "./town/renderer.ts";
import display from "./display.ts";
import * as townGenerator from "./town/generator.ts";
import * as npcGenerator from "./npc/generator.ts";
import * as random from "./random.ts";
import * as train from "./train.ts";
import * as ui from "./ui/ui.ts";


declare global {
    interface Array<T> {
        random(): T;
    }
}

let seed = (Math.random() * 1000000) | 0;
seed = 454036;
console.log("seed", seed);
random.seed(seed);

/*
function drawAllPaths(W: number, H: number, output: string) {
	let PXW = W * 40;
	let PXH = H * 40;

	let t = emptyTown(W, H);

	console.time("buildings")
	generateBuildings(t);
	console.timeEnd("buildings")

	console.time("allpaths")
	let paths = generateAllPaths(t)
	console.timeEnd("allpaths")
	console.log("all", paths.length);

	console.time("dedupe")
	paths = util.deduplicatePaths(paths);
	console.timeEnd("dedupe")
	console.log("deduped", paths.length);

	paths = paths.toSorted((a, b) => a.length - b.length);
	let mid = Math.floor(paths.length / 3);
	paths = paths.slice(mid, mid*2);
	console.log("mid length", paths.length);

	let cols = 30;
	let rows = Math.ceil(paths.length / cols);

	let ctx = createContext(cols*PXW, rows * PXH);
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);


	paths.forEach((path, i) => {
		let col = i % cols;
		let row = Math.floor(i / cols);
		let offset = [col * PXW, row * PXH] as [number, number];
		let r = new DebugRenderer(ctx, {offset, plotSize:20});
		r.renderTown(t);
		r.renderPath(path)
	});

	ctx.canvas.save(output);
}
drawAllPaths(4, 4, "all-paths.png");
*/

/*
function drawManyTowns(W: number, H: number, output: string	) {
	let PXW = W * 80;
	let PXH = H * 80;
	const N = 100;
	let cols = 10;
	let rows = Math.ceil(N / cols);

	let ctx = createContext(cols*PXW, rows * PXH);
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

	for (let i=0;i<N;i++) {
		let t = emptyTown(W, H);

		console.time("buildings")
		generateBuildings(t);
		console.timeEnd("buildings")

		console.time("allpaths")
		let paths = generateAllPaths(t)
		console.timeEnd("allpaths")
		console.log("all", paths.length);

		console.time("dedupe")
		paths = deduplicatePaths(paths);
		console.timeEnd("dedupe")
		console.log("deduped", paths.length);

		paths = paths.toSorted((a, b) => a.length - b.length);
		let mid = Math.floor(paths.length / 3);
		paths = paths.slice(mid, mid*2);
		console.log("mid length", paths.length);

		let path = paths.random();

		let col = i % cols;
		let row = Math.floor(i / cols);
		let offset = [col * PXW, row * PXH] as [number, number];
		let r = new DebugRenderer(ctx, {offset, plotSize:60});
		r.renderTown(t);
		r.renderPath(path)
	}
	ctx.canvas.save(output);
}
drawManyTowns(4, 4, "many-towns.png");
*/

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

	let firstTrack = renderer.renderPath(path);
	train.create(firstTrack);

	npcGenerator.generatePeople();
}

async function init() {
	createTown(4, 4);
	await ui.init();
}

init();
//run();
