# Quick start: How Yakkl uses Git and GitHub

This quick start provides a brief overview of how Yakkl uses Git and GitHub.

Those who are familiar with Git and GitHub should be able to start contributing
with these details in mind:

- We use **GitHub for source control and code review.** To contribute, fork
  [yakkl/yakkl][github-yakkl-yakkl] (or the appropriate
  [repository][github-yakkl], if you are working on something else besides
  Yakkl server) to your own account and then create feature/issue branches.
  When you're ready to get feedback, submit a work-in-progress (WIP) pull
  request. *We encourage you to submit WIP pull requests early and often.*

- We use a **[rebase][gitbook-rebase]-oriented workflow.** We do not use merge
  commits. This means you should use `git fetch` followed by `git rebase`
  rather than `git pull` (or you can use `git pull --rebase`). Also, to prevent
  pull requests from becoming out of date with the main line of development,
  you should rebase your feature branch prior to submitting a pull request, and
  as needed thereafter. If you're unfamiliar with how to rebase a pull request,
  [read this excellent guide][github-rebase-pr].

  We use this strategy in order to avoid the extra commits that appear
  when another branch is merged, that clutter the commit history (it's
  popular with other large projects such as Django).  This makes
  Yakkl's commit history more readable, but a side effect is that many
  pull requests we merge will be reported by GitHub's UI as *closed*
  instead of *merged*, since GitHub has poor support for
  rebase-oriented workflows.

- We have a **[code style guide][yakkl-rtd-code-style]**, a **[commit message
  guide][yakkl-rtd-commit-messages]**, and strive for each commit to be *a
  minimal coherent idea* (see **[commit
  discipline][yakkl-rtd-commit-discipline]** for details).

- We provide **many tools to help you submit quality code.** These include
  [linters][yakkl-rtd-lint-tools], [tests][yakkl-rtd-testing], [continuous
  integration][continuous-integration] and [mypy][yakkl-rtd-mypy].

- We use [yakklbot][yakkl-rtd-yakklbot-usage] to manage our issues and
  pull requests to create a better GitHub workflow for contributors.

- We provide some handy **[Yakkl-specific Git scripts][yakkl-rtd-yakkl-tools]**
  for developers to easily do tasks like fetching and rebasing a pull
  request, cleaning unimportant branches, etc. These reduce the common
  tasks of testing other contributors' pull requests to single commands.

Finally, install the [Yakkl developer environment][yakkl-rtd-dev-overview], and then
[configure continuous integration for your fork][yakkl-git-guide-fork-ci].

***

The following sections will help you be awesome with Yakkl and Git/GitHub in a
rebased-based workflow. Read through it if you're new to git, to a rebase-based
git workflow, or if you'd like a git refresher.

[gitbook-rebase]: https://git-scm.com/book/en/v2/Git-Branching-Rebasing
[github-rebase-pr]: https://github.com/edx/edx-platform/wiki/How-to-Rebase-a-Pull-Request
[github-yakkl]: https://github.com/yakkl/
[github-yakkl-yakkl]: https://github.com/yakkl/yakkl/
[continuous-integration]: ../testing/continuous-integration.html
[yakkl-git-guide-fork-ci]: ../git/cloning.html#step-3-configure-continuous-integration-for-your-fork
[yakkl-rtd-code-style]: ../contributing/code-style.html
[yakkl-rtd-commit-discipline]: ../contributing/version-control.html#commit-discipline
[yakkl-rtd-commit-messages]: ../contributing/version-control.html#commit-messages
[yakkl-rtd-dev-overview]: ../development/overview.html
[yakkl-rtd-lint-tools]: ../contributing/code-style.html#lint-tools
[yakkl-rtd-mypy]: ../testing/mypy.html
[yakkl-rtd-testing]: ../testing/testing.html
[yakkl-rtd-yakkl-tools]: ../git/yakkl-tools.html
[yakkl-rtd-yakklbot-usage]: ../contributing/yakklbot-usage.html
