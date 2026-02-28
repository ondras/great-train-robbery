function splitmix32(a: number) {
    return function() {
      a |= 0; a = a + 0x9e3779b9 | 0;
      var t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
          t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
      return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
    }
}

let generator = splitmix32(0);

export function seed(seed: number) {
    generator = splitmix32(seed);
}

export function float() {
    return generator();
}

export function arrayIndex(arr: unknown[]) {
    return Math.floor(float() * arr.length);
}

export function arrayItem<T>(arr: T[]): T {
    return arr[arrayIndex(arr)];
}

Array.prototype.random = function() {
    return arrayItem(this);
}
