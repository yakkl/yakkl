class yakkl_ops::postgres_master {
  include yakkl_ops::base
  include yakkl_ops::postgres_appdb

  $master_packages = [# Packages needed for disk + RAID configuration
                      'xfsprogs',
                      'mdadm',
                      ]
  package { $master_packages: ensure => 'installed' }

  file { '/etc/sysctl.d/40-postgresql.conf':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    source => 'puppet:///modules/yakkl_ops/postgresql/40-postgresql.conf.master',
  }

  file { '/root/setup_disks.sh':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0744',
    source => 'puppet:///modules/yakkl_ops/postgresql/setup_disks.sh',
  }

  exec { 'setup_disks':
    command => '/root/setup_disks.sh',
    require => Package["postgresql-${yakkl::base::postgres_version}", 'xfsprogs', 'mdadm'],
    creates => '/dev/md0'
  }

  # This one will probably fail most of the time
  exec {'give_nagios_user_access':
    # lint:ignore:140chars
    command => "bash -c \"su postgres -c 'psql -v ON_ERROR_STOP=1 yakkl < /usr/share/postgresql/${yakkl::base::postgres_version}/yakkl_nagios_setup.sql' && touch /usr/share/postgresql/${yakkl::base::postgres_version}/yakkl_nagios_setup.sql.applied\"",
    # lint:endignore
    creates => "/usr/share/postgresql/${yakkl::base::postgres_version}/yakkl_nagios_setup.sql.applied",
    require => Package["postgresql-${yakkl::base::postgres_version}"],
  }
}
