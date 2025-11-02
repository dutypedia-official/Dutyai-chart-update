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
		client: {"start":"_app/immutable/entry/start.BK_JQbBP.js","app":"_app/immutable/entry/app.DGaJ14mW.js","imports":["_app/immutable/entry/start.BK_JQbBP.js","_app/immutable/chunks/entry.DmRYpCJQ.js","_app/immutable/entry/app.DGaJ14mW.js","_app/immutable/chunks/i18n.Bq1nO_qV.js","_app/immutable/chunks/stores.CIMFyz5a.js","_app/immutable/chunks/entry.DmRYpCJQ.js","_app/immutable/chunks/runtime.CEbdPudm.js","_app/immutable/chunks/index-client.Dz6dpN1s.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
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
