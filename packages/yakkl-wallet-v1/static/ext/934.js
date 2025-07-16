'use strict';
(self['webpackChunkwallet'] = self['webpackChunkwallet'] || []).push([
	[934],
	{
		1623: (t, e, a) => {
			var o = a(5818);
			const n = (0, o.G)();
			const clearObjectsFromLocalStorage = async () => {
				try {
					await n.storage.local.clear();
				} catch (t) {
					console.log('Error clearing local storage', t);
					throw t;
				}
			};
			const getObjectFromLocalStorage = async (t) => {
				try {
					if (!n) return null;
					const e = await n.storage.local.get(t);
					return e[t];
				} catch (t) {
					console.log('Error getting object from local storage', t);
					throw t;
				}
			};
			const setObjectInLocalStorage = async (t, e) => {
				try {
					await n.storage.local.set({ [t]: e });
				} catch (t) {
					console.log('Error setting object in local storage', t);
					throw t;
				}
			};
			const removeObjectFromLocalStorage = async (t) => {
				try {
					await n.storage.local.remove(t);
				} catch (t) {
					console.log('Error removing object from local storage', t);
					throw t;
				}
			};
		},
		6934: (t, e, a) => {
			var o = a(1623);
			var n = a(4155);
			var r = a(8387);
			var c = a(5299);
			var s = a(469);
			var l = a(9336);
			var i = a(2443);
			const u = false;
			const k = (0, n.T5)({
				msg: 'Welcome to the YAKKL® Smart Wallet!',
				icon: 1,
				color: { background: 'bg-indigo-400', text: 'text-indigo-800' },
				opacity: 0.5,
				ms: 3e3
			});
			async function loadCheckCurrentlySelectedStore() {
				const t = getYakklCurrentlySelectedStore();
				const e = getMiscStore();
				if (e && t !== null) {
					if (isEncryptedData(t.data)) {
						decryptData(t.data, e).then((e) => {
							t.data = e;
							return t;
						});
					} else {
						return t;
					}
				}
				return null;
			}
			async function verifyEncryption(t) {
				const e = getMiscStore();
				if (e) {
					const processItem = async (t) => {
						if (!isEncryptedData(t.data)) {
							const a = await encryptData(t.data, e);
							t.data = a;
						}
						return t;
					};
					if (Array.isArray(t)) {
						return Promise.all(t.map(processItem));
					} else {
						return processItem(t);
					}
				}
				return t;
			}
			const g = (0, n.T5)(r.dt);
			const f = (0, n.T5)(r.qt);
			const y = (0, n.T5)(r.ME);
			const d = (0, n.T5)(r.yv);
			const S = (0, n.T5)(r.Ct);
			const h = (0, n.T5)(r.oe);
			const m = (0, n.T5)(r.Fz);
			const w = (0, n.T5)(r.vi);
			const p = (0, n.T5)(r.U_);
			const Y = (0, n.T5)(r.$n);
			const T = (0, n.T5)(undefined);
			const v = (0, n.T5)(undefined);
			const E = (0, n.T5)(undefined);
			const A = (0, n.T5)(undefined);
			const C = (0, n.T5)(undefined);
			const O = (0, n.T5)(undefined);
			const D = (0, n.T5)(undefined);
			const L = (0, n.T5)(undefined);
			const b = (0, n.T5)(undefined);
			const _ = (0, n.T5)([]);
			const x = (0, n.T5)([]);
			const P = (0, n.T5)([]);
			const I = (0, n.T5)([]);
			const K = (0, n.T5)([]);
			const j = (0, n.T5)(false);
			const R = (0, n.T5)(undefined);
			const W = (0, n.T5)(true);
			const N = (0, n.T5)(undefined);
			const F = (0, n.T5)(null);
			const B = (0, n.T5)({ address: '', abi: '', functions: [] });
			function onError(t) {
				console.log(t);
			}
			function storageChange(t) {
				try {
					if (t.yakklPreferences) {
						setPreferencesStore(t.yakklPreferences.newValue);
					}
					if (t.yakklSettings) {
						setSettingsStore(t.yakklSettings.newValue);
					}
					if (t.profile) {
						setProfileStore(t.profile.newValue);
					}
					if (t.yakklCurrentlySelected) {
						setYakklCurrentlySelectedStore(t.yakklCurrentlySelected.newValue);
					}
					if (t.yakklWatchList) {
						setYakklWatchListStore(t.yakklWatchList.newValue);
					}
					if (t.yakklAccounts) {
						setYakklAccountsStore(t.yakklAccounts.newValue);
					}
					if (t.yakklPrimaryAccounts) {
						setYakklPrimaryAccountsStore(t.yakklPrimaryAccounts.newValue);
					}
					if (t.yakklContacts) {
						setYakklContactsStore(t.yakklContacts.newValue);
					}
					if (t.yakklChats) {
						setYakklChatsStore(t.yakklChats.newValue);
					}
					if (t.yakklConnectedDomains) {
						setYakklConnectedDomainsStore(t.yakklConnectedDomains.newValue);
					}
					if (t.yakklBlockedList) {
						setYakklBlockedListStore(t.yakklBlockedList.newValue);
					}
					if (t.yakklTokenDataCustom) {
					}
					if (t.yakklTokenData) {
					}
				} catch (t) {
					console.log(t);
				}
			}
			async function syncStoresToStorage() {
				try {
					setPreferencesStore(await getPreferences());
					setSettingsStore(await getSettings());
					setProfileStore(await getProfile());
					setYakklCurrentlySelectedStore(await getYakklCurrentlySelected());
					setYakklWatchListStore(await getYakklWatchList());
					setYakklBlockedListStore(await getYakklBlockedList());
					setYakklAccountsStore(await getYakklAccounts());
					setYakklPrimaryAccountsStore(await getYakklPrimaryAccounts());
					setYakklContactsStore(await getYakklContacts());
					setYakklChatsStore(await getYakklChats());
					setYakklTokenDataStore(await getYakklTokenData());
					setYakklTokenDataCustomStore(await getYakklTokenDataCustom());
					setYakklConnectedDomainsStore(await getYakklConnectedDomains());
				} catch (t) {
					console.log(t);
				}
			}
			async function setSettings(t) {
				return await setSettingsStorage(t);
			}
			function getYakklPreferenceStore() {
				const t = get(g);
				return t;
			}
			function getSettingsStore() {
				const t = get(f);
				return t;
			}
			function getProfileStore(t) {
				const e = get(y);
				y.set(t);
				return e;
			}
			function getYakklCurrentlySelectedStore() {
				const t = get(d);
				return t;
			}
			function getYakklWatchListStore() {
				const t = get(p);
				return t;
			}
			function getYakklBlockedListStore() {
				const t = get(Y);
				return t;
			}
			function getYakklAccountsStore() {
				const t = get(m);
				return t;
			}
			function getYakklPrimaryAccountsStore() {
				const t = get(w);
				return t;
			}
			function getYakklContactsStore() {
				const t = get(S);
				return t;
			}
			function getYakklTokenDataStore() {
				const t = get(P);
				return t;
			}
			function getYakklTokenDataCustomStore() {
				const t = get(I);
				return t;
			}
			function getYakklCombinedTokenStore() {
				const t = get(K);
				return t;
			}
			function getYakklChatsStore() {
				const t = get(h);
				return t;
			}
			function getYakklWalletBlockchainsStore() {
				const t = get(x);
				return t;
			}
			function getYakklWalletProvidersStore() {
				const t = get(_);
				return t;
			}
			function getYakklConnectedDomainsStore() {
				const t = get(T);
				return t;
			}
			function getYakklContractStore() {
				return get(B);
			}
			function getMiscStore() {
				const t = get(v);
				return t;
			}
			function getVeryStore() {
				const t = get(E);
				return t;
			}
			function getDappConnectRequestStore() {
				const t = get(N);
				return t;
			}
			function getContactStore() {
				const t = get(L);
				return t;
			}
			function getAccountStore() {
				const t = get(b);
				return t;
			}
			function getVersionStore() {
				const t = get(A);
				return t;
			}
			function getUserNameStore() {
				const t = get(C);
				return t;
			}
			function getYakklGPTKeyStore() {
				const t = get(R);
				return t;
			}
			function getYakklConnectionStore() {
				const t = get(W);
				return t;
			}
			function setPreferencesStore(t) {
				const e = get(g);
				g.set(t === null ? yakklPreferences : t);
				return e;
			}
			function setSettingsStore(t) {
				const e = get(f);
				f.set(t === null ? yakklSettings : t);
				return e;
			}
			function setProfileStore(t) {
				const e = get(y);
				y.set(t === null ? profile : t);
				return e;
			}
			function setYakklCurrentlySelectedStore(t) {
				const e = get(d);
				d.set(t !== null ? t : null);
				return e;
			}
			function setYakklWatchListStore(t) {
				const e = get(p);
				p.set(t);
				return e;
			}
			function setYakklBlockedListStore(t) {
				const e = get(Y);
				Y.set(t);
				return e;
			}
			function setYakklContactsStore(t) {
				const e = get(S);
				S.set(t);
				return e;
			}
			function setYakklTokenDataStore(t) {
				const e = get(P);
				P.set(t);
				return e;
			}
			function setYakklTokenDataCustomStore(t) {
				const e = get(I);
				I.set(t);
				return e;
			}
			function setYakklCombinedTokenStore(t) {
				const e = get(K);
				K.set(t);
				return e;
			}
			function setYakklChatsStore(t) {
				const e = get(h);
				h.set(t);
				return e;
			}
			function setYakklWalletBlockchainsStore(t) {
				const e = get(x);
				x.set(t);
				return e;
			}
			function setYakklWalletProvidersStore(t) {
				const e = get(_);
				_.set(t);
				return e;
			}
			function setYakklConnectedDomainsStore(t) {
				const e = get(T);
				T.set(t);
				return e;
			}
			function setYakklAccountsStore(t) {
				const e = get(m);
				m.set(t);
				return e;
			}
			function setYakklPrimaryAccountsStore(t) {
				const e = get(w);
				w.set(t);
				return e;
			}
			function setMiscStore(t) {
				const e = get(v);
				v.set(t);
				return e;
			}
			function setVeryStore(t) {
				const e = get(E);
				E.set(t);
				return e;
			}
			function setDappConnectRequestStore(t) {
				const e = get(N);
				N.set(t);
				return e;
			}
			function setContactStore(t) {
				const e = get(L);
				L.set(t);
				return e;
			}
			function setAccountStore(t) {
				const e = get(b);
				b.set(t);
				return e;
			}
			function setVersionStore(t) {
				const e = get(A);
				A.set(t);
				return e;
			}
			function setUserNameStore(t) {
				const e = get(C);
				C.set(t);
				return e;
			}
			function setYakklGPTKeyStore(t) {
				const e = get(R);
				R.set(t);
				return e;
			}
			function setYakklConnectionStore(t) {
				const e = get(W);
				W.set(t);
				return e;
			}
			function setYakklContractStore(t) {
				const e = get(B);
				B.set(t);
				return e;
			}
			async function getYakklRegisteredData() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_REGISTERED_DATA);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t || null;
				} catch (t) {
					throw t;
				}
			}
			async function getYakklContacts() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_CONTACTS);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function getYakklTokenData() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_TOKENDATA);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function getYakklTokenDataCustom() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_TOKENDATA_CUSTOM);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function getYakklCombinedToken() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_COMBINED_TOKENS);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function getYakklChats() {
				try {
					let t = await getObjectFromLocalStorage(STORAGE_YAKKL_CHATS);
					if (typeof t === 'string') {
						t = [];
						setYakklChatsStorage(t);
					}
					if (t && typeof t === 'object' && !Array.isArray(t)) {
						t = Object.values(t);
					}
					return t || [];
				} catch (t) {
					console.log('Error in getYakklChats:', t);
					return [];
				}
			}
			async function getYakklWalletBlockchains() {
				try {
					let t = await getObjectFromLocalStorage(STORAGE_YAKKL_WALLET_BLOCKCHAINS);
					if (typeof t === 'string') {
						t = [];
						setYakklWalletBlockchainsStorage(t);
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function getYakklWalletProviders() {
				try {
					let t = await getObjectFromLocalStorage(STORAGE_YAKKL_WALLET_PROVIDERS);
					if (typeof t === 'string') {
						t = [];
						setYakklWalletProvidersStorage(t);
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function getYakklConnectedDomains() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_CONNECTED_DOMAINS);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function getPreferences() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_PREFERENCES);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t;
				} catch (t) {
					throw t;
				}
			}
			async function getSettings() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t;
				} catch (t) {
					throw t;
				}
			}
			async function getProfile() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_PROFILE);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t;
				} catch (t) {
					throw t;
				}
			}
			async function getYakklCurrentlySelected() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED);
					if (!t || typeof t === 'string') {
						throw new Error('No currently selected Yakkl found');
					}
					return t;
				} catch (t) {
					console.log('getYakklCurrentlySelected: ', t);
					throw t;
				}
			}
			async function getYakklWatchList() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_WATCHLIST);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function getYakklBlockedList() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_BLOCKEDLIST);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function getYakklAccounts() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_ACCOUNTS);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function getYakklPrimaryAccounts() {
				try {
					const t = await getObjectFromLocalStorage(STORAGE_YAKKL_PRIMARY_ACCOUNTS);
					if (typeof t === 'string') {
						throw new Error('Unexpected string value received from local storage');
					}
					return t || [];
				} catch (t) {
					throw t;
				}
			}
			async function setYakklContactsStorage(t) {
				try {
					S.set(t);
					await setObjectInLocalStorage('yakklContacts', t);
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklTokenDataStorage(t) {
				try {
					const e = get(P);
					if (!isEqual(e, t)) {
						P.set(t);
						await setObjectInLocalStorage('yakklTokenData', t);
					}
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklTokenDataCustomStorage(t) {
				try {
					const e = get(I);
					if (!isEqual(e, t)) {
						I.set(t);
						await setObjectInLocalStorage('yakklTokenDataCustom', t);
					}
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklCombinedTokenStorage(t) {
				try {
					const e = get(K);
					if (!isEqual(e, t)) {
						K.set(t);
						await setObjectInLocalStorage('yakklCombinedTokens', t);
					}
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklChatsStorage(t) {
				try {
					const e = get(h);
					if (!isEqual(e, t)) {
						h.set(t);
						await setObjectInLocalStorage('yakklChats', t);
					}
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklWalletBlockchainsStorage(t) {
				try {
					const e = get(x);
					if (!isEqual(e, t)) {
						x.set(t);
						await setObjectInLocalStorage('yakklWalletBlockchains', t);
					}
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklWalletProvidersStorage(t) {
				try {
					const e = get(_);
					if (!isEqual(e, t)) {
						_.set(t);
						await setObjectInLocalStorage('yakklWalletProviders', t);
					}
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklConnectedDomainsStorage(t) {
				try {
					const e = get(T);
					if (!isEqual(e, t)) {
						T.set(t);
						await setObjectInLocalStorage('yakklConnectedDomains', t);
					}
				} catch (t) {
					console.log(t);
				}
			}
			async function setSettingsStorage(t) {
				try {
					const e = get(f);
					if (!isEqual(e, t)) {
						f.set(t);
						await setObjectInLocalStorage('settings', t);
					}
				} catch (t) {
					console.log(t);
					throw new Error('Error in setSettingsStorage: ' + t);
				}
			}
			async function setPreferencesStorage(t) {
				try {
					const e = get(g);
					if (!isEqual(e, t)) {
						g.set(t);
						await setObjectInLocalStorage('preferences', t);
					}
				} catch (t) {
					console.log(t);
					throw new Error('Error in setPreferencesStorage: ' + t);
				}
			}
			async function setProfileStorage(t) {
				try {
					const e = get(y);
					const a = await verifyEncryption(t);
					if (!isEqual(e, a)) {
						y.set(a);
						await setObjectInLocalStorage('profile', a);
					}
				} catch (t) {
					console.log(t);
					throw new Error('Error in setProfileStorage: ' + t);
				}
			}
			async function setYakklCurrentlySelectedStorage(t) {
				try {
					if (
						t.shortcuts.address.trim().length === 0 ||
						t.shortcuts.accountName.trim().length === 0
					) {
						throw new Error(
							'Attempting to save yakklCurrentlySelected with no address or no account name. Select a default account and retry.'
						);
					}
					const e = get(d);
					if (!isEqual(e, t)) {
						setYakklCurrentlySelectedStore(t);
						const a = await verifyEncryption(t);
						const o = await verifyEncryption(e);
						if (!isEqual(o, a)) {
							await setObjectInLocalStorage('yakklCurrentlySelected', a);
						}
					}
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklWatchListStorage(t) {
				try {
					p.set(t);
					await setObjectInLocalStorage('yakklWatchList', t);
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklBlockedListStorage(t) {
				try {
					Y.set(t);
					await setObjectInLocalStorage('yakklBlockedList', t);
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklAccountsStorage(t) {
				try {
					const e = await verifyEncryption(t);
					m.set(e);
					await setObjectInLocalStorage('yakklAccounts', e);
				} catch (t) {
					console.log(t);
				}
			}
			async function setYakklPrimaryAccountsStorage(t) {
				try {
					const e = await verifyEncryption(t);
					w.set(e);
					await setObjectInLocalStorage('yakklPrimaryAccounts', e);
				} catch (t) {
					console.log(t);
				}
			}
			async function updateYakklTokenData(t) {
				try {
					const e = get(P);
					const a = e.map((e) => t(e));
					P.set(a);
					await setObjectInLocalStorage('yakklTokenData', a);
				} catch (t) {
					console.log('Error updating token data:', t);
					throw t;
				}
			}
			async function updateYakklTokenDataCustom(t) {
				try {
					const e = get(I);
					const a = e.map((e) => t(e));
					I.set(a);
					await setObjectInLocalStorage('yakklTokenDataCustom', a);
				} catch (t) {
					console.log('Error updating token data custom:', t);
					throw t;
				}
			}
			function updateCombinedTokenStore() {
				const t = [...get(P), ...get(I)];
				K.set(t);
			}
		},
		8387: (t, e, a) => {
			a.d(e, {
				$n: () => D,
				Ct: () => A,
				Fz: () => v,
				ME: () => d,
				U_: () => L,
				dt: () => i,
				oe: () => C,
				qt: () => u,
				vi: () => E,
				yv: () => h
			});
			var o = a(3689);
			var n = a(2443);
			var r = a(5299);
			const c = false;
			let s = ['Ethereum'];
			let l = ['Alchemy'];
			const i = {
				id: '',
				idleDelayInterval: 60,
				showTestNetworks: true,
				dark: n.Fc.SYSTEM,
				chart: 'line',
				screenWidth: 0,
				screenHeight: 0,
				idleAutoLock: true,
				idleAutoLockCycle: r.mx,
				locale: 'en_US',
				currency: { code: 'USD', symbol: '$' },
				words: 32,
				wallet: {
					title: r.p3,
					extensionHeight: r.A3,
					popupHeight: r.DG,
					popupWidth: r.S6,
					enableContextMenu: false,
					enableResize: false,
					splashDelay: r.Wv,
					alertDelay: r.Z6,
					splashImages: r.qC,
					autoLockTimer: 0,
					autoLockAsk: false,
					autoLockAskTimer: 10,
					animationLockScreen: false,
					pinned: true,
					pinnedLocation: 'TL',
					defaultWallet: true
				},
				theme: 'yakkl',
				themes: [
					{
						name: 'yakkl',
						animation: { lockScreen: '' },
						colors: {
							primary: '',
							secondary: '',
							primaryBackgroundLight: '',
							primaryBackgroundDark: ''
						}
					}
				],
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			let u = {
				id: '',
				version: r.xv,
				previousVersion: '',
				registeredType: n._Y.STANDARD,
				legal: { termsAgreed: false, privacyViewed: false, updated: false },
				platform: {
					arch: '',
					nacl_arch: '',
					os: '',
					osVersion: '',
					browser: '',
					browserVersion: '',
					platform: ''
				},
				init: false,
				showHints: true,
				isLocked: true,
				isLockedHow: '',
				transactions: {
					retry: {
						enabled: true,
						howManyAttempts: 3,
						seconds: 30,
						baseFeeIncrease: 0.1,
						priorityFeeIncrease: 0.1
					},
					retain: { enabled: true, days: -1, includeRaw: true }
				},
				meta: {},
				upgradeDate: '',
				lastAccessDate: (0, o.O2)(),
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			let k = {
				id: '',
				blockchain: '',
				name: '',
				tags: [],
				value: 0n,
				includeInPortfolio: false,
				explorer: '',
				address: '',
				addressAlias: '',
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			let g = {
				type: '',
				value: '',
				enhancedSecurity: {
					enabled: false,
					rotationDays: 0,
					lastRotationDate: '',
					passKey: '',
					passKeyHints: [],
					mfaType: '',
					phone: ''
				},
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			let f = { domain: '' };
			let y = {
				key: '',
				type: n._Y.STANDARD,
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			let d = {
				id: '',
				userName: '',
				preferences: i,
				data: {},
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			let S = {
				id: '',
				text: '',
				sender: '',
				timestamp: '',
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			let h = {
				id: '',
				shortcuts: {
					value: 0n,
					accountType: n.st.PRIMARY,
					accountName: r._Y,
					smartContract: false,
					address: r.zF,
					alias: '',
					primary: null,
					init: false,
					legal: false,
					isLocked: true,
					showTestNetworks: false,
					profile: { userName: '', name: null, email: '' },
					gasLimit: 21e3,
					networks: [
						{
							blockchain: 'Ethereum',
							name: 'Mainnet',
							chainId: 1,
							symbol: 'ETH',
							type: n.z1.MAINNET,
							explorer: 'https://etherscan.io',
							decimals: 18
						},
						{
							blockchain: 'Ethereum',
							name: 'Sepolia',
							chainId: 11155111,
							symbol: 'ETH',
							type: n.z1.TESTNET,
							explorer: 'https://sepolia.etherscan.io',
							decimals: 18
						}
					],
					network: {
						blockchain: 'Ethereum',
						name: 'Mainnet',
						chainId: 1,
						symbol: 'ETH',
						type: n.z1.MAINNET,
						explorer: 'https://etherscan.io',
						decimals: 18
					},
					blockchain: 'Ethereum',
					type: 'Mainnet',
					chainId: 1,
					symbol: 'ETH',
					explorer: 'https://etherscan.io'
				},
				preferences: { locale: 'en_US', currency: { code: 'USD', symbol: '$' } },
				data: {},
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			let m = {
				id: '',
				name: r._Y,
				address: r.zF,
				value: 0n,
				index: 0,
				data: {},
				account: {},
				subIndex: 0,
				subAccounts: [],
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			let w = {
				id: '',
				index: 0,
				blockchain: 'Ethereum',
				smartContract: false,
				address: r.zF,
				alias: '',
				accountType: n.st.PRIMARY,
				name: r._Y,
				description: '',
				primaryAccount: m,
				data: {},
				value: 0n,
				class: 'Default',
				level: 'L1',
				isSigner: true,
				avatar: '',
				tags: ['Ethereum'],
				includeInPortfolio: true,
				connectedDomains: [],
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			m.account = w;
			let p = {
				id: '',
				addresses: [],
				name: '',
				permissions: [],
				domain: '',
				icon: '',
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)()
			};
			let Y = {
				id: '',
				name: '',
				address: '',
				addressType: 'EOA',
				avatar: '',
				blockchain: 'Ethereum',
				alias: '',
				note: '',
				version: r.xv,
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)(),
				meta: {}
			};
			let T = {
				id: '',
				name: '',
				description: '',
				token: '',
				thumbnail: '',
				blockchain: '',
				media: [{ type: 'image', url: '' }],
				contract: '',
				owner: '',
				version: r.xv,
				transferDate: '',
				createDate: (0, o.O2)(),
				updateDate: (0, o.O2)(),
				meta: {}
			};
			let v = [w];
			let E = [m];
			let A = [Y];
			let C = [S];
			let O = [p];
			let D = [f];
			let L = [k];
			let b = [
				{
					id: '',
					blockchain: 'Ethereum',
					name: 'Watcher 1',
					tags: ['Binance 8', 'Uniswap'],
					value: '.000455',
					includeInPortfolio: true,
					explorer: '',
					address: '0xf977814e90da44bfa03b6295a0616a897441acec',
					addressAlias: '',
					version: r.xv,
					createDate: (0, o.O2)(),
					updateDate: (0, o.O2)()
				},
				{
					id: '',
					blockchain: 'Ethereum',
					name: 'Watcher 2',
					tags: ['Vb', 'Token holdings'],
					value: '0.0',
					includeInPortfolio: false,
					explorer:
						'https://etherscan.io/tokenholdings?a=0xab5801a7d398351b8be11c439e05c5b3259aec9b',
					address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
					addressAlias: 'Vb',
					version: r.xv,
					createDate: (0, o.O2)(),
					updateDate: (0, o.O2)()
				},
				{
					id: '',
					blockchain: 'Ethereum',
					name: 'Watcher 3',
					tags: ['barmstrong.eth', 'coinbase', 'address'],
					value: '0.0',
					includeInPortfolio: false,
					explorer: 'https://etherscan.io/address/0x5b76f5b8fc9d700624f78208132f91ad4e61a1f0',
					address: '0x5b76f5B8fc9D700624F78208132f91AD4e61a1f0',
					addressAlias: 'barmstrong.eth',
					version: r.xv,
					createDate: (0, o.O2)(),
					updateDate: (0, o.O2)()
				}
			];
			const _ = [
				{ key: 'preferences', value: i },
				{ key: 'settings', value: u },
				{ key: 'yakklCurrentlySelected', value: h },
				{ key: 'yakklSecurity', value: g },
				{ key: 'yakklWalletBlockchains', value: s },
				{ key: 'yakklWalletProviders', value: l },
				{ key: 'profile', value: d },
				{ key: 'yakklBlockedList', value: D },
				{ key: 'yakklWatchList', value: b }
			];
		}
	}
]);
