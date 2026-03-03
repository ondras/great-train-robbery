import * as face from "https://cdn.jsdelivr.net/gh/ondras/face@1fc5794/face.ts";
import { Task } from "./npc/tasks.ts";


export type Entity = face.Entity;

export interface Position {
	x: number;
	y: number;
	blocks: {
		sight: boolean;
		movement: boolean;
	}
}

export interface Visual {
	ch: string;
	fg?: string;
	bg?: string;
	zIndex?: number;
}

/* z-indexes:
  0: regular ground, walls
  1: items
  2: people, train parts
  3: projectiles, fx
*/

export interface Actor {
	wait: number;
	tasks: Task[];
	duration: number;
}

export interface Person {
	name: string;
	items: Entity[];
	price: number;
	relation: "npc" | "party" | "enemy";
	location?: Entity; // FIXME
	hp: number;
}

export interface Building {
	x: number;
	y: number;
	width: number;
	height: number;
	type: string; // FIXME
}

export interface Train {
	wagons: Entity[];
	trackOffset: number;
}

export interface Wagon {
	train: Entity;
	parts: Entity[];
	locomotive: boolean;
	hp: number;
}

export interface TrainPart {
	wagon: Entity;
}

export interface Town {
	width: number;
	height: number;
	track: {
		x: number;
		y: number;
		nextDirection?: number;
	}[];
}

export interface Item {
	label: string;
	type: "gold" | "horse" | "weapon";
}

interface Components {
	position: Position;
	visual: Visual;
	actor: Actor;
	person: Person;

	town: Town;
	building: Building;

	train: Train;
	wagon: Wagon;
	trainPart: TrainPart;

	item: Item;
}

export const world = new face.World<Components>();
export const spatialIndex = new face.SpatialIndex(world);
export const scheduler = new face.DurationActorScheduler(world);

(window as any).world = world;
