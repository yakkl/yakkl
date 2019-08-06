class yakkl::yakkl_org {
  include yakkl::common
  include yakkl::base
  include yakkl::nginx

  file { '/etc/nginx/sites-available/yakkl-org':
    ensure  => file,
    require => Package[$yakkl::common::nginx],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl/nginx/sites-available/yakkl-org',
    notify  => Service['nginx'],
  }

  file { '/etc/nginx/sites-enabled/yakkl-org':
    ensure  => 'link',
    require => Package[$yakkl::common::nginx],
    target  => '/etc/nginx/sites-available/yakkl-org',
    notify  => Service['nginx'],
  }

  file { '/home/yakkl/dist':
    ensure => 'directory',
    owner  => 'yakkl',
    group  => 'yakkl',
  }
}
