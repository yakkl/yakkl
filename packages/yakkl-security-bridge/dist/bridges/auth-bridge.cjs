"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
function createAuthBridge() {
  let authed = false;
  const listeners = /* @__PURE__ */ new Set();
  return {
    isAuthenticated: () => authed,
    getUser: () => null,
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }
  };
}
exports.createAuthBridge = createAuthBridge;
//# sourceMappingURL=auth-bridge.cjs.map
