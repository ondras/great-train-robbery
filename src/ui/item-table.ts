interface Options<T> {
	rowBuilder: (row: HTMLTableRowElement, item: T, isActive: boolean) => void;
	activeId?: number;
}

export default class ItemTable<T extends {id:number}> {
	protected numberToId = new Map<number, number>();
	protected offset = 0;

	constructor(protected options: Options<T>) {
	}

	build(data: T[]): HTMLTableElement {
		const { options, offset } = this;

		let table = document.createElement("table");

		data.forEach((item, index) => {
			let number = (index + 1 + offset) % 10;
			this.numberToId.set(number, item.id);

			let row = table.insertRow();
			let isActive = (item.id == options.activeId);
			row.classList.toggle("active", isActive);

			row.insertCell().innerHTML = `[<kbd>${number}</kbd>]`;

			options.rowBuilder(row, item, isActive);
		});

		this.offset += data.length;

		return table;
	}

	keyToId(e: KeyboardEvent): number | undefined {
		const { numberToId } = this;

		let r = e.code.match(/^(Digit|Numpad)(\d)$/);
		if (r) {
			let num = Number(r[2]);
			return numberToId.get(num);
		}
	}
}
