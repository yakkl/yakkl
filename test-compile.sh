#!/bin/bash

# Test compilation script for TokenPortfolio changes
cd /Users/hansjones/projects/lambdastack/yakkl/crypto/yakkl

echo "Testing TokenPortfolio.svelte compilation..."

# Quick compile check
pnpm run build:router

if [ $? -eq 0 ]; then
    echo "✅ Router build successful"
    
    # Test wallet development build
    cd packages/yakkl-wallet
    
    echo "Testing wallet dev build..."
    pnpm run check
    
    if [ $? -eq 0 ]; then
        echo "✅ TypeScript check passed"
        echo "✅ TokenPortfolio.svelte changes compile successfully"
        exit 0
    else
        echo "❌ TypeScript check failed"
        exit 1
    fi
else
    echo "❌ Router build failed"
    exit 1
fi