class yakkl::thumbor {
  include yakkl::common
  include yakkl::nginx
  include yakkl::supervisor

  file { "${yakkl::common::supervisor_conf_dir}/thumbor.conf":
    ensure  => file,
    require => Package[supervisor],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl/supervisor/conf.d/thumbor.conf',
    notify  => Service[$yakkl::common::supervisor_service],
  }

  file { '/etc/nginx/yakkl-include/app.d/thumbor.conf':
    ensure  => file,
    require => Package[$yakkl::common::nginx],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    notify  => Service['nginx'],
    source  => 'puppet:///modules/yakkl/nginx/yakkl-include-app.d/thumbor.conf',
  }
}
