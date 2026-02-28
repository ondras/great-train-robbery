import * as face from "https://cdn.jsdelivr.net/gh/ondras/face@main/face.ts"
import { Train, TrainPart } from "./train.ts"
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
}

export interface Inventory {
	items: Entity[];
}

interface Components {
	position: Position;
	visual: Visual;
	actor: Actor;
	train: Train;
	trainPart: TrainPart;
	person: Person;
}

export const world = new face.World<Components>();
export const spatialIndex = new face.SpatialIndex(world);
export const scheduler = new face.FairActorScheduler(world);
