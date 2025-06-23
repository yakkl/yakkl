<script lang="ts">
	interface Props {
		text?: string;
		typingSpeed?: number;
	}

	let { text = '', typingSpeed = 50 }: Props = $props();

	let visibleText = $state('');
	let typing = $state(false);
	let lastText = $state('');

	async function type() {
		if (!typing) {
			typing = true;
			visibleText = '';
			for (const char of text) {
				visibleText += char;
				await new Promise((resolve) => setTimeout(resolve, typingSpeed));
			}
			typing = false;
		}
	}

	// Only run typing effect when text prop actually changes (prevents infinite loop)
	$effect(() => {
		if (text !== lastText && text && text.length > 0) {
			lastText = text;
			type();
		}
	});
</script>

<div class="typing-effect">
	{visibleText}<span class="typing-cursor" class:typing>{typing ? '|' : ''}</span>
</div>

<style>
	.typing-effect {
		display: inline;
	}

	.typing-cursor {
		font-weight: bold;
		animation: blink 1s infinite;
	}

	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
</style>
