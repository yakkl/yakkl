# Default configuration for a Yakkl app frontend
class yakkl::app_frontend {
  include yakkl::common
  include yakkl::app_frontend_base
  include yakkl::app_frontend_once

  $nginx_http_only = yakklconf('application_server', 'http_only', undef)
  $nginx_listen_port = yakklconf('application_server', 'nginx_listen_port', 443)
  $no_serve_uploads = yakklconf('application_server', 'no_serve_uploads', undef)
  $ssl_dir = $::osfamily ? {
    'debian' => '/etc/ssl',
    'redhat' => '/etc/pki/tls',
  }
  file { '/etc/nginx/sites-available/yakkl-enterprise':
    ensure  => file,
    require => Package[$yakkl::common::nginx],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('yakkl/nginx/yakkl-enterprise.template.erb'),
    notify  => Service['nginx'],
  }
  file { '/etc/logrotate.d/yakkl':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    source => 'puppet:///modules/yakkl/logrotate/yakkl',
  }
  file { '/etc/nginx/sites-enabled/yakkl-enterprise':
    ensure  => 'link',
    require => Package[$yakkl::common::nginx],
    target  => '/etc/nginx/sites-available/yakkl-enterprise',
    notify  => Service['nginx'],
  }

  # Trigger 2x a day certbot renew
  file { '/etc/cron.d/certbot-renew':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    source => 'puppet:///modules/yakkl/cron.d/certbot-renew',
  }

  # Restart the server regularly to avoid potential memory leak problems.
  file { '/etc/cron.d/restart-yakkl':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    source => 'puppet:///modules/yakkl/cron.d/restart-yakkl',
  }
}
