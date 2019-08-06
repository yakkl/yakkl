# Secure, maintain, and upgrade

This page covers topics that will help you maintain a healthy, up-to-date, and
secure Yakkl installation, including:

- [Upgrading](#upgrading)
- [Upgrading from a git repository](#upgrading-from-a-git-repository)
- [Upgrading the operating system](#upgrading-the-operating-system)
- [Backups](#backups)
- [Monitoring](#monitoring)
- [Scalability](#scalability)
- [Management commands](#management-commands)

You may also want to read this related content:

- [Security Model](../production/security-model.html)

## Upgrading

**We recommend reading this entire section before doing your first
upgrade.**

To upgrade to a new version of the yakkl server, download the appropriate
release tarball from <https://www.yakkl.org/dist/releases/>.

You also have the option of creating your own release tarballs from a
copy of the [yakkl.git repository](https://github.com/yakkl/yakkl)
using `tools/build-release-tarball` or upgrade Yakkl
[to a version in a Git repository directly](#upgrading-from-a-git-repository).

Next, run as root:

```
/home/yakkl/deployments/current/scripts/upgrade-yakkl yakkl-server-VERSION.tar.gz
```

The upgrade process will shut down the Yakkl service and then run `apt-get upgrade`, a
puppet apply, any database migrations, and then bring the Yakkl service back
up. Upgrading will result in some brief downtime for the service, which should be
under 30 seconds unless there is an expensive transition involved. Unless you
have tested the upgrade in advance, we recommend doing upgrades at off hours.

(Note that there are
[separate instructions for upgrading Yakkl if you're using Docker][docker-upgrade].)

[docker-upgrade]: https://github.com/yakkl/docker-yakkl#upgrading-the-yakkl-container

### Preserving local changes to configuration files

**Warning**: If you have modified configuration files installed by
Yakkl (e.g. the nginx configuration), the Yakkl upgrade process will
overwrite your configuration when it does the `puppet apply`.

You can test whether this will happen assuming no upstream changes to
the configuration using `scripts/yakkl-puppet-apply` (without the
`-f` option), which will do a test puppet run and output and changes
it would make. Using this list, you can save a copy of any files
that you've modified, do the upgrade, and then restore your
configuration.

That said, Yakkl's configuration files are designed to be flexible
enough for a wide range of installations, from a small self-hosted
system to Yakkl Cloud.  Before making local changes to a configuration
file, first check whether there's an option supported by
`/etc/yakkl/yakkl.conf` for the customization you need.  And if you
need to make local modifications, please report the issue so that we
can make the Yakkl puppet configuration flexible enough to handle your
setup.

#### nginx configuration changes

If you need to modify Yakkl's `nginx` configuration, we recommend
first attempting to add configuration to `/etc/nginx/conf.d` or
`/etc/nginx/yakkl-include/app.d`; those directories are designed for
custom configuration.

### Troubleshooting with the upgrade log

The Yakkl upgrade script automatically logs output to
`/var/log/yakkl/upgrade.log`. Please use those logs to include output
that shows all errors in any bug reports.

After the upgrade, we recommend checking `/var/log/yakkl/errors.log`
to confirm that your users are not experiencing errors after the
upgrade.

### Rolling back to a prior version

The Yakkl upgrade process works by creating a new deployment under
`/home/yakkl/deployments/` containing a complete copy of the Yakkl server code,
and then moving the symlinks at `/home/yakkl/deployments/{current,last,next}`
as part of the upgrade process.

This means that if the new version isn't working,
you can quickly downgrade to the old version by running
`/home/yakkl/deployments/last/scripts/restart-server`, or to an
earlier previous version by running
`/home/yakkl/deployments/DATE/scripts/restart-server`.  The
`restart-server` script stops any running Yakkl server, and starts
the version corresponding to the `restart-server` path you call.

### Updating settings

If required, you can update your settings by editing `/etc/yakkl/settings.py`
and then run `/home/yakkl/deployments/current/scripts/restart-server` to
restart the server.

### Applying system updates

The Yakkl upgrade script will automatically run `apt-get update` and
then `apt-get upgrade`, to make sure you have any new versions of
dependencies (this will also update system packages).  We assume that
you will install security updates from `apt` regularly, according to
your usual security practices for a production server.

If you'd like to minimize downtime when installing a Yakkl server
upgrade, you may want to do an `apt-get upgrade` (and then restart the
server and check everything is working) before running the Yakkl
upgrade script.

There's one `apt` package to be careful about: upgrading `postgresql`
while the server is running may result in an outage (basically,
`postgresql` might stop accepting new queries but refuse to shut down
while waiting for connections from the Yakkl server to shut down).
While this only happens sometimes, it can be hard to fix for someone
who isn't comfortable managing a `postgresql` database [1].  You can
avoid that possibility with the following procedure (run as root):

```
apt-get update
supervisorctl stop all
apt-get upgrade -y
supervisorctl start all
```

[1] If this happens to you, just stop the Yakkl server, restart
postgres, and then start the Yakkl server again, and you'll be back in
business.

#### Disabling unattended upgrades

**Important**: We recommend that you
[disable Ubuntu's unattended-upgrades][disable-unattended-upgrades],
and instead install apt upgrades manually.  With unattended upgrades
enabled, the moment a new Postgres release is published, your Yakkl
server will have its postgres server upgraded (and thus restarted).

When one of the services Yakkl depends on (postgres, memcached, redis,
rabbitmq) is restarted, that services will disconnect everything using
them (like the Yakkl server), and every operation that Yakkl does
which uses that service will throw an exception (and send you an error
report email).  These apparently "random errors" can be confusing and
might cause you to worry incorrectly about the stability of the Yakkl
software, which in fact the problem is that Ubuntu automatically
upgraded and then restarted key Yakkl dependencies.

Instead, we recommend installing updates for these services manually,
and then restarting the Yakkl server with
`/home/yakkl/deployments/current/scripts/restart-server` afterwards.

[disable-unattended-upgrades]: https://linoxide.com/ubuntu-how-to/enable-disable-unattended-upgrades-ubuntu-16-04/

### API and your Yakkl URL

To use the Yakkl API with your Yakkl server, you will need to use the
API endpoint of e.g. `https://yakkl.example.com/api`.  Our Python
API example scripts support this via the
`--site=https://yakkl.example.com` argument.  The API bindings
support it via putting `site=https://yakkl.example.com` in your
.yakklrc.

Every Yakkl integration supports this sort of argument (or e.g. a
`YAKKL_SITE` variable in a yakklrc file or the environment), but this
is not yet documented for some of the integrations (the included
integration documentation on `/integrations` will properly document
how to do this for most integrations).  We welcome pull requests for
integrations that don't discuss this!

Similarly, you will need to instruct your users to specify the URL
for your Yakkl server when using the Yakkl desktop and mobile apps.

### Memory leak mitigation

As a measure to mitigate the impact of potential memory leaks in one
of the Yakkl daemons, the service automatically restarts itself
every Sunday early morning.  See `/etc/cron.d/restart-yakkl` for the
precise configuration.

## Upgrading from a git repository

Yakkl supports upgrading a production installation to any commit in
Git, which is great for running pre-release versions or maintaining a
small fork.  If you're using Yakkl 1.7 or newer, you can just run the
command:

```
# Upgrade to a tagged release
/home/yakkl/deployments/current/scripts/upgrade-yakkl-from-git 1.8.1
# Upgrade to a branch or other Git ref
/home/yakkl/deployments/current/scripts/upgrade-yakkl-from-git master
```

and Yakkl will automatically fetch the relevant Git commit and upgrade
to that version of Yakkl.

By default, this uses the main upstream Yakkl server repository
(example below), but you can configure any other Git repository by
adding a section like this to `/etc/yakkl/yakkl.conf`:

```
[deployment]
git_repo_url = https://github.com/yakkl/yakkl.git
```

**Systems with limited RAM**: If you are running a minimal Yakkl
  server with 2GB of RAM or less, the upgrade can fail due to the
  system running out of RAM running both the Yakkl server and Yakkl's
  static asset build process (`tools/webpack`
  is usually the step that fails).  If you encounter this,
  you can run `supervisorctl stop all` to shut down the Yakkl server
  while you run the upgrade (this will, of course, add some downtime,
  which is part of we already recommend more RAM for organizations of
  more than a few people).

### Upgrading using Git from Yakkl 1.6 and older

If you're are upgrading from a Git repository, and you currently have
Yakkl 1.6 or older installed, you will need to install the
dependencies for building Yakkl's static assets.  To do this, add
`yakkl::static_asset_compiler` to your `/etc/yakkl/yakkl.conf` file's
`puppet_classes` entry, like this:

```
puppet_classes = yakkl::voyager, yakkl::static_asset_compiler
```

and run `scripts/yakkl-puppet-apply`.  After approving the changes,
you'll be able to use `upgrade-yakkl-from-git`.

After you've upgraded to Yakkl 1.7 or above, you can safely remove
`yakkl::static_asset_compiler` from `puppet_classes`; in Yakkl 1.7 and
above, it is a dependency of `yakkl::voyager` and thus these
dependencies are installed by default.

## Upgrading the operating system

When you upgrade the operating system on which Yakkl is installed
(E.g. Ubuntu 14.04 Trusty to Ubuntu 16.04 Xenial), you need to take
some additional steps to update your Yakkl installation, documented
below.

The steps are largely the same for the various OS upgrades aside from
the versions of postgres, so you should be able to adapt these
instructions for other supported platforms.

### Upgrading from Ubuntu 14.04 Trusty to 16.04 Xenial

1. First, as the Yakkl user, stop the Yakkl server and run the following
to back up the system:

    ```
    supervisorctl stop all
    /home/yakkl/deployments/current/manage.py backup --output=/home/yakkl/release-upgrade.backup.tar.gz
    ```

2. Switch to the root user and upgrade the operating system using the
OS's standard tooling.  E.g. for Ubuntu, this means running
`do-release-upgrade` and following the prompts until it completes
successfully:

    ```
    sudo -i # Or otherwise get a root shell
    do-release-upgrade
    ```

    When `do-release-upgrade` asks you how to upgrade configuration
    files for services that Yakkl manages like `redis`, `postgres`,
    `nginx`, and `memcached`, the best choice is `N` to keep the
    currently installed version.  But it's not important; the next
    step will re-install Yakkl's configuration in any case.

3. As root, upgrade the database installation and OS configuration to
match the new OS version:

    ```
    apt remove upstart -y
    /home/yakkl/deployments/current/scripts/yakkl-puppet-apply -f
    pg_dropcluster 9.5 main --stop
    systemctl stop postgresql
    pg_upgradecluster -m upgrade 9.3 main
    pg_dropcluster 9.3 main
    apt remove postgresql-9.3
    systemctl start postgresql
    service memcached restart
    ```

4. At this point, you are now running the version of postgres that
comes with the new Ubuntu version.  Finally, we need to reinstall the
current version of Yakkl, which among other things will recompile
Yakkl's Python module dependencies for your new version of Python:

    ```
    rm -rf /srv/yakkl-venv-cache/*
    /home/yakkl/deployments/current/scripts/lib/upgrade-yakkl-stage-2 \
        /home/yakkl/deployments/current/ --ignore-static-assets
    ```

That last command will finish by restarting your Yakkl server; you
should now be able to navigate to its URL and confirm everything is
working correctly.

### Upgrading from Ubuntu 16.04 Xenial to 18.04 Bionic

1. First, as the Yakkl user, stop the Yakkl server and run the following
to back up the system:

    ```
    supervisorctl stop all
    /home/yakkl/deployments/current/manage.py backup --output=/home/yakkl/release-upgrade.backup.tar.gz
    ```

2. Switch to the root user and upgrade the operating system using the
OS's standard tooling.  E.g. for Ubuntu, this means running
`do-release-upgrade` and following the prompts until it completes
successfully:

    ```
    sudo -i # Or otherwise get a root shell
    do-release-upgrade
    ```

    When `do-release-upgrade` asks you how to upgrade configuration
    files for services that Yakkl manages like `redis`, `postgres`,
    `nginx`, and `memcached`, the best choice is `N` to keep the
    currently installed version.  But it's not important; the next
    step will re-install Yakkl's configuration in any case.

3. As root, upgrade the database installation and OS configuration to
match the new OS version:

    ```
    touch /usr/share/postgresql/10/pgroonga_setup.sql.applied
    /home/yakkl/deployments/current/scripts/yakkl-puppet-apply -f
    pg_dropcluster 10 main --stop
    systemctl stop postgresql
    pg_upgradecluster 9.5 main
    pg_dropcluster 9.5 main
    apt remove postgresql-9.5
    systemctl start postgresql
    systemctl restart memcached
    ```

4. At this point, you are now running the version of postgres that
comes with the new Ubuntu version.  Finally, we need to reinstall the
current version of Yakkl, which among other things will recompile
Yakkl's Python module dependencies for your new version of Python:

    ```
    rm -rf /srv/yakkl-venv-cache/*
    /home/yakkl/deployments/current/scripts/lib/upgrade-yakkl-stage-2 \
        /home/yakkl/deployments/current/ --ignore-static-assets
    ```

That last command will finish by restarting your Yakkl server; you
should now be able to navigate to its URL and confirm everything is
working correctly.

## Backups

Starting with Yakkl 2.0, Yakkl has a built-in backup tool:

```
# As the yakkl user
/home/yakkl/deployments/current/manage.py backup
# Or as root
su yakkl -c '/home/yakkl/deployments/current/manage.py backup'
```

The backup tool provides the following options:
- `--output`: Path where the output file should be stored. If no path is
 provided, the output file would be saved to a temporary directory.
- `--skip-db`: If set, the tool will skip the backup of your database.
- `--skip-uploads`: If set, the tool will skip the backup of the uploads.

This will generate a `.tar.gz` archive containing all the data stored
on your Yakkl server that would be needed to restore your Yakkl
server's state on another machine perfectly.

### Restoring backups

Backups generated using the Yakkl 2.0 backup tool can be restored as
follows.

First, [install a new Yakkl server through Step 3][install-server]
with the version of both the base OS and Yakkl from your previous
installation.  Then, run as root:

```
/home/yakkl/deployments/current/scripts/setup/restore-backup /path/to/backup
```

When that finishes, your Yakkl server should be fully operational again.

#### Changing the hostname

It's common when testing backup restoration to restore backups with a
different user-facing hostname than the original server to avoid
disrupting service (e.g. `yakkltest.example.com` rather than
`yakkl.example.com`).

If you do so, just like any other time you change the hostname, you'll
need to [update `EXTERNAL_HOST`](../production/settings.html) and then
restart the Yakkl server (after backup restoration completes).

Until you do, your Yakkl server will think its user-facing hostname is
still `yakkl.example.com` and will return HTTP `400 BAD REQUEST`
errors when trying to access it via `yakkltest.example.com`.

#### Inspecting a backup tarball

If you're not sure what versions were in use when a given backup was
created, you can get that information via the files in the backup
tarball `postgres-version`, `os-version`, and `yakkl-version`.  The
following command may be useful for viewing these files without
extracting the entire archive.

```
tar -Oaxf /path/to/archive/yakkl-backup-rest.tar.gz yakkl-backup/yakkl-version
```

[install-server]: ../production/install.html

### What is included

Yakkl's backup tools includes everything you need to fully restore
your Yakkl server from a user perspective.

The following data present on a Yakkl server is not included in these
backup archives, and you may want to backup separately:

* Transient data present in Yakkl's RabbitMQ queues.  For example, a
  record that a missed-message email for a given Yakkl message is
  scheduled to be sent to a given user in 2 minutes if the recipient
  user doesn't interact with Yakkl during that time window.  You can
  check their status using `rabbitmq list_queues` as root.

* Certain highly transient state that Yakkl doesn't store in a
  database, such as typing status, API rate-limiting counters,
  etc. that would have no value 1 minute after the backup is
  completed.

* The server access/error logs from `/var/log/yakkl`, because a Yakkl
  server only appends to those log files (i.e. they aren't necessarily
  to precisely restore your Yakkl data), and they can be very large
  compared to the rest of the data for a Yakkl server.

* Files uploaded with the Yakkl
  [S3 file upload backend](../production/upload-backends.html).  We
  don't include these for two reasons. First, the uploaded file data
  in S3 can easily be many times larger than the rest of the backup,
  and downloading it all to a server doing a backup could easily
  exceed its disk capacity.  Additionally, S3 is a reliable persistent
  storage system with its own high-quality tools for doing backups.
  Contributions of (documentation on) ready-to-use scripting for S3
  backups are welcome.

* SSL certificates.  Since these are security-sensitive and either
  trivially replaced (if generated via Certbot) or provided by the
  system administrator, we do not include them in these backups.

### Backup details

This section is primarily for users managing backups themselves
(E.g. if they're using a remote postgres database with an existing
backup strategy), and also serves as documentation for what is
included in the backups generated by Yakkl's standard tools.  That
data includes:

* The postgres database.  That you can back up like any postgres
database; we have some example tooling for doing that incrementally
into S3 using [wal-e](https://github.com/wal-e/wal-e) in
`puppet/yakkl_ops/manifests/postgres_common.pp` (that's what we
use for yakkl.com's database backups).  Note that this module isn't
part of the Yakkl server releases since it's part of the yakkl.com
configuration (see <https://github.com/yakkl/yakkl/issues/293>
for a ticket about fixing this to make life easier for running
backups).

* Any user-uploaded files.  If you're using S3 as storage for file
uploads, this is backed up in S3, but if you have instead set
`LOCAL_UPLOADS_DIR`, any files uploaded by users (including avatars)
will be stored in that directory and you'll want to back it up.

* Your Yakkl configuration including secrets from `/etc/yakkl/`.
E.g. if you lose the value of `secret_key`, all users will need to
login again when you setup a replacement server since you won't be
able to verify their cookies; if you lose `avatar_salt`, any
user-uploaded avatars will need to be re-uploaded (since avatar
filenames are computed using a hash of `avatar_salt` and user's
email), etc.

Yakkl also has a logical [data export and import tool][export-import],
which is useful for migrating data between Yakkl Cloud and other Yakkl
servers, as well as various auditing purposes.  The big advantage of
the `manage.py backup` system over the export/import process is that
it's structurally very unlikely for the `postgres` process to ever
develop bugs, whereas the import/export tool requires some work for
every new feature we add to Yakkl, and thus may occasionally have bugs
around corner cases.  The export tool's advantage is that the export is
more human-readable and easier to parse, and doesn't have the
requirement that the same set of Yakkl organizations exist on the two
servers (which is critical for migrations to and from Yakkl Cloud).

[export-import]: ../production/export-and-import.html

### Restore from manual backups

To restore from a manual backup, the process is basically the reverse of the above:

* Install new server as normal by downloading a Yakkl release tarball
  and then using `scripts/setup/install`, you don't need
  to run the `initialize-database` second stage which puts default
  data into the database.

* Unpack to `/etc/yakkl` the `settings.py` and `yakkl-secrets.conf` files
  from your backups.

* Restore your database from the backup using `wal-e`; if you ran
  `initialize-database` anyway above, you'll want to first
  `scripts/setup/postgres-init-db` to drop the initial database first.

* Reconfigure rabbitmq to use the password from `secrets.conf`
  by running, as root, `scripts/setup/configure-rabbitmq`.

* If you're using local file uploads, restore those files to the path
  specified by `settings.LOCAL_UPLOADS_DIR` and (if appropriate) any
  logs.

* Start the server using `scripts/restart-server`.

This restoration process can also be used to migrate a Yakkl
installation from one server to another.

We recommend running a disaster recovery after you setup backups to
confirm that your backups are working; you may also want to monitor
that they are up to date using the Nagios plugin at:
`puppet/yakkl_ops/files/nagios_plugins/check_postgres_backup`.

Contributions to more fully automate this process or make this section
of the guide much more explicit and detailed are very welcome!


### Postgres streaming replication

Yakkl has database configuration for using Postgres streaming
replication; you can see the configuration in these files:

* `puppet/yakkl_ops/manifests/postgres_slave.pp`
* `puppet/yakkl_ops/manifests/postgres_master.pp`
* `puppet/yakkl_ops/files/postgresql/*`

Contribution of a step-by-step guide for setting this up (and moving
this configuration to be available in the main `puppet/yakkl/` tree)
would be very welcome!

## Monitoring

The complete Nagios configuration (sans secret keys) used to
monitor yakkl.com is available under `puppet/yakkl_ops` in the
Yakkl Git repository (those files are not installed in the release
tarballs).

The Nagios plugins used by that configuration are installed
automatically by the Yakkl installation process in subdirectories
under `/usr/lib/nagios/plugins/`.  The following is a summary of the
various Nagios plugins included with Yakkl and what they check:

Application server and queue worker monitoring:

* `check_send_receive_time` (sends a test message through the system
  between two bot users to check that end-to-end message sending works)

* `check_rabbitmq_consumers` and `check_rabbitmq_queues` (checks for
  rabbitmq being down or the queue workers being behind)

* `check_queue_worker_errors` (checks for errors reported by the queue
  workers)

* `check_worker_memory` (monitors for memory leaks in queue workers)

* `check_email_deliverer_backlog` and `check_email_deliverer_process`
  (monitors for whether scheduled outgoing emails are being sent)

Database monitoring:

* `check_postgres_replication_lag` (checks streaming replication is up
  to date).

* `check_postgres` (checks the health of the postgres database)

* `check_postgres_backup` (checks backups are up to date; see above)

* `check_fts_update_log` (monitors for whether full-text search updates
  are being processed)

Standard server monitoring:

* `check_website_response.sh` (standard HTTP check)

* `check_debian_packages` (checks apt repository is up to date)

**Note**: While most commands require no special permissions,
  `check_email_deliverer_backlog`, requires the `nagios` user to be in
  the `yakkl` group, in order to access `SECRET_KEY` and thus run
  Yakkl management commands.

If you're using these plugins, bug reports and pull requests to make
it easier to monitor Yakkl and maintain it in production are
encouraged!

## Scalability

This section attempts to address the considerations involved with
running Yakkl with larger teams (especially >1000 users).

* For an organization with 100+ users, it's important to have more
  than 4GB of RAM on the system.  Yakkl will install on a system with
  2GB of RAM, but with less than 3.5GB of RAM, it will run its
  [queue processors](../subsystems/queuing.html) multithreaded to conserve memory;
  this creates a significant performance bottleneck.

* [yakkl.com](../contributing/chat-yakkl-org.html), with thousands of user
  accounts and thousands of messages sent every week, has 8GB of RAM,
  4 cores, and 80GB of disk.  The CPUs are essentially always idle,
  but the 8GB of RAM is important.

* We recommend using a [remote postgres
  database](postgres.html) for isolation, though it is
  not required.  In the following, we discuss a relatively simple
  configuration with two types of servers: application servers
  (running Django, Tornado, RabbitMQ, Redis, Memcached, etc.) and
  database servers.

* You can scale to a pretty large installation (O(~1000) concurrently
  active users using it to chat all day) with just a single reasonably
  large application server (e.g. AWS c3.2xlarge with 8 cores and 16GB
  of RAM) sitting mostly idle (<10% CPU used and only 4GB of the 16GB
  RAM actively in use).  You can probably get away with half that
  (e.g. c3.xlarge), but ~8GB of RAM is highly recommended at scale.
  Beyond a 1000 active users, you will eventually want to increase the
  memory cap in `memcached.conf` from the default 512MB to avoid high
  rates of memcached misses.

* For the database server, we highly recommend SSD disks, and RAM is
  the primary resource limitation.  We have not aggressively tested
  for the minimum resources required, but 8 cores with 30GB of RAM
  (e.g. AWS's m3.2xlarge) should suffice; you may be able to get away
  with less especially on the CPU side.  The database load per user is
  pretty optimized as long as `memcached` is working correctly.  This
  has not been tested, but from extrapolating the load profile, it
  should be possible to scale a Yakkl installation to 10,000s of
  active users using a single large database server without doing
  anything complicated like sharding the database.

* For reasonably high availability, it's easy to run a hot spare
  application server and a hot spare database (using Postgres
  streaming replication; see the section on configuring this).  Be
  sure to check out the section on backups if you're hoping to run a
  spare application server; in particular you probably want to use the
  S3 backend for storing user-uploaded files and avatars and will want
  to make sure secrets are available on the hot spare.

* Yakkl 2.0 and later supports running multiple Tornado servers
  sharded by realm/organization, which is how we scale Yakkl Cloud.

* However, Yakkl does not yet support dividing traffic for a single
  Yakkl realm between multiple application servers.  There are two
  issues: you need to share the memcached/Redis/RabbitMQ instance
  (these should can be moved to a network service shared by multiple
  servers with a bit of configuration) and the Tornado event system
  for pushing to browsers currently has no mechanism for multiple
  frontend servers (or event processes) talking to each other.  One
  can probably get a factor of 10 in a single server's scalability by
  [supporting multiple tornado processes on a single server](https://github.com/yakkl/yakkl/issues/372),
  which is also likely the first part of any project to support
  exchanging events amongst multiple servers.  The work for changing
  this is pretty far along, though, and thus while not generally
  available yet, we can set it up for users with an enterprise support
  contract.

Questions, concerns, and bug reports about this area of Yakkl are very
welcome!  This is an area we are hoping to improve.

## Securing your Yakkl server

Yakkl's security model is discussed in
[a separate document](../production/security-model.html).

## Management commands

Yakkl has a large library of [Django management
commands](https://docs.djangoproject.com/en/1.8/ref/django-admin/#django-admin-and-manage-py).
To use them, you will want to be logged in as the `yakkl` user and for
the purposes of this documentation, we assume the current working
directory is `/home/yakkl/deployments/current`.

Below, we show several useful examples, but there are more than 100
in total.  We recommend skimming the usage docs (or if there are none,
the code) of a management command before using it, since they are
generally less polished and more designed for expert use than the rest
of the Yakkl system.

### Running management commands

Many management commands require the Yakkl realm/organization to
interact with as an argument, which you can specify via numeric or
string ID.

You can see all the organizations on your Yakkl server using
`./manage.py list_realms`.

```
yakkl@yakkl:~$ /home/yakkl/deployments/current/manage.py list_realms
id    string_id                                name
--    ---------                                ----
1     yakkl                                    None
2                                              Yakkl Community
```

(Note that every Yakkl server has a special `yakklinternal` realm containing
system-internal bots like `welcome-bot`; you are unlikely to need to
interact with that realm.)

Unless you are
[hosting multiple organizations on your Yakkl server](../production/multiple-organizations.html),
your single Yakkl organization on the root domain will have the empty
string (`''`) as its `string_id`.  So you can run e.g.:
```
yakkl@yakkl:~$ /home/yakkl/deployments/current/manage.py show_admins -r ''
```

Otherwise, the `string_id` will correspond to the organization's
subdomain.  E.g. on `it.yakkl.example.com`, use
`/home/yakkl/deployments/current/manage.py show_admins -r it`.

### manage.py shell

You can get an iPython shell with full access to code within the Yakkl
project using `manage.py shell`, e.g., you can do the following to
change a user's email address:

```
$ /home/yakkl/deployments/current/manage.py shell
In [1]: user_profile = get_user_profile_by_email("email@example.com")
In [2]: do_change_user_delivery_email(user_profile, "new_email@example.com")
```

#### manage.py dbshell

This will start a postgres shell connected to the Yakkl database.

### Grant administrator access

You can make any user a realm administrator on the command line with
the `knight` management command:

```
./manage.py knight username@example.com -f
```

#### Creating API super users with manage.py

If you need to manage the IRC, Jabber, or Zephyr mirrors, you will
need to create API super users.  To do this, use `./manage.py knight`
with the `--permission=api_super_user` argument.  See the respective
integration scripts for these mirrors (under
[`yakkl/integrations/`][integrations-source] in the [Yakkl Python API
repo][python-api-repo]) for further detail on these.

[integrations-source]: https://github.com/yakkl/python-yakkl-api/tree/master/yakkl/integrations
[python-api-repo]: https://github.com/yakkl/python-yakkl-api

#### Exporting users and realms with manage.py export

If you need to do an export of a single user or of an entire realm, we
have tools in `management/` that essentially export Yakkl data to the
file system.

`export_single_user.py` exports the message history and realm-public
metadata for a single Yakkl user (including that user's *received*
messages as well as their sent messages).

A good overview of the process for exporting a single realm when
moving a realm to a new server (without moving a full database dump)
is in
[management/export.py](https://github.com/yakkl/yakkl/blob/master/zerver/management/commands/export.py). We
recommend you read the comment there for words of wisdom on speed,
what is and is not exported, what will break upon a move to a new
server, and suggested procedure.

### Other useful manage.py commands

There are a large number of useful management commands under
`zerver/management/commands/`; you can also see them listed using
`./manage.py` with no arguments.

## Hosting multiple Yakkl organizations

This is explained in detail on [its own page](../production/multiple-organizations.html).
