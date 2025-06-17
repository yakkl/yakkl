// main.ts
import { get } from "svelte/store";
import { yakklGasTransStore, yakklConnectionStore } from "$lib/common/stores";
import type { GasFeeTrend, BlocknativeResponse, GasTransStore, EstimatedPrice } from '$lib/common/interfaces';
import { timerManager } from "$lib/managers/TimerManager";
import { log } from "$lib/managers/Logger";
import { TIMER_CHECK_GAS_PRICE_INTERVAL_TIME, TIMER_GAS_PRICE_CHECK } from "$lib/common";

const now = () => +Date.now() / 1000;

let providerGasCB: string | null = null;
const gasFeeTrend: GasFeeTrend[] = [];

async function checkGasPricesCB() {
  try {
    if (timerManager.isRunning(TIMER_GAS_PRICE_CHECK)) {
      if (get(yakklConnectionStore) === true) {
        const results = await fetchBlocknativeData();
        // log.debug('gas.ts - checkGasPricesCB', false, results);
        yakklGasTransStore.set({ provider: providerGasCB, id: timerManager.getTimeoutID(TIMER_GAS_PRICE_CHECK), results });
      }
    }
  } catch (error) {
    log.error(error);
  }
}

function setGasCBProvider(provider: string | null) {
  providerGasCB = provider;
}

export function stopCheckGasPrices() {
  try {
    timerManager.stopTimer(TIMER_GAS_PRICE_CHECK);
    setGasCBProvider(null);
  } catch (error) {
    log.error(error);
  }
}

export function startCheckGasPrices(provider = 'blocknative', ms = TIMER_CHECK_GAS_PRICE_INTERVAL_TIME) {
  try {
    if (ms > 0) {
      if (timerManager.isRunning(TIMER_GAS_PRICE_CHECK)) {
        return; // Already running
      }

      setGasCBProvider(provider);
      if (!timerManager.isRunning(TIMER_GAS_PRICE_CHECK)) {
        timerManager.addTimer(TIMER_GAS_PRICE_CHECK, checkGasPricesCB, ms);
        timerManager.startTimer(TIMER_GAS_PRICE_CHECK);
      }
    }
  } catch (error) {
    log.error(error);
    timerManager.stopTimer(TIMER_GAS_PRICE_CHECK);
  }
}

const memoizeAsync = <T>(fn: () => Promise<T>): () => Promise<T> => {
  const CACHE_DURATION = 10;
  let lastRunTs = 0;
  let cache: T;

  return async () => {
    const isCacheExpired = now() - lastRunTs > CACHE_DURATION;

    if (isCacheExpired) {
      lastRunTs = now();
      cache = await fn();
    }

    return cache;
  };
};

const debounce = <T>(fn: () => Promise<T>): () => Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;

  return () =>
    new Promise((resolve) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => resolve(fn()), 500);
    });
};

const getBlocknativeData = memoizeAsync<BlocknativeResponse>(async () =>
  (
    await fetch(
      import.meta.env.VITE_GAS_BLOCKNATIVE_ENDPOINT
    )
  ).json()
);

const getEtherscanData = memoizeAsync(async () =>
  (
    await fetch(
      import.meta.env.VITE_GAS_ETHERSCAN_ENDPOINT
    )
  ).json()
);

const getEGSData = memoizeAsync(async () =>
  (
    await fetch(
      import.meta.env.VITE_GAS_ETHGASSTATION_ENDPOINT
    )
  ).json()
);

export { debounce, getBlocknativeData, getEtherscanData, getEGSData };

export const fetchBlocknativeData = debounce(async () => {
  try {
    const response = await getBlocknativeData();
    if (response?.blockPrices) {
      const blockPrices = response.blockPrices[0];
      const estimatedPrices: EstimatedPrice[] = blockPrices.estimatedPrices;

      const fastest = estimatedPrices.find((price: EstimatedPrice) => price.confidence === 99)!;
      const faster = estimatedPrices.find((price: EstimatedPrice) => price.confidence === 95)!;
      const fast = estimatedPrices.find((price: EstimatedPrice) => price.confidence === 90)!;
      const standard = estimatedPrices.find((price: EstimatedPrice) => price.confidence === 80)!;
      const slow = estimatedPrices.find((price: EstimatedPrice) => price.confidence === 70)!;

      if (gasFeeTrend.length > 4) {
        gasFeeTrend.shift();
      }
      gasFeeTrend.push({
        blocknumber: blockPrices.blockNumber,
        baseFeePerGas: blockPrices.baseFeePerGas,
        maxPriorityFeePerGas: fastest.maxPriorityFeePerGas,
        maxFeePerGas: fastest.maxFeePerGas,
        timestamp: now()
      });

      const sum = gasFeeTrend.reduce((accumulator, currentValue) => accumulator + currentValue.baseFeePerGas, 0);
      const avg = sum / gasFeeTrend.length;

      const results: GasTransStore['results'] = {
        blockNumber: blockPrices.blockNumber,
        estimatedTransactionCount: blockPrices.estimatedTransactionCount,
        gasProvider: 'blocknative',
        actual: {
          baseFeePerGas: blockPrices.baseFeePerGas,
          fastest: { maxPriorityFeePerGas: fastest.maxPriorityFeePerGas, maxFeePerGas: fastest.maxFeePerGas },
          faster: { maxPriorityFeePerGas: faster.maxPriorityFeePerGas, maxFeePerGas: faster.maxFeePerGas },
          fast: { maxPriorityFeePerGas: fast.maxPriorityFeePerGas, maxFeePerGas: fast.maxFeePerGas },
          standard: { maxPriorityFeePerGas: standard.maxPriorityFeePerGas, maxFeePerGas: standard.maxFeePerGas },
          slow: { maxPriorityFeePerGas: slow.maxPriorityFeePerGas, maxFeePerGas: slow.maxFeePerGas }
        },
        gasFeeTrend: {
          baseFeePerGasAvg: avg,
          mostRecentFees: gasFeeTrend
        }
      };

      return results;
    } else {
      return {} as GasTransStore['results'];
    }
  } catch (error) {
    log.error(error);
    return {} as GasTransStore['results'];
  }
});

export const fetchEtherscanData = debounce(async () => {
  try {
    const {
      result: { SafeGasPrice, ProposeGasPrice, FastGasPrice },
    } = await getEtherscanData();

    return [
      parseInt(FastGasPrice, 10),
      parseInt(ProposeGasPrice, 10),
      parseInt(SafeGasPrice, 10)
    ];
  } catch (error) {
    log.error(error);
    return [0, 0, 0];
  }
});

export const fetchEGSData = debounce(async () => {
  try {
    const { fast, safeLow, average } = await getEGSData();

    return [fast / 10, average / 10, safeLow / 10];
  } catch (error) {
    log.error(error);
    return [0, 0, 0];
  }
});
