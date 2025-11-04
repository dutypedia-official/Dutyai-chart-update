import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.CoIZvz5D.js","_app/immutable/chunks/stores.D4V96fH5.js","_app/immutable/chunks/entry.844_PdHt.js","_app/immutable/chunks/alert.CzDz8_wZ.js","_app/immutable/chunks/runtime.Do1lw5xy.js","_app/immutable/chunks/lifecycle.Bag3IqeI.js","_app/immutable/chunks/i18n.CFBH_dQ9.js"];
export const stylesheets = ["_app/immutable/assets/0.BGzx5xgu.css","_app/immutable/assets/alert.B3IZgsFc.css"];
export const fonts = [];
