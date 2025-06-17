<script lang="ts">
	import { log } from '$lib/managers/Logger';
  import { onMount, onDestroy } from 'svelte';

  let { symbol = 'COINBASE:ETHUSD' } = $props();
  let widgetContainer: HTMLDivElement | null = null;
  const URL = import.meta.env.VITE_TRADING_VIEW_LINK;

  const initializeWidget = () => {
    try {
      if (!widgetContainer) return;

      // Clear any existing widget
      widgetContainer.innerHTML = '';

      // Add the widget container for the new TradingView script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = '../../js/embed-widget-symbol-overview.js';
      script.innerHTML = JSON.stringify({
        width: '100%',
        height: '100%',
        symbols: [
          [
            "COINBASE:ETHUSD|1D"
          ],
          [
            "COINBASE:BTCUSD|1D"
          ]
        ], // Dynamically set the symbol
        locale: 'en',
        colorTheme: 'light',
        autosize: true,
        showVolume: true,
        showMA: true,
        hideDateRanges: false,
        hideMarketStatus: false,
        hideSymbolLogo: false,
        scalePosition: "right",
        scaleMode: "Normal",
        fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        fontSize: "10",
        noTimeScale: false,
        valuesTracking: "1",
        changeMode: "price-and-percent",
        chartType: "area",
        maLineColor: "#2962FF",
        maLineWidth: 1,
        maLength: 9,
        headerFontSize: "medium",
        lineWidth: 2,
        lineType: 0,
        dateRanges: [
          "1d|1",
          "1m|30",
          "3m|60",
          "12m|1D",
          "60m|1W",
          "all|1M"
        ]
      });

      log.info('Script', false, script);
      log.info('Widget Container', false, widgetContainer);

      widgetContainer.appendChild(script);
    } catch (error) {
      log.error('Error initializing TradingView widget', false, error);
    }

  };

  // Reactively reinitialize the widget when `symbol` changes
  // $effect(() => {
  //   initializeWidget();
  // });

  onMount(() => {
    initializeWidget();
  });

  onDestroy(() => {
    if (widgetContainer) {
      widgetContainer.innerHTML = '';
    }
  });
</script>

<section id="symbol-info">
  <div class="tradingview-widget-container">
    <div bind:this={widgetContainer} class="tradingview-widget-container__widget" style="width: auto; height: 400px; min-height: 400px; max-height: auto;"></div>
    <div class="tradingview-widget-copyright">
      <a
        href={URL}
        rel="noopener nofollow"
        target="_blank"
      >
        <span class="blue-text">Track all markets on TradingView</span>
      </a>
    </div>
  </div>
</section>

<style>
  .tradingview-widget-container {
    width: 100%;
    height: 100%;
  }
</style>


