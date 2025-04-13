# Contributing to YAKKL

We love your input! We want to make contributing to YAKKL as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Git Workflow

1. Fork the repo and create your branch from `develop`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

### Detailed Steps for Contributors

1. Fork the Repository
   ```bash
   # Click "Fork" on GitHub
   ```

2. Clone your fork
   ```bash
   git clone git@github.com:your-username/yakkl.git
   cd yakkl
   ```

3. Add the upstream repository
   ```bash
   git remote add upstream git@github.com:yakkl/yakkl.git
   ```

4. Keep your fork up to date
   ```bash
   git fetch upstream
   git checkout develop
   git merge upstream/develop
   ```

5. Create your feature branch
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b fix/bug-fix
   ```

6. Commit your changes
   ```bash
   git commit -m "feat: add some amazing feature"
   # or
   git commit -m "fix: resolve some bug"
   ```

7. Push to your fork
   ```bash
   git push origin feature/amazing-feature
   ```

8. Open a Pull Request

### Branch Naming Convention

- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Critical fixes for production
- `release/v*.*.*` - Release branches
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `test/*` - Test-related changes

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Changes that do not affect the meaning of the code
- `refactor:` - A code change that neither fixes a bug nor adds a feature
- `perf:` - A code change that improves performance
- `test:` - Adding missing tests or correcting existing tests
- `chore:` - Changes to the build process or auxiliary tools

### Pull Request Process

1. Update the README.md with details of changes if applicable.
2. Update the CHANGELOG.md with a note describing your changes.
3. The PR will be merged once you have the sign-off of at least one maintainer.

## Any contributions you make will be under the MIT Software License
In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issue tracker]
We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/yakkl/yakkl/issues/new).

### Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can.
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## License
By contributing, you agree that your contributions will be licensed under its MIT License.

## References
This document was adapted from the open-source contribution guidelines for [Facebook's Draft](https://github.com/facebook/draft-js/blob/a9316a723f9e918afde44dea68b5f9f39b7d9b00/CONTRIBUTING.md).

### Development Environment Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

<!-- 2. Set up your development environment:
   ```bash
   pnpm run setup
   ``` -->

2. Run tests to ensure everything is working:
   ```bash
   pnpm test
   ```

3. Start the development server:
   ```bash
   pnpm run dev:wallet
   ```

### Code Review Process

1. All submissions require review
2. We use GitHub pull requests for this purpose
3. Reviews require:
   - Passing CI checks
   - Code follows style guidelines
   - Tests cover new functionality
   - Documentation is updated
   - Commits follow conventional commit format

### Release Process

1. Changes are merged into `develop`
2. When ready for release:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/vX.Y.Z
   # Update version in package.json and other relevant files
   git commit -m "chore: bump version to vX.Y.Z"
   git tag vX.Y.Z
   git push origin release/vX.Y.Z
   git push origin vX.Y.Z
   ```
3. Create a PR from `release/vX.Y.Z` to `main`
4. After merge, create a PR from `main` back to `develop` 
