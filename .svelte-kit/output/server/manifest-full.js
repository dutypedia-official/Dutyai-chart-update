export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","fonts/icomoon.eot","fonts/icomoon.svg","fonts/icomoon.ttf","fonts/icomoon.woff","test-refresh-persistence.js","test-script.html"]),
	mimeTypes: {".png":"image/png",".svg":"image/svg+xml",".ttf":"font/ttf",".woff":"font/woff",".js":"text/javascript",".html":"text/html"},
	_: {
		client: {"start":"_app/immutable/entry/start.DxulZ23D.js","app":"_app/immutable/entry/app.GSL32MT8.js","imports":["_app/immutable/entry/start.DxulZ23D.js","_app/immutable/chunks/entry.D7ktinMD.js","_app/immutable/entry/app.GSL32MT8.js","_app/immutable/chunks/i18n.DCO13aZi.js","_app/immutable/chunks/stores.CKeIhM-k.js","_app/immutable/chunks/entry.D7ktinMD.js","_app/immutable/chunks/runtime.ey3qzwEx.js","_app/immutable/chunks/index-client.3R_1SF-O.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
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
