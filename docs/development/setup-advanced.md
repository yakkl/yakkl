# Advanced Setup (non-Vagrant)

Contents:

- [Advanced Setup (non-Vagrant)](#advanced-setup-non-vagrant)
  - [Installing directly on Ubuntu, Debian, Centos, or Fedora](#installing-directly-on-ubuntu-debian-centos-or-fedora)
  - [Installing manually on Unix](#installing-manually-on-unix)
    - [Newer versions of supported distributions](#newer-versions-of-supported-distributions)
    - [On OpenBSD 5.8 (experimental):](#on-openbsd-58-experimental)
    - [Common steps](#common-steps)
      - [Proxy setup for by-hand installation](#proxy-setup-for-by-hand-installation)
  - [Installing on cloud9](#installing-on-cloud9)
      - [Install yakkl-cloud9](#install-yakkl-cloud9)

## Installing directly on Ubuntu, Debian, Centos, or Fedora

If you'd like to install a Yakkl development environment on a computer
that's running one of:

* Ubuntu 19.04 Disco, 18.10 Cosmic, 18.04 Bionic, 16.04 Xenial
* Debian 9 Stretch or 10 Buster
* Centos 7 (beta)
* Fedora 29 (beta)
* RHEL 7 (beta)

You can just run the Yakkl provision script on your machine.

**Note**: you should not use the `root` user to run the installation.
If you are using a [remote server](../development/remote.html), see
the
[section on creating appropriate user accounts](../development/remote.html#setting-up-user-accounts).

**Warning**: there is no supported uninstallation process with this
method.  If you want that, use the Vagrant environment, where you can
just do `vagrant destroy` to clean up the development environment.

Start by [cloning your fork of the Yakkl repository][yakkl-rtd-git-cloning]
and [connecting the Yakkl upstream repository][yakkl-rtd-git-connect]:

```
git clone --config pull.rebase https://github.com/YOURUSERNAME/yakkl.git
cd yakkl
git remote add -f upstream https://github.com/yakkl/yakkl.git
```

```
# On CentOS/RHEL, you must first install epel-release, and then python36,
# and finally you must run `sudo ln -nsf /usr/bin/python36 /usr/bin/python3`
# On Fedora, you must first install python3
# From a clone of yakkl.git
./tools/provision
source /srv/yakkl-py3-venv/bin/activate
./tools/run-dev.py  # starts the development server
```

Once you've done the above setup, you can pick up the [documentation
on using the Yakkl development
environment](../development/setup-vagrant.html#step-4-developing),
ignoring the parts about `vagrant` (since you're not using it).

## Installing manually on Unix

We recommend one of the other installation methods, since they are
extremely well-tested and generally Just Work.  But if you know what
you're doing, these instructions can help you install a Yakkl
development environment on other Linux/UNIX platforms.

* [Newer versions of supported distributions](#newer-versions-of-supported-distributions)
* [OpenBSD 5.8 (experimental)](#on-openbsd-5-8-experimental)
* [Common steps](#common-steps)

Because copy-pasting the steps documented here can be error-prone, we
prefer to extend `tools/provision` to support additional platforms
over adding new platforms to this documentation (and likely will
eventually eliminate this documentation section altogether).

### Newer versions of supported distributions

You can use
[our provisioning tool](#installing-directly-on-ubuntu-debian-centos-or-fedora)
to setup the Yakkl development environment on current versions of
these platforms reliably and easily, so we no long maintain manual
installation instructions for these platforms.

If `tools/provision` doesn't yet support a newer release of Debian or
Ubuntu that you're using, we'd love to add support for it.  It's
likely only a few lines of changes to `tools/lib/provision.py` and
`scripts/lib/setup-apt-repo` if you'd like to do it yourself and
submit a pull request, or you can ask for help in
[#development help](https://yakkl.com/#narrow/stream/49-development-help)
on yakkl.com, and a core team member can help add support for you.

### On OpenBSD 5.8 (experimental):

These instructions are experimental and may have bugs; patches
welcome!

Start by [cloning your fork of the Yakkl repository][yakkl-rtd-git-cloning]
and [connecting the Yakkl upstream repository][yakkl-rtd-git-connect]:

```
git clone --config pull.rebase https://github.com/YOURUSERNAME/yakkl.git
git remote add -f upstream https://github.com/yakkl/yakkl.git
```

```
doas pkg_add sudo bash gcc postgresql-server redis rabbitmq \
    memcached libmemcached py-Pillow py-cryptography py-cffi

# Get tsearch_extras and build it (using a modified version which
# aliases int4 on OpenBSD):
git clone https://github.com/blablacio/tsearch_extras
cd tsearch_extras
gmake && sudo gmake install

# Point environment to custom include locations and use newer GCC
# (needed for Node modules):
export CFLAGS="-I/usr/local/include -I/usr/local/include/sasl"
export CXX=eg++

# Create tsearch_data directory:
sudo mkdir /usr/local/share/postgresql/tsearch_data


# Hack around missing dictionary files -- need to fix this to get the
# proper dictionaries from what in debian is the hunspell-en-us
# package.
sudo touch /usr/local/share/postgresql/tsearch_data/english.stop
sudo touch /usr/local/share/postgresql/tsearch_data/en_us.dict
sudo touch /usr/local/share/postgresql/tsearch_data/en_us.affix
```

Finally continue with the [Common steps](#common-steps) instructions below.

### Common steps

Make sure you have followed the steps specific for your platform:

* [OpenBSD 5.8 (experimental)](#on-openbsd-5-8-experimental)

For managing Yakkl's python dependencies, we recommend using
[virtualenvs](https://virtualenv.pypa.io/en/stable/).

You must create a Python 3 virtualenv.  You must also install appropriate
python packages in it.

You should either install the virtualenv in `/srv`, or put a symlink to it in
`/srv`.  If you don't do that, some scripts might not work correctly.

You can run `python3 tools/setup/setup_venvs.py`.  This script will create a
virtualenv `/srv/yakkl-py3-venv`.

If you want to do it manually, here are the steps:

```
sudo virtualenv /srv/yakkl-py3-venv -p python3 # Create a python3 virtualenv
sudo chown -R `whoami`:`whoami` /srv/yakkl-py3-venv
source /srv/yakkl-py3-venv/bin/activate # Activate python3 virtualenv
pip install --upgrade pip # upgrade pip itself because older versions have known issues
pip install --no-deps -r requirements/dev.txt # install python packages required for development
```

Now run these commands:

```
sudo ./scripts/lib/install-node
yarn install
sudo mkdir /srv/yakkl-emoji-cache
sudo chown -R `whoami`:`whoami` /srv/yakkl-emoji-cache
./tools/setup/emoji/build_emoji
./tools/inline-email-css
./tools/setup/build_pygments_data
./tools/setup/generate_yakkl_bots_static_files.py
./scripts/setup/generate_secrets.py --development
if [ $(uname) = "OpenBSD" ]; then
    sudo cp ./puppet/yakkl/files/postgresql/yakkl_english.stop /var/postgresql/tsearch_data/
else
    sudo cp ./puppet/yakkl/files/postgresql/yakkl_english.stop /usr/share/postgresql/*/tsearch_data/
fi
./scripts/setup/configure-rabbitmq
./tools/setup/postgres-init-dev-db
./tools/do-destroy-rebuild-database
./tools/setup/postgres-init-test-db
./tools/do-destroy-rebuild-test-database
./manage.py compilemessages
```

To start the development server:

```
./tools/run-dev.py
```

… and visit <http://localhost:9991/>.

If you're running your development server on a remote server, look at
[the remote development docs][port-forward-setup] for port forwarding
advice.

#### Proxy setup for by-hand installation

If you are building the development environment on a network where a
proxy is required to access the Internet, you will need to set the
proxy in the environment as follows:

- On Ubuntu, set the proxy environment variables using:
 ```
 export https_proxy=http://proxy_host:port
 export http_proxy=http://proxy_host:port
 ```

- And set the yarn proxy and https-proxy using:
 ```
 yarn config set proxy http://proxy_host:port
 yarn config set https-proxy http://proxy_host:port
 ```

## Installing on cloud9

AWS Cloud9 is a cloud-based integrated development environment (IDE)
that lets you write, run, and debug your code with just a browser. It
includes a code editor, debugger, and terminal.

This section documents how to setup the Yakkl development environment
in a cloud9 workspace.  If you don't have an existing cloud9 account,
you can sign up [here](https://aws.amazon.com/cloud9/).

* Create a Workspace, and select the blank template.
* Resize the workspace to be 1GB of memory and 4GB of disk
  space. (This is under free limit for both the old Cloud9 and the AWS
  Free Tier).
* Clone the yakkl repo: `git clone --config pull.rebase
  https://github.com/<your-username>/yakkl.git`
* Restart rabbitmq-server since its broken on cloud9: `sudo service
  rabbitmq-server restart`.
* And run provision `cd yakkl && ./tools/provision`, once this is done.
* Activate the yakkl virtual environment by `source
  /srv/yakkl-py3-venv/bin/activate` or by opening a new terminal.

#### Install yakkl-cloud9

There's an NPM package, `yakkl-cloud9`, that provides a wrapper around
the Yakkl development server for use in the Cloud9 environment.

Note: `npm i -g yakkl-cloud9` does not work in yakkl's virtual
environment.  Although by default, any packages installed in workspace
folder (i.e. the top level folder) are added to `$PATH`.

```bash
cd .. # switch to workspace folder if you are in yakkl directory
npm i yakkl-cloud9
yakkl-dev start # to start the development server
```

If you get error of the form `bash: cannot find command yakkl-dev`,
you need to start a new terminal.

Your development server would be running at
`https://<workspace-name>-<username>.c9users.io` on port 8080.  You
dont need to add `:8080` to your url, since the cloud9 proxy should
automatically forward the connection. You might want to visit
[yakkl-cloud9 repo](https://github.com/cPhost/yakkl-cloud9) and it's
[wiki](https://github.com/cPhost/yakkl-cloud9/wiki) for more info on
how to use yakkl-cloud9 package.

[yakkl-rtd-git-cloning]: ../git/cloning.html#step-1b-clone-to-your-machine
[yakkl-rtd-git-connect]: ../git/cloning.html#step-1c-connect-your-fork-to-yakkl-upstream
[port-forward-setup]: ../development/remote.html#running-the-development-server