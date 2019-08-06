# This class includes all the modules you need to run an entire Yakkl
# installation on a single server.  If desired, you can split up the
# different components of a Yakkl installation on different servers by
# using the modules below on different machines (the module list is
# stored in `puppet_classes` in /etc/yakkl/yakkl.conf).  In general,
# every machine should have `yakkl::base` and `yakkl::apt_repository`
# included, but the various service modules can be arranged on
# different machines or the same machine as desired (corresponding
# configuration in /etc/yakkl/settings.py for how to find the various
# services is also required to make this work).
class yakkl::voyager {
  include yakkl::base
  # yakkl::apt_repository must come after yakkl::base
  case $::osfamily {
    'debian': {
      include yakkl::apt_repository
    }
    'redhat': {
      include yakkl::yum_repository
    }
    default: {
      fail('osfamily not supported')
    }
  }
  include yakkl::app_frontend
  include yakkl::postgres_appdb_tuned
  include yakkl::memcached
  include yakkl::rabbit
  include yakkl::redis
  if $::osfamily == debian {
    # camo is only required on Debian-based systems as part of
    # our migration towards not including camo at all.
    include yakkl::localhost_camo
  }
  include yakkl::static_asset_compiler
  include yakkl::thumbor
}
