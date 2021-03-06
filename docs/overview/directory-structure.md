# Directory structure

This page documents the Yakkl directory structure, where to find
things, and how to decide where to put a file.

You may also find the [new application feature
tutorial](../tutorials/new-feature-tutorial.html) helpful for understanding the
flow through these files.

### Core Python files

Yakkl uses the [Django web
framework](https://docs.djangoproject.com/en/1.8/), so a lot of these
paths will be familiar to Django developers.

* `zproject/urls.py` Main
  [Django routes file](https://docs.djangoproject.com/en/1.8/topics/http/urls/).
  Defines which URLs are handled by which view functions or templates.

* `zerver/models.py` Main
  [Django models](https://docs.djangoproject.com/en/1.8/topics/db/models/)
  file.  Defines Yakkl's database tables.

* `zerver/lib/actions.py` Most code doing writes to user-facing database tables.

* `zerver/views/*.py` Most [Django views](https://docs.djangoproject.com/en/1.8/topics/http/views/).

* `zerver/webhooks/` Webhook views and tests for [Yakkl's incoming webhook integrations](
  https://yakkl.com/api/incoming-webhooks-overview).

* `zerver/tornado/views.py` Tornado views.

* `zerver/worker/queue_processors.py` [Queue workers](../subsystems/queuing.html).

* `zerver/lib/*.py` Most library code.

* `zerver/lib/bugdown/` [Backend Markdown processor](../subsystems/markdown.html).

* `zproject/backends.py` [Authentication backends](https://docs.djangoproject.com/en/1.8/topics/auth/customizing/).

-------------------------------------------------------------------

### HTML Templates

See [our docs](../subsystems/html-templates.html) for details on Yakkl's
templating systems.

* `templates/zerver/` For [Jinja2](http://jinja.pocoo.org/) templates
  for the backend (for zerver app; logged-in content is in `templates/zerver/app`).

* `static/templates/` [Handlebars](http://handlebarsjs.com/) templates for the frontend.

----------------------------------------

### JavaScript, TypeScript, and other static assets

* `static/js/` Yakkl's own JavaScript and TypeScript sources.

* `static/styles/` Yakkl's own CSS.

* `static/images/` Yakkl's images.

* `static/third/` Third-party JavaScript and CSS that has been vendored.

* `node_modules/` Third-party JavaScript installed via `yarn`.

* `static/assets/` For assets not to be served to the web (e.g. the system to
                   generate our favicons).

-----------------------------------------------------------------------

### Tests

* `zerver/tests/` Backend tests.

* `frontend_tests/node_tests/` Node Frontend unit tests.

* `frontend_tests/casper_tests/` Casper frontend tests.

* `tools/test-*` Developer-facing test runner scripts.

-----------------------------------------------------

### Management commands

These are distinguished from scripts, below, by needing to run a
Django context (i.e. with database access).

* `zerver/management/commands/`
  [Management commands](../subsystems/management-commands.html) one might run at a
  production deployment site (e.g. scripts to change a value or
  deactivate a user properly).

---------------------------------------------------------------

### Scripts

* `scripts/` Scripts that production deployments might run manually
  (e.g., `restart-server`).

* `scripts/lib/` Scripts that are needed on production deployments but
  humans should never run directly.

* `scripts/setup/` Scripts that production deployments will only run
  once, during installation.

* `tools/` Scripts used only in a Yakkl development environment.
  These are not included in production release tarballs for Yakkl, so
  that we can include scripts here one wouldn't want someone to run in
  production accidentally (e.g. things that delete the Yakkl database
  without prompting).

* `tools/setup/` Subdirectory of `tools/` for things only used during
  the development environment setup process.

* `tools/ci/` Subdirectory of `tools/` for things only used to
  setup and run our tests in CI.  Actual test suites should
  go in `tools/`.

---------------------------------------------------------

### API and Bots

* See the [Yakkl API repository](https://github.com/yakkl/python-yakkl-api).
  Yakkl's Python API bindings, a number of Yakkl integrations and
  bots, and a framework for running and testing Yakkl bots, used to be
  developed in the main Yakkl server repo but are now in their own repo.

* `templates/zerver/integrations/` (within `templates/zerver/`, above).
  Documentation for these integrations.

-------------------------------------------------------------------------

### Production puppet configuration

This is used to deploy essentially all configuration in production.

* `puppet/yakkl/` For configuration for production deployments.

* `puppet/yakkl/manifests/voyager.pp` Main manifest for Yakkl standalone deployments.

-----------------------------------------------------------------------

### Additional Django apps

* `confirmation` Email confirmation system.

* `analytics` Analytics for the Yakkl server administrator (needs work to
  be useful to normal Yakkl sites).

* `corporate` The old yakkl.com website.  Not included in production
  distribution.

* `zilencer` Primarily used to hold management commands that aren't
  used in production.  Not included in production distribution.

-----------------------------------------------------------------------

### Jinja2 Compatibility Files

* `zproject/jinja2/__init__.py` Jinja2 environment.

-----------------------------------------------------------------------

### Translation files

* `locale/` Backend (Django) and frontend translation data files.

-----------------------------------------------------------------------

### Documentation

*  `docs/`        Source for this documentation.

--------------------------------------------------------------

You can consult the repository's `.gitattributes` file to see exactly
which components are excluded from production releases (release
tarballs are generated using `tools/build-release-tarball`).
