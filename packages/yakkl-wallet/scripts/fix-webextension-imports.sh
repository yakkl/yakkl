#!/bin/bash

# Script to replace all webextension-polyfill imports with local types

echo "Fixing webextension-polyfill imports..."

# Find all TypeScript and Svelte files
find src -type f \( -name "*.ts" -o -name "*.svelte" \) | while read -r file; do
    # Skip the browser-types.ts file itself
    if [[ "$file" == *"browser-types.ts" ]]; then
        continue
    fi
    
    # Check if file contains webextension-polyfill import
    if grep -q "from ['\"]webextension-polyfill['\"]" "$file"; then
        echo "Processing: $file"
        
        # Replace the import statement
        # Handle different import patterns
        sed -i.bak -E "s/import type \* as Browser from ['\"]webextension-polyfill['\"]/import type { BrowserAPI } from '\$lib\/types\/browser-types'/g" "$file"
        sed -i.bak -E "s/import type \{ Browser \} from ['\"]webextension-polyfill['\"]/import type { BrowserAPI } from '\$lib\/types\/browser-types'/g" "$file"
        sed -i.bak -E "s/import \* as Browser from ['\"]webextension-polyfill['\"]/import type { BrowserAPI } from '\$lib\/types\/browser-types'/g" "$file"
        sed -i.bak -E "s/import Browser from ['\"]webextension-polyfill['\"]/import type { BrowserAPI } from '\$lib\/types\/browser-types'/g" "$file"
        sed -i.bak -E "s/from ['\"]webextension-polyfill['\"]/from '\$lib\/types\/browser-types'/g" "$file"
        
        # Replace Browser type references with BrowserAPI
        sed -i.bak -E "s/: Browser([^A-Za-z])/: BrowserAPI\1/g" "$file"
        sed -i.bak -E "s/typeof Browser/BrowserAPI/g" "$file"
        sed -i.bak -E "s/<Browser>/<BrowserAPI>/g" "$file"
        sed -i.bak -E "s/as Browser([^A-Za-z])/as BrowserAPI\1/g" "$file"
        
        # Clean up backup files
        rm "${file}.bak"
    fi
done

echo "Import replacement complete!"

# Show remaining imports (should be none)
echo ""
echo "Checking for remaining webextension-polyfill imports..."
grep -r "from ['\"]webextension-polyfill['\"]" src --include="*.ts" --include="*.svelte" || echo "No webextension-polyfill imports found!"