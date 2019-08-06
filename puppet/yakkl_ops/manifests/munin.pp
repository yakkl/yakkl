class yakkl_ops::munin {
  include yakkl::supervisor

  $munin_packages = [# Packages needed for munin
    'munin',
    'autossh',
    # Packages needed for munin website
    'libapache2-mod-fcgid',
  ]
  package { $munin_packages: ensure => 'installed' }

  $hosts_domain = yakklconf('nagios', 'hosts_domain', undef)
  $hosts = $yakkl_ops::base::hosts

  file { '/etc/munin':
    require => Package['munin'],
    recurse => true,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl_ops/munin'
  }

  file { '/etc/munin/munin.conf':
    ensure  => file,
    require => [ Package['munin'], File['/etc/munin'] ],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('yakkl_ops/munin/munin.conf.erb')
  }

  file { '/etc/supervisor/conf.d/munin_tunnels.conf':
    ensure  => file,
    require => Package['supervisor', 'autossh'],
    mode    => '0644',
    owner   => 'root',
    group   => 'root',
    content => template('yakkl_ops/supervisor/conf.d/munin_tunnels.conf.erb'),
    notify  => Service['supervisor']
  }
}
