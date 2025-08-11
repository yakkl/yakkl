# YAKKL Smart Wallet

🚀 Enterprise-grade Web3 wallet with advanced security features and multi-chain support.

> 🔐 Note: This project includes placeholders for private UI components. These are mocked in /src/mocks/yakkl-ui-private/ and provide safe fallbacks for public contributors. If you're working on Pro-only features and need full access, contact the core team.

## Overview

YAKKL Smart Wallet v2 is a secure, feature-rich browser extension wallet designed for both individual users and enterprises. Built with SvelteKit and TypeScript, it provides advanced security features, multi-chain support, and a seamless user experience.

### Key Features

- 🔐 **Enterprise Security**: JWT-based authentication, secure session management, and advanced lock mechanisms
- 🌐 **Multi-Chain Support**: Ethereum, Polygon, Arbitrum, Optimism, and more
- 📊 **Portfolio Management**: Real-time portfolio tracking with multi-level aggregation
- 🛡️ **Security First**: Biometric authentication, secure recovery, and encrypted storage
- ⚡ **Performance Optimized**: Direct storage access, intelligent caching, and efficient message passing
- 🎨 **Modern UI**: Responsive design with dark mode support

## Architecture

### Browser Extension Architecture

The wallet uses a sophisticated browser extension architecture:

- **Service Worker**: Handles background operations, API calls, and state management
- **Content Scripts**: Minimal injection for dApp communication
- **Popup/Sidepanel**: Main UI interfaces with optimized browser API access
- **Message Passing**: Secure communication between contexts

### Performance Optimizations

- **Direct Storage Access**: 50ms → 5ms improvement for extension contexts
- **Context Detection**: Automatic API selection based on runtime context
- **Intelligent Caching**: Multi-level caching for portfolio and transaction data
- **Static Imports**: Service worker compatible build configuration

## Development

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Chrome/Brave browser for testing

### Setup

```bash
# From the monorepo root (/yakkl)
pnpm install

# Start development server
pnpm run dev:wallet

# Run tests
pnpm test:wallet

# Type checking
pnpm run check:wallet

# Linting
pnpm run lint:wallet
```

### Important Development Notes

1. **Always run commands from the monorepo root** (`/yakkl`), not from the package directory
2. **No dynamic imports** - Use static imports only (service worker compatibility)
3. **BigNumber formatting** - Always use proper formatting utilities for display
4. **Multi-chain naming** - Avoid chain-specific names (e.g., use `nativeToken` not `ethToken`)

### Project Structure

```
src/
├── app.html                 # Main HTML template
├── lib/
│   ├── common/             # Shared utilities and types
│   ├── components/         # Svelte components
│   ├── services/           # Business logic services
│   ├── stores/             # Svelte stores for state
│   └── utilities/          # Helper functions
├── routes/                 # SvelteKit routes
├── contexts/              # Browser extension contexts
│   ├── background/        # Service worker
│   ├── content/          # Content scripts
│   └── inpage/           # Injected scripts
└── tests/                 # Test files
```

## Configuration

### Environment Variables

Create a `.env` file in the package root:

```env
PUBLIC_ALCHEMY_API_KEY=your_key_here
PUBLIC_INFURA_API_KEY=your_key_here
PUBLIC_ENVIRONMENT=development
```

### Feature Flags

Configure in `settings.json`:

```json
{
  "multiChainView": true,
  "testnetDisplay": true,
  "idleDetection": {
    "threshold": 120,
    "lockdownTime": 60
  }
}
```

## Security

### Security Features

- **Session Management**: Automatic timeout with configurable thresholds
- **Token Blacklisting**: JWT invalidation on wallet lock
- **Secure Storage**: Encrypted local storage with key derivation
- **CSP Compliance**: Strict content security policies
- **Biometric Support**: Hardware-backed authentication

### Security Best Practices

1. Never expose private keys or mnemonics
2. Use secure message passing between contexts
3. Validate all external inputs
4. Implement proper error boundaries
5. Regular security audits

## Testing

```bash
# Unit tests
pnpm test:unit

# Integration tests  
pnpm test:integration

# E2E tests
pnpm test:e2e

# All tests
pnpm test:wallet
```

## Building

```bash
# Development build
pnpm run build:wallet

# Production build
pnpm run build:wallet:prod

# Create extension package
pnpm run package:wallet
```

## Documentation

- **Architecture**: See `.claude/PROJECT_CONTEXT.md` for detailed architecture
- **Development Guide**: `.claude/WORKFLOW.md` for development workflow
- **API Documentation**: `/docs/api/` for service APIs
- **Component Library**: `/docs/components/` for UI components

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Write comprehensive tests
- Document complex logic
- Keep components small and focused

## License

Private - See LICENSE file for details

## Support

- Documentation: [docs.yakkl.com](https://docs.yakkl.com)
- Issues: GitHub Issues
- Contact: support@yakkl.com

---

Built with ❤️ by the YAKKL team