

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.DwzZIHar.js","_app/immutable/chunks/stores.CzhMk1x1.js","_app/immutable/chunks/entry.DVonoP5C.js","_app/immutable/chunks/lifecycle.BZI17lMV.js"];
export const stylesheets = [];
export const fonts = [];
