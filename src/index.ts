import * as game from "./game.ts";
import * as intro from "./intro.ts";


declare global {
    interface Array<T> {
        random(): T;
    }
}

async function init() {
//	let seed = (Math.random() * 0x1000000) | 0;
	let seed = 454036;
//	seed = await intro.init(seed);

	await game.init(seed);
}

init();


// minimalni rozmery: 1000 x 600 ?
