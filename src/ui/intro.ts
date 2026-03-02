import * as keyboard from "./keyboard.ts";


/*




 ▁▁▁┬──┬▁▁   ▁▁▁▁▁▁            ▁   ∙
 `|╓┐╓┐╓┐|  |\|▔▔|/|   ,:;.   |o| ▁|
 ||╙┘╙┘╙┘|╌╌|/|∙∙|\|╌╌|▔▔▔▔|╌╌|───∙()
 ▔'oo▔▔oo'  'oo▔▔oo'  'o▔▔o'  'o▔oo'\\



  */

const intro = document.querySelector<HTMLElement>("#intro")!;
const dom = {
	intro,
	seed: intro.querySelector<HTMLInputElement>("[name=seed]")!,
	sections: [...intro.querySelectorAll("section")],
}
let sectionIndex = 0;

function done(resolve: Function) {
	keyboard.off();
	keyboard.popHandler();
	dom.intro.hidden = true;
	let seed = parseInt(dom.seed.value, 16);
	resolve(seed);
}

function showSection(index: number) {
	sectionIndex = index;
	dom.sections[1].hidden = (index != 1);
}

export function init(seed: number): Promise<number> {
	let { resolve, promise } = Promise.withResolvers<number>();

	dom.seed.value = seed.toString(16);
	showSection(0);

	function handleKey(e: KeyboardEvent) {
		if (sectionIndex == 0) {
			if (e.key == "Enter") {
				showSection(1);
				// FIXME schovat text o enteru
				return true;
			} else {
				return false;
			}
		}

		if (sectionIndex == 1) {
			if (e.key == "Enter") {
				done(resolve);
				return true;
			} else if (e.key.toLowerCase() == "e" && e.target != dom.seed) {
				e.preventDefault();
				dom.seed.focus();
				dom.seed.select();
				return true;
			} else {
				return false;
			}
		}

		return false;
	}

	dom.intro.hidden = false;
	keyboard.pushHandler(handleKey);
	keyboard.on();

	return promise;
}
