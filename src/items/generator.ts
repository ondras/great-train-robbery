import { world } from "../world.ts";


const DYNAMITE_VISUAL = {
	ch: "‼",
	fg: "#f00",
	zIndex: 1
}

function createHorse(name: string, params: {price: number, duration: number}) {
	let item = {type: "horse", ...params} as const;
	return world.createEntity({item, named: {name}});
}

function createWeapon(name: string, params: {price: number, damage: number, range: number, duration: number, explosionRadius?: number}) {
	let item = {type: "weapon", ...params} as const;
	return world.createEntity({item, named: {name}});
}

function createDynamite(params: {price:number}) {
	let item = {type: "dynamite", damage:20, ...params} as const;
	let name = "Dynamite";
	return world.createEntity({item, named: {name}, visual: DYNAMITE_VISUAL});
}

export function generateItems() {
	createHorse("Regular Horse", {price: 200, duration: 6});
	createHorse("Super-fast Horse", {price: 300, duration: 4});

	createWeapon("Revolver", {price: 100, damage: 2, range: 3, duration: 5});
	createWeapon("Rifle", {price: 300, damage: 4, range: 5, duration: 5});
	createWeapon("Sniper rifle", {price: 500, damage: 4, range: 10, duration: 5});

	createWeapon("Rocket launcher", {price: 1000, damage: 5, range: 10, duration: 10, explosionRadius: 1});

	createDynamite({price: 500});
}
