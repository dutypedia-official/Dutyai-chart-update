

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.C7m6neqP.js","_app/immutable/chunks/stores.CKeIhM-k.js","_app/immutable/chunks/entry.D7ktinMD.js","_app/immutable/chunks/lifecycle.Cx71gp2y.js","_app/immutable/chunks/runtime.ey3qzwEx.js","_app/immutable/chunks/alert.Ba6X_dS3.js","_app/immutable/chunks/index-client.3R_1SF-O.js"];
export const stylesheets = ["_app/immutable/assets/2.BimukbpB.css","_app/immutable/assets/alert.B3IZgsFc.css"];
export const fonts = [];
