import Pane from "./pane.ts";
import * as log from "./log.ts";


export default class Help extends Pane {
	constructor() {
		super("help");
	}

	activate() {
		super.activate();
		log.clear();
		log.add(`To learn more about this project, you can visit its the GitHub repository at <br><a href="https://github.com/ondras/great-train-robbery">https://github.com/ondras/great-train-robbery</a>.`);
		log.newline();
	}
}
