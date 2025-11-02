import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.Dx_uqxMS.js","_app/immutable/chunks/stores.C7c0YD_o.js","_app/immutable/chunks/entry.p8240aGw.js","_app/immutable/chunks/alert.gc1vn7SX.js","_app/immutable/chunks/runtime.9m2hsWbV.js","_app/immutable/chunks/lifecycle.BVDFLsNZ.js","_app/immutable/chunks/i18n.BC_C168A.js"];
export const stylesheets = ["_app/immutable/assets/0.D7w0gaQN.css","_app/immutable/assets/alert.B3IZgsFc.css"];
export const fonts = [];
