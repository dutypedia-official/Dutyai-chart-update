

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.hiFHf0mW.js","_app/immutable/chunks/stores.CzhMk1x1.js","_app/immutable/chunks/entry.DVonoP5C.js","_app/immutable/chunks/lifecycle.BZI17lMV.js","_app/immutable/chunks/runtime.DX7W3zek.js","_app/immutable/chunks/alert.Cpx-GHD3.js","_app/immutable/chunks/index-client.Cp1sIxic.js"];
export const stylesheets = ["_app/immutable/assets/2.DudYmptw.css","_app/immutable/assets/alert.B3IZgsFc.css"];
export const fonts = [];
