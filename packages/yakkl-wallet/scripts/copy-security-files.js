#!/usr/bin/env node

/**
 * Copy security-sensitive files from yakkl-security package before build
 * This ensures private implementation is not exposed in public repo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECURITY_PACKAGE_PATH = path.resolve(__dirname, '../../yakkl-security');
const WALLET_PACKAGE_PATH = path.resolve(__dirname, '..');

// Define files to copy from yakkl-security to yakkl-wallet
const FILES_TO_COPY = [
  {
    source: 'src/lib/managers/EmergencyKitManager.ts',
    destination: 'src/lib/managers/EmergencyKitManager.ts'
  },
  {
    source: 'src/lib/managers/ShamirSecretManager.ts',
    destination: 'src/lib/managers/ShamirSecretManager.ts'
  }
  // Add more files as needed
];

function copySecurityFiles() {
  console.log('Copying security files from yakkl-security...');
  
  // Skip EmergencyKitManager if it already exists and has been modified
  const emergencyKitPath = path.join(WALLET_PACKAGE_PATH, 'src/lib/managers/EmergencyKitManager.ts');
  const hasEmergencyKit = fs.existsSync(emergencyKitPath);
  
  FILES_TO_COPY.forEach(({ source, destination }) => {
    // Skip EmergencyKitManager if it already exists
    if (destination === 'src/lib/managers/EmergencyKitManager.ts' && hasEmergencyKit) {
      console.log(`✓ Skipped ${destination} (already exists)`);
      return;
    }
    const sourcePath = path.join(SECURITY_PACKAGE_PATH, source);
    const destPath = path.join(WALLET_PACKAGE_PATH, destination);
    
    try {
      // Check if source exists
      if (!fs.existsSync(sourcePath)) {
        console.error(`Source file not found: ${sourcePath}`);
        return;
      }
      
      // Create destination directory if it doesn't exist
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Copy the file
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✓ Copied ${source} to ${destination}`);
    } catch (error) {
      console.error(`✗ Failed to copy ${source}:`, error.message);
    }
  });
  
  console.log('Security files copy complete.');
}

// Run if called directly
copySecurityFiles();