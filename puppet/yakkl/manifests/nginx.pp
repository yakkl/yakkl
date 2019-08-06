class yakkl::nginx {
  include yakkl::common
  $web_packages = [
    # Needed to run nginx with the modules we use
    $yakkl::common::nginx,
    'openssl',
    'ca-certificates',
  ]
  package { $web_packages: ensure => 'installed' }

  if $::osfamily == 'redhat' {
    file { '/etc/nginx/sites-available':
      ensure => 'directory',
      owner  => 'root',
      group  => 'root',
    }
    file { '/etc/nginx/sites-enabled':
      ensure => 'directory',
      owner  => 'root',
      group  => 'root',
    }
  }

  file { '/etc/nginx/yakkl-include/':
    require => Package[$yakkl::common::nginx],
    recurse => true,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl/nginx/yakkl-include-common/',
    notify  => Service['nginx'],
  }

  $no_serve_uploads = yakklconf('application_server', 'no_serve_uploads', '')
  if $no_serve_uploads != '' {
    # If we're not serving uploads locally, set the appropriate API headers for it.
    $uploads_route = 'puppet:///modules/yakkl/nginx/yakkl-include-maybe/uploads-route.noserve'
  } else {
    $uploads_route = 'puppet:///modules/yakkl/nginx/yakkl-include-maybe/uploads-route.internal'
  }

  file { '/etc/nginx/yakkl-include/uploads.route':
    ensure  => file,
    require => Package[$yakkl::common::nginx],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    notify  => Service['nginx'],
    source  => $uploads_route,
  }

  exec { 'dhparam':
    command => 'openssl dhparam -out /etc/nginx/dhparam.pem 2048',
    creates => '/etc/nginx/dhparam.pem',
    require => Package[$yakkl::common::nginx, 'openssl'],
  }

  file { '/etc/nginx/nginx.conf':
    ensure  => file,
    require => Package[$yakkl::common::nginx, 'ca-certificates'],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    notify  => Service['nginx'],
    source  => 'puppet:///modules/yakkl/nginx/nginx.conf',
  }

  file { '/etc/nginx/uwsgi_params':
    ensure  => file,
    require => Package[$yakkl::common::nginx],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    notify  => Service['nginx'],
    source  => 'puppet:///modules/yakkl/nginx/uwsgi_params',
  }

  file { '/etc/nginx/sites-enabled/default':
    ensure => absent,
    notify => Service['nginx'],
  }

  file { '/var/log/nginx':
    ensure => 'directory',
    owner  => 'yakkl',
    group  => 'adm',
    mode   => '0650'
  }

  file { ['/var/lib/yakkl', '/var/lib/yakkl/certbot-webroot']:
    ensure => 'directory',
    owner  => 'yakkl',
    group  => 'adm',
    mode   => '0660',
  }

  service { 'nginx':
    ensure     => running,
  }
}
