class yakkl_ops::app_frontend {
  include yakkl::app_frontend_base
  include yakkl::memcached
  include yakkl::rabbit
  include yakkl::postfix_localmail
  include yakkl::static_asset_compiler
  $app_packages = [# Needed for the ssh tunnel to the redis server
    'autossh',
  ]
  package { $app_packages: ensure => 'installed' }
  $hosts_domain = yakklconf('nagios', 'hosts_domain', undef)

  file { '/etc/logrotate.d/yakkl':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    source => 'puppet:///modules/yakkl/logrotate/yakkl',
  }

  file { '/etc/log2yakkl.conf':
    ensure => file,
    owner  => 'yakkl',
    group  => 'yakkl',
    mode   => '0644',
    source => 'puppet:///modules/yakkl_ops/log2yakkl.conf',
  }

  file { '/etc/cron.d/log2yakkl':
    ensure => absent,
  }

  file { '/etc/log2yakkl.yakklrc':
    ensure => file,
    owner  => 'yakkl',
    group  => 'yakkl',
    mode   => '0600',
    source => 'puppet:///modules/yakkl_ops/log2yakkl.yakklrc',
  }
  file { '/etc/cron.d/check-apns-tokens':
    ensure => absent,
  }

  file { '/etc/supervisor/conf.d/redis_tunnel.conf':
    ensure  => file,
    require => Package['supervisor', 'autossh'],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('yakkl_ops/supervisor/conf.d/redis_tunnel.conf.template.erb'),
    notify  => Service['supervisor'],
  }
  # Need redis_password in its own file for Nagios
  file { '/var/lib/nagios/redis_password':
    ensure  => file,
    mode    => '0600',
    owner   => 'nagios',
    group   => 'nagios',
    content => yakklsecret('secrets', 'redis_password', ''),
  }

}
