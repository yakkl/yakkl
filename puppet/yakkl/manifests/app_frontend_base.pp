# Minimal configuration to run a Yakkl application server.
# Default nginx configuration is included in extension app_frontend.pp.
class yakkl::app_frontend_base {
  include yakkl::common
  include yakkl::nginx
  include yakkl::supervisor

  $web_packages = [
    # Needed to access our database
    "postgresql-client-${yakkl::base::postgres_version}",
  ]
  yakkl::safepackage { $web_packages: ensure => 'installed' }

  file { '/etc/nginx/yakkl-include/app':
    require => Package[$yakkl::common::nginx],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl/nginx/yakkl-include-frontend/app',
    notify  => Service['nginx'],
  }
  file { '/etc/nginx/yakkl-include/upstreams':
    require => Package[$yakkl::common::nginx],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl/nginx/yakkl-include-frontend/upstreams',
    notify  => Service['nginx'],
  }
  file { '/etc/nginx/yakkl-include/uploads.types':
    require => Package[$yakkl::common::nginx],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl/nginx/yakkl-include-frontend/uploads.types',
    notify  => Service['nginx'],
  }
  file { '/etc/nginx/yakkl-include/app.d/':
    ensure => directory,
    owner  => 'root',
    group  => 'root',
    mode   => '0755',
  }

  $loadbalancers = split(yakklconf('loadbalancer', 'ips', ''), ',')
  if $loadbalancers != [] {
    file { '/etc/nginx/yakkl-include/app.d/accept-loadbalancer.conf':
      require => File['/etc/nginx/yakkl-include/app.d'],
      owner   => 'root',
      group   => 'root',
      mode    => '0644',
      content => template('yakkl/accept-loadbalancer.conf.template.erb'),
      notify  => Service['nginx'],
    }
  }

  # The number of Tornado processes to run on the server;
  # historically, this has always been 1, but we now have experimental
  # support for Tornado sharding.
  $tornado_processes = yakklconf('application_server', 'tornado_processes', 1)
  if $tornado_processes > 1 {
    $tornado_ports = range(9800, 9800 + $tornado_processes)
    $tornado_multiprocess = true
  } else {
    $tornado_multiprocess = false
  }

  # This determines whether we run queue processors multithreaded or
  # multiprocess.  Multiprocess scales much better, but requires more
  # RAM; we just auto-detect based on available system RAM.
  $queues_multiprocess = $yakkl::base::total_memory_mb > 3500
  $queues = $yakkl::base::normal_queues
  if $queues_multiprocess {
    $message_sender_default_processes = 4
    $uwsgi_default_processes = 6
  } else {
    $message_sender_default_processes = 2
    $uwsgi_default_processes = 4
  }
  $message_sender_processes = yakklconf('application_server', 'message_sender_processes',
                                        $message_sender_default_processes)
  file { "${yakkl::common::supervisor_conf_dir}/yakkl.conf":
    ensure  => file,
    require => Package[supervisor],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('yakkl/supervisor/yakkl.conf.template.erb'),
    notify  => Service[$yakkl::common::supervisor_service],
  }

  $uwsgi_listen_backlog_limit = yakklconf('application_server', 'uwsgi_listen_backlog_limit', 128)
  $uwsgi_buffer_size = yakklconf('application_server', 'uwsgi_buffer_size', 8192)
  $uwsgi_processes = yakklconf('application_server', 'uwsgi_processes', $uwsgi_default_processes)
  file { '/etc/yakkl/uwsgi.ini':
    ensure  => file,
    require => Package[supervisor],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('yakkl/uwsgi.ini.template.erb'),
    notify  => Service[$yakkl::common::supervisor_service],
  }

  file { '/home/yakkl/tornado':
    ensure => directory,
    owner  => 'yakkl',
    group  => 'yakkl',
    mode   => '0755',
  }
  file { '/home/yakkl/logs':
    ensure => 'directory',
    owner  => 'yakkl',
    group  => 'yakkl',
  }
  file { '/home/yakkl/prod-static':
    ensure => 'directory',
    owner  => 'yakkl',
    group  => 'yakkl',
  }
  file { '/home/yakkl/deployments':
    ensure => 'directory',
    owner  => 'yakkl',
    group  => 'yakkl',
  }
  file { '/srv/yakkl-npm-cache':
    ensure => directory,
    owner  => 'yakkl',
    group  => 'yakkl',
    mode   => '0755',
  }
  file { '/srv/yakkl-emoji-cache':
    ensure => directory,
    owner  => 'yakkl',
    group  => 'yakkl',
    mode   => '0755',
  }
  file { '/etc/cron.d/email-mirror':
    ensure => absent,
  }
  file { "${yakkl::common::nagios_plugins_dir}/yakkl_app_frontend":
    require => Package[$yakkl::common::nagios_plugins],
    recurse => true,
    purge   => true,
    owner   => 'root',
    group   => 'root',
    mode    => '0755',
    source  => 'puppet:///modules/yakkl/nagios_plugins/yakkl_app_frontend',
  }
}
