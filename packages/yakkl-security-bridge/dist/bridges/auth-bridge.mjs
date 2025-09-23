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
export {
  createAuthBridge
};
//# sourceMappingURL=auth-bridge.mjs.map
