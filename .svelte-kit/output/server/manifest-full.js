export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","fonts/icomoon.eot","fonts/icomoon.svg","fonts/icomoon.ttf","fonts/icomoon.woff"]),
	mimeTypes: {".png":"image/png",".svg":"image/svg+xml",".ttf":"font/ttf",".woff":"font/woff"},
	_: {
		client: {"start":"_app/immutable/entry/start.PhX0wH7j.js","app":"_app/immutable/entry/app.BsG7Y-h0.js","imports":["_app/immutable/entry/start.PhX0wH7j.js","_app/immutable/chunks/entry.DQwhcsqT.js","_app/immutable/entry/app.BsG7Y-h0.js","_app/immutable/chunks/i18n.B4YSaY00.js","_app/immutable/chunks/stores.DVpjKVv8.js","_app/immutable/chunks/entry.DQwhcsqT.js","_app/immutable/chunks/runtime.dv8f1mUX.js","_app/immutable/chunks/index-client.BxePsEDC.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
