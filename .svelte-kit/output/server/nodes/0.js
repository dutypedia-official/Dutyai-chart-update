import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.CtUEfErc.js","_app/immutable/chunks/stores.CIMFyz5a.js","_app/immutable/chunks/entry.DmRYpCJQ.js","_app/immutable/chunks/alert.y5d0PhAF.js","_app/immutable/chunks/runtime.CEbdPudm.js","_app/immutable/chunks/lifecycle.BSCdky23.js","_app/immutable/chunks/i18n.Bq1nO_qV.js"];
export const stylesheets = ["_app/immutable/assets/0.DDmf5Pvd.css","_app/immutable/assets/alert.B3IZgsFc.css"];
export const fonts = [];
