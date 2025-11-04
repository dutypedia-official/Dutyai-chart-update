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
		client: {"start":"_app/immutable/entry/start.amOkSCje.js","app":"_app/immutable/entry/app.cB8BmbHK.js","imports":["_app/immutable/entry/start.amOkSCje.js","_app/immutable/chunks/entry.844_PdHt.js","_app/immutable/entry/app.cB8BmbHK.js","_app/immutable/chunks/i18n.CFBH_dQ9.js","_app/immutable/chunks/stores.D4V96fH5.js","_app/immutable/chunks/entry.844_PdHt.js","_app/immutable/chunks/runtime.Do1lw5xy.js","_app/immutable/chunks/index-client.CB5ylF5P.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		routes: [
			
		],
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
