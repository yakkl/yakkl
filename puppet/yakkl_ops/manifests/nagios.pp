class yakkl_ops::nagios {
  include yakkl_ops::base
  include yakkl_ops::apache
  include yakkl::nagios

  $nagios_packages = [# Packages needed for Nagios
                      'nagios3',
                      # For sending outgoing email
                      'msmtp',
                      ]
  package { $nagios_packages: ensure => 'installed' }
  $nagios_format_users = join($yakkl_ops::base::users, ',')
  $nagios_alert_email = yakklconf('nagios', 'alert_email', undef)
  $nagios_test_email = yakklconf('nagios', 'test_email', undef)
  $nagios_pager_email = yakklconf('nagios', 'pager_email', undef)

  $nagios_mail_domain = yakklconf('nagios', 'mail_domain', undef)
  $nagios_mail_host = yakklconf('nagios', 'mail_host', undef)
  $nagios_mail_password = yakklsecret('secrets', 'nagios_mail_password', '')
  $nagios_camo_check_url = yakklconf('nagios', 'camo_check_url', undef)

  $hosts_domain = yakklconf('nagios', 'hosts_domain', undef)
  $hosts_zmirror = split(yakklconf('nagios', 'hosts_zmirror', undef), ',')
  $hosts_zmirrorp = split(yakklconf('nagios', 'hosts_zmirrorp', undef), ',')
  $hosts_app_prod = split(yakklconf('nagios', 'hosts_app_prod', undef), ',')
  $hosts_app_staging = split(yakklconf('nagios', 'hosts_app_staging', undef), ',')
  $hosts_postgres_primary = split(yakklconf('nagios', 'hosts_postgres_primary', undef), ',')
  $hosts_postgres_secondary = split(yakklconf('nagios', 'hosts_postgres_secondary', undef), ',')
  $hosts_redis = split(yakklconf('nagios', 'hosts_redis', undef), ',')
  $hosts_loadbalancer = split(yakklconf('nagios', 'hosts_loadbalancer', undef), ',')
  $hosts_stats = split(yakklconf('nagios', 'hosts_stats', undef), ',')
  $hosts_fullstack = split(yakklconf('nagios', 'hosts_fullstack', undef), ',')

  apache2site { 'nagios':
    ensure  => present,
    require => [File['/etc/apache2/sites-available/'],
                Apache2mod['headers'], Apache2mod['ssl'],
                ],
  }

  file { '/etc/nagios3/':
    recurse => true,
    purge   => false,
    require => Package[nagios3],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl_ops/nagios3/',
    notify  => Service['nagios3'],
  }

  file { '/etc/nagios3/conf.d/contacts.cfg':
    require => Package[nagios3],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('yakkl_ops/nagios3/contacts.cfg.template.erb'),
    notify  => Service['nagios3'],
  }
  file { '/etc/nagios3/conf.d/hosts.cfg':
    require => Package[nagios3],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('yakkl_ops/nagios3/hosts.cfg.template.erb'),
    notify  => Service['nagios3'],
  }
  file { '/etc/nagios3/conf.d/localhost.cfg':
    require => Package[nagios3],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('yakkl_ops/nagios3/localhost.cfg.template.erb'),
    notify  => Service['nagios3'],
  }

  file { '/etc/nagios3/cgi.cfg':
    require => Package[nagios3],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('yakkl_ops/nagios3/cgi.cfg.template.erb'),
    notify  => Service['nagios3'],
  }

  service { 'nagios3':
    ensure => running,
  }

  file { [ '/etc/nagios3/conf.d/extinfo_nagios2.cfg',
    '/etc/nagios3/conf.d/services_nagios2.cfg',
    '/etc/nagios3/conf.d/contacts_nagios2.cfg',
    '/etc/nagios3/conf.d/hostgroups_nagios2.cfg',
    '/etc/nagios3/conf.d/localhost_nagios2.cfg',
  ]:
    ensure     => absent,
  }

  file { '/etc/nagios3/conf.d/yakkl_nagios.cfg':
    ensure => file,
    mode   => '0644',
    owner  => 'root',
    group  => 'root',
    source => '/usr/local/share/yakkl/integrations/nagios/yakkl_nagios.cfg',
    notify => Service['nagios3'],
  }

  $hosts = $yakkl_ops::base::hosts
  file { '/etc/nagios3/conf.d/yakkl_autossh.cfg':
    ensure  => file,
    mode    => '0644',
    owner   => 'root',
    group   => 'root',
    content => template('yakkl_ops/nagios_autossh.template.erb'),
    notify  => Service['nagios3'],
  }

  file { '/var/lib/nagios/msmtprc':
    ensure  => file,
    mode    => '0600',
    owner   => 'nagios',
    group   => 'nagios',
    content => template('yakkl_ops/msmtprc_nagios.template.erb'),
    require => File['/var/lib/nagios'],
  }

  exec { 'fix_nagios_permissions':
    command => 'dpkg-statoverride --update --add nagios www-data 2710 /var/lib/nagios3/rw',
    unless  => 'bash -c "ls -ld /var/lib/nagios3/rw | grep ^drwx--s--- -q"',
    notify  => Service['nagios3'],
  }
  exec { 'fix_nagios_permissions2':
    command => 'dpkg-statoverride --update --add nagios nagios 751 /var/lib/nagios3',
    unless  => 'bash -c "ls -ld /var/lib/nagios3 | grep ^drwxr-x--x -q"',
    notify  => Service['nagios3'],
  }

  file { '/etc/apache2/sites-available/nagios.conf':
    recurse => true,
    purge   => false,
    require => Package[apache2],
    owner   => 'root',
    group   => 'root',
    mode    => '0640',
    content => template('yakkl_ops/nagios_apache_site.conf.template.erb'),
  }
  # TODO: Install our API
}
