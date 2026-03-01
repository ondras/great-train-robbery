import Pane from "./pane.ts";
import { world, Entity } from "../world.ts";
import { confirm } from "./dialog.ts";


export default class Saloon extends Pane {

	constructor() {
		super("saloon");

		this.node.append(this.personTable);
	}

	activate() {
		super.activate();
		this.renderPersons();
	}

	handleKey(e: KeyboardEvent): boolean {
		const { activePerson } = this;

		if (activePerson) {
			switch (e.key.toLowerCase()) {
				case "f": this.tryFire(activePerson); return true;
				case "h": this.tryHire(activePerson); return true;
			}
		}

		let entity = this.keyToEntity(e);
		if (!entity) { return false; }

		this.activePerson = entity;
		this.renderPersons();

		return true;
	}

	protected async tryHire(entity: Entity) {
		const { person } = world.requireComponents(entity, "person", "visual");

		let content = this.template(".confirm-hire", {name: person.name, gold: person.price});
		let ok = await confirm(content);
		if (!ok) { return; }

		person.active = true;
		this.renderPersons();
	}

	protected async tryFire(entity: Entity) {
		const { person } = world.requireComponents(entity, "person", "visual");

		let content = this.template(".confirm-fire", {name: person.name, gold: person.price});
		let ok = await confirm(content);
		if (!ok) { return; }

		person.active = false;
		this.renderPersons();
	}

	protected renderPersons() {
		let { activePerson } = this;
		let results = world.findEntities("person", "visual");
		let entities = [...results.keys()];

		function personBuilder(row: HTMLTableRowElement, entity: Entity) {
			let { person } = world.requireComponents(entity, "person");

			let price = row.insertCell();
			price.classList.add("price");
			price.textContent = `price: ${person.price}$`;

			if (entity == activePerson) {
				let action = row.insertCell();

				if (person.active) {
					action.innerHTML = "<kbd>F</kbd>ire";
				} else {
					action.innerHTML = "<kbd>H</kbd>ire";
				}
			}
		}

		super.renderPersons(entities, personBuilder);
	}
}

function money(amount: number): string {
	return `<span class="gold">${amount}$</span>`;
}
