export const DIRS_4 = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0]
];

export const DIRS_8 = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[1, 0],
	[1, 1],
	[0, 1],
	[-1, 1],
	[-1, 0]
]


interface HasXY { x: number, y: number }
export function id(what: HasXY): string { return`${what.x},${what.y}`; }

export function sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }

export function template(selector: string, values: Record<string, string> = {}) {
	let d = document.querySelector<HTMLTemplateElement>(selector)!;

	let frag = d.content.cloneNode(true) as DocumentFragment;
	Object.entries(values).forEach(([key, value]) => {
		frag.querySelector(`.${key}`)!.textContent = value;
	});

	return frag;
}
