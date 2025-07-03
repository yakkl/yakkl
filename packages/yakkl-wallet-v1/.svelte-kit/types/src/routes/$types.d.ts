import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// @ts-ignore
type MatcherParam<M> = M extends (param : string) => param is infer U ? U extends string ? U : string : string;
type RouteParams = {  };
type RouteId = '/';
type MaybeWithVoid<T> = {} extends T ? T | void : T;
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K; }[keyof T];
type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>
type EnsureDefined<T> = T extends null | undefined ? {} : T;
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;
export type Snapshot<T = any> = Kit.Snapshot<T>;
type LayoutRouteId = RouteId | "/(dapp)/dapp/EIP6963" | "/(dapp)/dapp/login" | "/(dapp)/dapp/popups/accounts" | "/(dapp)/dapp/popups/approve" | "/(dapp)/dapp/popups/permissions" | "/(dapp)/dapp/popups/sign" | "/(dapp)/dapp/popups/transactions" | "/(dapp)/dapp/popups/wallet" | "/(dapp)/dapp/walletConnect" | "/(sidepanel)/sidepanel/sidepanel" | "/(splash)/popup" | "/(splash)/popup/popup" | "/(test)/test-registration-prompt" | "/(upgrade)/upgrade" | "/(wallet)" | "/(wallet)/accounts" | "/(wallet)/accounts/ethereum" | "/(wallet)/accounts/ethereum/create/derived" | "/(wallet)/accounts/ethereum/create/primary" | "/(wallet)/accounts/ethereum/transactions/buy" | "/(wallet)/accounts/ethereum/transactions/send" | "/(wallet)/accounts/ethereum/transactions/stake" | "/(wallet)/contacts" | "/(wallet)/crypto" | "/(wallet)/cta" | "/(wallet)/import/import-phrase" | "/(wallet)/legal/Legal" | "/(wallet)/lock" | "/(wallet)/login/Login" | "/(wallet)/logout" | "/(wallet)/register/Register" | "/(wallet)/security" | "/(wallet)/tokens" | "/(wallet)/welcome/welcome" | "/phishing" | "/preview" | "/preview/accounts" | "/preview/ai-help" | "/preview/contacts" | "/preview/preferences" | "/preview/send" | "/preview/settings" | "/preview/swap" | "/preview/tokens" | "/preview1" | "/preview1/emergency-kit" | "/preview1/history" | "/preview1/receive" | "/preview1/send" | "/preview1/settings" | "/preview1/swap" | "/preview1/watch-accounts" | "/preview2" | "/preview2/accounts" | "/preview2/ai-help" | "/preview2/contacts" | "/preview2/legal" | "/preview2/login" | "/preview2/mods" | "/preview2/preferences" | "/preview2/register" | "/preview2/send" | "/preview2/settings" | "/preview2/success" | "/preview2/swap" | "/preview2/tokens" | "/preview2/upgrade" | null
type LayoutParams = RouteParams & {  }
type LayoutParentData = EnsureDefined<{}>;

export type LayoutServerData = null;
export type LayoutLoad<OutputData extends OutputDataShape<LayoutParentData> = OutputDataShape<LayoutParentData>> = Kit.Load<LayoutParams, LayoutServerData, LayoutParentData, OutputData, LayoutRouteId>;
export type LayoutLoadEvent = Parameters<LayoutLoad>[0];
export type LayoutData = Expand<Omit<LayoutParentData, keyof Kit.LoadProperties<Awaited<ReturnType<typeof import('../../../../src/routes/+layout.js').load>>>> & OptionalUnion<EnsureDefined<Kit.LoadProperties<Awaited<ReturnType<typeof import('../../../../src/routes/+layout.js').load>>>>>>;
export type LayoutProps = { data: LayoutData; children: import("svelte").Snippet }