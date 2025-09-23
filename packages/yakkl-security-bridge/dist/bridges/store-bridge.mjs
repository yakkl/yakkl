import { writable } from "@yakkl/reactive";
function createStoreBridge() {
  return {
    syncStores(reactiveStore, walletStore) {
      const unsubReactive = reactiveStore.subscribe((value) => {
        if (walletStore.set && typeof walletStore.set === "function") {
          walletStore.set(value);
        }
      });
      if (walletStore.subscribe && typeof walletStore.subscribe === "function") {
        const unsubWallet = walletStore.subscribe((value) => {
          if ("set" in reactiveStore && typeof reactiveStore.set === "function") {
            reactiveStore.set(value);
          }
        });
        return () => {
          unsubReactive();
          unsubWallet();
        };
      }
      return unsubReactive;
    },
    bridgeStores(storePairs) {
      const unsubscribers = storePairs.map(
        (pair) => this.syncStores(pair.reactive, pair.wallet)
      );
      return () => {
        unsubscribers.forEach((unsub) => unsub());
      };
    }
  };
}
function createSyncedStore(initialValue, walletStore) {
  const reactiveStore = writable(initialValue);
  const sync = walletStore ? createStoreBridge().syncStores(reactiveStore, walletStore) : () => {
  };
  return {
    reactive: reactiveStore,
    sync
  };
}
export {
  createStoreBridge,
  createSyncedStore
};
//# sourceMappingURL=store-bridge.mjs.map
