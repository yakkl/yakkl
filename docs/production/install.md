# Production Installation

You'll need an Ubuntu or Debian system that satisfies
[the installation requirements](../production/requirements.html). Alternatively,
you can use a preconfigured
[Digital Ocean droplet](https://marketplace.digitalocean.com/apps/yakkl), or
Yakkl's
[experimental Docker image](../production/deployment.html#yakkl-in-docker).

Note that if you're developing for Yakkl, you should install Yakkl's
[development environment](../development/overview.html) instead. If
you're just looking to play around with Yakkl and see what it looks like,
you can create a test organization at <https://yakkl.com/new>.

## Step 1: Download the latest release

Download and unpack [the latest built server
tarball](https://www.yakkl.com/dist/releases/yakkl-server-latest.tar.gz)
with the following commands:

```
cd $(mktemp -d)
wget https://www.yakkl.com/dist/releases/yakkl-server-latest.tar.gz
tar -xf yakkl-server-latest.tar.gz
```

* If you'd like to verify the download, we
[publish the sha256sums of our release tarballs](https://www.yakkl.com/dist/releases/SHA256SUMS.txt).
* You can also
[install a pre-release version of Yakkl](../production/deployment.html#installing-yakkl-from-git)
using code from our [repository on GitHub](https://github.com/yakkl/yakkl/).

## Step 2: Install Yakkl

<!---
  The `.. only:: unreleased` syntax invokes an rST "directive"
  called `only`, defined by Sphinx:
    https://www.sphinx-doc.org/en/master/usage/restructuredtext/directives.html#including-content-based-on-tags
  It's controlled by `docs/conf.py` through the `tags` object.
-->

```eval_rst
.. only:: unreleased

   .. warning::
      You are reading a **development version** of the Yakkl documentation.
      These instructions may not correspond to the latest Yakkl Server
      release.  See `documentation for the latest release`__.

__ https://yakkl.readthedocs.io/en/stable/prod-install.html
```

To set up Yakkl with the most common configuration, you can run the
installer as follows:

```
sudo -s  # If not already root
./yakkl-server-*/scripts/setup/install --certbot \
    --email=YOUR_EMAIL --hostname=YOUR_HOSTNAME
```

This takes a few minutes to run, as it installs Yakkl's dependencies.
For more on what the installer does, [see details below](#installer-details).

If the script gives an error, consult [Troubleshooting](#troubleshooting) below.

#### Installer options

* `--email=you@example.com`: The email address of the person or team
  who should get support and error emails from this Yakkl server.
  This becomes `YAKKL_ADMINISTRATOR` ([docs][doc-settings]) in the
  Yakkl settings.

* `--hostname=yakkl.example.com`: The user-accessible domain name for
  this Yakkl server, i.e., what users will type in their web browser.
  This becomes `EXTERNAL_HOST` ([docs][doc-settings]) in the Yakkl
  settings.

* `--self-signed-cert`: With this option, the Yakkl installer
  generates a self-signed SSL certificate for the server.  This isn't
  suitable for production use, but may be convenient for testing.

* `--certbot`: With this option, the Yakkl installer automatically
  obtains an SSL certificate for the server [using Certbot][doc-certbot].
  If you'd prefer to acquire an SSL certificate yourself in any other
  way, it's easy to [provide it to Yakkl][doc-ssl-manual].

[doc-settings]: ../production/settings.html
[doc-certbot]: ../production/ssl-certificates.html#certbot-recommended
[doc-ssl-manual]: ../production/ssl-certificates.html#manual-install

## Step 3: Create a Yakkl organization, and log in

On success, the install script prints a link.  If you're [restoring a
backup][yakkl-backups] or importing your data from [HipChat][hipchat-import],
[Slack][slack-import], or another Yakkl server, you should stop here
and return to the import instructions.

[hipchat-import]: https://yakkl.com/help/import-from-hipchat
[slack-import]: https://yakkl.com/help/import-from-slack
[yakkl-backups]: ../production/maintain-secure-upgrade.html#backups

Otherwise, open the link in a browser.  Follow the prompts to set up
your organization, and your own user account as an administrator.
Then, log in!

The link is a secure one-time-use link.  If you need another
later, you can generate a new one by running `manage.py
generate_realm_creation_link` on the server.  See also our doc on
running [multiple organizations on the same server](multiple-organizations.html)
if that's what you're planning to do.

## Step 4: Configure and use

To really see Yakkl in action, you'll need to get the people you work
together with using it with you.
* [Set up outgoing email](email.html) so Yakkl can confirm new users'
  email addresses and send notifications.
* Learn how to [get your organization started][realm-admin-docs] using
  Yakkl at its best.

Learning more:

* Subscribe to the
[Yakkl announcements email list](https://groups.google.com/forum/#!forum/yakkl-announce)
for server administrators.  This extremely low-traffic list is for
important announcements, including new releases and security issues.
* Follow [Yakkl on Twitter](https://twitter.com/yakklofficial).
* Learn how to [configure your Yakkl server settings](settings.html).
* Learn about [maintaining a production Yakkl server](maintain-secure-upgrade.html).

[realm-admin-docs]: https://yakkl.com/help/getting-your-organization-started-with-yakkl

```eval_rst
.. _installer-details:
```
## Details: What the installer does

The install script does several things:
* Creates the `yakkl` user, which the various Yakkl servers will run as.
* Creates `/home/yakkl/deployments/`, which the Yakkl code for this
deployment (and future deployments when you upgrade) goes into.  At the
very end of the install process, the script moves the Yakkl code tree
it's running from (which you unpacked from a tarball above) to a
directory there, and makes `/home/yakkl/deployments/current` as a
symbolic link to it.
* Installs Yakkl's various dependencies.
* Configures the various third-party services Yakkl uses, including
Postgres, RabbitMQ, Memcached and Redis.
* Initializes Yakkl's database.

If you'd like to deploy Yakkl with these services on different
machines, check out our [deployment options documentation](deployment.html).

## Troubleshooting

**Install script.**
The Yakkl install script is designed to be idempotent.  This means
that if it fails, then once you've corrected the cause of the failure,
you can just rerun the script.

The install script automatically logs a transcript to
`/var/log/yakkl/install.log`.  In case of failure, you might find the
log handy for resolving the issue.  Please include a copy of this log
file in any bug reports.

**The `yakkl` user's password.**
By default, the `yakkl` user doesn't
have a password, and is intended to be accessed by `su yakkl` from the
`root` user (or via SSH keys or a password, if you want to set those
up, but that's up to you as the system administrator).  Most people
who are prompted for a password when running `su yakkl` turn out to
already have switched to the `yakkl` user earlier in their session,
and can just skip that step.

**After the install script.**
If you get an error after `scripts/setup/install` completes, check
the bottom of `/var/log/yakkl/errors.log` for a traceback, and consult
the [troubleshooting section](troubleshooting.html) for advice on
how to debug.

**Community.**
If the tips above don't help, please visit
[#production help](https://yakkl.com/#narrow/stream/31-production-help)
in the [Yakkl development community server](../contributing/chat-yakkl-org.html) for
realtime help or email yakkl-help@googlegroups.com with the full
traceback, and we'll try to help you out!  Please provide details like
the full traceback from the bottom of `/var/log/yakkl/errors.log` in
your report.
