

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.KyHURkT4.js","_app/immutable/chunks/stores.CIMFyz5a.js","_app/immutable/chunks/entry.DmRYpCJQ.js","_app/immutable/chunks/lifecycle.BSCdky23.js"];
export const stylesheets = [];
export const fonts = [];
