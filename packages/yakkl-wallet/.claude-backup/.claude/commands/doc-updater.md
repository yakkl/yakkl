# Documentation Auto-Updater

This command automatically updates all documentation files (/docs, READMEs, CLAUDE.md, code comments) based on recent code changes.

## Usage
```
/doc-updater
```

## What it does

1. **Analyzes recent changes**: Reviews git diff to understand what code has been modified
2. **Updates documentation**: Automatically updates relevant documentation including:
   - README files at all levels
   - CLAUDE.md with new patterns and fixes
   - Package-specific documentation
   - Code comments for complex functions
   - API documentation
   - Developer documentation about the given project
   - Migration guides

3. **Maintains consistency**: Ensures all documentation follows the same format and includes:
   - Current feature status
   - Installation instructions
   - Usage examples
   - Architecture descriptions
   - Known issues and solutions

## Process

The documentation updater will:
1. First analyze what has changed using git diff
2. Identify which documentation files need updates
3. Update each file with relevant changes
4. Ensure CLAUDE.md reflects the current project state
5. Add inline comments to complex new code
6. Update type definitions documentation

## Options

You can also run with specific targets:
- `/doc-updater readme` - Only update README files
- `/doc-updater claude` - Only update CLAUDE.md
- `/doc-updater comments` - Only update code comments
- `/doc-updater all` - Update everything (default)

The updater uses the documentation-updater subagent to perform the actual updates, ensuring consistency and accuracy across all documentation.
