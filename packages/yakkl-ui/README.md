```markdown
# @yakkl/ui — Shared UI Component Library

A shared Svelte 5 component library used across Yakkl frontend projects for consistency, maintainability, and reuse.

---

## 📁 Directory Structure

```bash

/packages
  /yakkl-ui
    /src
      /lib
        /components           # Reusable Svelte components
          Avatar.svelte
        /types                # Shared TypeScript interfaces and enums
          index.ts
        /utils                # Generic utilities and helper functions
          format.ts
        index.ts              # Entry point for exports
      /routes
        /(modals)
          /...
        :
        :

    package.json            # Internal package config
    tsconfig.json           # TypeScript settings
    svelte.config.js        # Svelte preprocessor and alias config

````

---

## 🔗 Usage in Other Yakkl Apps

### Step 1: Alias `@yakkl/ui` in consumer app

Edit `svelte.config.js`:

```ts
import path from 'path';

export default {
  kit: {
    alias: {
      '@yakkl/ui': path.resolve('../../packages/yakkl-ui/src')
    }
  }
};
````

### Step 2: Import and use in SvelteKit

```svelte
<script lang="ts">
  import { Avatar } from '@yakkl/ui';
</script>

<Avatar userName="Toshi" />
```

---

## ✍️ Exporting from yakkl-ui

All exports go through `src/index.ts`:

```ts
export { default as Avatar } from './components/Avatar.svelte';
export { default as Button } from './components/Button.svelte';
export * from './types';
export * from './utils';
```

---

## 🧱 Example Component: `Avatar.svelte`

```svelte
<script lang="ts">
  const { userName, avatarUrl, className, ariaLabel } = $props<{
    userName?: string;
    avatarUrl?: string;
    className?: string;
    ariaLabel?: string;
  }>();

  const initial = userName?.charAt(0)?.toUpperCase() ?? '?';

  const defaultClasses =
    'w-10 h-10 rounded-full ring-2 ring-offset-1 flex items-center justify-center text-sm font-bold uppercase bg-primary-300 text-base-content';
</script>

{#if avatarUrl}
  <img
    src={avatarUrl}
    alt={ariaLabel ?? 'User avatar'}
    class={`object-cover ${className ?? defaultClasses}`}
    loading="lazy"
  />
{:else}
  <div
    class={className ?? defaultClasses}
    aria-label={ariaLabel ?? 'User avatar'}
    role="img"
  >
    {initial}
  </div>
{/if}
```

---

## 🔄 Development Workflow

### Add a New Component

```bash
mkdir src/components/MyComponent
touch src/components/MyComponent/MyComponent.svelte
```

### Export It

```ts
// src/index.ts
export { default as MyComponent } from './components/MyComponent/MyComponent.svelte';
```

### Use It in Another Yakkl App

```ts
import { MyComponent } from '@yakkl/ui';
```

---

## 🧠 Design Philosophy

* **Reusable**: Use in multiple apps without modification
* **Composable**: Slot-ready, class-driven, flexible
* **Accessible**: Semantic roles, ARIA where needed
* **Framework-First**: Tailwind CSS and Svelte 5 compatibility
* **Minimalist**: Avoid premature abstraction or app-specific logic

---

## 🛠 Tools & Dependencies

* [Svelte 5](https://github.com/sveltejs/svelte)
* [Tailwind CSS](https://tailwindcss.com/)
* [pnpm Workspaces](https://pnpm.io/workspaces)
* Optional: Storybook, Histoire (not yet set up)

---

## 🚧 TODOs

* [ ] Add Histoire or Storybook for visual docs
* [ ] Tailwind config documentation and conventions
* [ ] Add a CLI or generator for scaffolding components
* [ ] Create `@yakkl/core` for shared stores, types, logic
* [ ] Add visual test automation
* [ ] Set up GitHub Actions or publish script for versioning

---

## 📝 Notes to Future Self

* Always build new shared components here first.
* Only migrate old ones if/when they’re reused or refactored.
* Don’t bring app logic into this package — keep it generic and pure.
* Consider breaking into multiple packages (`@yakkl/ui`, `@yakkl/core`, `@yakkl/hooks`) as this grows.
* Stay consistent with exports and file naming.

---

## 🔒 License

Private – Yakkl internal use only.

```
```
