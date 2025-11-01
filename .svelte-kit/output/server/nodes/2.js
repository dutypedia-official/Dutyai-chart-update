

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.C_jDbRW2.js","_app/immutable/chunks/stores.CIMFyz5a.js","_app/immutable/chunks/entry.DmRYpCJQ.js","_app/immutable/chunks/lifecycle.BSCdky23.js","_app/immutable/chunks/runtime.CEbdPudm.js","_app/immutable/chunks/alert.y5d0PhAF.js","_app/immutable/chunks/index-client.Dz6dpN1s.js"];
export const stylesheets = ["_app/immutable/assets/2.DudYmptw.css","_app/immutable/assets/alert.B3IZgsFc.css"];
export const fonts = [];
