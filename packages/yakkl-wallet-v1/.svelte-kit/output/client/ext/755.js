'use strict';
(self['webpackChunkyakkl_wallet'] = self['webpackChunkyakkl_wallet'] || []).push([
	[755],
	{
		6755: (e, n, i) => {
			i.d(n, { hideSecurityWarning: () => hideSecurityWarning });
			var t = i(9513);
			let a = 30;
			const l = (0, t.T5)({ show: false, warningTime: a, onComplete: undefined });
			function showSecurityWarning(e, n) {
				l.set({ show: true, warningTime: (a = e), onComplete: n });
			}
			function hideSecurityWarning() {
				l.set({ show: false, warningTime: a, onComplete: undefined });
			}
		}
	}
]);
