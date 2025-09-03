<!-- Input.svelte -->
<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface Props {
    type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local';
    value?: string | number;
    placeholder?: string;
    label?: string;
    error?: string;
    hint?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    className?: string;
    inputClassName?: string;
    variant?: 'bordered' | 'ghost' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    leftIcon?: any;
    rightIcon?: any;
    name?: string;
    id?: string;
    autocomplete?: string;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    pattern?: string;
    maxlength?: number;
    onInput?: (e: Event) => void;
    onChange?: (e: Event) => void;
    onBlur?: (e: FocusEvent) => void;
    onFocus?: (e: FocusEvent) => void;
    onKeydown?: (e: KeyboardEvent) => void;
  }

  let {
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    label = '',
    error = '',
    hint = '',
    disabled = false,
    readonly = false,
    required = false,
    className = '',
    inputClassName = '',
    variant = 'bordered',
    size = 'md',
    leftIcon: LeftIcon = null,
    rightIcon: RightIcon = null,
    name = '',
    id = '',
    autocomplete = '',
    min,
    max,
    step,
    pattern = '',
    maxlength,
    onInput = () => {},
    onChange = () => {},
    onBlur = () => {},
    onFocus = () => {},
    onKeydown = () => {}
  }: Props = $props();

  const sizeClasses = $derived({
    xs: 'input-xs',
    sm: 'input-sm',
    md: 'input-md',
    lg: 'input-lg'
  }[size]);

  const variantClasses = $derived({
    bordered: 'input-bordered',
    ghost: 'input-ghost',
    primary: 'input-primary',
    secondary: 'input-secondary',
    accent: 'input-accent',
    info: 'input-info',
    success: 'input-success',
    warning: 'input-warning',
    error: 'input-error'
  }[variant]);

  const inputClasses = $derived(
    twMerge(
      'input w-full',
      sizeClasses,
      variantClasses,
      error && 'input-error',
      disabled && 'input-disabled',
      inputClassName
    )
  );

  const containerClasses = $derived(
    twMerge('form-control w-full', className)
  );
</script>

<div class={containerClasses}>
  {#if label}
    <label class="label" for={id}>
      <span class="label-text" class:text-error={error}>
        {label}
        {#if required}
          <span class="text-error">*</span>
        {/if}
      </span>
    </label>
  {/if}

  <div class="relative">
    {#if LeftIcon}
      <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <LeftIcon class="w-5 h-5 text-base-content/50" />
      </div>
    {/if}

    <input
      {type}
      bind:value
      {placeholder}
      {disabled}
      {readonly}
      {required}
      {name}
      {id}
      {autocomplete}
      {min}
      {max}
      {step}
      {pattern}
      {maxlength}
      class={inputClasses}
      class:pl-10={LeftIcon}
      class:pr-10={RightIcon}
      on:input={onInput}
      on:change={onChange}
      on:blur={onBlur}
      on:focus={onFocus}
      on:keydown={onKeydown}
    />

    {#if RightIcon}
      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <RightIcon class="w-5 h-5 text-base-content/50" />
      </div>
    {/if}
  </div>

  {#if error}
    <label class="label">
      <span class="label-text-alt text-error">{error}</span>
    </label>
  {:else if hint}
    <label class="label">
      <span class="label-text-alt">{hint}</span>
    </label>
  {/if}
</div>