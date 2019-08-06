class yakkl_ops::staging_app_frontend {
  include yakkl_ops::base
  include yakkl_ops::app_frontend

  file { '/etc/nginx/sites-available/yakkl-staging':
    ensure  => file,
    require => Package['nginx-full'],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl_ops/nginx/sites-available/yakkl-staging',
    notify  => Service['nginx'],
  }
  file { '/etc/nginx/sites-enabled/yakkl-staging':
    ensure  => 'link',
    require => Package['nginx-full'],
    target  => '/etc/nginx/sites-available/yakkl-staging',
    notify  => Service['nginx'],
  }

  # Eventually, this will go in a staging_app_frontend_once.pp
  file { '/etc/cron.d/check_send_receive_time':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    source => 'puppet:///modules/yakkl_ops/cron.d/check_send_receive_time',
  }
}
