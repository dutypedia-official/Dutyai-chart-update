import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.DJTX018w.js","_app/immutable/chunks/stores.CKeIhM-k.js","_app/immutable/chunks/entry.D7ktinMD.js","_app/immutable/chunks/alert.Ba6X_dS3.js","_app/immutable/chunks/runtime.ey3qzwEx.js","_app/immutable/chunks/lifecycle.Cx71gp2y.js","_app/immutable/chunks/i18n.DCO13aZi.js"];
export const stylesheets = ["_app/immutable/assets/0.BeT4pnRl.css","_app/immutable/assets/alert.B3IZgsFc.css"];
export const fonts = [];
