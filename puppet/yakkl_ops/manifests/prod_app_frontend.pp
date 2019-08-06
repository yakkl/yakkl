class yakkl_ops::prod_app_frontend {
  include yakkl_ops::base
  include yakkl_ops::app_frontend

  file { '/etc/nginx/sites-available/yakkl':
    ensure  => file,
    require => Package['nginx-full'],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl_ops/nginx/sites-available/yakkl',
    notify  => Service['nginx'],
  }

  file { '/etc/nginx/sites-enabled/yakkl':
    ensure  => 'link',
    require => Package['nginx-full'],
    target  => '/etc/nginx/sites-available/yakkl',
    notify  => Service['nginx'],
  }

  file { '/usr/lib/nagios/plugins/yakkl_zephyr_mirror':
    require => Package[nagios-plugins-basic],
    recurse => true,
    purge   => true,
    owner   => 'root',
    group   => 'root',
    mode    => '0755',
    source  => 'puppet:///modules/yakkl_ops/nagios_plugins/yakkl_zephyr_mirror',
  }

  # Prod has our Apple Push Notifications Service private key at
  # /etc/ssl/django-private/apns-dist.pem
}
