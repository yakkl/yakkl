import { globalListenerManager } from "$lib/managers/GlobalListenerManager";

export function removeListeners() {
  if (globalListenerManager) {
    globalListenerManager.removeAll();
  }
}
