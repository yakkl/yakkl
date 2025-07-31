# Changelog Generator

This command generates or updates CHANGELOG.md following the [Keep a Changelog](http://keepachangelog.com/) format and [Semantic Versioning](http://semver.org/) standards.

## Usage
```
/changelog [version]
```

## Examples
```
# Generate changelog for unreleased changes
/changelog

# Generate changelog for a specific version
/changelog 2.0.0

# Generate changelog with pre-release version
/changelog 2.0.0-beta.1
```

## What it does

1. **Analyzes git history**: Reviews commits since the last tagged release
2. **Categorizes changes**: Automatically sorts changes into:
   - **Added**: New features or functionality
   - **Changed**: Changes to existing functionality
   - **Deprecated**: Features marked for removal
   - **Removed**: Features that were removed
   - **Fixed**: Bug fixes
   - **Security**: Security-related fixes

3. **Generates formatted entries**: Creates properly formatted changelog entries with:
   - Commit references (links to GitHub/GitLab)
   - Semantic version indicators (MAJOR, MINOR, PATCH)
   - Clear, user-friendly descriptions

4. **Maintains existing changelog**: Updates existing CHANGELOG.md or creates new one

## Commit Message Parsing

The generator recognizes these patterns in commit messages:
- `feat:` or `feature:` → Added
- `fix:` or `bugfix:` → Fixed
- `change:` or `update:` → Changed
- `remove:` or `delete:` → Removed
- `security:` or `sec:` → Security
- `deprecate:` → Deprecated

## Version Detection

- **MAJOR**: Breaking changes, API changes, removed features
- **MINOR**: New features, significant improvements
- **PATCH**: Bug fixes, small improvements

## Process

1. Reads existing CHANGELOG.md (if exists)
2. Gets commits since last version tag
3. Parses and categorizes each commit
4. Generates new version section
5. Updates CHANGELOG.md maintaining previous entries
6. Suggests next version based on changes

## Configuration

The command will look for ticket/issue patterns in commits:
- GitHub: `#123`, `GH-123`
- JIRA: `YAKKL-123`, `[YAKKL-123]`
- GitLab: `!123`, `GL-123`

## Integration with doc-updater

After generating the changelog, you can run `/doc-updater` to update other documentation to reference the new version and changes.