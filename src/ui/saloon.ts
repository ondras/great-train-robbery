import Pane from "./pane.ts";
import { world, Entity } from "../world.ts";


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
		let entity = this.keyToEntity(e);
		if (!entity) { return false; }

		this.activePerson = entity;
		this.renderPersons();

		return true;
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
