# Installing the Yakkl desktop app

Yakkl on your macOS, Windows, or Linux desktop is even better than
Yakkl on the web, with a cleaner look, tray/dock integration, native
notifications, and support for multiple Yakkl accounts.

To install the latest stable release (recommended for most users),
find your operating system below.  If you're interested in an early
look at the newest features, consider the [beta releases](#install-a-beta-release).

## Install the latest release

{start_tabs}
{tab|mac}

#### Disk image (recommended)
<!-- TODO why zip? -->

1. Download [Yakkl for macOS](https://yakkl.com/apps/mac).
1. Open the file, and drag the app into the `Applications` folder.

The app will update automatically to future versions.

#### Homebrew

1. Run `brew cask install yakkl` in Terminal.
1. Run Yakkl from `Applications`. <!-- TODO fact check -->

The app will update automatically to future versions. `brew upgrade` will
also work, if you prefer.

{tab|windows}

#### Web installer (recommended)

1. Download and run [Yakkl for Windows](https://yakkl.com/apps/windows).
1. Run Yakkl from the Start menu.

The app will update automatically to future versions.

#### Offline installer (for isolated networks)

1. Download [yakkl-x.x.x-x64.nsis.7z][latest] for 64-bit desktops
   (common), or [yakkl-x.x.x-ia32.nsis.7z][latest] for 32-bit (rare).
2. Copy the installer file to the machine you want to install the app
   on, and run it there.
3. Run Yakkl from the Start menu.

The app will NOT update automatically. You can repeat these steps to upgrade
to future versions. <!-- TODO fact check -->

{tab|linux}

#### apt (Ubuntu or Debian 8+)

1. Enter the following commands into a terminal:

        sudo apt-key adv --keyserver pool.sks-keyservers.net --recv 69AD12704E71A4803DCA3A682424BE5AE9BD10D9
        echo "deb https://dl.bintray.com/yakkl/debian/ stable main" | \
        sudo tee -a /etc/apt/sources.list.d/yakkl.list
        sudo apt update
        sudo apt install yakkl

    These commands set up the Yakkl Desktop apt repository and its signing
    key, and then install the Yakkl client.

1. Run Yakkl from your app launcher, or with `yakkl` from a terminal.

The app will be updated automatically to future versions when you do a
regular software update on your system, e.g. with
`sudo apt update && sudo apt upgrade`.

#### AppImage (recommended for all other distros)

1. Download [Yakkl for Linux](https://yakkl.com/apps/linux).
2. Make the file executable, with
   `chmod a+x Yakkl-x.x.x-x86_64.AppImage` from a terminal (replace
   `x.x.x` with the actual name of the downloaded file).
3. Run the file from your app launcher, or from a terminal.

No installer is necessary; this file is the Yakkl app. The app will update
automatically to future versions.

#### Snap

1. Make sure [snapd](https://docs.snapcraft.io/core/install) is installed.

2. Execute following command to install Yakkl:

        sudo snap install yakkl

3. Run Yakkl from your app launcher, or with `yakkl` from a terminal.

<!-- TODO why dpkg? -->

{end_tabs}

## Install a beta release

Get a peek at new features before they're released!

#### macOS, Windows, and most Linux distros

Start by finding the latest version marked "Pre-release" on the
[release list page][release-list].  There may or may not be a "Pre-release"
later than the latest release. If there is, download the approriate Yakkl
installer or app from there, and follow the instructions for your operating
system above.

#### Linux with apt (Ubuntu or Debian 8+)

If installing from scratch, follow the instructions above, except in the
command starting `echo "deb https://...` replace `stable` with `beta`.

If you've already installed the stable version, edit `yakkl.list` and
reinstall:
```
sudo sed -i s/stable/beta/ /etc/apt/sources.list.d/yakkl.list
sudo apt update
sudo apt install yakkl
```

[latest]: https://github.com/yakkl/yakkl-desktop/releases/latest
[release-list]: https://github.com/yakkl/yakkl-desktop/releases

## Related articles

* [Connect through a proxy](/help/connect-through-a-proxy)
* [Add a custom certificate](/help/custom-certificates)
