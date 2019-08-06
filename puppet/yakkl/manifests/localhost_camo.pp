class yakkl::localhost_camo {
  include yakkl::camo

  # Install nginx configuration to run camo locally
  file { '/etc/nginx/yakkl-include/app.d/camo.conf':
    ensure  => file,
    require => Package['nginx-full'],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    notify  => Service['nginx'],
    source  => 'puppet:///modules/yakkl/nginx/yakkl-include-app.d/camo.conf',
  }
}
