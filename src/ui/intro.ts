import * as keyboard from "./keyboard.ts";


/*




 ▁▁▁┬──┬▁▁   ▁▁▁▁▁▁            ▁   ∙
 `|╓┐╓┐╓┐|  |\|▔▔|/|   ,:;.   |o| ▁|
 ||╙┘╙┘╙┘|╌╌|/|∙∙|\|╌╌|▔▔▔▔|╌╌|───∙()
 ▔'oo▔▔oo'  'oo▔▔oo'  'o▔▔o'  'o▔oo'\\



  */



export function init() {
	let { resolve, promise } = Promise.withResolvers();

	function done() {
		keyboard.off();
		keyboard.popHandler();
		resolve(undefined);
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key == "Enter") {
			done();
			return true;
		}
		return false;
	}

	keyboard.pushHandler(handleKey);
	keyboard.on();

	return promise;
}

