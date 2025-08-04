import { log } from '$lib/common/logger-wrapper';
import { networkTestLimiter } from '$lib/common/rateLimiter';
import SpeedTest from '@cloudflare/speedtest';

export interface NetworkSpeedResult {
  latency: number; // milliseconds
  downloadSpeed: number; // Mbps
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  recommendedTimeout: number; // milliseconds
}

interface NetworkSpeedCache {
  result: NetworkSpeedResult;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TIMEOUT = 3000;
const MIN_TIMEOUT = 1000;
const MAX_TIMEOUT = 30000;

let speedCache: NetworkSpeedCache | null = null;

/**
 * Tests network speed by making a request to api.yakkl.com
 * Returns latency, estimated download speed, and recommended timeout values
 */
export async function testNetworkSpeed(): Promise<NetworkSpeedResult> {
  // Check cache first
  if (speedCache && Date.now() - speedCache.timestamp < CACHE_DURATION) {
    log.debug('Using cached network speed result', false, speedCache.result);
    return speedCache.result;
  }

  // Check rate limit
  if (!networkTestLimiter.isAllowed('network-speed-test-core')) {
    log.warn('Network speed test rate limited', false, {
      resetTime: networkTestLimiter.getResetTime('network-speed-test-core')
    });

    // Return last cached result or conservative defaults
    if (speedCache) {
      return speedCache.result;
    }

    return {
      latency: 500,
      downloadSpeed: 1,
      connectionQuality: 'fair',
      recommendedTimeout: DEFAULT_TIMEOUT * 2
    };
  }

  try {
    let latency = 0;
    let downloadSpeed = 0;
    let speedTestError = false;

    // Try to use Cloudflare SpeedTest library, but it may fail in sidepanel context
    try {
      // Skip Cloudflare speed test in sidepanel context to avoid transferSize errors
      const isSidepanel = typeof window !== 'undefined' &&
                          (window.location.pathname.includes('sidepanel') ||
                           window.location.href.includes('sidepanel'));

      if (!isSidepanel) {
        const speedTest = new SpeedTest({
          autoStart: false,
          measurements: [
            { type: 'latency', numPackets: 10 },
            { type: 'download', bytes: 102400, count: 3 }
          ]
        });

        let isTestComplete = false;

        // Set up event listeners with proper error handling
        speedTest.onFinish = (results) => {
          try {
            isTestComplete = true;
            log.info('Speed test finished', false, results.getSummary());
          } catch (error) {
            log.warn('Error processing speed test results', false, error);
            speedTestError = true;
          }
        };

        speedTest.onError = (error) => {
          log.warn('Speed test error', false, error);
          speedTestError = true;
          isTestComplete = true;
        };

        // Start the test
        speedTest.play();

        // Wait for test completion with timeout
        const waitForCompletion = new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (isTestComplete || speedTest.isFinished) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });

        await Promise.race([
          waitForCompletion,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Speed test timeout')), 15000)
          )
        ]);

        // Extract results from Cloudflare speed test with error handling
        if (speedTest.results && !speedTestError) {
          try {
            const summary = speedTest.results.getSummary();

            // Get latency
            if (summary.latency) {
              latency = summary.latency;
            }

            // Get download speed (already in Mbps)
            if (summary.download) {
              downloadSpeed = summary.download / 1_000_000; // Convert bps to Mbps
            }
          } catch (summaryError) {
            log.warn('Error extracting speed test summary', false, summaryError);
            speedTestError = true;
          }
        }
      } else {
        log.info('Skipping Cloudflare SpeedTest in sidepanel context');
        speedTestError = true;
      }
    } catch (cfError) {
      // Cloudflare SpeedTest failed (likely due to transferSize issue in sidepanel)
      log.warn('Cloudflare SpeedTest failed in current context, using fallback', false, cfError);
      speedTestError = true;
    }

    // Fallback: Simple latency check if Cloudflare test didn't provide results
    if (latency === 0) {
      const latencyStart = performance.now();

      // try {
      //   await fetch('https://api.yakkl.com/health', {
      //     method: 'HEAD',
      //     cache: 'no-cache',
      //     signal: AbortSignal.timeout(5000)
      //   });
      // } catch {
        // Fallback to a reliable public endpoint
        await fetch('https://cloudflare-dns.com/dns-query?name=yakkl.com', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
      // }

      latency = performance.now() - latencyStart;
    }

    // Fallback: Estimate download speed based on latency if not available
    if (downloadSpeed === 0) {
      if (latency < 50) downloadSpeed = 50;       // Excellent latency suggests good bandwidth
      else if (latency < 150) downloadSpeed = 10; // Good latency
      else if (latency < 500) downloadSpeed = 2;  // Fair latency
      else downloadSpeed = 0.5;                   // Poor latency
    }

    // Determine connection quality based on latency and speed
    let connectionQuality: NetworkSpeedResult['connectionQuality'];
    let recommendedTimeout: number;

    if (latency < 100 && downloadSpeed > 10) {
      connectionQuality = 'excellent';
      recommendedTimeout = DEFAULT_TIMEOUT; // Keep default for good connections
    } else if (latency < 300 && downloadSpeed > 2) {
      connectionQuality = 'good';
      recommendedTimeout = DEFAULT_TIMEOUT * 1.5; // 4.5 seconds
    } else if (latency < 1000 && downloadSpeed > 0.5) {
      connectionQuality = 'fair';
      recommendedTimeout = DEFAULT_TIMEOUT * 3; // 9 seconds
    } else {
      connectionQuality = 'poor';
      recommendedTimeout = DEFAULT_TIMEOUT * 5; // 15 seconds
    }

    // Ensure timeout is within bounds
    recommendedTimeout = Math.max(MIN_TIMEOUT, Math.min(MAX_TIMEOUT, recommendedTimeout));

    const result: NetworkSpeedResult = {
      latency: Math.round(latency),
      downloadSpeed: Math.round(downloadSpeed * 100) / 100,
      connectionQuality,
      recommendedTimeout
    };

    // Cache the result
    speedCache = {
      result,
      timestamp: Date.now()
    };

    log.info('Network speed test completed', false, result);
    return result;

  } catch (error) {
    log.warn('Network speed test failed', false, error);

    // Return conservative defaults on error
    const fallbackResult: NetworkSpeedResult = {
      latency: 1000,
      downloadSpeed: 0,
      connectionQuality: 'poor',
      recommendedTimeout: DEFAULT_TIMEOUT * 3 // 9 seconds for poor connections
    };

    // Still cache the fallback to avoid repeated failures
    speedCache = {
      result: fallbackResult,
      timestamp: Date.now()
    };

    return fallbackResult;
  }
}

/**
 * Get recommended timeout based on current network conditions
 * Uses cached result if available, otherwise returns a conservative default
 */
export async function getRecommendedTimeout(): Promise<number> {
  try {
    const speedResult = await testNetworkSpeed();
    return speedResult.recommendedTimeout;
  } catch {
    // Return conservative default on any error
    return DEFAULT_TIMEOUT * 2; // 6 seconds
  }
}

/**
 * Clear the network speed cache to force a new test
 */
export function clearNetworkSpeedCache(): void {
  speedCache = null;
  log.debug('Network speed cache cleared');
}

/**
 * Get timeout based on message type and network conditions
 * Some message types may need longer timeouts regardless of network speed
 */
export async function getDynamicTimeout(messageType?: string): Promise<number> {
  const baseTimeout = await getRecommendedTimeout();

  // Certain message types might need extra time
  const timeoutMultipliers: Record<string, number> = {
    'TRANSACTION_SUBMIT': 2,
    'CONTRACT_CALL': 2,
    'BULK_OPERATION': 3,
    'WALLET_INIT': 1.5,
    'yakkl_getTransactionHistory': 3,  // Transaction history needs more time
    'yakkl_transactionUpdate': 2       // Transaction updates need extra time
  };

  const multiplier = messageType && timeoutMultipliers[messageType] ? timeoutMultipliers[messageType] : 1;
  const finalTimeout = Math.min(baseTimeout * multiplier, MAX_TIMEOUT);

  log.debug('Dynamic timeout calculated', false, {
    messageType,
    baseTimeout,
    multiplier,
    finalTimeout
  });

  return finalTimeout;
}

/**
 * Initialize periodic network speed testing
 * This should be called once when the wallet starts
 */
export function initNetworkSpeedMonitoring(): void {
  try {
    // Test network speed immediately
    testNetworkSpeed().catch(error => {
      log.warn('Initial network speed test failed', false, error);
    });

    // Then test every 5 minutes
    setInterval(() => {
      testNetworkSpeed().catch(error => {
        log.warn('Periodic network speed test failed', false, error);
      });
      }, CACHE_DURATION);

      log.info('Network speed monitoring initialized');
  } catch (error) {
    log.warn('Network speed monitoring initialization failed', false, error);
  }
}
