// Project Structure
src/
├── types/
│ ├── ethereum.ts
│ ├── eip6963.ts
│ └── messages.ts
├── providers/
│ ├── base/
│ │ ├── BaseProvider.ts
│ │ └── ProviderUtils.ts
│ ├── EIP6963Provider.ts
│ └── ProviderRegistry.ts
├── communication/
│ ├── MessageStream.ts
│ └── PortStream.ts
├── background/
│ ├── BackgroundService.ts
│ └── handlers/
│ ├── TransactionHandler.ts
│ └── AccountHandler.ts
├── content/
│ └── ContentScript.ts
├── inpage/
│ └── InpageScript.ts
└── utils/
├── rpcErrors.ts
└── validation.ts
