<script>
	const URL = import.meta.env.VITE_TRADING_VIEW_LINK;
</script>

<section id="top-stories">
	<div class="tradingview-widget-container">
		<div
			class="tradingview-widget-container__widget"
			style="width: auto; height: 400px; min-height: 400px; max-height: auto;"
		>
			<script type="text/javascript" src="../../js/embed-widget-timeline.js" async>
        {
        "feedMode": "market",
        "market": "crypto",
        "isTransparent": false,
        "displayMode": "adaptive",
        "width": "100%",
        "height": "100%",
        "colorTheme": "light",
        "locale": "en"
        }
			</script>
		</div>
	</div>
	<div class="tradingview-widget-copyright">
		<a href={URL} rel="noopener nofollow" target="_blank"
			><span class="blue-text">Track all markets on TradingView</span></a
		>
	</div>
</section>
