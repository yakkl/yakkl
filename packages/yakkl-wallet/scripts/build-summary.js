#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs', 'build');

// Ensure docs/build directory exists
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Get EST timestamp
function getESTTimestamp() {
  const now = new Date();
  const estOffset = -5; // EST is UTC-5 (ignoring DST for simplicity)
  const estTime = new Date(now.getTime() + (estOffset * 60 * 60 * 1000));
  return estTime.toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0] + '_EST';
}

class BuildSummary {
  constructor() {
    this.summary = {
      timestamp: new Date().toISOString(),
      estTime: getESTTimestamp(),
      buildEnvironment: process.env.NODE_ENV || 'development',
      buildType: process.argv[2] || 'dev:chrome',
      webpack: {
        success: false,
        errors: [],
        warnings: [],
        assets: [],
        time: null
      },
      vite: {
        success: false,
        errors: [],
        warnings: [],
        outputSize: null,
        time: null
      },
      accessibility: {
        warnings: [],
        count: 0
      },
      overall: {
        success: false,
        totalErrors: 0,
        totalWarnings: 0,
        totalBuildTime: null,
        criticalIssues: []
      }
    };
  }

  parseBuildOutput(output) {
    const lines = output.split('\n');
    let currentSection = '';
    let webpackStarted = false;
    let viteStarted = false;

    for (const line of lines) {
      // Detect webpack section
      if (line.includes('webpack') && line.includes('compiled')) {
        webpackStarted = true;
        const match = line.match(/webpack .* compiled (successfully|with (\d+) errors?|with (\d+) warnings?) in (\d+)ms/);
        if (match) {
          this.summary.webpack.success = match[1] === 'successfully';
          this.summary.webpack.time = parseInt(match[4]);
          if (match[2]) {
            this.summary.webpack.errors.push(`${match[2]} compilation errors`);
          }
        }
      }

      // Detect Vite section
      if (line.includes('vite v') && line.includes('building')) {
        viteStarted = true;
        currentSection = 'vite';
      }

      // Parse Vite build success
      if (line.includes('✓ built in')) {
        const match = line.match(/✓ built in ([\d.]+)s/);
        if (match) {
          this.summary.vite.success = true;
          this.summary.vite.time = parseFloat(match[1]) * 1000; // Convert to ms
        }
      }

      // Parse webpack assets
      if (webpackStarted && line.includes('asset ') && line.includes('.js')) {
        const match = line.match(/asset (\S+) ([\d.]+ \w+)/);
        if (match) {
          this.summary.webpack.assets.push({
            name: match[1],
            size: match[2]
          });
        }
      }

      // Parse accessibility warnings
      if (line.includes('[vite-plugin-svelte]') && line.includes('a11y_')) {
        const fileMatch = line.match(/src\/[^:]+\.svelte/);
        const messageMatch = line.match(/a11y_\w+/);
        if (fileMatch && messageMatch) {
          this.summary.accessibility.warnings.push({
            file: fileMatch[0],
            type: messageMatch[0],
            line: line
          });
          this.summary.accessibility.count++;
        }
      }

      // Parse errors
      if (line.toLowerCase().includes('error') && !line.includes('0 errors')) {
        if (viteStarted && !line.includes('Error when using sourcemap')) {
          this.summary.vite.errors.push(line.trim());
        } else if (webpackStarted && !viteStarted) {
          this.summary.webpack.errors.push(line.trim());
        }
      }

      // Parse warnings (excluding benign ones)
      if (line.toLowerCase().includes('warning') && 
          !line.includes('tsconfig.json which interferes') &&
          !line.includes('/* @__PURE__ */')) {
        if (viteStarted) {
          this.summary.vite.warnings.push(line.trim());
        } else if (webpackStarted) {
          this.summary.webpack.warnings.push(line.trim());
        }
      }

      // Check for specific issues
      if (line.includes('Cannot find module') || line.includes('is not exported')) {
        this.summary.overall.criticalIssues.push(`Module resolution: ${line.trim()}`);
      }
      if (line.includes('Cannot convert') && line.includes('BigInt')) {
        this.summary.overall.criticalIssues.push(`BigInt conversion: ${line.trim()}`);
      }
      if (line.includes('preload') && line.includes('not used')) {
        this.summary.overall.criticalIssues.push(`Preload warning: ${line.trim()}`);
      }
    }

    // Calculate overall stats
    this.summary.overall.totalErrors = 
      this.summary.webpack.errors.length + this.summary.vite.errors.length;
    this.summary.overall.totalWarnings = 
      this.summary.webpack.warnings.length + 
      this.summary.vite.warnings.length + 
      this.summary.accessibility.count;
    this.summary.overall.success = 
      this.summary.webpack.success && this.summary.vite.success;
    this.summary.overall.totalBuildTime = 
      (this.summary.webpack.time || 0) + (this.summary.vite.time || 0);
  }

  generateMarkdown() {
    const status = this.summary.overall.success ? '✅ SUCCESS' : '❌ FAILED';
    const errorEmoji = this.summary.overall.totalErrors === 0 ? '✅' : '🔴';
    const warningEmoji = this.summary.overall.totalWarnings === 0 ? '✅' : '⚠️';

    let md = `# Build Summary - ${this.summary.estTime}\n\n`;
    md += `## Overall Status: ${status}\n\n`;
    md += `- **Environment**: ${this.summary.buildEnvironment}\n`;
    md += `- **Build Type**: ${this.summary.buildType}\n`;
    md += `- **Total Build Time**: ${this.summary.overall.totalBuildTime}ms\n`;
    md += `- **Total Errors**: ${errorEmoji} ${this.summary.overall.totalErrors}\n`;
    md += `- **Total Warnings**: ${warningEmoji} ${this.summary.overall.totalWarnings}\n\n`;

    // Webpack Section
    md += `## Webpack Build\n`;
    md += `- **Status**: ${this.summary.webpack.success ? '✅' : '❌'}\n`;
    md += `- **Time**: ${this.summary.webpack.time}ms\n`;
    md += `- **Errors**: ${this.summary.webpack.errors.length}\n`;
    md += `- **Warnings**: ${this.summary.webpack.warnings.length}\n`;
    
    if (this.summary.webpack.assets.length > 0) {
      md += `\n### Main Assets:\n`;
      this.summary.webpack.assets
        .filter(a => a.name.includes('background') || a.name.includes('content') || a.name.includes('inpage'))
        .forEach(asset => {
          md += `- ${asset.name}: ${asset.size}\n`;
        });
    }

    // Vite Section
    md += `\n## Vite Build\n`;
    md += `- **Status**: ${this.summary.vite.success ? '✅' : '❌'}\n`;
    md += `- **Time**: ${this.summary.vite.time}ms\n`;
    md += `- **Errors**: ${this.summary.vite.errors.length}\n`;
    md += `- **Warnings**: ${this.summary.vite.warnings.length}\n`;

    // Critical Issues
    if (this.summary.overall.criticalIssues.length > 0) {
      md += `\n## ⚠️ Critical Issues\n`;
      this.summary.overall.criticalIssues.forEach(issue => {
        md += `- ${issue}\n`;
      });
    }

    // Accessibility Warnings
    if (this.summary.accessibility.count > 0) {
      md += `\n## Accessibility Warnings (${this.summary.accessibility.count})\n`;
      const grouped = {};
      this.summary.accessibility.warnings.forEach(w => {
        if (!grouped[w.type]) grouped[w.type] = [];
        grouped[w.type].push(w.file);
      });
      
      Object.entries(grouped).forEach(([type, files]) => {
        md += `\n### ${type} (${files.length})\n`;
        [...new Set(files)].forEach(file => {
          md += `- ${file}\n`;
        });
      });
    }

    // Action Items
    md += `\n## Action Items\n`;
    if (this.summary.overall.totalErrors > 0) {
      md += `- 🔴 Fix ${this.summary.overall.totalErrors} build errors\n`;
    }
    if (this.summary.overall.totalWarnings > 10) {
      md += `- ⚠️ Review ${this.summary.overall.totalWarnings} warnings\n`;
    }
    if (this.summary.overall.criticalIssues.length > 0) {
      md += `- ⚠️ Address ${this.summary.overall.criticalIssues.length} critical issues\n`;
    }
    if (this.summary.overall.success && this.summary.overall.totalErrors === 0) {
      md += `- ✅ Build is clean and ready for deployment\n`;
    }

    return md;
  }

  save() {
    const filename = `build-summary_${this.summary.estTime}.md`;
    const filepath = path.join(docsDir, filename);
    const markdown = this.generateMarkdown();
    
    fs.writeFileSync(filepath, markdown);
    
    // Also save as latest.md for quick reference
    const latestPath = path.join(docsDir, 'latest.md');
    fs.writeFileSync(latestPath, markdown);
    
    // Save JSON version
    const jsonPath = path.join(docsDir, `build-summary_${this.summary.estTime}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(this.summary, null, 2));
    
    console.log(`\n📊 Build summary saved to:`);
    console.log(`   - ${filepath}`);
    console.log(`   - ${latestPath}`);
    console.log(`   - ${jsonPath}`);
    
    return filepath;
  }
}

// Run build and capture output
function runBuildWithSummary(buildCommand = 'dev:chrome') {
  console.log(`Starting build: pnpm run ${buildCommand}...`);
  
  const buildProcess = spawn('pnpm', ['run', buildCommand], {
    cwd: rootDir,
    shell: true
  });
  
  let output = '';
  const summary = new BuildSummary();
  
  buildProcess.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(data);
  });
  
  buildProcess.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stderr.write(data);
  });
  
  buildProcess.on('close', (code) => {
    console.log(`\nBuild process exited with code ${code}`);
    
    // Parse and save summary
    summary.parseBuildOutput(output);
    const savedPath = summary.save();
    
    // Display quick summary
    console.log('\n' + '='.repeat(60));
    console.log('BUILD SUMMARY');
    console.log('='.repeat(60));
    console.log(`Status: ${summary.summary.overall.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Errors: ${summary.summary.overall.totalErrors}`);
    console.log(`Warnings: ${summary.summary.overall.totalWarnings}`);
    console.log(`Build Time: ${summary.summary.overall.totalBuildTime}ms`);
    console.log('='.repeat(60));
    
    process.exit(code);
  });
}

// Check if running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const buildCommand = process.argv[2] || 'dev:chrome';
  runBuildWithSummary(buildCommand);
}

export { BuildSummary, getESTTimestamp };