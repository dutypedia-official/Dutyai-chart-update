import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.4C6uPMvq.js","_app/immutable/chunks/stores.CzhMk1x1.js","_app/immutable/chunks/entry.DVonoP5C.js","_app/immutable/chunks/alert.Cpx-GHD3.js","_app/immutable/chunks/runtime.DX7W3zek.js","_app/immutable/chunks/lifecycle.BZI17lMV.js","_app/immutable/chunks/i18n.9kLVmOxW.js"];
export const stylesheets = ["_app/immutable/assets/0.DDmf5Pvd.css","_app/immutable/assets/alert.B3IZgsFc.css"];
export const fonts = [];
