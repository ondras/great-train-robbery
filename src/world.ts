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

export interface Actor {
	wait: number;
	tasks: Task[];
}

export interface Person {
	name: string;
	items: Entity[];
	price: number;
	active: boolean;
	location?: Entity; // FIXME
	hp: number;
}

export interface Inventory {
	items: Entity[];
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
	connected: boolean;
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
}

export const world = new face.World<Components>();
export const spatialIndex = new face.SpatialIndex(world);
export const scheduler = new face.FairActorScheduler(world);
