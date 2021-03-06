class yakkl::postfix_localmail {
  $postfix_packages = [ 'postfix', ]

  if $::fqdn == '' {
    fail('Your system does not have a fully-qualified domain name defined. See hostname(1).')
  }
  $postfix_mailname = yakklconf('postfix', 'mailname', $::fqdn)
  package { $postfix_packages:
    ensure  => 'installed',
    require => File['/etc/mailname'],
  }

  service { 'postfix':
  }

  file {'/etc/mailname':
    ensure  => file,
    mode    => '0644',
    owner   => root,
    group   => root,
    content => $::fqdn,
  }

  file {'/etc/postfix/main.cf':
    ensure  => file,
    mode    => '0644',
    owner   => root,
    group   => root,
    content => template('yakkl/postfix/main.cf.erb'),
    require => Package[postfix],
    notify  => Service['postfix'],
  }
  file {'/etc/postfix/master.cf':
    ensure  => file,
    mode    => '0644',
    owner   => root,
    group   => root,
    source  => 'puppet:///modules/yakkl/postfix/master.cf',
    require => Package[postfix],
    notify  => Service['postfix'],
  }

  file {'/etc/postfix/virtual':
    ensure  => file,
    mode    => '0644',
    owner   => root,
    group   => root,
    source  => 'puppet:///modules/yakkl/postfix/virtual',
    require => Package[postfix],
  }
  exec {'postmap /etc/postfix/virtual':
    subscribe   => File['/etc/postfix/virtual'],
    refreshonly => true,
    require     => [
      File['/etc/postfix/main.cf'],
      Package[postfix],
    ],
  }

  file {'/etc/postfix/transport':
    ensure  => file,
    mode    => '0644',
    owner   => root,
    group   => root,
    source  => 'puppet:///modules/yakkl/postfix/transport',
    require => Package[postfix],
  }
  exec {'postmap /etc/postfix/transport':
    subscribe   => File['/etc/postfix/transport'],
    refreshonly => true,
    require     => [
      File['/etc/postfix/main.cf'],
      Package[postfix],
    ],
  }

}
