class yakkl::localhost_sso {
  include yakkl::common

  file { '/etc/nginx/yakkl-include/app.d/external-sso.conf':
    ensure  => file,
    require => Package[$yakkl::common::nginx],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    notify  => Service['nginx'],
    source  => 'puppet:///modules/yakkl/nginx/yakkl-include-app.d/external-sso.conf',
  }
}
