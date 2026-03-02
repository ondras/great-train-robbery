import * as game from "./ui/game.ts";
import * as intro from "./ui/intro.ts";

declare global {
    interface Array<T> {
        random(): T;
    }
}

async function init() {
	let seed = (Math.random() * 0x1000000) | 0;
//	let seed = 454036;
	seed = await intro.init(seed);

	await game.init(seed);
}

init();
