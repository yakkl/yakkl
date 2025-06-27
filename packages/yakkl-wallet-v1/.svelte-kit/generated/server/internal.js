
import root from '../root.js';
import { set_building, set_prerendering } from '__sveltekit/environment';
import { set_assets } from '__sveltekit/paths';
import { set_manifest, set_read_implementation } from '__sveltekit/server';
import { set_private_env, set_public_env, set_safe_public_env } from '../../../../../node_modules/.pnpm/@sveltejs+kit@2.21.5_@sveltejs+vite-plugin-svelte@5.1.0_svelte@5.34.3_vite@6.3.5_@types+node@_kkg52bulj3afeke4e35iads2tm/node_modules/@sveltejs/kit/src/runtime/shared-server.js';

export const options = {
	app_template_contains_nonce: false,
	csp: {"mode":"auto","directives":{"upgrade-insecure-requests":false,"block-all-mixed-content":false},"reportOnly":{"upgrade-insecure-requests":false,"block-all-mixed-content":false}},
	csrf_check_origin: true,
	embedded: false,
	env_public_prefix: 'PUBLIC_',
	env_private_prefix: '',
	hash_routing: false,
	hooks: null, // added lazily, via `get_hooks`
	preload_strategy: "modulepreload",
	root,
	service_worker: false,
	templates: {
		app: ({ head, body, assets, nonce, env }) => "<!doctype html>\n<html\n\tlang=\"en\"\n\tclass=\"h-full bg-base-100 no-js dark\"\n\tstyle=\"overscroll-behavior-x: none\"\n\tdata-theme=\"yakkl\"\n>\n\t<!-- <html lang=\"en\" class=\"h-full bg-base-100 bg-dotted-spacing-1 bg-dotted-gray-600 no-js dark\" style=\"overscroll-behavior-x: none;\" data-theme=\"yakkl\"> -->\n\t<head>\n\t\t<!-- <meta http-equiv=\"Content-Type\" content=\"text/html\" charset=\"utf-8\" /> -->\n\n\t\t<meta charset=\"utf-8\" />\n\t\t<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge,chrome=1\" />\n\t\t<meta\n\t\t\tname=\"viewport\"\n\t\t\tcontent=\"width=device-width, initial-scale=1.0, shrink-to-fit=no, viewport-fit=cover\"\n\t\t/>\n\n\t\t<!-- <meta http-equiv=\"content-security-policy\" content=\"script-src 'self' ; script-src-elem 'self' \"> -->\n\n\t\t<link rel=\"shortcut icon\" href=\"/images/favicon.png\" />\n\t\t<link rel=\"stylesheet\" type=\"text/css\" href=\"/css/inter.css\" />\n\n\t\t<script src=\"/ext/browser-polyfill.js\"></script>\n\n\t\t<style>\n\t\t\t@media print {\n\t\t\t\t@page {\n\t\t\t\t\tmargin-top: 0;\n\t\t\t\t\tmargin-bottom: 0;\n\t\t\t\t}\n\t\t\t\tbody {\n\t\t\t\t\tpadding-top: 72px;\n\t\t\t\t\tpadding-bottom: 72px;\n\t\t\t\t}\n\t\t\t}\n\n\t\t\t/* Turns off spinners on number inputs */\n\t\t\tinput::-webkit-outer-spin-button,\n\t\t\tinput::-webkit-inner-spin-button {\n\t\t\t\t-webkit-appearance: none;\n\t\t\t\tmargin: 0;\n\t\t\t}\n\n\t\t\t/*\n\t\tinput[type=number]{\n\t\t\t-moz-appearance: textfield;\n\t\t}\n\t\t*/\n\n\t\t\t::-webkit-scrollbar {\n\t\t\t\tdisplay: none;\n\t\t\t}\n\n\t\t\tbody {\n\t\t\t\t-ms-overflow-style: none; /* IE and Edge */\n\t\t\t\tscrollbar-width: none; /* Firefox */\n\t\t\t}\n\t\t</style>\n\n\t\t" + head + "\n\t</head>\n\t<!-- For sidepanel -->\n\t<body\n\t\tstyle=\"resize: none; overflow: hidden\"\n\t\tclass=\"text-base-content font-inter antialiased h-full w-full overscroll-hidden selection:bg-fuchsia-300 selection:text-fuchsia-900\"\n\t>\n\t\t<!-- For popup-->\n\t\t<!-- <body style=\"resize: none; overflow: hidden;\" class=\"text-base-content font-inter antialiased min-h-[926px] min-w-[428px] max-h-[926px] max-w-[428px] selection:bg-fuchsia-300 selection:text-fuchsia-900\"> -->\n\n\t\t<div id=\"sk-body\" style=\"display: contents\">" + body + "</div>\n\n\t\t<!-- <script src=\"/js/errorHandler.js\"></script> -->\n\t\t<script src=\"/js/helpers.js\"></script>\n\t\t<script src=\"/js/fontawesome-8d8e5192b2.js\"></script>\n\t\t<script src=\"/js/darkmode.js\"></script>\n\t\t<script src=\"/js/clipboard.min.js\"></script>\n\t\t<script src=\"/js/index.min.js\"></script>\n\t\t<script src=\"/js/popper.min.js\"></script>\n\t\t<script src=\"/js/console.js\"></script>\n\t\t<!-- <script src=\"/js/in/in.js\" type=\"text/javascript\">lang: en_US</script> -->\n\t\t<!-- <script src=\"js/fb/sdk.js\"></script> -->\n\t</body>\n</html>\n",
		error: ({ status, message }) => "<h1>Fallback Error</h1>\n<p>Code " + status + "</p>\n<p>" + message + "</p>\n"
	},
	version_hash: "1n9dmms"
};

export async function get_hooks() {
	let handle;
	let handleFetch;
	let handleError;
	let init;
	

	let reroute;
	let transport;
	

	return {
		handle,
		handleFetch,
		handleError,
		init,
		reroute,
		transport
	};
}

export { set_assets, set_building, set_manifest, set_prerendering, set_private_env, set_public_env, set_read_implementation, set_safe_public_env };
