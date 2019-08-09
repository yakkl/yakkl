import os

# Version number uses semantic versioning and used as MAJOR.MINOR.PATH-Prerelease+Build metadata
# Examples: 1.0.1, 0.2.10-alpha, 0.3.1+190808, 0.9.9-beta+190808 [The build metadata could be sprint date or whatever but must begin with '+' and not used for precedence sorting]
YAKKL_VERSION = "0.1.0"
# Add information on number of commits and commit hash to version, if available
yakkl_git_version_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'yakkl-git-version')
if os.path.exists(yakkl_git_version_file):
    with open(yakkl_git_version_file) as f:
        version = f.read().strip()
        if version:
            YAKKL_VERSION = version

LATEST_MAJOR_VERSION = "0"
LATEST_RELEASE_VERSION = "0.1.0"
LATEST_RELEASE_ANNOUNCEMENT = "https://blog.yakkl.com/2019/08/12/yakkl-0-1-0-released/"

#############################################################################################
## Not used any longer
# Bump the minor PROVISION_VERSION to indicate that folks should provision
# only when going from an old version of the code to a newer version. Bump
# the major version to indicate that folks should provision in both
# directions.

# Typically,
# * adding a dependency only requires a minor version bump;
# * removing a dependency requires a major version bump;
# * upgrading a dependency requires a major version bump, unless the
#   upgraded dependency is backwards compatible with all of our
#   historical commits sharing the same major version, in which case a
#   minor version bump suffices.

PROVISION_VERSION = '46.1'
