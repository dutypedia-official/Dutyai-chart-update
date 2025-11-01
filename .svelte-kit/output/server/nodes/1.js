

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.3qqKIvEd.js","_app/immutable/chunks/stores.DVpjKVv8.js","_app/immutable/chunks/entry.DQwhcsqT.js","_app/immutable/chunks/lifecycle.BSAg6wbP.js"];
export const stylesheets = [];
export const fonts = [];
