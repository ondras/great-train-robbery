export interface Plot {
	x: number;
	y: number;
	building?: Building;
	trees?: boolean;
}

export interface Crossing {
	x: number;
	y: number;
	neighbors: (Crossing | undefined)[];
}

export interface Building {
	type: string;
	plots: Plot[];
}

export type Path = Crossing[];

export interface Town {
	crossings: Crossing[];
	plots: Plot[];
	buildings: Building[];
}

export function addBuilding(town: Town, type: string, plot: Plot, secondaryPlot?: Plot) {
	let plots = [plot];
	if (secondaryPlot) { plots.push(secondaryPlot); }

	let building = { plots, type };
	town.buildings.push(building);
	plots.forEach(plot => {
		plot.trees = false;
		plot.building = building;
	});

	if (secondaryPlot) {
		let crossings = filterCommonCrossings(town.crossings, plot, secondaryPlot);
		if (crossings.length != 2) { throw new Error(`consistency failure: bad count of common crossings: ${crossings.length}`); }

		let [c1, c2] = crossings;
		c1.neighbors.forEach((n, i, all) => all[i] = (n == c2) ? undefined : n);
		c2.neighbors.forEach((n, i, all) => all[i] = (n == c1) ? undefined : n);
	}
}

function filterCommonCrossings(crossings: Crossing[], plotA: Plot, plotB: Plot): Crossing[] {
	function isAroundPlot(crossing: Crossing, plot: Plot): boolean {
		let dx = crossing.x - plot.x;
		let dy = crossing.y - plot.y;
		return (dx >= 0) && (dx <= 1) && (dy >= 0) && (dy <= 1);
	}

	function isCommonCrossing(crossing: Crossing): boolean {
		return isAroundPlot(crossing, plotA) && isAroundPlot(crossing, plotB);
	}

	return crossings.filter(isCommonCrossing);
}
