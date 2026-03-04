import * as random from "../random.ts"


export interface WallDesign {
	corners: string[];
	edges: string[];
}

const WALL_DESIGNS: WallDesign[] = [
	{
		corners: ["┌", "┐", "┘", "└"],
		edges: ["─", "│", "─", "│"]
	},

	{
		corners: ["╔", "╗", "╝", "╚"],
		edges: ["═", "║", "═", "║"]
	},

	{
		corners: ["┏", "┓", "┛", "┗"],
		edges: ["━", "┃", "━", "┃"]
	}
];

const ALL_TYPES = {
	bank: {name: "Bank"},
	saloon: {name: "Saloon"},
	hotel: {name: "Hotel"},
	sheriff: {name: "Sheriff"},
	church: {name: "Church"},
	station: {name: "Station"},
	brothel: {name: "Brothel"},
	jail: {name: "Jail"},
	eatery: {name: "Eatery"},
	store: {name: "General\nStore"},
	barber: {name: "Barber"},
	doctor: {name: "Doctor's"},
	undertaker: {name: "Undertaker"},
	post: {name: "Post\nOffice"},
	hall: {name: "Town\nHall"},
	water: {name: "Water\nTower"},
	cattle: {name: "Cattle\nPen"},
	stable: {name: "Stable"}
}

type BuildingType = keyof typeof ALL_TYPES;

const FORCED_TYPES: BuildingType[] = ["saloon", "hotel"];
const RANDOM_TYPES: BuildingType[] = [
	"bank", "sheriff", "church", "station", "brothel", "jail", "eatery", "store",
	"barber", "doctor", "undertaker", "post", "hall", "water", "cattle", "stable"
];

export function getWallDesign(type: string): WallDesign {
	return WALL_DESIGNS.random();
}

export function getBuildingColor(): string {
	let hue = 35;
	let saturation = 20 + random.float() * 20;
	let lightness = 40 + random.float() * 20;
	return `hsl(${hue}deg ${saturation | 0}% ${lightness | 0}%)`;
}

export function getBuildingName(type: string): string {
	if (type in ALL_TYPES) {
		return ALL_TYPES[type as BuildingType].name;
	} else {
		return type;
	}
}

export function generateTypePool(): BuildingType[] {
	let pool = FORCED_TYPES.slice();

	let others = RANDOM_TYPES.slice();
	while (others.length > 0) {
		let index = random.arrayIndex(others);
		pool.push(others[index]);
		others.splice(index, 1);
	}

	return pool;
}
