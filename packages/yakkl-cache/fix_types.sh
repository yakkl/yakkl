#!/bin/bash

# Fix CacheManagerConfig export
sed -i '' 's/export type { CacheManagerConfig }/export type { CacheConfig as CacheManagerConfig }/' src/index.ts

# Fix index.ts function signature
sed -i '' 's/Partial<CacheManagerConfig>/Partial<CacheConfig>/' src/index.ts

# Fix PersistentCache type issue
sed -i '' 's/String.fromCharCode(typeof v === '\''number'\'' ? v : v)/String.fromCharCode(typeof v === '\''number'\'' ? v : v.charCodeAt(0))/' src/tiers/PersistentCache.ts

bash fix_types.sh
