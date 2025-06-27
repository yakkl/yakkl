GitHub Repository Management
Option 1: Single Private Repository with Open Source Export
Keep a single private repository and use GitHub Actions to export open source components:

# .github/workflows/sync-open-source.yml

name: Sync Open Source Components

on:
push:
branches: [main]

jobs:
sync:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Check for license compliance
        run: node scripts/check-license-compliance.js

      - name: Build open source version
        run: npm run build:open-source

      - name: Prepare repository for sync
        run: |
          # Copy necessary files for an open source repo
          cp LICENSE-OPEN.md dist/LICENSE.md
          cp README.open.md dist/README.md

      - name: Deploy to open source repository
        uses: peaceiris/actions-gh-pages@v3
        with:
          deploy_key: ${{ secrets.OPEN_SOURCE_DEPLOY_KEY }}
          external_repository: yakkl/yakkl-wallet-open
          publish_branch: main
          publish_dir: ./dist

Option 2: Split Repository Structure
If you prefer separate repositories from the start:

yakkl/yakkl-wallet-core: Open source core components
yakkl/yakkl-wallet-full: Private repository with full codebase

Use git submodules to keep them in sync:

yakkl-wallet-full/
├── core/ # Submodule pointing to yakkl-wallet-core
└── private/ # Private components

Directory layout suggestion:

yakkl-wallet/
├── .github/ # GitHub workflows and templates
├── static/ # Static assets (SvelteKit standard)
├── src/
│ ├── lib/ # Library code (SvelteKit standard)
│ │ ├── core/ # Core functionality (mostly open)
│ │ │ ├── blockchain/ # Blockchain interactions
│ │ │ ├── crypto/ # Basic cryptographic functions
│ │ │ └── utils/ # Utility functions
│ │ ├── components/ # UI components (SvelteKit standard)
│ │ │ ├── standard/ # Standard tier components
│ │ │ ├── pro/ # Pro tier components
│ │ │ └── enterprise/ # Enterprise tier components
│ │ ├── features/ # Feature modules
│ │ │ ├── accounts/ # Account management
│ │ │ ├── emergency-kit/ # Emergency Kit
│ │ │ ├── portfolio/ # Portfolio management
│ │ │ └── teams/ # Team management
│ │ ├── stores/ # Svelte stores
│ │ ├── licensing/ # License verification
│ │ │ ├── FeatureManager.ts # Feature access control
│ │ │ └── tiers.ts # Tier definitions
│ │ ├── services/ # Service layer
│ │ └── types/ # TypeScript type definitions
│ ├── routes/ # SvelteKit routes
│ │ ├── standard/ # Standard tier routes
│ │ ├── pro/ # Pro tier routes
│ │ └── enterprise/ # Enterprise tier routes
│ ├── extension/ # Extension-specific code
│ │ ├── background/ # Background service worker
│ │ ├── content/ # Content scripts
│ │ └── inpage/ # Injected scripts
│ ├── app.html # SvelteKit app template
│ └── hooks.ts # SvelteKit hooks
├── tests/ # Test suites
├── scripts/ # Build and development scripts
├── svelte.config.js # SvelteKit configuration
├── vite.config.js # Vite configuration
├── LICENSE-OPEN.md # License for open source components
├── LICENSE-PROPRIETARY.md # License for closed source components
└── package.json
