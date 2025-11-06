

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.CSLcxkiX.js","_app/immutable/chunks/stores.CKeIhM-k.js","_app/immutable/chunks/entry.D7ktinMD.js","_app/immutable/chunks/lifecycle.Cx71gp2y.js"];
export const stylesheets = [];
export const fonts = [];
