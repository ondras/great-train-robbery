import { world } from "../world.ts";


export function generateItems() {
	world.createEntity({item: {type: "horse", price: 10, speed: 5}, named: {name: "Horse 1"}});
	world.createEntity({item: {type: "horse", price: 10, speed: 5}, named: {name: "Horse 2"}});
	world.createEntity({item: {type: "horse", price: 10, speed: 5}, named: {name: "Horse 3"}});
	world.createEntity({item: {type: "weapon", price: 10, damage: 5}, named: {name: "Gun 1"}});
	world.createEntity({item: {type: "weapon", price: 10, damage: 5}, named: {name: "Gun 2"}});
	world.createEntity({item: {type: "weapon", price: 10, damage: 5}, named: {name: "Gun 3"}});
}
