<!-- Generic Banner Component for yakkl-ui -->
<script lang="ts">
	let {
		title = '',
		message = '',
		ctaText = '',
		onCallToAction = null,
		variant = 'primary'
	} = $props<{
		title?: string;
		message?: string;
		ctaText?: string;
		onCallToAction?: (() => void) | null;
		variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
	}>();
	
	const variantClasses = {
		primary: 'bg-primary text-primary-content',
		secondary: 'bg-secondary text-secondary-content',
		success: 'bg-success text-success-content',
		warning: 'bg-warning text-warning-content',
		error: 'bg-error text-error-content',
		info: 'bg-info text-info-content'
	};
</script>

<div class="{variantClasses[variant]} p-4 rounded-lg">
	<div class="flex justify-between items-center">
		<div>
			{#if title}
				<h2 class="text-lg font-bold">{title}</h2>
			{/if}
			{#if message}
				<p class="text-sm">{message}</p>
			{/if}
		</div>
		{#if onCallToAction && ctaText}
			<button onclick={onCallToAction} class="btn btn-sm btn-outline">
				{ctaText}
			</button>
		{/if}
	</div>
</div>