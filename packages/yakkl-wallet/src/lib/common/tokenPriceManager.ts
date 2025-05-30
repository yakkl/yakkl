import { writable, get } from "svelte/store";
import { yakklCombinedTokenStore, setYakklCombinedTokenStorage } from "$lib/common/stores";
import { log } from "$lib/plugins/Logger";
import { PriceManager } from "$lib/plugins/PriceManager";
import { createPriceUpdater } from "./createPriceUpdater";
import { TimerManager } from "$lib/plugins/TimerManager";
import type { TokenData } from "$lib/common/interfaces";
import { TIMER_TOKEN_PRICE_CYCLE_TIME } from "./constants";

let priceManager: PriceManager | null = null;
let priceUpdater: any | null = null;

const fetchingActive = writable(false); // Prevents duplicate fetches

// NOTE: May want to pass in priceManager as a parameter to allow for different configurations
export async function updateTokenPrices() {
  if (get(fetchingActive)) return; // Prevent concurrent fetches
  fetchingActive.set(true);

  try {
    log.info("updateTokenPrices: Starting price update");
    const tokens: TokenData[] = get(yakklCombinedTokenStore);  // Ensure we're working with the correct store
    if (tokens.length === 0) {
      log.info("updateTokenPrices: No tokens to update");
      return;
    }

    const updatedTokens: TokenData[] = await priceUpdater.fetchPrices(tokens);
    if (!updatedTokens || updatedTokens.length === 0) {
      log.warn("updateTokenPrices: Fetched prices returned empty.");
      return;
    }

    // Update the store
    yakklCombinedTokenStore.update(() => updatedTokens);

    // Persist to localStorage
    await setYakklCombinedTokenStorage(updatedTokens);
    log.info("updateTokenPrices: Successfully updated and persisted token prices");
  } catch (error) {
    log.error("updateTokenPrices: Failed to update token prices", false, error);
  } finally {
    fetchingActive.set(false);
  }
}

// Get the TimerManager instance
const timerManager = TimerManager.getInstance();

if (!timerManager.hasTimer("tokenPriceUpdater")) {
  log.info("Setting up token price updater timer");
  if (!priceManager) {
    priceManager = new PriceManager();
  }
  if (!priceUpdater) {
    priceUpdater = createPriceUpdater(priceManager);
  }
  // Setup a timer to call `updateTokenPrices()` every 15s
  timerManager.addTimer("tokenPriceUpdater", async () => {
    await updateTokenPrices();
  }, TIMER_TOKEN_PRICE_CYCLE_TIME);
}

if (!timerManager.isRunning("tokenPriceUpdater")) {
  log.info("Starting token price updater timer");
  timerManager.startTimer("tokenPriceUpdater");
}
