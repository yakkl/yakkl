#!/bin/bash

# Script to fix incorrect browser imports from our types file

echo "Fixing browser imports..."

# Find all files that import browser as default from our types
find src -type f \( -name "*.ts" -o -name "*.svelte" \) | while read -r file; do
    # Skip the browser-types.ts file itself
    if [[ "$file" == *"browser-types.ts" ]]; then
        continue
    fi
    
    # Check if file contains the problematic import
    if grep -q "import browser from '\$lib/types/browser-types'" "$file"; then
        echo "Fixing: $file"
        
        # Replace the import with getBrowserExt
        sed -i.bak "s/import browser from '\$lib\/types\/browser-types'/import { getBrowserExt } from '\$lib\/browser-polyfill-wrapper'/g" "$file"
        
        # Check if the file uses 'browser' directly (not as browser_ext)
        if grep -q "^[[:space:]]*browser\." "$file" && ! grep -q "const browser_ext = browser" "$file"; then
            # Add browser constant after imports
            # Find the last import statement and add the const after it
            awk '/^import/ { imports = imports $0 "\n" } 
                 !/^import/ && !done { 
                     if (imports != "") {
                         print imports "const browser = getBrowserExt()!;"
                         imports = ""
                         done = 1
                     }
                     print 
                 }
                 /^import/ { next }' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
        elif grep -q "const browser_ext = browser" "$file"; then
            # Replace browser_ext = browser with browser_ext = getBrowserExt()
            sed -i.bak "s/const browser_ext = browser;/const browser_ext = getBrowserExt();/g" "$file"
        fi
        
        # Clean up backup files
        rm "${file}.bak" 2>/dev/null || true
    fi
done

# Also fix any remaining imports that use browser from webextension-polyfill directly
find src -type f \( -name "*.ts" -o -name "*.svelte" \) | while read -r file; do
    if grep -q "^import browser " "$file" && grep -q "webextension-polyfill" "$file"; then
        echo "Fixing direct browser import in: $file"
        
        # Replace various browser import patterns
        sed -i.bak -E "s/^import browser from ['\"]webextension-polyfill['\"];?/import { getBrowserExt } from '\$lib\/browser-polyfill-wrapper';\nconst browser = getBrowserExt()!;/g" "$file"
        
        # Clean up backup
        rm "${file}.bak" 2>/dev/null || true
    fi
done

echo "Browser import fixes complete!"

# Show any remaining problematic imports
echo ""
echo "Checking for remaining issues..."
grep -r "from '\$lib/types/browser-types'" src --include="*.ts" --include="*.svelte" | grep -v "import type" | grep -v "BrowserAPI" || echo "No issues found!"