class yakkl::camo {
  $camo_packages = [# Needed for camo
                    'nodejs',
                    'camo',
                    ]
  package { $camo_packages: ensure => 'installed' }

  $camo_key = yakklsecret('secrets', 'camo_key', '')

  file { '/etc/default/camo':
    ensure  => file,
    require => Package[camo],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('yakkl/camo_defaults.template.erb'),
  }
}
