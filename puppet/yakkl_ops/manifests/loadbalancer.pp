class yakkl_ops::loadbalancer {
  include yakkl_ops::base
  include yakkl::nginx
  include yakkl::camo

  file { '/etc/nginx/sites-available/loadbalancer':
    ensure  => file,
    require => Package['nginx-full'],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl_ops/nginx/sites-available/loadbalancer',
    notify  => Service['nginx'],
  }

  file { '/etc/motd':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    source => 'puppet:///modules/yakkl_ops/motd.lb0',
  }

  file { '/etc/nginx/sites-enabled/loadbalancer':
    ensure  => 'link',
    require => Package['nginx-full'],
    target  => '/etc/nginx/sites-available/loadbalancer',
    notify  => Service['nginx'],
  }

  file { '/etc/log2yakkl.conf':
    ensure => file,
    owner  => 'yakkl',
    group  => 'yakkl',
    mode   => '0644',
    source => 'puppet:///modules/yakkl_ops/log2yakkl.conf',
  }

  file { '/etc/cron.d/log2yakkl':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    source => 'puppet:///modules/yakkl_ops/cron.d/log2yakkl',
  }

  file { '/etc/log2yakkl.yakklrc':
    ensure => file,
    owner  => 'yakkl',
    group  => 'yakkl',
    mode   => '0600',
    source => 'puppet:///modules/yakkl_ops/log2yakkl.yakklrc',
  }
}
