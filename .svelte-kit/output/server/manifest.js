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
		client: {"start":"_app/immutable/entry/start.DT6CjI93.js","app":"_app/immutable/entry/app.CMF8BZX3.js","imports":["_app/immutable/entry/start.DT6CjI93.js","_app/immutable/chunks/entry.DVonoP5C.js","_app/immutable/entry/app.CMF8BZX3.js","_app/immutable/chunks/i18n.9kLVmOxW.js","_app/immutable/chunks/stores.CzhMk1x1.js","_app/immutable/chunks/entry.DVonoP5C.js","_app/immutable/chunks/runtime.DX7W3zek.js","_app/immutable/chunks/index-client.Cp1sIxic.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
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
