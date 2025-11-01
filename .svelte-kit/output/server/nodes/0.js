import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.DeXNfDPr.js","_app/immutable/chunks/stores.DVpjKVv8.js","_app/immutable/chunks/entry.DQwhcsqT.js","_app/immutable/chunks/alert.DAfoRNGV.js","_app/immutable/chunks/runtime.dv8f1mUX.js","_app/immutable/chunks/lifecycle.BSAg6wbP.js","_app/immutable/chunks/i18n.B4YSaY00.js"];
export const stylesheets = ["_app/immutable/assets/0.VZNjhaom.css","_app/immutable/assets/alert.B3IZgsFc.css"];
export const fonts = [];
