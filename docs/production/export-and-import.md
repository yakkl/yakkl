# Export and import

Yakkl has high quality export and import tools that can be used to move data
from one Yakkl server to another, do backups or compliance work, or migrate
from your own servers to the hosted Yakkl Cloud service.

When using these tools, it's important to ensure that the Yakkl server
you're exporting from and the one you're exporting to are running the
same version of Yakkl, since we do change and extend the format from
time to time.

## Backups

If you want to move hardware for a self-hosted Yakkl installation, we
recommend Yakkl's
[database-level backup and restoration process][backups] for a better
experience.  Yakkl's database-level backup process is faster,
structurally very unlikely to ever develop bugs, and will restore your
Yakkl server to the exact state it was left in.  The big thing it
can't do is support a migration to a server hosting a different set of
organizations than the original one, e.g. migrations between
self-hosting and Yakkl Cloud (because doing so in the general case
requires renumbering all the users/messages/etc.).

Yakkl's export/import tools (documented on this page) have full
support for such a renumbering process.  While these tools are
carefully designed and tested to make various classes of bugs
impossible or unlikely, the extra complexity required for renumbering
makes them structurally more risky than the direct postgres backup
process.

[backups]: ../production/maintain-secure-upgrade.html#backups

## Preventing changes during the export

For best results, you'll want to shut down access to the organization
before exporting, so that nobody can send new messages (etc.)  while
you're exporting data.  There are two ways to do this:

1. `supervisorctl stop all`, which stops the whole server.  This is
preferred if you're not hosting multiple organizations, because it has
no side effects other than disabling the Yakkl server for the
duration.
1. `manage.py deactivate_realm`, which deactivates the target
organization, logging out all active login sessions and preventing all
accounts in the from logging in or accessing the API.  This is
preferred for environments like Yakkl Cloud where you might want to
export a single organization without disrupting any other users, and
the intent is to move hosting of the organization (and forcing users
to re-login would be required as part of the hosting migration
anyway).

We include both options in the instructions below, commented out so
that neither runs (using the `# ` at the start of the lines).  If
you'd like to use one of these options, remove the `# ` at the start
of the lines for the appropriate option.

## Export your Yakkl data

Log in to a shell on your Yakkl server as the `yakkl` user. Run the
following commands:

```
cd /home/yakkl/deployments/current
# ./manage.py deactivate_realm -r ''  # Deactivates the organization
# supervisorctl stop all # Stops the Yakkl server
./manage.py export -r ''  # Exports the data
```

(The `-r` option lets you specify the organization to export; `''` is
the default organization hosted at the Yakkl server's root domain.)

This will generate a tarred archive with a name like
`/tmp/yakkl-export-zcmpxfm6.tar.gz`.  The archive contains several
JSON files (containing the Yakkl organization's data) as well as an
archive of all the organization's uploaded files.

## Import into a new Yakkl server

(1.) [Install a new Yakkl server](../production/install.html),
skipping "Step 3: Create a Yakkl organization, and log in" (you'll
create your Yakkl organization via the data import tool instead).

(1a.) Ensure that the Yakkl server you're importing into is running the same
version of Yakkl as the server you're exporting from.

For exports from yakkl.com, run the following:

```
/home/yakkl/deployments/current/scripts/upgrade-yakkl-from-git master
```

Note that if your server has 2GB of RAM or less, you'll want to read the detailed instructions
[here][upgrade-yakkl-from-git].
It is not sufficient to be on the latest stable release, as yakkl.com is
often several months of development ahead of the latest release.

(2.) If your new Yakkl server is meant to fully replace a previous Yakkl
server, you may want to copy the contents of `/etc/yakkl` to your new
server to reuse the server-level configuration and
secret keys from your old server.  See our
[documentation on backups][backups] for details on the contents of
this directory.

(3.) Log in to a shell on your Yakkl server as the `yakkl` user. Run the
following commands, replacing the filename with the path to your data
export tarball:

```
cd ~
tar -xf /path/to/export/file/yakkl-export-zcmpxfm6.tar.gz
cd /home/yakkl/deployments/current
./manage.py import '' ~/yakkl-export-zcmpxfm6
# supervisorctl start all # Starts the Yakkl server
# ./manage.py reactivate_realm -r ''  # Reactivates the organization
```

This could take several minutes to run, depending on how much data you're
importing.

[upgrade-yakkl-from-git]: ../production/maintain-secure-upgrade.html#upgrading-from-a-git-repository

**Import options**

The commands above create an imported organization on the root domain
(`EXTERNAL_HOST`) of the Yakkl installation. You can also import into a
custom subdomain, e.g. if you already have an existing organization on the
root domain. Replace the last two lines above with the following, after replacing
`<subdomain>` with the desired subdomain.

```
./manage.py import <subdomain> ~/yakkl-export-zcmpxfm6
./manage.py reactivate_realm -r <subdomain>  # Reactivates the organization
```

## Logging in

Once the import completes, all your users will have accounts in your
new Yakkl organization, but those accounts won't have passwords yet
(since for security reasons, passwords are not exported).
Your users will need to either authenticate using something like
Google auth, or start by resetting their passwords.

You can use the `./manage.py send_password_reset_email` command to
send password reset emails to your users.  We
recommend starting with sending one to yourself for testing:

```
./manage.py send_password_reset_email -u username@example.com
```

and then once you're ready, you can email them to everyone using e.g.
```
./manage.py send_password_reset_email -r '' --all-users
```

(replace `''` with your subdomain if you're using one).

## Deleting and re-importing

If you did a test import of a Yakkl organization, you may want to
delete the test import data from your Yakkl server before doing a
final import.  You can **permanently delete** all data from a Yakkl
organization using the following procedure:

* Start a [Yakkl management shell](../production/maintain-secure-upgrade.html#manage-py-shell)
* In the management shell, run the following commands, replacing `""`
  with the subdomain if [you are hosting the organization on a
  subdomain](../production/multiple-organizations.html):

```
realm = Realm.objects.get(string_id="")
realm.delete()
```

The output contains details on the objects deleted from the database.

Now, exit the management shell and run this to clear Yakkl's cache:
```
/home/yakkl/deployments/current/scripts/setup/flush-memcached
```

Assuming you're using the
[local file uploads backend](../production/upload-backends.html), you
can additionally delete all file uploads, avatars, and custom emoji on
a Yakkl server (across **all organizations**) with the following
command:

```
rm -rf /home/yakkl/uploads/*/*
```

If you're hosting multiple organizations and would like to remove
uploads from a single organization, you'll need to access `realm.id`
in the management shell before deleting the organization from the
database (this will be `2` for the first organization created on a
Yakkl server, shown in the example below), e.g.:

```
rm -rf /home/yakkl/uploads/*/2/
```

Once that's done, you can simply re-run the import process.
