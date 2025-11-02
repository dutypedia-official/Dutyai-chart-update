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
		client: {"start":"_app/immutable/entry/start.CklWdewq.js","app":"_app/immutable/entry/app.D14Ktr31.js","imports":["_app/immutable/entry/start.CklWdewq.js","_app/immutable/chunks/entry.p8240aGw.js","_app/immutable/entry/app.D14Ktr31.js","_app/immutable/chunks/i18n.BC_C168A.js","_app/immutable/chunks/stores.C7c0YD_o.js","_app/immutable/chunks/entry.p8240aGw.js","_app/immutable/chunks/runtime.9m2hsWbV.js","_app/immutable/chunks/index-client.DFMPa_3w.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
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
