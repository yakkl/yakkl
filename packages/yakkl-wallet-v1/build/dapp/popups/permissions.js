__sveltekit_jgwjpy = {
						base: new URL("../..", location).pathname.slice(0, -1)
					};

					const element = document.currentScript.parentElement;

					Promise.all([
						import("../../app/immutable/entry/start.Cca19n2v.js"),
						import("../../app/immutable/entry/app.BWuxDamq.js")
					]).then(([kit, app]) => {
						kit.start(app, element, {
							node_ids: [0, 2, 21],
							data: [null,null,null],
							form: null,
							error: null
						});
					});