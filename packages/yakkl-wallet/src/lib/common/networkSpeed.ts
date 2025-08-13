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

    // Try to use Cloudflare SpeedTest library, but it may fail in extension contexts
    try {
      // Skip Cloudflare speed test in extension contexts to avoid transferSize errors
      const isExtensionContext = typeof window !== 'undefined' &&
                                 (window.location.pathname.includes('sidepanel') ||
                                  window.location.href.includes('sidepanel') ||
                                  window.location.protocol === 'chrome-extension:' ||
                                  window.location.protocol === 'moz-extension:' ||
                                  window.location.protocol === 'webkit-extension:');

      if (!isExtensionContext) {
        const speedTest = new SpeedTest({
          autoStart: false,
          measurements: [
            { type: 'latency', numPackets: 5 }, // Reduced packets for faster test
            { type: 'download', bytes: 51200, count: 2 } // Smaller download test
          ]
        });

        let isTestComplete = false;
        let testTimeout: NodeJS.Timeout | null = null;

        // Set up event listeners with proper error handling
        speedTest.onFinish = (results) => {
          try {
            if (testTimeout) {
              clearTimeout(testTimeout);
              testTimeout = null;
            }
            isTestComplete = true;
            log.info('Speed test finished', false, results.getSummary());
          } catch (error) {
            log.warn('Error processing speed test results', false, error);
            speedTestError = true;
          }
        };

        speedTest.onError = (error) => {
          if (testTimeout) {
            clearTimeout(testTimeout);
            testTimeout = null;
          }
          log.warn('Speed test error', false, error);
          speedTestError = true;
          isTestComplete = true;
        };

        // Set a shorter timeout to prevent hanging
        testTimeout = setTimeout(() => {
          log.warn('Speed test timeout after 10 seconds');
          speedTestError = true;
          isTestComplete = true;
        }, 10000);

        // Start the test with additional error handling
        try {
          speedTest.play();
        } catch (playError) {
          if (testTimeout) {
            clearTimeout(testTimeout);
            testTimeout = null;
          }
          log.warn('Error starting speed test', false, playError);
          speedTestError = true;
          isTestComplete = true;
        }

        // Wait for test completion with timeout
        const waitForCompletion = new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (isTestComplete || speedTest.isFinished) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          
          // Cleanup interval after timeout
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 12000);
        });

        await waitForCompletion;

        // Clean up timeout if still active
        if (testTimeout) {
          clearTimeout(testTimeout);
          testTimeout = null;
        }

        // Extract results from Cloudflare speed test with error handling
        if (speedTest.results && !speedTestError) {
          try {
            const summary = speedTest.results.getSummary();

            // Safely get latency with fallback
            if (summary && summary.latency && typeof summary.latency === 'number') {
              latency = summary.latency;
            }

            // Safely get download speed with fallback
            if (summary && summary.download && typeof summary.download === 'number') {
              downloadSpeed = summary.download / 1_000_000; // Convert bps to Mbps
            }
          } catch (summaryError) {
            log.warn('Error extracting speed test summary', false, summaryError);
            speedTestError = true;
          }
        }
      } else {
        log.info('Skipping Cloudflare SpeedTest in extension context to avoid transferSize errors');
        speedTestError = true;
      }
    } catch (cfError) {
      // Cloudflare SpeedTest failed (likely due to transferSize issue or other extension context issues)
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

// Track if monitoring is already initialized to prevent multiple intervals
let monitoringInitialized = false;
let monitoringInterval: NodeJS.Timeout | null = null;

/**
 * Initialize periodic network speed testing
 * This should be called once when the wallet starts
 * Will only run the test once on initialization, not continuously
 */
export function initNetworkSpeedMonitoring(): void {
  try {
    // Prevent multiple initializations
    if (monitoringInitialized) {
      log.debug('Network speed monitoring already initialized, skipping');
      return;
    }

    monitoringInitialized = true;

    // Test network speed immediately (one-time)
    testNetworkSpeed().catch(error => {
      log.warn('Initial network speed test failed', false, error);
    });

    // Only re-test if cache expires and a test is specifically requested
    // No automatic periodic testing to avoid performance issues
    log.info('Network speed monitoring initialized (one-time test only)');
  } catch (error) {
    log.warn('Network speed monitoring initialization failed', false, error);
    monitoringInitialized = false; // Reset on error to allow retry
  }
}

/**
 * Stop network speed monitoring and cleanup
 */
export function stopNetworkSpeedMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  monitoringInitialized = false;
  log.info('Network speed monitoring stopped');
}
