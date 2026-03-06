// src/ui/keyboard.ts
var handlerStack = [];
var enabled = false;
function pushHandler(handler) {
  handlerStack.push(handler);
}
function popHandler() {
  handlerStack.pop();
}
function handleEvent(e) {
  let index = handlerStack.length;
  while (index-- > 0) {
    let handler = handlerStack[index];
    let handled = typeof handler == "function" ? handler(e) : handler.handleKey(e);
    if (handled) {
      return;
    }
  }
}
function on() {
  enabled = true;
}
function off() {
  enabled = false;
}
window.addEventListener("keydown", (e) => {
  if (!enabled) {
    return;
  }
  handleEvent(e);
});

// deno:https://cdn.jsdelivr.net/gh/ondras/rl-display@ad920fa/src/storage.ts
var Storage = class {
};
function positionKey(x, y) {
  return `${x},${y}`;
}
var MapStorage = class extends Storage {
  #idToData = /* @__PURE__ */ new Map();
  #idToKey = /* @__PURE__ */ new Map();
  #keyToIds = /* @__PURE__ */ new Map();
  getById(id2) {
    return this.#idToData.get(id2);
  }
  getIdsByPosition(x, y) {
    return this.#keyToIds.get(positionKey(x, y)) || /* @__PURE__ */ new Set();
  }
  getIdByPosition(x, y, zIndex) {
    let ids = this.getIdsByPosition(x, y);
    return [
      ...ids
    ].find((id2) => this.getById(id2).zIndex == zIndex);
  }
  add(id2, data) {
    this.#idToData.set(id2, data);
    let key = positionKey(data.x, data.y);
    this.#idToKey.set(id2, key);
    this.#addIdToSet(id2, key);
  }
  update(id2, data) {
    let currentData = this.getById(id2);
    Object.assign(currentData, data);
    let currentKey = this.#idToKey.get(id2);
    let newKey = positionKey(currentData.x, currentData.y);
    if (currentKey != newKey) {
      this.#keyToIds.get(currentKey).delete(id2);
      this.#addIdToSet(id2, newKey);
      this.#idToKey.set(id2, newKey);
    }
  }
  #addIdToSet(id2, key) {
    if (this.#keyToIds.has(key)) {
      this.#keyToIds.get(key).add(id2);
    } else {
      this.#keyToIds.set(key, /* @__PURE__ */ new Set([
        id2
      ]));
    }
  }
  delete(id2) {
    this.#idToData.delete(id2);
    let key = this.#idToKey.get(id2);
    this.#keyToIds.get(key).delete(id2);
    this.#idToKey.delete(id2);
  }
  clear() {
    this.#idToData.clear();
    this.#idToKey.clear();
    this.#keyToIds.clear();
  }
  entries() {
    return this.#idToData.entries();
  }
};

// deno:https://cdn.jsdelivr.net/gh/ondras/rl-display@ad920fa/src/rl-display.ts
var EFFECTS = {
  "pulse": {
    keyframes: {
      scale: [
        1,
        1.6,
        1
      ],
      offset: [
        0,
        0.1,
        1
      ]
    },
    options: 500
  },
  "fade-in": {
    keyframes: {
      opacity: [
        0,
        1
      ]
    },
    options: 300
  },
  "fade-out": {
    keyframes: {
      opacity: [
        1,
        0
      ]
    },
    options: 300
  },
  "jump": {
    keyframes: [
      {
        scale: 1,
        translate: 0
      },
      {
        scale: "1.2 0.8",
        translate: "0 20%"
      },
      {
        scale: "0.7 1.3",
        translate: "0 -70%"
      },
      {
        scale: 1,
        translate: 0
      }
    ],
    options: 600
  },
  "explode": {
    keyframes: [
      {
        scale: 0.9,
        opacity: 1
      },
      {
        scale: 1
      },
      {
        scale: 1.3
      },
      {
        scale: 1.2
      },
      {
        scale: 1.3
      },
      {
        scale: 1.4
      },
      {
        scale: 1.3
      },
      {
        scale: "2 1.5",
        opacity: 1
      },
      {
        scale: "4 3",
        opacity: 0.5
      },
      {
        scale: "8 6",
        opacity: 0
      }
    ],
    options: 800
  }
};
var FORCED_FILL_MODE = "both";
var RlDisplay = class extends HTMLElement {
  #storage = new MapStorage();
  #canvas = document.createElement("div");
  /** By default, only the top-most character is draw. Set overlap=true to draw all of them. */
  overlap = false;
  /**
  * Computes an optimal character size if we want to fit a given number of characters into a given area.
  */
  static computeTileSize(tileCount, area, aspectRatioRange) {
    let w = Math.floor(area[0] / tileCount[0]);
    let h = Math.floor(area[1] / tileCount[1]);
    let ar = w / h;
    if (ar < aspectRatioRange[0]) {
      h = Math.floor(w / aspectRatioRange[0]);
    } else if (ar > aspectRatioRange[1]) {
      w = Math.floor(h * aspectRatioRange[1]);
    }
    return [
      w,
      h
    ];
  }
  constructor() {
    super();
    this.attachShadow({
      mode: "open"
    });
    this.#canvas.id = "canvas";
  }
  /** Number of columns (characters in horizontal direction) */
  get cols() {
    return Number(this.style.getPropertyValue("--cols")) || 20;
  }
  set cols(cols) {
    this.style.setProperty("--cols", String(cols));
  }
  /** Number of rows (characters in vertical direction) */
  get rows() {
    return Number(this.style.getPropertyValue("--rows")) || 10;
  }
  set rows(rows) {
    this.style.setProperty("--rows", String(rows));
  }
  /** Center the viewport above a given position */
  panTo(x, y, scale = 1, timing) {
    const { cols, rows } = this;
    let props = {
      "--pan-dx": ((cols - 1) / 2 - x) * scale,
      "--pan-dy": ((rows - 1) / 2 - y) * scale,
      "--scale": scale
    };
    let options = mergeTiming({
      duration: 300,
      fill: FORCED_FILL_MODE
    }, timing);
    let a = this.animate([
      props
    ], options);
    return waitAndCommit(a);
  }
  /** Reset the viewport back to the center of the canvas */
  panToCenter(timing) {
    const { cols, rows } = this;
    return this.panTo((cols - 1) / 2, (rows - 1) / 2, 1, timing);
  }
  /**
  * Draws one character (and optionally removes it from its previous position).
  */
  draw(x, y, visual, options = {}) {
    let id2 = options.id || Math.random();
    let zIndex = options.zIndex || 0;
    let existing = this.#storage.getIdByPosition(x, y, zIndex);
    if (existing && existing != id2) {
      this.delete(existing);
    }
    let node3;
    let data = this.#storage.getById(id2);
    if (data) {
      let { x: oldX, y: oldY } = data;
      this.#storage.update(id2, {
        x,
        y,
        zIndex
      });
      if (oldX != x || oldY != y) {
        this.#applyDepth(oldX, oldY);
      }
      node3 = data.node;
    } else {
      node3 = document.createElement("div");
      this.#canvas.append(node3);
      this.#storage.add(id2, {
        x,
        y,
        zIndex,
        node: node3
      });
    }
    updateVisual(node3, visual);
    updateProperties(node3, {
      "--x": x,
      "--y": y,
      "z-index": zIndex
    });
    if (options.part) {
      node3.part = options.part;
    }
    this.#applyDepth(x, y);
    return id2;
  }
  /** Move a previously drawn character to a different position */
  async move(id2, x, y, timing) {
    let data = this.#storage.getById(id2);
    if (!data) {
      return;
    }
    let existing = this.#storage.getIdByPosition(x, y, data.zIndex);
    if (existing && existing != id2) {
      this.delete(existing);
    }
    let { x: oldX, y: oldY } = data;
    this.#storage.update(id2, {
      x,
      y
    });
    this.#applyDepth(oldX, oldY);
    data.node.hidden = false;
    let props = {
      "--x": x,
      "--y": y
    };
    let options = mergeTiming({
      duration: 150,
      fill: FORCED_FILL_MODE
    }, timing);
    let a = data.node.animate([
      props
    ], options);
    await waitAndCommit(a);
    this.#applyDepth(x, y);
  }
  /** Remove a character from anywhere, based on its id */
  delete(id2) {
    let data = this.#storage.getById(id2);
    if (data) {
      data.node.remove();
      this.#storage.delete(id2);
      this.#applyDepth(data.x, data.y);
    }
  }
  /** Remove a character from a position (without requiring its id) */
  deleteAt(x, y, zIndex = 0) {
    let id2 = this.#storage.getIdByPosition(x, y, zIndex);
    if (id2) {
      this.delete(id2);
    }
  }
  /** @ignore */
  clear() {
  }
  /** Apply an animation effect. Either a pre-built string or a standardized Keyframe definition. */
  fx(id2, keyframes, options) {
    let record = this.#storage.getById(id2);
    if (!record) {
      return;
    }
    if (typeof keyframes == "string") {
      let def = EFFECTS[keyframes];
      return record.node.animate(def.keyframes, options || def.options);
    } else {
      return record.node.animate(keyframes, options);
    }
  }
  /** @ignore */
  connectedCallback() {
    this.shadowRoot.replaceChildren(createStyle(PRIVATE_STYLE), this.#canvas);
    this.cols = this.cols;
    this.rows = this.rows;
  }
  delegateEvent(e) {
    let path = e.composedPath();
    let node3 = path.shift();
    for (let [id2, data] of this.#storage.entries()) {
      if (data.node == node3) {
        return id2;
      }
    }
  }
  #applyDepth(x, y) {
    if (this.overlap) {
      return;
    }
    let ids = this.#storage.getIdsByPosition(x, y);
    let data = [
      ...ids
    ].map((id2) => this.#storage.getById(id2));
    let maxZindex = -1 / 0;
    data.forEach((data2) => maxZindex = Math.max(maxZindex, data2.zIndex));
    data.forEach((data2) => {
      data2.node.hidden = data2.zIndex < maxZindex;
    });
  }
};
function mergeTiming(options, timing) {
  if (timing !== void 0) {
    if (typeof timing == "number") {
      options.duration = timing;
    } else {
      Object.assign(options, timing);
    }
  }
  return options;
}
async function waitAndCommit(a) {
  await a.finished;
  try {
    a.commitStyles();
    a.cancel();
  } catch (e) {
  }
}
function createStyle(src) {
  let style = document.createElement("style");
  style.textContent = src;
  return style;
}
var PUBLIC_STYLE = `
@property --x {
	syntax: "<number>";
	inherits: false;
	initial-value: 0;
}

@property --y {
	syntax: "<number>";
	inherits: false;
	initial-value: 0;
}

@property --scale {
	syntax: "<number>";
	inherits: true;
	initial-value: 1;
}

@property --pan-dx {
	syntax: "<number>";
	inherits: true;
	initial-value: 0;
}

@property --pan-dy {
	syntax: "<number>";
	inherits: true;
	initial-value: 0;
}
`;
var PRIVATE_STYLE = `
:host {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	font-family: monospace;
	color: gray;
	background-color: black;
	user-select: none;
	--tile-width: 20px;
	--tile-height: 20px;
}

#canvas {
	flex: none;
	position: relative;
	width: calc(var(--tile-width) * var(--cols));
	height: calc(var(--tile-height) * var(--rows));
	scale: var(--scale);
	translate:
	    calc(var(--tile-width) * var(--pan-dx))
	    calc(var(--tile-height) * var(--pan-dy));

	div {
		display: block; /* not hidden with [hidden] */
		position: absolute;
		width: var(--tile-width);
		text-align: center;
		left: calc(var(--tile-width) * var(--x));
		top: calc(var(--tile-height) * var(--y));
		font-size: calc(var(--tile-height));
		line-height: 1;

		&[hidden] { color: transparent !important; }
	}
}
`;
customElements.define("rl-display", RlDisplay);
document.head.append(createStyle(PUBLIC_STYLE));
function updateProperties(node3, props) {
  for (let key in props) {
    node3.style.setProperty(key, props[key]);
  }
}
function updateVisual(node3, visual) {
  if (visual.ch) {
    node3.textContent = visual.ch;
  }
  let props = {};
  if (visual.fg) {
    props.color = visual.fg;
  }
  if (visual.bg) {
    props["background-color"] = visual.bg;
  }
  updateProperties(node3, props);
}

// src/display.ts
var display = new RlDisplay();
var display_default = display;

// src/ui/viewport.ts
var main = document.querySelector("#main");
var log = document.querySelector("#log");
function syncFontSize() {
  let game2 = document.querySelector("#game");
  let currentFontSize = parseInt(getComputedStyle(game2).getPropertyValue("font-size"));
  const { offsetWidth, offsetHeight } = game2;
  const { innerWidth, innerHeight } = window;
  let scaleVertical = innerHeight / offsetHeight;
  let scaleHorizontal = innerWidth / offsetWidth;
  let fontSizeVertical = Math.floor(currentFontSize * scaleVertical);
  let fontSizeHorizontal = Math.floor(currentFontSize * scaleHorizontal);
  let fontSize = Math.min(fontSizeVertical, fontSizeHorizontal);
  document.documentElement.style.fontSize = `${fontSize}px`;
}
function syncDisplaySize() {
  let cs = getComputedStyle(display_default);
  let tileWidth = cs.getPropertyValue("--tile-width");
  let tileHeight = cs.getPropertyValue("--tile-height");
  main.style.width = `calc(${display_default.cols + 1} * ${tileWidth})`;
  main.style.height = `calc(${display_default.rows + 1} * ${tileHeight})`;
  log.style.height = main.style.height;
}
function init() {
  syncDisplaySize();
  syncFontSize();
  window.addEventListener("resize", syncFontSize);
}

// deno:https://cdn.jsdelivr.net/gh/ondras/face@6dbc79c/query.ts
var Query = class extends EventTarget {
  ac = new AbortController();
  entities = /* @__PURE__ */ new Set();
  components;
  constructor(world2, ...components) {
    super();
    this.components = components;
    const options = {
      signal: this.ac.signal
    };
    world2.addEventListener("component-add", (e) => this.onAddComponent(e.detail.entity, e.detail.component), options);
    world2.addEventListener("component-remove", (e) => this.onRemoveComponent(e.detail.entity, e.detail.component), options);
    world2.addEventListener("entity-remove", (e) => this.onRemoveEntity(e.detail.entity), options);
    world2.addEventListener("reset", (e) => this.onReset(e.target), options);
    world2.findEntities(...components).keys().forEach((entity) => this.entities.add(entity));
  }
  destroy() {
    this.entities.clear();
    this.ac.abort();
  }
  onReset(world2) {
    const { entities, components } = this;
    entities.clear();
    world2.findEntities(...components).keys().forEach((entity) => entities.add(entity));
    this.dispatchEvent(new Event("change"));
  }
  onAddComponent(entity, component) {
    const { entities, components } = this;
    if (!components.includes(component)) {
      return;
    }
    entities.add(entity);
    this.dispatchEvent(new Event("change"));
  }
  onRemoveComponent(entity, component) {
    const { entities, components } = this;
    if (!components.includes(component)) {
      return;
    }
    entities.delete(entity);
    this.dispatchEvent(new Event("change"));
  }
  onRemoveEntity(entity) {
    const { entities } = this;
    if (!entities.has(entity)) {
      return;
    }
    entities.delete(entity);
    this.dispatchEvent(new Event("change"));
  }
};

// deno:https://cdn.jsdelivr.net/gh/ondras/face@6dbc79c/typed-event-target.ts
var TypedEventTarget = class extends EventTarget {
  addEventListener(type, listener, options) {
    return super.addEventListener(type, listener, options);
  }
  removeEventListener(type, listener, options) {
    return super.removeEventListener(type, listener, options);
  }
};

// deno:https://cdn.jsdelivr.net/gh/ondras/face@6dbc79c/world.ts
var World = class extends TypedEventTarget {
  storage = /* @__PURE__ */ new Map();
  counter = 0;
  /** world.createEntity({position:{x,y}}) */
  createEntity(init6) {
    let entity = ++this.counter;
    let detail = {
      entity
    };
    this.dispatchEvent(new CustomEvent("entity-create", {
      detail
    }));
    init6 && this.addComponents(entity, init6);
    return entity;
  }
  removeEntity(entity) {
    let detail = {
      entity
    };
    this.dispatchEvent(new CustomEvent("entity-remove", {
      detail
    }));
    this.storage.delete(entity);
  }
  /** world.addComponent(3, "position", {x,y}) */
  addComponent(entity, componentName, componentData) {
    const { storage } = this;
    let data = storage.get(entity);
    if (!data) {
      data = {};
      storage.set(entity, data);
    }
    data[componentName] = componentData;
    let detail = {
      entity,
      component: componentName
    };
    this.dispatchEvent(new CustomEvent("component-add", {
      detail
    }));
  }
  /** world.addComponent(3, {position:{x,y}, name:{...}}) */
  addComponents(entity, components) {
    for (let name in components) {
      this.addComponent(entity, name, components[name]);
    }
  }
  /** world.removeComponents(3, "position", "name", ...) */
  removeComponents(entity, ...components) {
    const { storage } = this;
    let data = storage.get(entity);
    components.forEach((component) => {
      delete data[component];
      let detail = {
        entity,
        component
      };
      this.dispatchEvent(new CustomEvent("component-remove", {
        detail
      }));
    });
  }
  /** world.hasComponents(3, "position", "name", ...) */
  hasComponents(entity, ...components) {
    let data = this.storage.get(entity);
    if (!data) {
      return false;
    }
    return keysPresent(data, components);
  }
  /** world.findEntities("position") -> Map<3, {position:{x,y}}> */
  findEntities(...components) {
    let result = /* @__PURE__ */ new Map();
    for (let [entity, storage] of this.storage.entries()) {
      if (!keysPresent(storage, components)) {
        continue;
      }
      result.set(entity, storage);
    }
    return result;
  }
  /** world.getComponent(3, "position") -> {x,y} | undefined */
  getComponent(entity, component) {
    let data = this.storage.get(entity);
    return data ? data[component] : void 0;
  }
  /** world.getComponents(3, "position", "name") -> {position:{x,y}, name:{...}} | undefined */
  getComponents(entity, ...components) {
    let data = this.storage.get(entity);
    if (!data || !keysPresent(data, components)) {
      return void 0;
    }
    return data;
  }
  /** world.requireComponent(3, "position") -> {x,y} | throw */
  requireComponent(entity, component) {
    let result = this.getComponent(entity, component);
    if (!result) {
      throw new Error(`entity ${entity} is missing the required component ${component}`);
    }
    return result;
  }
  /** world.getComponents(3, "position", "name") -> {position:{x,y}, name:{...}} | throw */
  requireComponents(entity, ...components) {
    let result = this.getComponents(entity, ...components);
    if (!result) {
      throw new Error(`entity ${entity} is missing the required components ${components}`);
    }
    return result;
  }
  query(...components) {
    return new Query(this, ...components);
  }
  toString() {
    let dict = {};
    for (let [entity, components] of this.storage.entries()) {
      dict[entity] = components;
    }
    return JSON.stringify(dict);
  }
  fromString(str) {
    let dict = JSON.parse(str);
    this.storage.clear();
    for (let key in dict) {
      this.storage.set(Number(key), dict[key]);
    }
    this.dispatchEvent(new CustomEvent("reset"));
  }
};
function keysPresent(data, keys) {
  return keys.every((key) => key in data);
}

// deno:https://cdn.jsdelivr.net/gh/ondras/face@6dbc79c/scheduler.ts
var DurationActorScheduler = class {
  world;
  query;
  constructor(world2) {
    this.world = world2;
    this.query = world2.query("actor");
  }
  next() {
    const { world: world2, query } = this;
    let { entities } = query;
    let actors = /* @__PURE__ */ new Map();
    entities.forEach((entity) => actors.set(entity, world2.requireComponent(entity, "actor")));
    let minEntity = findMinWait(actors);
    if (!minEntity) {
      return void 0;
    }
    let minWait = actors.get(minEntity).wait;
    actors.forEach((actor) => actor.wait -= minWait);
    return minEntity;
  }
  commit(entity, duration) {
    this.world.requireComponent(entity, "actor").wait += duration;
  }
};
function findMinWait(actors) {
  let minWait = 1 / 0;
  let minEntity;
  actors.forEach((actor, entity) => {
    if (actor.wait < minWait) {
      minWait = actor.wait;
      minEntity = entity;
    }
  });
  return minEntity;
}

// deno:https://cdn.jsdelivr.net/gh/ondras/face@6dbc79c/spatial-index.ts
var SpatialIndex = class {
  world;
  data = [];
  entityToSet = /* @__PURE__ */ new Map();
  constructor(world2) {
    this.world = world2;
  }
  update(entity) {
    const { world: world2, data, entityToSet } = this;
    const existingSet = entityToSet.get(entity);
    if (existingSet) {
      existingSet.delete(entity);
      entityToSet.delete(entity);
    }
    const position = world2.getComponent(entity, "position");
    if (position) {
      const storage = getSetFor(position.x, position.y, data);
      storage.add(entity);
      entityToSet.set(entity, storage);
    }
  }
  list(x, y) {
    if (x < 0 || y < 0) {
      return /* @__PURE__ */ new Set();
    }
    return getSetFor(x, y, this.data);
  }
  reset() {
    const { world: world2 } = this;
    this.data = [];
    let entities = world2.findEntities("position").keys();
    for (let entity of entities) {
      this.update(entity);
    }
  }
};
function getSetFor(x, y, data) {
  while (data.length <= x) {
    data.push([]);
  }
  const col = data[x];
  while (col.length <= y) {
    col.push(/* @__PURE__ */ new Set());
  }
  return col[y];
}

// src/world.ts
var world = new World();
var spatialIndex = new SpatialIndex(world);
var scheduler = new DurationActorScheduler(world);
window.world = world;

// src/rules.ts
var initialMoney = 4e3;
var personHp = 5;
var personPrice = 400;
var personBonusChance = 0.4;
var locomotiveHp = 15;
var wagonHp = 10;
var baseTaskDuration = 10;
var trainTaskDuration = 3;
var goldPrice = 1e3;
var droppedGoldCount = 2;
var droppedGuardCount = 2;
var roofRangeBonus = 5;
var punchDamage = 1;
var guardHp = 3;
var guardGun = {
  range: 3,
  damage: 2,
  explosionRadius: 0,
  duration: 2
};
var personQuery = world.query("person");
function currentMoney() {
  let money = initialMoney;
  let entities = personQuery.entities;
  for (let entity of entities) {
    let person = world.requireComponent(entity, "person");
    if (person.relation != "party") {
      continue;
    }
    money -= person.price;
    person.items.forEach((entity2) => {
      let item = world.requireComponent(entity2, "item");
      if (item.type == "gold") {
        return;
      }
      money -= item.price;
    });
  }
  return money;
}

// src/ui/status.ts
var node = document.querySelector("#status");
var dom = {
  node,
  status: node.querySelector(".status"),
  party: node.querySelector(".party"),
  money: node.querySelector(".money"),
  hp: node.querySelector(".hp")
};
function updateMoney() {
  let current = currentMoney();
  dom.money.innerHTML = `<span class="gold">${current}</span>`;
}
function updateParty() {
  let results = [
    ...personQuery.entities
  ].map((entity) => world.requireComponents(entity, "person", "visual")).filter((result) => result.person.relation == "party");
  if (results.length == 0) {
    dom.party.textContent = "(no members)";
    dom.hp.textContent = "(no members)";
    return;
  }
  let party = [];
  let hp = [];
  results.forEach((result) => {
    party.push(`<span style="color:${result.visual.fg}">@</span>`);
    hp.push(`${Math.max(0, result.person.hp)}`);
  });
  dom.party.innerHTML = party.join(" ");
  dom.hp.innerHTML = hp.join(" ");
}
function update() {
  updateMoney();
  updateParty();
}
function setMode(mode) {
  switch (mode) {
    case "planning":
      dom.status.innerHTML = "<strong>planning the robbery</strong>";
      break;
    case "action":
      dom.status.innerHTML = "<strong>the heist is on!</strong> Press [<kbd>Space</kbd>] to pause.";
      break;
    case "paused":
      dom.status.innerHTML = "<strong>the heist is paused!</strong> Press [<kbd>Space</kbd>] to continue, [<kbd>A</kbd>] to abort.";
      break;
  }
  update();
}

// src/ui/log.ts
var node2 = document.querySelector("#log");
var lastParagraphNode = null;
var lastMessageNode = null;
var lastMessage = "";
var lastMessageCount = 0;
function newline() {
  lastParagraphNode = null;
  lastMessageNode = null;
  lastMessage = "";
  lastMessageCount = 0;
}
function add(message) {
  if (!lastParagraphNode) {
    lastParagraphNode = document.createElement("p");
    node2.append(lastParagraphNode);
  }
  if (message == lastMessage) {
    lastMessageCount++;
    lastMessageNode.innerHTML = `${message}(x${lastMessageCount})`;
  } else {
    lastMessage = message;
    lastMessageCount = 1;
    lastMessageNode = document.createElement("span");
    lastMessageNode.innerHTML = message;
    lastParagraphNode.append(lastMessageNode, " ");
  }
  node2.scrollTop = node2.scrollHeight;
}
function clear() {
  node2.replaceChildren();
  newline();
}
function extractName(entity, type) {
  let named = world.getComponent(entity, "named");
  if (!named) {
    return `entity ${entity}`;
  }
  let { name } = named;
  if (name.charAt(0) == name.charAt(0).toUpperCase()) {
    return `<i>${name}</i>`;
  }
  if (named.unique) {
    return `the ${name}`;
  }
  switch (type.toLowerCase()) {
    case "a":
      return `a ${name}`;
    case "the":
      return `the ${name}`;
    default:
      return name;
  }
}
function s(e, type) {
  let name = extractName(e, type);
  if (type.charAt(0) == type.charAt(0).toUpperCase()) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
}
function format(message, ...entities) {
  entities = entities.slice();
  return message.replace(/%(\w+)/g, (_, type) => s(entities.shift(), type));
}

// src/ui/pane.ts
var Pane = class {
  node;
  activeKeyHandlers = [];
  constructor(id2) {
    this.node = document.querySelector(`#${id2}`);
    this.node.hidden = true;
  }
  handleKey(e) {
    let handler = this.activeKeyHandlers.find((h) => {
      if (h.key && h.key.toLowerCase() == e.key.toLowerCase()) {
        return true;
      }
      if (h.code && h.code == e.code) {
        return true;
      }
      return false;
    });
    if (!handler) {
      return false;
    }
    handler.cb(e);
    return true;
  }
  activate() {
    this.node.hidden = false;
    pushHandler(this);
  }
  deactivate() {
    popHandler();
    this.node.hidden = true;
  }
};

// src/dirs.ts
var DIRS_4 = [
  [
    0,
    -1
  ],
  [
    1,
    0
  ],
  [
    0,
    1
  ],
  [
    -1,
    0
  ]
];
var DIRS_8 = [
  [
    -1,
    -1
  ],
  [
    0,
    -1
  ],
  [
    1,
    -1
  ],
  [
    1,
    0
  ],
  [
    1,
    1
  ],
  [
    0,
    1
  ],
  [
    -1,
    1
  ],
  [
    -1,
    0
  ]
];

// src/npc/util.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function dist4(a, b) {
  const dx = Math.abs(a[0] - b[0]);
  const dy = Math.abs(a[1] - b[1]);
  return dx + dy;
}
function dist8(a, b) {
  const dx = Math.abs(a[0] - b[0]);
  const dy = Math.abs(a[1] - b[1]);
  return Math.max(dx, dy);
}
function distEuclidean(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}
function computePath(a, b) {
  let dx = b[0] - a[0];
  let dy = b[1] - a[1];
  let dist = dist8(a, b);
  let path = [];
  for (let i = 0; i <= dist; i++) {
    let x = a[0] + Math.round(dx * i / dist);
    let y = a[1] + Math.round(dy * i / dist);
    path.push([
      x,
      y
    ]);
  }
  return path;
}
function getFreeNeighbors(center, forceInsideTown) {
  let { town } = world.findEntities("town").values().next().value;
  return DIRS_8.map((dir) => [
    center[0] + dir[0],
    center[1] + dir[1]
  ]).filter(([x, y]) => {
    if (forceInsideTown) {
      if (x < 0 || y < 0 || x >= town.width || y >= town.height) {
        return false;
      }
    }
    let targetEntities = spatialIndex.list(x, y);
    return [
      ...targetEntities
    ].every((e) => {
      let blocks = world.getComponent(e, "blocks");
      if (!blocks) {
        return true;
      }
      return !blocks.movement;
    });
  });
}
function getDurationWithHorse(entity) {
  let person = world.requireComponent(entity, "person");
  for (let itemEntity of person.items) {
    let item = world.requireComponent(itemEntity, "item");
    if (item.type == "horse") {
      return item.duration;
    }
  }
  let actor = world.getComponent(entity, "actor");
  return actor ? actor.duration : baseTaskDuration;
}

// src/conf.ts
var MOVE_DELAY = 40;
var ATTACK_DELAY = 200;

// src/npc/train.ts
var WAGONS = 3;
var WAGON_LENGTH = 3;
var WAGON = [
  "\u2507oo",
  "\u2505oo",
  "\u2507oo",
  "\u2505oo"
];
var LOCOMOTIVE = [
  [
    "\u{1F809}",
    "\u25FC",
    "T"
  ],
  [
    "\u{1F80A}",
    "\u25FC",
    "T"
  ],
  [
    "\u{1F80B}",
    "\u25FC",
    "T"
  ],
  [
    "\u{1F808}",
    "\u25FC",
    "T"
  ]
];
var GUARD_VISUAL = {
  ch: "@",
  fg: "#666",
  zIndex: 2
};
var GOLD_VISUAL = {
  ch: "$",
  fg: "gold",
  zIndex: 1
};
function color(hpFraction) {
  let hue = 0;
  let saturation = 80;
  let lightness = (1 - hpFraction) * 40;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}
function create(trackOffset) {
  let actor = {
    wait: 0,
    tasks: [
      {
        type: "train"
      }
    ],
    duration: trainTaskDuration
  };
  let train = world.createEntity({
    actor
  });
  let wagons = [];
  for (let i = 0; i < WAGONS + 1; i++) {
    let parts = [];
    let locomotive = i == 0;
    let hp = locomotive ? locomotiveHp : wagonHp;
    let wagon = {
      train,
      parts,
      hp,
      locomotive
    };
    let wagonEntity = world.createEntity({
      wagon
    });
    wagons.push(wagonEntity);
    let named = {
      name: i == 0 ? "locomotive" : "train",
      unique: true
    };
    for (let j = 0; j < WAGON_LENGTH; j++) {
      let trainPart = {
        wagon: wagonEntity
      };
      let blocks = {
        projectile: true,
        movement: true
      };
      let part = "train";
      if (i > 0 && j == 0) {
        part = void 0;
      }
      let visual = {
        ch: "",
        fg: color(1),
        part,
        zIndex: 2
      };
      let trainPartEntity = world.createEntity({
        trainPart,
        blocks,
        visual,
        named
      });
      parts.push(trainPartEntity);
    }
  }
  let trainComponent = {
    wagons,
    trackOffset
  };
  world.addComponent(train, "train", trainComponent);
  updateTrainPositions(trainComponent);
  return train;
}
function updateTrainPartPosition(partEntity, index, town, wagonIndex, partIndex) {
  let position = world.getComponent(partEntity, "position");
  if (index < 0 || index >= town.track.length) {
    if (position) {
      world.removeComponents(partEntity, "position");
      spatialIndex.update(partEntity);
      display_default.delete(partEntity);
    }
    return;
  }
  let { x, y, nextDirection } = town.track[index];
  if (position) {
    position.x = x;
    position.y = y;
  } else {
    world.addComponent(partEntity, "position", {
      x,
      y
    });
  }
  let visual = world.requireComponent(partEntity, "visual");
  updateTrainPartVisual(visual, wagonIndex, partIndex, nextDirection);
  display_default.draw(x, y, visual, {
    id: partEntity,
    zIndex: visual.zIndex,
    part: visual.part
  });
  spatialIndex.update(partEntity);
}
function updateTrainPositions(train) {
  const { town } = world.findEntities("town").values().next().value;
  let index = train.trackOffset;
  train.wagons.forEach((wagonEntity, i) => {
    let { parts } = world.requireComponent(wagonEntity, "wagon");
    parts.forEach((partEntity, j) => {
      updateTrainPartPosition(partEntity, index, town, i, j);
      index--;
    });
  });
}
function updateTrainPartVisual(visual, wagonIndex, partIndex, nextDirection) {
  let templates = wagonIndex == 0 ? LOCOMOTIVE : WAGON;
  visual.ch = templates[nextDirection][partIndex];
}
async function move(entity) {
  let { train, actor } = world.requireComponents(entity, "train", "actor");
  train.trackOffset++;
  const { town } = world.findEntities("town").values().next().value;
  if (train.trackOffset < town.track.length) {
    let { x, y } = town.track[train.trackOffset];
    let damage = {
      amount: 10,
      explosionRadius: 0
    };
    await damagePosition([
      x,
      y
    ], damage);
  }
  updateTrainPositions(train);
  await sleep(MOVE_DELAY);
  return actor.duration;
}
function getAllPositions(isLocomotive) {
  let results = world.findEntities("trainPart", "position");
  let positions = [];
  for (let result of results.values()) {
    let wagon = world.requireComponent(result.trainPart.wagon, "wagon");
    if (wagon.locomotive != isLocomotive) {
      continue;
    }
    positions.push([
      result.position.x,
      result.position.y
    ]);
  }
  return positions;
}
function createGuard(x, y, hasGun) {
  let gun = world.createEntity({
    item: {
      type: "weapon",
      price: 0,
      ...guardGun
    }
  });
  let items = [];
  if (hasGun) {
    items.push(gun);
  }
  let visual = GUARD_VISUAL;
  let tasks = [
    {
      type: "attack",
      target: "party"
    },
    {
      type: "escape",
      withGold: false
    }
  ];
  let guard = world.createEntity({
    person: {
      items,
      price: 0,
      relation: "enemy",
      hp: guardHp,
      maxHp: guardHp
    },
    actor: {
      wait: 0,
      duration: baseTaskDuration,
      tasks
    },
    position: {
      x,
      y
    },
    blocks: {
      projectile: false,
      movement: true
    },
    visual,
    named: {
      name: "guard"
    }
  });
  spatialIndex.update(guard);
  display_default.draw(x, y, visual, {
    id: guard,
    zIndex: visual.zIndex
  });
}
function dropGoldAndGuards(positions) {
  function removePosition(pos) {
    let i = positions.length;
    while (i-- > 0) {
      if (positions[i][0] == pos[0] && positions[i][1] == pos[1]) {
        positions.splice(i, 1);
      }
    }
  }
  for (let i = 0; i < droppedGuardCount; i++) {
    let position = positions.random();
    removePosition(position);
    createGuard(position[0], position[1], i % 2 == 0);
  }
  add("Security guards jump out of the damaged wagon.");
  for (let i = 0; i < droppedGoldCount; i++) {
    let position = positions.random();
    removePosition(position);
    let visual = GOLD_VISUAL;
    let gold = world.createEntity({
      position: {
        x: position[0],
        y: position[1]
      },
      item: {
        type: "gold",
        price: goldPrice
      },
      visual,
      named: {
        name: "bag of gold"
      }
    });
    spatialIndex.update(gold);
    display_default.draw(position[0], position[1], visual, {
      id: gold,
      zIndex: visual.zIndex
    });
  }
  add("Several bags with money are scattered on the ground!");
}
function disconnectLastWagon(train) {
  let wagonEntity = train.wagons.at(-1);
  let forceInsideTown = true;
  let freePositions = [];
  let { parts } = world.requireComponent(wagonEntity, "wagon");
  parts.forEach((partEntity) => {
    world.removeComponents(partEntity, "trainPart", "blocks");
    let position = world.getComponent(partEntity, "position");
    if (position) {
      freePositions.push(...getFreeNeighbors([
        position.x,
        position.y
      ], forceInsideTown));
    }
  });
  train.wagons.pop();
  add("The last wagon is so damaged that it disconnects from the train.");
  dropGoldAndGuards(freePositions);
  newline();
}
function getLocomotivePosition() {
  let results = world.findEntities("wagon");
  for (let { wagon } of results.values()) {
    if (!wagon.locomotive) {
      continue;
    }
    let parts = wagon.parts.slice().reverse();
    for (let part of parts) {
      let position = world.getComponent(part, "position");
      if (position) {
        return [
          position.x,
          position.y
        ];
      }
    }
  }
}
function updateSpeed(train) {
  let locomotive = world.requireComponent(train.wagons[0], "wagon");
  let actor = world.requireComponent(locomotive.train, "actor");
  let hpFraction = locomotive.hp / locomotiveHp;
  actor.duration = trainTaskDuration + (1 - hpFraction) * 10;
  if (locomotive.hp <= 0) {
    world.removeComponents(locomotive.train, "actor");
    locomotive.parts.forEach((part) => world.removeComponents(part, "trainPart"));
    add("The locomotive is completely broken. The train is stopped!");
    newline();
  } else {
    add("The train slows down a bit.");
  }
}

// src/npc/damage.ts
function damageTrain(trainComponent, isLocomotive, damage) {
  if (isLocomotive) {
    let wagon = world.requireComponent(trainComponent.wagons[0], "wagon");
    wagon.hp -= damage.amount;
    updateSpeed(trainComponent);
  } else {
    let lastWagon = world.requireComponent(trainComponent.wagons.at(-1), "wagon");
    lastWagon.hp -= damage.amount;
    let fraction = lastWagon.hp / wagonHp;
    let color3 = color(fraction);
    for (let part of lastWagon.parts) {
      let visual = world.requireComponent(part, "visual");
      visual.fg = color3;
      let position = world.getComponent(part, "position");
      position && display_default.draw(position.x, position.y, visual, {
        id: part,
        zIndex: visual.zIndex
      });
    }
    if (lastWagon.hp <= 0) {
      disconnectLastWagon(trainComponent);
    }
  }
}
function damagePerson(person, entity, damage) {
  person.hp -= damage.amount;
  if (person.hp <= 0) {
    world.removeComponents(entity, "position", "actor");
    spatialIndex.update(entity);
    display_default.delete(entity);
    let str = format("%The is killed!", entity);
    add(str);
    newline();
  }
  update();
}
async function drawExplosion(position, radius) {
  let ids = [];
  const COLORS = [
    "#ff0",
    "#f00",
    "#f80"
  ];
  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      let x = position[0] + i;
      let y = position[1] + j;
      let id2 = display_default.draw(x, y, {
        ch: "*",
        fg: COLORS.random()
      }, {
        zIndex: 3
      });
      ids.push(id2);
    }
  }
  await sleep(500);
  ids.forEach((id2) => display_default.delete(id2));
}
async function damagePosition(position, damage) {
  if (damage.explosionRadius > 0) {
    let r = damage.explosionRadius;
    await drawExplosion(position, r);
    for (let i = -r; i <= r; i++) {
      for (let j = -r; j <= r; j++) {
        let x = position[0] + i;
        let y = position[1] + j;
        damagePosition([
          x,
          y
        ], {
          amount: damage.amount,
          explosionRadius: 0
        });
      }
    }
    return;
  }
  let entities = spatialIndex.list(position[0], position[1]);
  for (let entity of entities) {
    let trainPart = world.getComponent(entity, "trainPart");
    if (trainPart) {
      let wagon = world.requireComponent(trainPart.wagon, "wagon");
      let train = world.requireComponent(wagon.train, "train");
      damageTrain(train, wagon.locomotive, damage);
    }
    let person = world.getComponent(entity, "person");
    person && damagePerson(person, entity, damage);
    let item = world.getComponent(entity, "item");
    if (item && item.type == "dynamite") {
      world.removeComponents(entity, "position");
      spatialIndex.update(entity);
      newline();
      add("The dynamite explodes!");
      damage = {
        amount: item.damage,
        explosionRadius: 2
      };
      await damagePosition(position, damage);
    }
  }
}

// src/npc/task-attack.ts
var SHOT_VISUAL = {
  ch: "*",
  fg: "#fff",
  zIndex: 3
};
function getTargetPositions(task, weapon) {
  let positions = [];
  switch (task.target) {
    case "guard": {
      for (let entity of personQuery.entities) {
        let result = world.getComponents(entity, "position", "person");
        if (!result) {
          continue;
        }
        if (result.person.relation != "enemy") {
          continue;
        }
        positions.push([
          result.position.x,
          result.position.y
        ]);
      }
      return positions;
    }
    case "locomotive":
      return getAllPositions(true);
    case "wagon":
      return getAllPositions(false);
    case "party": {
      for (let entity of personQuery.entities) {
        let result = world.getComponents(entity, "position", "person");
        if (!result) {
          continue;
        }
        const { person, position } = result;
        if (person.relation != "party") {
          continue;
        }
        if (person.building) {
          let building = world.requireComponent(person.building, "building");
          if (building.roof && !weapon) {
            continue;
          }
        }
        positions.push([
          position.x,
          position.y
        ]);
      }
      return positions;
    }
  }
}
function sortPositions(positions, target) {
  function CMP_DIST(a, b) {
    let da = dist8(a, target);
    let db = dist8(b, target);
    return da - db;
  }
  return positions.sort(CMP_DIST);
}
function getBlockerAt(pos) {
  let entities = spatialIndex.list(pos[0], pos[1]);
  return [
    ...entities
  ].find((e) => {
    let blocks = world.getComponent(e, "blocks");
    return blocks && blocks.projectile;
  });
}
async function doAttack(entity, target, weapon) {
  let { position, actor } = world.requireComponents(entity, "position", "actor");
  let currentPosition = [
    position.x,
    position.y
  ];
  let targetEntity = getBlockerAt(target);
  if (targetEntity) {
    let str = format(`%A ${weapon.verb} %a.`, entity, targetEntity);
    add(str);
  }
  let dist = distEuclidean(currentPosition, target);
  if (dist > 2 || weapon.damage.explosionRadius > 0) {
    let visual = SHOT_VISUAL;
    let id2 = "shot";
    display_default.draw(currentPosition[0], currentPosition[1], visual, {
      id: id2,
      zIndex: visual.zIndex
    });
    await display_default.move(id2, target[0], target[1], 20 * dist);
    display_default.delete(id2);
  }
  await damagePosition(target, weapon.damage);
  await sleep(ATTACK_DELAY);
  return actor.duration + weapon.duration;
}
function canBeAttacked(target, current, weapon, building) {
  let dist = distEuclidean(current, target);
  if (dist > weapon.range) {
    return false;
  }
  if (building && building.roof) {
    return true;
  }
  let path = computePath(current, target);
  path.shift();
  path.pop();
  if (path.some((pos) => getBlockerAt(pos))) {
    return false;
  }
  return true;
}
function canBeReached(target, current, weapon, building) {
  if (!building || !building.roof) {
    return true;
  }
  let { x, y, width, height } = building;
  let corners = [
    [
      x + 1,
      y + 1
    ],
    [
      x + width - 2,
      y + 1
    ],
    [
      x + 1,
      y + height - 2
    ],
    [
      x + width - 2,
      y + height - 2
    ]
  ];
  return corners.some((corner) => {
    let dist = distEuclidean(corner, target);
    return dist <= weapon.range;
  });
}
async function attack(entity, task) {
  let weapon = void 0;
  let building = void 0;
  let person = world.getComponent(entity, "person");
  if (person) {
    if (person.building) {
      building = world.requireComponent(person.building, "building");
    }
    person.items.forEach((e) => {
      let item = world.requireComponent(e, "item");
      if (item.type == "weapon") {
        weapon = {
          verb: "shoots at",
          range: item.range + (building && building.roof ? roofRangeBonus : 0),
          damage: {
            amount: item.damage,
            explosionRadius: item.explosionRadius || 0
          },
          duration: item.duration
        };
      }
    });
  }
  const { position } = world.requireComponents(entity, "position");
  const currentPosition = [
    position.x,
    position.y
  ];
  let candidatePositions = getTargetPositions(task, weapon);
  sortPositions(candidatePositions, currentPosition);
  if (!weapon) {
    weapon = {
      verb: "punches",
      damage: {
        amount: punchDamage,
        explosionRadius: 0
      },
      range: 1.5,
      duration: 0
    };
  }
  let attackablePositions = [];
  let reachablePositions = [];
  candidatePositions.forEach((pos) => {
    if (canBeAttacked(pos, currentPosition, weapon, building)) {
      attackablePositions.push(pos);
    }
    if (canBeReached(pos, currentPosition, weapon, building)) {
      reachablePositions.push(pos);
    }
  });
  if (attackablePositions.length > 0) {
    let target = attackablePositions[0];
    return doAttack(entity, target, weapon);
  }
  if (reachablePositions.length > 0) {
    let target = reachablePositions[0];
    return moveCloser(entity, target);
  }
  return 0;
}

// src/npc/task-move.ts
async function wander(entity) {
  let position = world.requireComponent(entity, "position");
  let forceInsideTown = true;
  let neighbors = getFreeNeighbors([
    position.x,
    position.y
  ], forceInsideTown);
  if (neighbors.length == 0) {
    return 0;
  }
  let neighbor = neighbors.random();
  position.x = neighbor[0];
  position.y = neighbor[1];
  spatialIndex.update(entity);
  await display_default.move(entity, position.x, position.y, MOVE_DELAY);
  return 0;
}
async function move2(entity, task) {
  let position;
  switch (task.target) {
    case "center":
      {
        let { town } = world.findEntities("town").values().next().value;
        position = [
          Math.round(town.width / 2),
          Math.round(town.height / 2)
        ];
      }
      break;
    case "locomotive":
      {
        position = getLocomotivePosition();
        if (!position) {
          return 0;
        }
      }
      break;
  }
  return moveCloser(entity, position);
}

// src/npc/task-collect.ts
function sortPositions2(positions, target) {
  function CMP_DIST(a, b) {
    let da = distEuclidean(a, target);
    let db = distEuclidean(b, target);
    return da - db;
  }
  return positions.sort(CMP_DIST);
}
function doCollect(entity, item) {
  let person = world.requireComponent(entity, "person");
  person.items.push(item);
  let str = format("%A picks up %a.", entity, item);
  add(str);
  display_default.delete(item);
  world.removeComponents(item, "position");
  spatialIndex.update(item);
  return getDurationWithHorse(entity);
}
async function collect(entity) {
  const { position, person } = world.requireComponents(entity, "position", "person");
  if (person.building) {
    let building = world.requireComponent(person.building, "building");
    if (building.roof) {
      return 0;
    }
  }
  let entitiesHere = [
    ...spatialIndex.list(position.x, position.y)
  ].filter((e) => world.hasComponents(e, "item"));
  if (entitiesHere.length > 0) {
    await sleep(MOVE_DELAY);
    return doCollect(entity, entitiesHere[0]);
  }
  let results = world.findEntities("item", "position");
  let positions = [
    ...results.values()
  ].filter((result) => result.item.type == "gold").map((result) => [
    result.position.x,
    result.position.y
  ]);
  if (!positions.length) {
    return 0;
  }
  const currentPosition = [
    position.x,
    position.y
  ];
  sortPositions2(positions, currentPosition);
  let targetPosition = positions[0];
  return moveCloser(entity, targetPosition);
}

// src/npc/task-escape.ts
function isItemGold(entity) {
  let item = world.requireComponent(entity, "item");
  return item.type == "gold";
}
async function escape(entity, task) {
  if (task.withGold) {
    let { items } = world.requireComponent(entity, "person");
    if (!items.some(isItemGold)) {
      return 0;
    }
  }
  let { town } = world.findEntities("town").values().next().value;
  let center = [
    town.width / 2,
    town.height / 2
  ];
  let duration = await moveFurther(entity, center);
  if (!world.hasComponents(entity, "position")) {
    world.removeComponents(entity, "actor");
    let person = world.requireComponent(entity, "person");
    let verb = person.relation == "party" ? "escapes" : "leaves";
    let str = format(`%A ${verb} the town!`, entity);
    add(str);
    newline();
  }
  return duration;
}

// src/npc/task-dynamite.ts
function sortPositions3(positions, target) {
  function CMP_DIST(a, b) {
    let da = dist8(a, target);
    let db = dist8(b, target);
    return da - db;
  }
  return positions.sort(CMP_DIST);
}
function getClosestTrack(position) {
  let { town } = world.findEntities("town").values().next().value;
  let positions = town.track.map((track) => [
    track.x,
    track.y
  ]);
  sortPositions3(positions, position);
  return positions[0];
}
async function dynamite(entity) {
  let { person, actor, position } = world.requireComponents(entity, "person", "actor", "position");
  let dynamiteEntity = person.items.find((e) => world.requireComponent(e, "item").type == "dynamite");
  if (!dynamiteEntity) {
    return 0;
  }
  let closest = getClosestTrack([
    position.x,
    position.y
  ]);
  if (!closest) {
    return 0;
  }
  let dist = dist8([
    position.x,
    position.y
  ], closest);
  if (dist <= 1) {
    let dynamitePosition = {
      x: closest[0],
      y: closest[1]
    };
    let str = format(`%A carefully plants a dynamite...`, entity);
    add(str);
    person.items = person.items.filter((e) => e != dynamiteEntity);
    let visual = world.requireComponent(dynamiteEntity, "visual");
    world.addComponent(dynamiteEntity, "position", dynamitePosition);
    spatialIndex.update(dynamiteEntity);
    display_default.draw(dynamitePosition.x, dynamitePosition.y, visual, {
      id: dynamiteEntity,
      zIndex: visual.zIndex
    });
    await sleep(ATTACK_DELAY);
    return actor.duration;
  } else {
    return moveCloser(entity, closest);
  }
}

// src/npc/tasks.ts
async function runTask(task, entity) {
  switch (task.type) {
    case "wander":
      return wander(entity);
    case "train":
      return move(entity);
    case "attack":
      return attack(entity, task);
    case "collect":
      return collect(entity);
    case "escape":
      return escape(entity, task);
    case "move":
      return move2(entity, task);
    case "dynamite":
      return dynamite(entity);
  }
}
async function run(entity) {
  let { tasks } = world.requireComponent(entity, "actor");
  for (let task of tasks) {
    let time = await runTask(task, entity);
    if (time) {
      return time;
    }
  }
  return 0;
}
async function moveTowardsDistance(entity, target, idealDistance) {
  let { town } = world.findEntities("town").values().next().value;
  let position = world.requireComponent(entity, "position");
  if (dist4([
    position.x,
    position.y
  ], target) == idealDistance) {
    return 0;
  }
  let forceInsideTown = false;
  let neighbors = getFreeNeighbors([
    position.x,
    position.y
  ], forceInsideTown);
  if (neighbors.length == 0) {
    return 0;
  }
  function CMP_DIST(a, b) {
    let aToTarget = dist4(a, target);
    let bToTarget = dist4(b, target);
    let aToIdeal = Math.abs(aToTarget - idealDistance);
    let bToIdeal = Math.abs(bToTarget - idealDistance);
    return aToIdeal - bToIdeal;
  }
  neighbors.sort(CMP_DIST);
  let neighbor = neighbors[0];
  if (neighbor[0] < 0 || neighbor[1] < 0 || neighbor[0] >= town.width || neighbor[1] >= town.height) {
    world.removeComponents(entity, "position", "actor");
    spatialIndex.update(entity);
    display_default.delete(entity);
  } else {
    position.x = neighbor[0];
    position.y = neighbor[1];
    spatialIndex.update(entity);
    display_default.move(entity, position.x, position.y, 0);
  }
  await sleep(MOVE_DELAY);
  return getDurationWithHorse(entity);
}
async function moveCloser(entity, target) {
  return moveTowardsDistance(entity, target, 0);
}
async function moveFurther(entity, target) {
  return moveTowardsDistance(entity, target, 1e3);
}

// src/random.ts
function splitmix32(a) {
  return function() {
    a |= 0;
    a = a + 2654435769 | 0;
    var t = a ^ a >>> 16;
    t = Math.imul(t, 569420461);
    t = t ^ t >>> 15;
    t = Math.imul(t, 1935289751);
    return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
  };
}
var generator = splitmix32(0);
function seed(seed3) {
  generator = splitmix32(seed3);
}
function float() {
  return generator();
}
function arrayIndex(arr) {
  return Math.floor(float() * arr.length);
}
function arrayItem(arr) {
  return arr[arrayIndex(arr)];
}
Array.prototype.random = function() {
  return arrayItem(this);
};

// src/npc/generator.ts
function createPerson(name) {
  let blocks = {
    projectile: true,
    movement: true
  };
  let visual = {
    ch: "@",
    fg: color2(),
    zIndex: 2
  };
  let named = {
    name
  };
  let actor = {
    wait: 0,
    tasks: [],
    duration: baseTaskDuration
  };
  let person = {
    items: [],
    price: personPrice,
    relation: "npc",
    building: void 0,
    hp: 0,
    maxHp: personHp
  };
  if (float() < personBonusChance) {
    applyBonus(person, actor, named);
  }
  person.hp = person.maxHp;
  let components = {
    actor,
    visual,
    person,
    blocks,
    named
  };
  let entity = world.createEntity(components);
  spatialIndex.update(entity);
  return entity;
}
var COUNT = 10;
var NAMES = [
  "Bodie",
  "Boone",
  "Briggs",
  "Buck",
  "Billy",
  "Colt",
  "Emmett",
  "Emily",
  "Flint",
  "Gideon",
  "Gonzales",
  "Harlan",
  "Jackie",
  "Knox",
  "Luther",
  "Mercer",
  "Nash",
  "Quincy",
  "Remy",
  "Rhett",
  "Rowdy",
  "Sawyer",
  "Silas",
  "Stetson",
  "Trace",
  "Tucker",
  "Virgil",
  "Wade",
  "Wyatt"
];
var BONUSES = [
  {
    names: [
      "Healthy %s",
      "%s the Healthy",
      "Big %s",
      "%s the Tough"
    ],
    values: {
      maxHp: Math.ceil(personHp * 0.5)
    }
  },
  {
    names: [
      "Weak %s",
      "%s the Sick"
    ],
    values: {
      maxHp: -Math.floor(personHp * 0.5)
    }
  },
  {
    names: [
      "Cheap %s",
      "%s the Cheap"
    ],
    values: {
      price: -Math.floor(personPrice * 0.25)
    }
  },
  {
    names: [
      "Expensive %s",
      "%s the Luxurious"
    ],
    values: {
      price: Math.floor(personPrice * 0.25)
    }
  },
  {
    names: [
      "Speedy %s",
      "%s the Lightning"
    ],
    values: {
      speed: 0.5
    }
  },
  {
    names: [
      "Slow %s",
      "%s the Snail"
    ],
    values: {
      speed: 2
    }
  }
];
function applyBonus(person, actor, named) {
  let bonus = BONUSES.random();
  Object.entries(bonus.values).forEach(([key, value]) => {
    if (key == "maxHp") {
      person.maxHp += value;
    }
    if (key == "price") {
      person.price += value;
    }
    if (key == "speed") {
      actor.duration = Math.round(actor.duration * value);
    }
  });
  let template2 = bonus.names.random();
  named.name = template2.replace("%s", named.name);
}
function placeRandomly(entities) {
  let freePositions = computeFreePositions();
  entities.forEach((entity) => {
    let index = arrayIndex(freePositions);
    let pos = freePositions.splice(index, 1)[0];
    let visual = world.requireComponent(entity, "visual");
    world.addComponents(entity, {
      position: {
        x: pos[0],
        y: pos[1]
      }
    });
    spatialIndex.update(entity);
    display_default.draw(pos[0], pos[1], visual, {
      id: entity,
      zIndex: visual.zIndex
    });
  });
}
async function placeIntoBuildings(entities, delay) {
  function getFreePositions(building) {
    let positions = [];
    for (let i = 1; i < building.width - 1; i++) {
      for (let j = 1; j < building.height - 1; j++) {
        let x = building.x + i;
        let y = building.y + j;
        let entities2 = spatialIndex.list(x, y);
        if (entities2.size == 0) {
          positions.push([
            x,
            y
          ]);
        }
      }
    }
    let cx = building.x + Math.ceil(building.width / 2);
    let cy = building.y + Math.ceil(building.height / 2);
    positions.sort((a, b) => {
      let da = Math.abs(a[1] - cy);
      let db = Math.abs(b[1] - cy);
      if (da != db) {
        return da - db;
      }
      da = Math.abs(a[0] - cx);
      db = Math.abs(b[0] - cx);
      return da - db;
    });
    return positions;
  }
  for (let entity of entities) {
    let { person, visual } = world.requireComponents(entity, "person", "visual");
    let building = world.requireComponent(person.building, "building");
    let pos = getFreePositions(building).shift();
    world.addComponents(entity, {
      position: {
        x: pos[0],
        y: pos[1]
      }
    });
    spatialIndex.update(entity);
    display_default.draw(pos[0], pos[1], visual, {
      id: entity,
      zIndex: visual.zIndex
    });
    await display_default.fx(entity, {
      scale: [
        5,
        1
      ]
    }, delay).finished;
  }
  ;
}
function generatePeople() {
  let names = NAMES.slice();
  let entities = [];
  for (let i = 0; i < COUNT; i++) {
    let nameIndex = arrayIndex(names);
    let name = names.splice(nameIndex, 1)[0];
    let entity = createPerson(name);
    entities.push(entity);
  }
}
function color2() {
  let h = Math.round(float() * 360);
  let l = float() * 0.5 + 0.25;
  return `hsl(${h | 0} 100% ${l * 100 | 0}%)`;
}
function isInsideBuilding(x, y, buildings) {
  return buildings.some((b) => {
    return x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height;
  });
}
function computeFreePositions() {
  const { town } = world.findEntities("town").values().next().value;
  let buildings = [
    ...world.findEntities("building").values()
  ].map((e) => e.building);
  let positions = [];
  for (let x = 0; x < town.width; x++) {
    for (let y = 0; y < town.height; y++) {
      if (isInsideBuilding(x, y, buildings)) {
        continue;
      }
      let items = spatialIndex.list(x, y);
      if (items.size == 0) {
        positions.push([
          x,
          y
        ]);
      }
    }
  }
  return positions;
}

// src/ui/map.ts
var Map2 = class extends Pane {
  ac;
  constructor() {
    super("map");
  }
  runDemo() {
    let ac2 = new AbortController();
    this.ac = ac2;
    runDemo(ac2.signal);
  }
  activate() {
    super.activate();
    clear();
    add("Welcome! As you can see, the townsfolk are busy running their daily errands. Feel free to look around.");
    newline();
    add("You can learn more about playing this game by pressing the [<kbd>?</kbd>] key.");
    newline();
  }
  deactivate() {
    this.ac?.abort();
    this.ac = void 0;
    super.deactivate();
  }
};
async function runDemo(signal) {
  placeRandomly([
    ...personQuery.entities
  ]);
  while (!signal.aborted) {
    let entity = scheduler.next();
    if (!entity) {
      break;
    }
    await runTask({
      type: "wander"
    }, entity);
    scheduler.commit(entity, baseTaskDuration);
  }
}

// src/ui/dialog.ts
var game = document.querySelector("#game");
function createDialog() {
  let dialog = document.createElement("dialog");
  dialog.classList.add("border", "double", "inside");
  return dialog;
}
async function show(dialog, handleKey) {
  let { promise, resolve } = Promise.withResolvers();
  function close(result) {
    popHandler();
    dialog.close();
    dialog.remove();
    resolve(result);
  }
  function handle(e) {
    let result = handleKey(e);
    if (result != void 0) {
      close(result);
    }
    return true;
  }
  game.append(dialog);
  dialog.showModal();
  pushHandler(handle);
  return promise;
}
async function confirm(content) {
  let dialog = createDialog();
  let menu = document.createElement("menu");
  let ok = document.createElement("li");
  ok.innerHTML = `Yes [<kbd>Enter</kbd>]`;
  let ko = document.createElement("li");
  ko.innerHTML = `[<kbd>Esc</kbd>] No`;
  menu.append(ko, ok);
  dialog.append(content, menu);
  function handleKey(e) {
    if (e.key == "Enter") {
      return true;
    }
    if (e.key == "Escape") {
      return false;
    }
  }
  return show(dialog, handleKey);
}
async function alert(message) {
  let dialog = createDialog();
  let menu = document.createElement("menu");
  let ok = document.createElement("li");
  ok.innerHTML = `[<kbd>Enter</kbd>] Ok`;
  menu.append(ok);
  dialog.append(message, menu);
  function handleKey(e) {
    if (e.key == "Enter") {
      return true;
    }
  }
  return show(dialog, handleKey);
}

// src/ui/item-table.ts
var ItemTable = class {
  options;
  numberToId;
  offset;
  constructor(options) {
    this.options = options;
    this.numberToId = /* @__PURE__ */ new Map();
    this.offset = 0;
  }
  build(data) {
    const { options, offset } = this;
    let table = document.createElement("table");
    table.classList.add("item-table");
    data.forEach((item, index) => {
      let number = (index + 1 + offset) % 10;
      this.numberToId.set(number, item.id);
      let row = table.insertRow();
      let isActive = item.id == options.activeId;
      row.classList.toggle("active", isActive);
      row.insertCell().innerHTML = `[<kbd>${number}</kbd>]`;
      options.rowBuilder(row, item, isActive, data);
    });
    this.offset += data.length;
    return table;
  }
  keyToId(e) {
    const { numberToId } = this;
    let r = e.code.match(/^(Digit|Numpad)(\d)$/);
    if (r) {
      let num = Number(r[2]);
      return numberToId.get(num);
    }
  }
};

// src/ui/util.ts
function fillPerson(parent, named, visual) {
  let ch = document.createElement("span");
  ch.textContent = visual.ch;
  if (visual.fg) {
    ch.style.color = visual.fg;
  }
  parent.append(ch, " ", named.name);
}
function template(selector, values = {}) {
  let d = document.querySelector(selector);
  let frag = d.content.cloneNode(true);
  Object.entries(values).forEach(([key, value]) => {
    frag.querySelector(`.${key}`).textContent = value;
  });
  return frag;
}

// src/ui/saloon.ts
var Saloon = class extends Pane {
  personTable;
  constructor() {
    super("saloon");
  }
  activate() {
    super.activate();
    this.render();
    clear();
    add("Welcome to the Saloon! Here you can hire people for your heist, or fire them if you change your mind.");
    newline();
  }
  handleKey(e) {
    const { personTable } = this;
    if (personTable) {
      let entity = personTable.keyToId(e);
      if (entity) {
        this.render(entity);
        return true;
      }
    }
    return super.handleKey(e);
  }
  async tryHire(entity) {
    const { person, named } = world.requireComponents(entity, "person", "visual", "named");
    if (currentMoney() < person.price) {
      await alert("You do not have enough money :-(");
      return;
    }
    let content = template(".confirm-hire", {
      name: named.name,
      price: String(person.price)
    });
    let ok = await confirm(content);
    if (!ok) {
      return;
    }
    person.relation = "party";
    update();
    add(`You hired ${named.name} for ${person.price}$.`);
    newline();
    this.render(entity);
  }
  async tryFire(entity) {
    const { person, named, actor } = world.requireComponents(entity, "person", "visual", "named", "actor");
    let content = template(".confirm-fire", {
      name: named.name,
      price: String(person.price)
    });
    let ok = await confirm(content);
    if (!ok) {
      return;
    }
    person.relation = "npc";
    person.items = [];
    person.building = void 0;
    actor.tasks = [];
    update();
    add(`You fired ${named.name} and got your ${person.price}$ back.`);
    newline();
    this.render(entity);
  }
  render(activePerson) {
    let { node: node3 } = this;
    node3.replaceChildren();
    this.activeKeyHandlers = [];
    let results = world.findEntities("person", "visual", "named");
    let allItems = [
      ...results.entries()
    ].map((entry) => {
      return {
        id: entry[0],
        person: entry[1].person,
        visual: entry[1].visual,
        named: entry[1].named
      };
    });
    let activeItems = allItems.filter((item) => item.person.relation == "party");
    let inactiveItems = allItems.filter((item) => item.person.relation == "npc");
    let options = {
      rowBuilder: buildPersonRow,
      activeId: activePerson
    };
    let personTable = new ItemTable(options);
    this.personTable = personTable;
    if (activeItems.length) {
      let p = document.createElement("p");
      p.textContent = "Robbery members:";
      node3.append(p, personTable.build(activeItems));
    }
    if (inactiveItems.length) {
      let p = document.createElement("p");
      p.textContent = "Available people:";
      node3.append(p, personTable.build(inactiveItems));
    }
    if (activePerson) {
      const person = world.requireComponent(activePerson, "person");
      if (person.relation == "party") {
        this.activeKeyHandlers = [
          {
            key: "f",
            cb: () => this.tryFire(activePerson)
          }
        ];
      } else {
        this.activeKeyHandlers = [
          {
            key: "h",
            cb: () => this.tryHire(activePerson)
          }
        ];
      }
    }
  }
};
function buildPersonRow(row, item, isActive) {
  let { person, visual, named } = item;
  fillPerson(row.insertCell(), named, visual);
  let price = row.insertCell();
  price.innerHTML = `price: <span class="gold">${person.price}</span>`;
  let action = row.insertCell();
  if (isActive) {
    if (person.relation == "party") {
      action.innerHTML = "<kbd>F</kbd>ire";
    } else {
      action.innerHTML = "<kbd>H</kbd>ire";
    }
  }
}

// src/ui/dialog-location.ts
async function pickLocation(entity) {
  const { person, named, visual } = world.requireComponents(entity, "person", "named", "visual");
  let dialog = createDialog();
  let result = world.findEntities("building", "named");
  let items = [
    ...result.entries()
  ].map((entry) => {
    return {
      id: entry[0],
      building: entry[1].building,
      name: entry[1].named.name
    };
  });
  let options = {
    rowBuilder: buildBuildingRow,
    activeId: person.building
  };
  let itemTable = new ItemTable(options);
  let p = document.createElement("p");
  p.innerHTML = "Choose a starting location for ";
  fillPerson(p, named, visual);
  p.append(":");
  function handleKey(e) {
    let id2 = itemTable.keyToId(e);
    if (id2 != void 0) {
      return id2;
    }
    if (e.key == "Escape") {
      return false;
    }
  }
  let menu = document.createElement("menu");
  menu.innerHTML = "<li>[<kbd>Esc</kbd>] to cancel</li>";
  dialog.append(p, itemTable.build(items), menu);
  return show(dialog, handleKey);
}
function getBuildingName(entity) {
  let { building, named } = world.requireComponents(entity, "building", "named");
  let name = named.name;
  if (building.roof) {
    name += " (roof)";
  }
  return name;
}
function buildBuildingRow(row, item) {
  row.insertCell().textContent = getBuildingName(item.id);
}

// src/ui/dialog-task.ts
var allowedTasks = [
  {
    task: {
      type: "attack",
      target: "locomotive"
    },
    label: "Attack the locomotive"
  },
  {
    task: {
      type: "attack",
      target: "wagon"
    },
    label: "Attack wagons with gold"
  },
  {
    task: {
      type: "attack",
      target: "guard"
    },
    label: "Attack train guards"
  },
  {
    task: {
      type: "escape",
      withGold: true
    },
    label: "Escape once there is nothing to collect"
  },
  {
    task: {
      type: "move",
      target: "center"
    },
    label: "Move towards the town center"
  },
  {
    task: {
      type: "move",
      target: "locomotive"
    },
    label: "Move towards the locomotive"
  },
  {
    task: {
      type: "collect"
    },
    label: "Collect gold looted from the train"
  },
  {
    task: {
      type: "dynamite"
    },
    label: "Place a dynamite on a railroad track"
  }
];
function objectsEqual(a, b) {
  let keys = /* @__PURE__ */ new Set();
  Object.keys(a).forEach((k) => keys.add(k));
  Object.keys(b).forEach((k) => keys.add(k));
  for (let key of keys) {
    if (a[key] != b[key]) {
      return false;
    }
  }
  return true;
}
function getTaskLabel(task) {
  let found = allowedTasks.find((t) => objectsEqual(t.task, task));
  return found ? found.label : "(unknown task)";
}
function buildTaskRow(row, item) {
  row.insertCell().textContent = item.task.label;
}
async function pickTask() {
  let dialog = createDialog();
  let options = {
    rowBuilder: buildTaskRow
  };
  let taskTable = new ItemTable(options);
  let items = allowedTasks.map((task, id2) => ({
    id: id2,
    task
  }));
  function handleKey(e) {
    let id2 = taskTable.keyToId(e);
    if (id2 != void 0) {
      return id2;
    }
    if (e.key == "Escape") {
      return false;
    }
  }
  let p = document.createElement("p");
  p.innerHTML = `Pick a task:`;
  let menu = document.createElement("menu");
  menu.innerHTML = "<li>[<kbd>Esc</kbd>] to cancel</li>";
  dialog.replaceChildren(p, taskTable.build(items), menu);
  let taskIndex = await show(dialog, handleKey);
  if (taskIndex === false) {
    return false;
  }
  return allowedTasks[taskIndex].task;
}

// src/ui/hotel.ts
var Hotel = class extends Pane {
  /**
  * Initial state: yes personTable,  no (taskTable + activePerson)
  * Picked person:  no personTable, yes (taskTable + activePerson)
  */
  personTable;
  taskTable;
  activePerson;
  constructor() {
    super("hotel");
  }
  activate() {
    super.activate();
    this.renderPersons();
    clear();
    add("Welcome to the Hotel! This is the best place to decide on the robbery plan and set up starting locations for your party members.");
    newline();
  }
  handleKey(e) {
    const { personTable, taskTable } = this;
    if (taskTable) {
      let taskIndex = taskTable.keyToId(e);
      if (taskIndex != void 0) {
        this.renderPerson(this.activePerson, taskIndex);
        return true;
      }
    }
    if (personTable) {
      let entity = personTable.keyToId(e);
      if (entity) {
        this.activePerson = entity;
        this.renderPerson(entity);
        return true;
      }
    }
    return super.handleKey(e);
  }
  async editLocation(activePerson) {
    let entity = await pickLocation(activePerson);
    if (entity) {
      let { person } = world.requireComponents(activePerson, "person");
      person.building = entity;
    }
    this.renderPerson(activePerson);
  }
  async addTask(activePerson) {
    let result = await pickTask();
    if (!result) {
      return;
    }
    let { tasks } = world.requireComponent(activePerson, "actor");
    tasks.push(result);
    this.renderPerson(activePerson);
  }
  moveTask(activePerson, taskIndex, offset) {
    let { tasks } = world.requireComponents(activePerson, "actor").actor;
    let task = tasks[taskIndex];
    let newIndex = taskIndex + offset;
    tasks.splice(taskIndex, 1);
    tasks.splice(newIndex, 0, task);
    this.renderPerson(activePerson, newIndex);
  }
  async removeTask(activePerson, taskIndex) {
    let { tasks } = world.requireComponents(activePerson, "actor").actor;
    let task = tasks[taskIndex];
    let label = getTaskLabel(task);
    let content = template(".confirm-remove-task", {
      task: label
    });
    let ok = await confirm(content);
    if (!ok) {
      return;
    }
    tasks.splice(taskIndex, 1);
    this.renderPerson(activePerson);
  }
  renderPersons() {
    let { node: node3 } = this;
    node3.replaceChildren();
    let results = world.findEntities("person", "visual", "named", "actor");
    let entries = [
      ...results.entries()
    ].filter((entry) => entry[1].person.relation == "party");
    let items = entries.map((entry) => {
      return {
        id: entry[0],
        visual: entry[1].visual,
        named: entry[1].named,
        taskCount: entry[1].actor.tasks.length,
        building: entry[1].person.building
      };
    });
    if (items.length == 0) {
      node3.append("You have not hired any people yet. Hire some in the Saloon and come back to plan the robbery.");
      return;
    }
    let options = {
      rowBuilder: buildPersonRow2
    };
    let personTable = new ItemTable(options);
    this.personTable = personTable;
    this.taskTable = void 0;
    this.activePerson = void 0;
    let p = document.createElement("p");
    p.textContent = "Select a party member to set their starting location and organize their tasks.";
    node3.append(p, personTable.build(items));
  }
  renderPerson(activePerson, taskIndex) {
    let { node: node3 } = this;
    node3.replaceChildren();
    let activeKeyHandlers = [];
    let { person, visual, actor, named } = world.requireComponents(activePerson, "person", "visual", "actor", "named");
    let p1 = document.createElement("p");
    fillPerson(p1, named, visual);
    p1.append("'s plans:");
    node3.append(p1);
    let location2 = person.building ? getBuildingName(person.building) : "(unset)";
    let p2 = document.createElement("p");
    p2.innerHTML = `<kbd>L</kbd>ocation: ${location2}`;
    node3.append(p2);
    activeKeyHandlers.push({
      key: "l",
      cb: () => this.editLocation(activePerson)
    });
    let p3 = document.createElement("p");
    p3.innerHTML = `Tasks:`;
    node3.append(p3);
    if (actor.tasks.length == 0) {
      p3.innerHTML += " (none)";
    }
    let options = {
      rowBuilder: buildTaskRow2,
      activeId: taskIndex
    };
    let taskTable = new ItemTable(options);
    this.taskTable = taskTable;
    this.personTable = void 0;
    let items = actor.tasks.map((task, index) => {
      return {
        id: index,
        task
      };
    });
    if (taskIndex != void 0) {
      activeKeyHandlers.push({
        key: "r",
        cb: () => this.removeTask(activePerson, taskIndex)
      });
      if (taskIndex > 0) {
        activeKeyHandlers.push({
          code: "ArrowUp",
          cb: () => this.moveTask(activePerson, taskIndex, -1)
        });
      }
      if (taskIndex < items.length - 1) {
        activeKeyHandlers.push({
          code: "ArrowDown",
          cb: () => this.moveTask(activePerson, taskIndex, 1)
        });
      }
    }
    let menu = document.createElement("menu");
    if (actor.tasks.length < 10) {
      let item2 = document.createElement("li");
      item2.innerHTML = `<kbd>A</kbd>dd new task`;
      menu.append(item2);
      activeKeyHandlers.push({
        key: "a",
        cb: () => this.addTask(activePerson)
      });
    }
    let item = document.createElement("li");
    item.innerHTML = `<kbd>B</kbd>ack to your party`;
    menu.append(item);
    activeKeyHandlers.push({
      key: "b",
      cb: () => this.renderPersons()
    });
    node3.append(taskTable.build(items), menu);
    this.activeKeyHandlers = activeKeyHandlers;
  }
};
function buildPersonRow2(row, item, isActive) {
  let { visual, named } = item;
  fillPerson(row.insertCell(), named, visual);
  let loc = item.building ? getBuildingName(item.building) : "location not set";
  row.insertCell().textContent = `${item.taskCount} task(s), ${loc}`;
}
function buildTaskRow2(row, item, isActive, items) {
  row.insertCell().textContent = getTaskLabel(item.task);
  if (isActive) {
    row.insertCell().innerHTML = `<kbd>R</kbd>emove`;
    let movements = [];
    if (items.indexOf(item) > 0) {
      movements.push(`<kbd>\u2191</kbd>`);
    }
    if (items.indexOf(item) < items.length - 1) {
      movements.push(`<kbd>\u2193</kbd>`);
    }
    if (movements.length > 0) {
      row.insertCell().innerHTML = `[${movements.join("")}]`;
    }
  }
}

// src/ui/dialog-buy.ts
function buildInventoryRow(row, item) {
  row.insertCell().textContent = item.named.name;
  row.insertCell().innerHTML = `<span class="gold">${item.item.price}</span>`;
}
function getAvailableItems() {
  let allItems = new Set(world.findEntities("item").keys());
  let persons = world.findEntities("person");
  for (let entity of persons.keys()) {
    let person = world.requireComponent(entity, "person");
    for (let item of person.items) {
      allItems.delete(item);
    }
  }
  return [
    ...allItems
  ];
}
async function pickItem() {
  let dialog = createDialog();
  let options = {
    rowBuilder: buildInventoryRow
  };
  let inventoryTable = new ItemTable(options);
  let items = getAvailableItems().map((entity) => {
    let { named, item } = world.requireComponents(entity, "named", "item");
    return {
      id: entity,
      named,
      item
    };
  });
  function handleKey(e) {
    let id2 = inventoryTable.keyToId(e);
    if (id2 != void 0) {
      return id2;
    }
    if (e.key == "Escape") {
      return false;
    }
  }
  let p = document.createElement("p");
  p.innerHTML = "Pick an item to buy it:";
  let menu = document.createElement("menu");
  menu.innerHTML = "<li>[<kbd>Esc</kbd>] to cancel</li>";
  dialog.replaceChildren(p, inventoryTable.build(items), menu);
  return show(dialog, handleKey);
}

// src/ui/store.ts
var Store = class extends Pane {
  personTable;
  inventoryTable;
  activePerson;
  constructor() {
    super("store");
  }
  activate() {
    super.activate();
    this.renderPersons();
    clear();
    add("Welcome to the General Store! Here you can buy various helpful items for your party members.");
    newline();
  }
  handleKey(e) {
    const { personTable, inventoryTable } = this;
    if (inventoryTable) {
      let item = inventoryTable.keyToId(e);
      if (item != void 0) {
        this.renderPerson(this.activePerson, item);
        return true;
      }
    }
    if (personTable) {
      let entity = personTable.keyToId(e);
      if (entity) {
        this.activePerson = entity;
        this.renderPerson(entity);
        return true;
      }
    }
    return super.handleKey(e);
  }
  renderPersons() {
    let { node: node3 } = this;
    node3.replaceChildren();
    this.activeKeyHandlers = [];
    let results = world.findEntities("person", "visual", "named");
    let entries = [
      ...results.entries()
    ].filter((entry) => entry[1].person.relation == "party");
    let items = entries.map((entry) => {
      return {
        id: entry[0],
        person: entry[1].person,
        visual: entry[1].visual,
        named: entry[1].named
      };
    });
    if (items.length == 0) {
      node3.append("You have not hired any people yet. Hire some in the Saloon and come back to buy their equipment.");
      return;
    }
    let personTable = new ItemTable({
      rowBuilder: buildPersonRow3
    });
    this.personTable = personTable;
    this.inventoryTable = void 0;
    this.activePerson = void 0;
    let p = document.createElement("p");
    p.textContent = "Select a party member to view their inventory and buy them new items.";
    node3.append(p, personTable.build(items));
  }
  renderPerson(activePerson, item) {
    let { node: node3 } = this;
    node3.replaceChildren();
    let activeKeyHandlers = [];
    let { person, visual, named } = world.requireComponents(activePerson, "person", "visual", "actor", "named");
    let p1 = document.createElement("p");
    fillPerson(p1, named, visual);
    p1.append("'s inventory:");
    node3.append(p1);
    let options = {
      rowBuilder: buildInventoryRow2,
      activeId: item
    };
    let inventoryTable = new ItemTable(options);
    this.inventoryTable = inventoryTable;
    this.personTable = void 0;
    let items = person.items.map((entity) => {
      let { item: item2, named: named2 } = world.requireComponents(entity, "item", "named");
      return {
        id: entity,
        item: item2,
        named: named2
      };
    });
    if (item) {
      activeKeyHandlers.push({
        key: "s",
        cb: () => this.trySell(activePerson, item)
      });
    }
    let menu = document.createElement("menu");
    menu.innerHTML = `
			<li><kbd>P</kbd>urchase new item</li>
			<li><kbd>B</kbd>ack to your party</li>
		`;
    activeKeyHandlers.push({
      key: "p",
      cb: () => this.purchase(activePerson)
    });
    activeKeyHandlers.push({
      key: "b",
      cb: () => this.renderPersons()
    });
    node3.append(inventoryTable.build(items), menu);
    this.activeKeyHandlers = activeKeyHandlers;
  }
  async trySell(personEntity, itemEntity) {
    const { named, item } = world.requireComponents(itemEntity, "named", "item");
    let content = template(".confirm-sell", {
      name: named.name,
      price: String(item.price)
    });
    let ok = await confirm(content);
    if (!ok) {
      return;
    }
    let { items } = world.requireComponent(personEntity, "person");
    let index = items.indexOf(itemEntity);
    if (index != -1) {
      items.splice(index, 1);
      update();
      add(`You sold ${named.name} and got your ${item.price}$ back.`);
      newline();
    }
    this.renderPerson(personEntity);
  }
  async purchase(person) {
    let itemEntity = await pickItem();
    if (!itemEntity) {
      return;
    }
    const { named, item } = world.requireComponents(itemEntity, "named", "item");
    if (item.price > currentMoney()) {
      await alert("You do not have enough money :-(");
      return;
    }
    const uniqueGroups = /* @__PURE__ */ new Set([
      "weapon",
      "horse"
    ]);
    let { items } = world.requireComponent(person, "person");
    if (uniqueGroups.has(item.type)) {
      if (items.some((entity) => world.requireComponent(entity, "item").type == item.type)) {
        await alert(`You already have a ${item.type}. Sell it first if you want to buy another one.`);
        return;
      }
    }
    let content = template(".confirm-buy", {
      name: named.name,
      price: String(item.price)
    });
    let ok = await confirm(content);
    if (!ok) {
      return;
    }
    items.push(itemEntity);
    update();
    add(`You bought ${named.name} for ${item.price}$.`);
    newline();
    this.renderPerson(person);
  }
};
function buildPersonRow3(row, item, isActive) {
  let { person, visual, named } = item;
  fillPerson(row.insertCell(), named, visual);
  let str = "(no items)";
  let count = person.items.length;
  if (count == 1) {
    str = "1 item";
  } else if (count > 1) {
    str = `${count} items`;
  }
  row.insertCell().innerHTML = str;
}
function buildInventoryRow2(row, item, isActive) {
  const { named } = item;
  row.insertCell().textContent = named.name;
  let actions = row.insertCell();
  if (isActive) {
    actions.innerHTML = `<kbd>S</kbd>ell`;
  }
}

// src/ui/action.ts
function checkDynamite(messages, party) {
  party.forEach((member) => {
    let hasTask = member.actor.tasks.some((t) => t.type == "dynamite");
    let hasDynamite = member.person.items.some((e) => {
      return world.requireComponent(e, "item").type == "dynamite";
    });
    if (hasTask && !hasDynamite) {
      messages.push(`\u2718 ${member.named.name} has a dynamite task assigned, but is not equipped with any dynamite.`);
    }
  });
}
var Action = class extends Pane {
  ready = false;
  constructor() {
    super("action");
  }
  activate() {
    super.activate();
    const { node: node3 } = this;
    this.ready = false;
    clear();
    add("This is the last check before we start the heist. We rob the train right at midnight!");
    newline();
    let messages = [];
    let { entities } = personQuery;
    let party = [
      ...entities
    ].map((e) => world.requireComponents(e, "person", "actor", "named")).filter((item) => {
      return item.person.relation == "party";
    });
    let itemCount = 0;
    party.forEach((item) => itemCount += item.person.items.length);
    let tasks = party.every((item) => item.actor.tasks.length > 0);
    let locations = party.every((item) => item.person.building);
    if (party.length == 0) {
      messages.push("\u2718 You have not hired any people yet. Hire some in the Saloon.");
    } else {
      messages.push(`\u2714 You hired a party of ${party.length} people.`);
      if (itemCount == 0) {
        messages.push(`\u2718 You have not equipped your party with any items. You can do that in the General Store.`);
      } else {
        messages.push(`\u2714 Your party is equipped with ${itemCount} items.`);
      }
      if (!tasks) {
        messages.push(`\u2718 Every member of your party needs to have at least one task assigned. Plan their tasks in the Hotel.`);
      } else {
        messages.push(`\u2714 Every member of your party has at least one task assigned.`);
        checkDynamite(messages, party);
        if (!locations) {
          messages.push(`\u2718 Every member of your party needs to have a starting location assigned. Do that in the Hotel.`);
        } else {
          messages.push(`\u2714 Every member of your party has a starting location assigned.`);
          this.ready = true;
        }
      }
    }
    let paragraphs = messages.map((m) => {
      let p = document.createElement("p");
      p.textContent = m;
      return p;
    });
    node3.replaceChildren(...paragraphs);
    if (this.ready) {
      let p = document.createElement("p");
      p.innerHTML = "Press [<kbd>Enter</kbd>] to start the heist!";
      node3.append(p);
    }
  }
  handleKey(e) {
    if (!this.ready) {
      return false;
    }
    switch (e.key) {
      case "Enter":
        this.tryStart();
        return true;
        break;
    }
    return false;
  }
  async tryStart() {
    let content = template(".confirm-action");
    let ok = await confirm(content);
    if (!ok) {
      return;
    }
    startAction();
  }
};

// src/ui/help.ts
var Help = class extends Pane {
  constructor() {
    super("help");
  }
  activate() {
    super.activate();
    clear();
    add(`To learn more about this project, you can visit its the GitHub repository at <br><a href="https://github.com/ondras/great-train-robbery">https://github.com/ondras/great-train-robbery</a>.`);
    newline();
  }
};

// src/ui/ui.ts
var dom2 = {
  game: document.querySelector("#game"),
  map: document.querySelector("#map"),
  nav: document.querySelector("#nav"),
  tabs: []
};
dom2.tabs = [
  ...dom2.nav.querySelectorAll("[data-content]")
];
var panes = {
  map: new Map2(),
  saloon: new Saloon(),
  hotel: new Hotel(),
  store: new Store(),
  action: new Action(),
  help: new Help()
};
var activePane;
function showNav(id2) {
  dom2.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.content == id2));
}
function navKeyboardHandler(e) {
  let tab = dom2.tabs.find((tab2) => {
    let kbd = tab2.querySelector("kbd");
    if (!kbd) {
      return false;
    }
    return kbd.textContent.toLowerCase() == e.key.toLowerCase();
  });
  if (!tab) {
    return false;
  }
  activate(tab.dataset.content);
  return true;
}
function activate(pane) {
  if (activePane) {
    activePane.deactivate();
    activePane = void 0;
  }
  activePane = panes[pane];
  activePane.activate();
  showNav(pane);
  if (pane == "map") {
    panes.map.runDemo();
  }
}
function startAction2() {
  if (activePane) {
    activePane.deactivate();
    activePane = void 0;
  }
  dom2.nav.classList.add("disabled");
  popHandler();
  setMode("action");
  showNav("map");
  panes.map.activate();
  clear();
  add("This is it. The Great Train Robbery is about to start. Let's just wait for the train...");
  newline();
}
function startPlanning() {
  if (activePane) {
    activePane.deactivate();
    activePane = void 0;
  }
  dom2.nav.classList.remove("disabled");
  setMode("planning");
  update();
  pushHandler(navKeyboardHandler);
  activate("map");
}
async function init2() {
  dom2.map.append(display_default);
  await document.fonts.ready;
  dom2.game.hidden = false;
  init();
}

// src/town/buildings.ts
var WALL_DESIGNS = [
  {
    corners: [
      "\u250C",
      "\u2510",
      "\u2518",
      "\u2514"
    ],
    edges: [
      "\u2500",
      "\u2502",
      "\u2500",
      "\u2502"
    ]
  },
  {
    corners: [
      "\u2554",
      "\u2557",
      "\u255D",
      "\u255A"
    ],
    edges: [
      "\u2550",
      "\u2551",
      "\u2550",
      "\u2551"
    ]
  },
  {
    corners: [
      "\u250F",
      "\u2513",
      "\u251B",
      "\u2517"
    ],
    edges: [
      "\u2501",
      "\u2503",
      "\u2501",
      "\u2503"
    ]
  }
];
var ALL_TYPES = {
  bank: {
    name: "Bank"
  },
  saloon: {
    name: "Saloon"
  },
  hotel: {
    name: "Hotel"
  },
  sheriff: {
    name: "Sheriff"
  },
  church: {
    name: "Church"
  },
  station: {
    name: "Station"
  },
  brothel: {
    name: "Brothel"
  },
  jail: {
    name: "Jail"
  },
  eatery: {
    name: "Eatery"
  },
  store: {
    name: "General\nStore"
  },
  barber: {
    name: "Barber"
  },
  doctor: {
    name: "Doctor's"
  },
  undertaker: {
    name: "Undertaker"
  },
  post: {
    name: "Post\nOffice"
  },
  hall: {
    name: "Town\nHall"
  },
  water: {
    name: "Water\nTower"
  },
  cattle: {
    name: "Cattle\nPen"
  },
  stable: {
    name: "Stable"
  }
};
var FORCED_TYPES = [
  "saloon",
  "hotel"
];
var RANDOM_TYPES = [
  "bank",
  "sheriff",
  "church",
  "station",
  "brothel",
  "jail",
  "eatery",
  "store",
  "barber",
  "doctor",
  "undertaker",
  "post",
  "hall",
  "water",
  "cattle",
  "stable"
];
function getWallDesign(type) {
  return WALL_DESIGNS.random();
}
function getBuildingColor() {
  let hue = 35;
  let saturation = 20 + float() * 20;
  let lightness = 40 + float() * 20;
  return `hsl(${hue}deg ${saturation | 0}% ${lightness | 0}%)`;
}
function getBuildingName2(type) {
  if (type in ALL_TYPES) {
    return ALL_TYPES[type].name;
  } else {
    return type;
  }
}
function generateTypePool() {
  let pool = FORCED_TYPES.slice();
  let others = RANDOM_TYPES.slice();
  while (others.length > 0) {
    let index = arrayIndex(others);
    pool.push(others[index]);
    others.splice(index, 1);
  }
  return pool;
}

// src/town/rasterizer.ts
var WINDOW_COLOR = "#338";
var DOOR_COLOR = "saddlebrown";
var INTERIOR_COLOR = "#888";
var TREE_COLOR = [
  "#653",
  "#353",
  "#9a6"
];
var TREE_CH = [
  "T",
  "Y"
];
var TREE_CHANCE = 0.05;
var TRACK_VISUAL = {
  ch: "#",
  fg: "#777",
  bg: "rgb(80 40 0)"
};
function rasterize(town, path, options) {
  let g = gutter(options);
  let fp = getFurthestPlot(town);
  let width = 2 * g + (fp.x + 1) * options.plotWidth + fp.x * options.roadWidth;
  let height = 2 * g + (fp.y + 1) * options.plotHeight + fp.y * options.roadWidth;
  rasterizeGround(width, height, options);
  rasterizeBuildings(town, options);
  rasterizeTrees(town, options);
  let track = rasterizePath(path, options);
  for (let i = 0; i < 3; i++) {
    let tp = track[i];
    let ch = [
      "^",
      ">",
      "v",
      "<"
    ][tp.nextDirection];
    let visual = {
      ...TRACK_VISUAL,
      ch
    };
    display_default.draw(tp.x, tp.y, visual);
  }
  for (let i = track.length - 3; i < track.length; i++) {
    let tp = track[i];
    let ch = [
      "^",
      ">",
      "v",
      "<"
    ][tp.nextDirection];
    let visual = {
      ...TRACK_VISUAL,
      ch
    };
    display_default.draw(tp.x, tp.y, visual);
  }
  let t = {
    width,
    height,
    track
  };
  return world.createEntity({
    town: t
  });
}
function rasterizeGround(width, height, options) {
  let offset = gutter(options) - Math.ceil(options.roadWidth / 2);
  const roadSpacingHorizontal = options.plotWidth + options.roadWidth;
  const roadSpacingVertical = options.plotHeight + options.roadWidth;
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      let isRoadX = (i - offset) % roadSpacingHorizontal == 0;
      let isRoadY = (j - offset) % roadSpacingVertical == 0;
      let isRoad = isRoadX || isRoadY;
      display_default.draw(i, j, {
        ch: ".",
        fg: isRoad ? "#841" : "#ed5"
      });
    }
  }
}
function rasterizeTrees(town, options) {
  let g = gutter(options);
  town.plots.filter((plot) => !plot.building).forEach((plot) => {
    let x = g + plot.x * (options.plotWidth + options.roadWidth);
    let y = g + plot.y * (options.plotHeight + options.roadWidth);
    for (let i = 0; i < options.plotWidth; i++) {
      for (let j = 0; j < options.plotHeight; j++) {
        if (float() < TREE_CHANCE) {
          let position = {
            x: x + i,
            y: y + j
          };
          let blocks = {
            projectile: true,
            movement: true
          };
          let entity = world.createEntity({
            position,
            blocks
          });
          spatialIndex.update(entity);
          display_default.draw(position.x, position.y, {
            ch: TREE_CH.random(),
            fg: TREE_COLOR.random()
          });
        }
      }
    }
  });
}
function rasterizeBuildings(town, options) {
  town.buildings.forEach((building) => rasterizeBuilding(building, options));
}
function isDoor(i, j, bbox) {
  let cx = Math.round(bbox.width / 2);
  let cy = Math.round(bbox.height / 2);
  if (i != cx && j != cy) {
    return false;
  }
  return float() < 0.5;
}
function isWindow(i, j, bbox) {
  let edgeX = i == 0 || i == bbox.width - 1;
  let edgeY = j == 0 || j == bbox.height - 1;
  if (edgeX && edgeY) {
    return false;
  }
  let chance = float() < 0.8;
  if (!edgeX) {
    return i % 2 == 0 && chance;
  }
  if (!edgeY) {
    return j % 2 == 0 && chance;
  }
  return false;
}
function rasterizeBuildingDoor(x, y) {
  display_default.draw(x, y, {
    ch: "/",
    fg: DOOR_COLOR
  });
}
function rasterizeBuildingWindow(x, y, edges, design) {
  let ch = "";
  let { left, right, top, bottom } = edges;
  switch (true) {
    case top:
      ch = design.edges[0];
      break;
    case right:
      ch = design.edges[1];
      break;
    case bottom:
      ch = design.edges[2];
      break;
    case left:
      ch = design.edges[3];
      break;
  }
  display_default.draw(x, y, {
    ch,
    fg: WINDOW_COLOR
  });
}
function rasterizeBuildingWall(x, y, edges, design, color3, roof) {
  let ch = "";
  let { left, right, top, bottom } = edges;
  switch (true) {
    case (left && top):
      ch = design.corners[0];
      break;
    case (right && top):
      ch = design.corners[1];
      break;
    case (right && bottom):
      ch = design.corners[2];
      break;
    case (left && bottom):
      ch = design.corners[3];
      break;
    case top:
      ch = design.edges[0];
      break;
    case right:
      ch = design.edges[1];
      break;
    case bottom:
      ch = design.edges[2];
      break;
    case left:
      ch = design.edges[3];
      break;
  }
  let blocks = {
    projectile: roof ? false : true,
    movement: true
  };
  let position = {
    x,
    y
  };
  let entity = world.createEntity({
    position,
    blocks
  });
  spatialIndex.update(entity);
  display_default.draw(x, y, {
    ch,
    fg: color3
  });
}
function rasterizeBuildingInterior(x, y, color3) {
  display_default.draw(x, y, {
    ch: ".",
    fg: color3
  });
}
function rasterizeBuilding(building, options) {
  let bbox = computeBuildingBbox(building, options);
  let design = getWallDesign(building.type);
  let name = getBuildingName2(building.type);
  let color3 = getBuildingColor();
  let roof = float() < 0.5;
  let b = {
    ...bbox,
    type: building.type,
    roof
  };
  let named = {
    name
  };
  world.createEntity({
    building: b,
    named
  });
  for (let i = 0; i < bbox.width; i++) {
    for (let j = 0; j < bbox.height; j++) {
      let edges = {
        left: i == 0,
        right: i == bbox.width - 1,
        top: j == 0,
        bottom: j == bbox.height - 1
      };
      let x = bbox.x + i;
      let y = bbox.y + j;
      if (edges.left || edges.right || edges.top || edges.bottom) {
        if (roof) {
          rasterizeBuildingWall(x, y, edges, design, color3, roof);
        } else if (isDoor(i, j, bbox)) {
          rasterizeBuildingDoor(x, y);
        } else if (isWindow(i, j, bbox)) {
          rasterizeBuildingWindow(x, y, edges, design);
        } else {
          rasterizeBuildingWall(x, y, edges, design, color3, roof);
        }
      } else {
        rasterizeBuildingInterior(x, y, roof ? color3 : INTERIOR_COLOR);
      }
    }
  }
  let cx = Math.floor(bbox.x + bbox.width / 2);
  name.split("\n").forEach((nameRow, i) => {
    let y = bbox.y + i + 1;
    nameRow.split("").forEach((ch, j) => {
      let x = cx - Math.ceil(nameRow.length / 2) + j;
      display_default.draw(x, y, {
        ch,
        fg: color3
      });
    });
  });
}
function rasterizePath(path, options) {
  let track = [];
  path.forEach((crossing, i) => {
    let segment = rasterizePathSegment(crossing, i, path, options);
    track = track.concat(segment);
  });
  return track;
}
function rasterizePathSegment(crossing, i, path, options) {
  let positions = [];
  if (i == 0) {
    return positions;
  }
  let current = crossingToXY(crossing, options);
  let prev = crossingToXY(path[i - 1], options);
  let dx = Math.sign(current[0] - prev[0]);
  let dy = Math.sign(current[1] - prev[1]);
  let dist = Math.abs(current[0] - prev[0]) + Math.abs(current[1] - prev[1]);
  if (i + 1 == path.length) {
    dist += 1;
  }
  let direction = DIRS_4.findIndex((d) => d[0] == dx && d[1] == dy);
  for (let j = 0; j < dist; j++) {
    let x = prev[0] + dx * j;
    let y = prev[1] + dy * j;
    let position = {
      x,
      y,
      nextDirection: direction
    };
    positions.push(position);
    display_default.draw(x, y, TRACK_VISUAL);
  }
  return positions;
}
function computeBuildingBbox(building, options) {
  let g = gutter(options);
  let plotX = [
    Infinity,
    -Infinity
  ];
  let plotY = [
    Infinity,
    -Infinity
  ];
  building.plots.forEach((plot) => {
    plotX[0] = Math.min(plotX[0], plot.x);
    plotY[0] = Math.min(plotY[0], plot.y);
    plotX[1] = Math.max(plotX[1], plot.x);
    plotY[1] = Math.max(plotY[1], plot.y);
  });
  const spacingH = options.plotWidth + options.roadWidth;
  const spacingV = options.plotHeight + options.roadWidth;
  return {
    x: g + plotX[0] * spacingH,
    y: g + plotY[0] * spacingV,
    width: (plotX[1] - plotX[0]) * spacingH + options.plotWidth,
    height: (plotY[1] - plotY[0]) * spacingV + options.plotHeight
  };
}
function crossingToXY(crossing, options) {
  let offset = gutter(options) - Math.ceil(options.roadWidth / 2);
  return [
    offset + crossing.x * (options.plotWidth + options.roadWidth),
    offset + crossing.y * (options.plotHeight + options.roadWidth)
  ];
}
function gutter(options) {
  return Math.ceil(options.roadWidth / 2);
}
function getFurthestPlot(town) {
  let maxX = -Infinity;
  let maxY = -Infinity;
  let furthestPlot;
  town.plots.forEach((plot) => {
    if (plot.x > maxX) {
      maxX = plot.x;
    }
    if (plot.y > maxY) {
      maxY = plot.y;
    }
    if (plot.x == maxX && plot.y == maxY) {
      furthestPlot = plot;
    }
  });
  return furthestPlot;
}

// src/town/town.ts
function addBuilding(town, type, plot, secondaryPlot) {
  let plots = [
    plot
  ];
  if (secondaryPlot) {
    plots.push(secondaryPlot);
  }
  let building = {
    plots,
    type
  };
  town.buildings.push(building);
  plots.forEach((plot2) => {
    plot2.building = building;
  });
  if (secondaryPlot) {
    let crossings = filterCommonCrossings(town.crossings, plot, secondaryPlot);
    if (crossings.length != 2) {
      throw new Error(`consistency failure: bad count of common crossings: ${crossings.length}`);
    }
    let [c1, c2] = crossings;
    c1.neighbors.forEach((n, i, all) => all[i] = n == c2 ? void 0 : n);
    c2.neighbors.forEach((n, i, all) => all[i] = n == c1 ? void 0 : n);
  }
}
function filterCommonCrossings(crossings, plotA, plotB) {
  function isAroundPlot(crossing, plot) {
    let dx = crossing.x - plot.x;
    let dy = crossing.y - plot.y;
    return dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1;
  }
  function isCommonCrossing(crossing) {
    return isAroundPlot(crossing, plotA) && isAroundPlot(crossing, plotB);
  }
  return crossings.filter(isCommonCrossing);
}

// src/town/generator.ts
var EMPTY_PERCENTAGE = 0.26;
var DOUBLE_CHANCE = 0.33;
function emptyTown(width, height) {
  let plots = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      plots.push({
        x,
        y
      });
    }
  }
  return {
    buildings: [],
    plots,
    crossings: generateCrossings(width, height)
  };
}
function generateBuildings(town) {
  let totalPlots = town.plots.length;
  let typePool = generateTypePool();
  while (true) {
    let emptyPlots = town.plots.filter((p) => !p.building);
    if (emptyPlots.length / totalPlots < EMPTY_PERCENTAGE) {
      break;
    }
    let type = typePool.shift();
    let plot = emptyPlots.random();
    let neighbors = getNeighborPlots(plot, emptyPlots);
    if (neighbors.length > 0 && float() < DOUBLE_CHANCE) {
      let secondaryPlot = neighbors.random();
      addBuilding(town, type, plot, secondaryPlot);
    } else {
      addBuilding(town, type, plot);
    }
  }
}
function generateAllPaths(town) {
  let width = town.plots.reduce((maxX, plot) => Math.max(maxX, plot.x), 0) + 1;
  let height = town.plots.reduce((maxY, plot) => Math.max(maxY, plot.y), 0) + 1;
  let initialCrossings = town.crossings.filter((c) => isEdgeCrossing(c, width, height));
  function generatePaths(partialPath) {
    let lastCrossing = partialPath[partialPath.length - 1];
    if (isEdgeCrossing(lastCrossing, width, height) && partialPath.length > 1) {
      return [
        partialPath
      ];
    }
    let nextCrossings = lastCrossing.neighbors.filter((n) => n && !partialPath.includes(n));
    return nextCrossings.flatMap((nextCrossing) => generatePaths([
      ...partialPath,
      nextCrossing
    ]));
  }
  return initialCrossings.flatMap((crossing) => generatePaths([
    crossing
  ]));
}
function generateCrossings(width, height) {
  let crossingsById = /* @__PURE__ */ new Map();
  let crossings = [];
  for (let x = 0; x <= width; x++) {
    for (let y = 0; y <= height; y++) {
      let crossing = {
        x,
        y,
        neighbors: []
      };
      crossings.push(crossing);
      crossingsById.set(id(crossing), crossing);
    }
  }
  crossings.forEach((crossing) => {
    let { x, y } = crossing;
    crossing.neighbors = DIRS_4.map(([dx, dy]) => {
      let neighbor = {
        x: x + dx,
        y: y + dy
      };
      if (isEdgeCrossing(crossing, width, height) && isEdgeCrossing(neighbor, width, height)) {
        return;
      }
      return crossingsById.get(id(neighbor));
    });
  });
  function hasNeighbor(crossing) {
    return crossing.neighbors.some((n) => n);
  }
  return crossings.filter(hasNeighbor);
}
function deduplicatePaths(paths) {
  function stringify(path) {
    let crossings = path.map((c) => id(c));
    if (crossings.at(0).localeCompare(crossings.at(-1)) > 0) {
      crossings.reverse();
    }
    return crossings.join(";");
  }
  let pathMap = /* @__PURE__ */ new Map();
  paths.forEach((path) => {
    let key = stringify(path);
    if (!pathMap.has(key)) {
      pathMap.set(key, path);
    }
  });
  return [
    ...pathMap.values()
  ];
}
function isEdgeCrossing(crossing, width, height) {
  return crossing.x == 0 || crossing.x == width || crossing.y == 0 || crossing.y == height;
}
function getNeighborPlots(plot, plots) {
  return DIRS_4.map((dir) => {
    let x = plot.x + dir[0];
    let y = plot.y + dir[1];
    return plots.find((p) => p.x == x && p.y == y);
  }).filter((p) => p);
}
function id(what) {
  return `${what.x},${what.y}`;
}

// src/items/generator.ts
var DYNAMITE_VISUAL = {
  ch: "\u203C",
  fg: "#f00",
  zIndex: 1
};
function createHorse(name, params) {
  let item = {
    type: "horse",
    ...params
  };
  return world.createEntity({
    item,
    named: {
      name
    }
  });
}
function createWeapon(name, params) {
  let item = {
    type: "weapon",
    ...params
  };
  return world.createEntity({
    item,
    named: {
      name
    }
  });
}
function createDynamite(params) {
  let item = {
    type: "dynamite",
    damage: 20,
    ...params
  };
  let name = "Dynamite";
  return world.createEntity({
    item,
    named: {
      name
    },
    visual: DYNAMITE_VISUAL
  });
}
function generateItems() {
  createHorse("Regular Horse", {
    price: 200,
    duration: 6
  });
  createHorse("Super-fast Horse", {
    price: 300,
    duration: 4
  });
  createWeapon("Revolver", {
    price: 100,
    damage: 2,
    range: 3,
    duration: 5
  });
  createWeapon("Rifle", {
    price: 300,
    damage: 4,
    range: 5,
    duration: 5
  });
  createWeapon("Sniper rifle", {
    price: 500,
    damage: 4,
    range: 8,
    duration: 5
  });
  createWeapon("Rocket launcher", {
    price: 1e3,
    damage: 5,
    range: 10,
    duration: 10,
    explosionRadius: 1
  });
  createDynamite({
    price: 800
  });
}

// src/ui/dialog-gameover.ts
function computeScore(money, loot, party) {
  let dead = party.filter((p) => p.hp <= 0).length;
  if (dead == party.length || loot == 0) {
    return 0;
  }
  return Math.round((money + loot) / party.length);
}
function formatParty(party) {
  let alive = 0;
  let dead = 0;
  party.forEach((p) => {
    p.hp > 0 ? alive++ : dead++;
  });
  let components = [];
  if (alive > 0) {
    components.push(`${alive} alive`);
  }
  if (dead > 0) {
    if (dead == party.length) {
      components.push("\u{1F480} All dead!");
    } else {
      components.push(`${dead} dead`);
    }
  }
  return components.join(", ");
}
async function gameOver() {
  let node3 = createDialog();
  node3.addEventListener("cancel", (e) => e.preventDefault());
  let party = [];
  let loot = 0;
  for (let entity of personQuery.entities) {
    let { person } = world.requireComponents(entity, "person");
    if (person.relation == "party") {
      party.push(person);
      person.items.forEach((e) => {
        let item = world.requireComponent(e, "item");
        if (item.type == "gold") {
          loot += item.price;
        }
      });
    }
  }
  let money = currentMoney();
  let score = computeScore(money, loot, party);
  let title = score > 0 ? "The robbery is over. Good job!" : "The robbery is over!";
  let data = {
    title,
    money: String(money),
    party: formatParty(party),
    loot: String(loot),
    score: String(score)
  };
  node3.append(template(".game-over", data));
  function handleKey(e) {
    switch (e.code) {
      case "Digit1":
      case "Numpad1":
        {
          return "retry";
        }
        break;
      case "Digit2":
      case "Numpad2":
        {
          return "restart";
        }
        break;
      case "Digit3":
      case "Numpad3":
        {
          return "new";
        }
        break;
      case "Digit4":
      case "Numpad4":
        return "github";
        break;
    }
  }
  return show(node3, handleKey);
}

// src/game.ts
var actionPaused = false;
var seed2;
var ac;
function actionKeyboardHandler(e) {
  if (e.code == "Space") {
    actionPaused = !actionPaused;
    setMode(actionPaused ? "paused" : "action");
  }
  if (e.key.toLowerCase() == "a" && actionPaused) {
    ac && ac.abort();
  }
  return true;
}
function createTown(W, H) {
  let town = emptyTown(W, H);
  generateBuildings(town);
  let paths = generateAllPaths(town);
  paths = deduplicatePaths(paths);
  paths = paths.toSorted((a, b) => a.length - b.length);
  let q = Math.floor(paths.length / 4);
  paths = paths.slice(2 * q, 3 * q);
  let path = paths.random();
  let options = {
    roadWidth: 3,
    plotWidth: 12,
    plotHeight: 6
  };
  let townEntity = rasterize(town, path, options);
  let { width, height } = world.requireComponent(townEntity, "town");
  display_default.cols = width;
  display_default.rows = height;
  generatePeople();
  generateItems();
}
async function runAction() {
  let failedActors = /* @__PURE__ */ new Set();
  let actors = world.query("actor");
  ac = new AbortController();
  actionPaused = false;
  while (!ac.signal.aborted) {
    if (actionPaused) {
      await sleep(50);
      continue;
    }
    if (isGameFinished()) {
      return;
    }
    let entity = scheduler.next();
    if (!entity) {
      break;
    }
    let time = await run(entity);
    if (!time) {
      failedActors.add(entity);
      time = baseTaskDuration;
    } else {
      failedActors.delete(entity);
    }
    for (let failedActor of failedActors) {
      if (!actors.entities.has(failedActor)) {
        failedActors.delete(failedActor);
      }
    }
    if (world.hasComponents(entity, "actor")) {
      scheduler.commit(entity, time);
    }
    if (failedActors.size == actors.entities.size) {
      break;
    }
  }
}
function isGameFinished() {
  let activePartyMembers = 0;
  let enemies = 0;
  for (let entity of personQuery.entities) {
    let actor = world.getComponent(entity, "actor");
    if (!actor) {
      continue;
    }
    let person = world.requireComponent(entity, "person");
    switch (person.relation) {
      case "enemy":
        enemies++;
        break;
      case "party":
        activePartyMembers++;
        break;
    }
  }
  if (activePartyMembers == 0) {
    return true;
  }
  let trainParts = world.findEntities("trainPart", "position");
  if (trainParts.size > 0) {
    return false;
  }
  if (enemies > 0) {
    return false;
  }
  let items = world.findEntities("item", "position");
  let types = [
    ...items.keys()
  ].map((entity) => world.requireComponent(entity, "item").type);
  let gold = types.filter((t) => t == "gold");
  if (gold.length > 0) {
    return false;
  }
  return true;
}
function removePersons() {
  for (let entity of personQuery.entities) {
    display_default.delete(entity);
    world.removeComponents(entity, "position");
    spatialIndex.update(entity);
  }
}
async function trainArrival() {
  let entity = create(0);
  add("The train arrives!");
  let delay = 200;
  for (let i = 0; i < 11; i++) {
    move(entity);
    await sleep(delay);
  }
}
function processGameOverResult(result) {
  switch (result) {
    case "restart":
      {
        let url = new URL(location.href);
        url.search = `seed=${seed2.toString(16).toUpperCase()}`;
        location.href = url.href;
      }
      break;
    case "retry":
      {
        startPlanning();
      }
      break;
    case "new":
      {
        let url = new URL(location.href);
        url.search = "";
        location.href = url.href;
      }
      break;
    case "github":
      {
        window.open("https://github.com/ondras/great-train-robbery", "_blank");
      }
      break;
  }
}
async function startAction() {
  let worldState = world.toString();
  let partyEntities = [];
  let otherEntities = [];
  for (let entity of personQuery.entities) {
    let person = world.requireComponent(entity, "person");
    (person.relation == "party" ? partyEntities : otherEntities).push(entity);
  }
  otherEntities.forEach((e) => {
    let actor = world.requireComponent(e, "actor");
    actor.tasks = [
      {
        type: "wander"
      }
    ];
  });
  seed(seed2);
  removePersons();
  startAction2();
  placeRandomly(otherEntities);
  await trainArrival();
  await placeIntoBuildings(partyEntities, 700);
  pushHandler(actionKeyboardHandler);
  await runAction();
  popHandler();
  let gameOverResult = await gameOver();
  world.findEntities("item", "position").forEach((_, entity) => {
    display_default.delete(entity);
  });
  world.findEntities("town").values().next().value.town.track.forEach(({ x, y }) => {
    display_default.deleteAt(x, y, 2);
  });
  world.fromString(worldState);
  spatialIndex.reset();
  processGameOverResult(gameOverResult);
}
async function init3(s2) {
  seed2 = s2;
  seed(seed2);
  createTown(4, 4);
  await init2();
  on();
  startPlanning();
}

// src/intro.ts
var intro = document.querySelector("#intro");
var dom3 = {
  intro,
  seed: intro.querySelector("[name=seed]"),
  sections: [
    ...intro.querySelectorAll("section")
  ]
};
var sectionIndex = 0;
function done(resolve) {
  off();
  popHandler();
  dom3.intro.hidden = true;
  let seed3 = parseInt(dom3.seed.value, 16);
  resolve(seed3);
}
function showSection(index) {
  sectionIndex = index;
  dom3.sections[1].hidden = index != 1;
}
function init4(seed3) {
  let { resolve, promise } = Promise.withResolvers();
  dom3.seed.value = seed3.toString(16);
  showSection(0);
  function handleKey(e) {
    if (sectionIndex == 0) {
      if (e.key == "Enter") {
        showSection(1);
        dom3.sections[0].querySelector(".continue")?.remove();
        return true;
      } else {
        return false;
      }
    }
    if (sectionIndex == 1) {
      if (e.key == "Enter") {
        done(resolve);
        return true;
      } else if (e.key.toLowerCase() == "e" && e.target != dom3.seed) {
        e.preventDefault();
        dom3.seed.focus();
        dom3.seed.select();
        return true;
      } else {
        return false;
      }
    }
    return false;
  }
  dom3.intro.hidden = false;
  pushHandler(handleKey);
  on();
  return promise;
}

// src/index.ts
async function init5() {
  let seed3 = Math.random() * 16777216 | 0;
  let sp = new URL(location.href).searchParams;
  if (sp.has("seed")) {
    let parsed = parseInt(sp.get("seed"), 16);
    if (parsed) {
      seed3 = parsed;
    }
  }
  seed3 = await init4(seed3);
  await init3(seed3);
}
init5();
