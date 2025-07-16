import { W as t } from "./IntegrationAPI-BrnntV9A.mjs";
import { A as f, E as l, I as c, N as m, R as g, T as u } from "./IntegrationAPI-BrnntV9A.mjs";
import { D as v, L as w, a as y, M as h } from "./DiscoveryProtocol-C3idOBxL.mjs";
async function a(e = {}) {
  const r = {
    name: "YAKKL Wallet",
    version: "1.0.0",
    embedded: !1,
    restrictions: [],
    modDiscovery: !0,
    enableMods: !0,
    enableDiscovery: !0,
    storagePrefix: "yakkl",
    logLevel: "info",
    ...e
  }, o = new t(r);
  return await o.initialize(), o;
}
function n(e) {
  try {
    if (!e.manifest)
      throw new Error("Mod missing manifest");
    if (!e.manifest.id || !e.manifest.name || !e.manifest.version)
      throw new Error("Mod manifest missing required fields");
    const r = ["initialize", "destroy", "isLoaded", "isActive"];
    for (const o of r)
      if (typeof e[o] != "function")
        throw new Error(`Mod missing required method: ${o}`);
    return !0;
  } catch (r) {
    return console.error("Mod validation failed:", r), !1;
  }
}
export {
  f as AccountManager,
  v as DiscoveryProtocol,
  l as EmbeddedAPI,
  c as IntegrationAPI,
  w as Logger,
  y as ModLoader,
  h as ModRegistry,
  m as NetworkManager,
  g as RemoteAPI,
  u as TransactionManager,
  t as WalletEngine,
  a as createWallet,
  n as validateMod
};
//# sourceMappingURL=index.mjs.map
