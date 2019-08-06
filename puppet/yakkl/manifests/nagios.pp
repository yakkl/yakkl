# This manifest installs Yakkl's Nagios plugins intended to be on
# localhost on a Nagios server.
#
# Depends on yakkl::base to have installed `nagios-plugins-basic`.
class yakkl::nagios {
  include yakkl::common
  file { "${yakkl::common::nagios_plugins_dir}/yakkl_nagios_server":
    require => Package[$yakkl::common::nagios_plugins],
    recurse => true,
    purge   => true,
    owner   => 'root',
    group   => 'root',
    mode    => '0755',
    source  => 'puppet:///modules/yakkl/nagios_plugins/yakkl_nagios_server',
  }
}
