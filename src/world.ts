import * as face from "https://cdn.jsdelivr.net/gh/ondras/face@main/face.ts"
import { Wagon } from "./npc/train.ts"
import { Task } from "./npc/tasks.ts"


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

export interface Track {
	positions: {
		x: number;
		y: number;
		nextDirection?: number;
	}[];
}

export interface Train {
	wagons: Wagon[];
	track: Entity;
}

export interface TrainPart {
	wagon: Wagon;
	pathIndex: number;
}

export interface Town {
	width: number;
	height: number;
}

interface Components {
	position: Position;
	visual: Visual;
	actor: Actor;
	train: Train;
	trainPart: TrainPart;
	person: Person;
	building: Building;
	track: Track;
	town: Town;
}

export const world = new face.World<Components>();
export const spatialIndex = new face.SpatialIndex(world);
export const scheduler = new face.FairActorScheduler(world);
