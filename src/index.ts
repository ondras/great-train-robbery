import * as game from "./game.ts";
import * as intro from "./intro.ts";


declare global {
    interface Array<T> {
        random(): T;
    }
}

async function init() {
	let seed = (Math.random() * 0x1000000) | 0; // backup/random seed

    let sp = new URL(location.href).searchParams; // override with url, if usable
    if (sp.has("seed")) {
        let parsed = parseInt(sp.get("seed")!, 16);
        if (parsed) { seed = parsed; }
    }

//    seed = 454036; // override with debug
	seed = await intro.init(seed); // override with user

	await game.init(seed);
}

init();
