# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by pnpm; workspace defined in `pnpm-workspace.yaml`.
- Packages live under `packages/*` (e.g., `@yakkl/core`, `yakkl-wallet`, `yakkl-browser-extension`).
- Typical layout: `src/` (source), `dist/` (build output), `tests/` or `*.test.ts`, plus package-specific configs (`vite.config.ts`, `tsconfig.json`).

## Build, Test, and Development Commands
- Install deps: `pnpm install` (run at repo root).
- Build all packages: `pnpm -r build`.
- Test all packages: `pnpm -r test`.
- Lint/format: `pnpm -r lint` and `pnpm -r format`.
- Package dev examples:
  - Core (watch build): `pnpm --filter @yakkl/core dev`.
  - Wallet (Chrome dev build): `pnpm --filter yakkl-wallet run dev:chrome`.
  - Wallet production build: `pnpm --filter yakkl-wallet run build:chrome`.

## Coding Style & Naming Conventions
- Languages: TypeScript (primary), Svelte (wallet UI).
- Formatting: Prettier; Linting: ESLint. Use 2‑space indentation.
- Naming: `camelCase` for vars/functions, `PascalCase` for types/classes/components, `kebab-case` for filenames.
- Do not edit or commit generated `dist/` artifacts.

## Testing Guidelines
- Frameworks: Vitest (e.g., `@yakkl/core`), Jest/Playwright where applicable (e.g., `yakkl-wallet`).
- Name tests `*.test.ts` (or use `packages/<pkg>/tests/` where present).
- Run per package: `pnpm --filter <package> test`.
- Add tests for new features and bug fixes; include edge cases. No strict coverage gate yet—aim for meaningful coverage on critical paths.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `type(scope): summary`. Scope should be the package (e.g., `core`, `wallet`, `browser-extension`). Examples: `feat(core): add state sync`, `fix(wallet): correct jwt validation`.
- PRs should include:
  - Clear description and rationale; link related issues.
  - Screenshots/GIFs for UI changes (wallet/extension).
  - How-to-test steps and any env vars used.
  - Passing build, lint, and tests (`pnpm -r build`, `pnpm -r lint`, `pnpm -r test`).

## Security & Configuration Tips
- Never commit secrets. Use env generation where provided (e.g., `pnpm --filter yakkl-wallet run build:env:dev`).
- Prefer local `.env` files ignored by Git; document required keys in package READMEs.
