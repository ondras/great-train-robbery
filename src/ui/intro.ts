import * as keyboard from "./keyboard.ts";


/*




 ▁▁▁┬──┬▁▁   ▁▁▁▁▁▁            ▁   ∙
 `|╓┐╓┐╓┐|  |\|▔▔|/|   ,:;.   |o| ▁|
 ||╙┘╙┘╙┘|╌╌|/|∙∙|\|╌╌|▔▔▔▔|╌╌|───∙()
 ▔'oo▔▔oo'  'oo▔▔oo'  'o▔▔o'  'o▔oo'\\



  */

const dom = {
	intro: document.querySelector<HTMLElement>("#intro")!
}

export function init(seed: number): Promise<number> {
	let { resolve, promise } = Promise.withResolvers<number>();

	function done() {
		keyboard.off();
		keyboard.popHandler();
		dom.intro.hidden = true;
		resolve(undefined);
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key == "Enter") {
			done();
			return true;
		}
		return false;
	}

	dom.intro.hidden = false;
	keyboard.pushHandler(handleKey);
	keyboard.on();

	return promise;
}

