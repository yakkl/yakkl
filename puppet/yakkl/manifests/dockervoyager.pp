# This class includes all the modules you need to install/run a Yakkl installation
# in a single container (without the database, memcached, redis services).
# The database, memcached, redis services need to be run in seperate containers.
# Through this split of services, it is easier to scale the services to the needs.
class yakkl::dockervoyager {
  include yakkl::base
  # yakkl::apt_repository must come after yakkl::base
  include yakkl::apt_repository
  include yakkl::app_frontend
  include yakkl::supervisor
  include yakkl::process_fts_updates
  include yakkl::thumbor

  file { "${yakkl::common::supervisor_conf_dir}/cron.conf":
    ensure  => file,
    require => Package[supervisor],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl/supervisor/conf.d/cron.conf',
  }
  file { "${yakkl::common::supervisor_conf_dir}/nginx.conf":
    ensure  => file,
    require => Package[supervisor],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl/supervisor/conf.d/nginx.conf',
  }
}
