class yakkl_ops::postgres_slave {
  include yakkl_ops::base
  include yakkl_ops::postgres_appdb

  file { "/var/lib/postgresql/${yakkl::base::postgres_version}/main/recovery.conf":
    ensure  => file,
    require => Package["postgresql-${yakkl::base::postgres_version}"],
    owner   => 'postgres',
    group   => 'postgres',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl_ops/postgresql/recovery.conf',
  }
  file { '/etc/sysctl.d/40-postgresql.conf':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    source => 'puppet:///modules/yakkl_ops/postgresql/40-postgresql.conf.slave',
  }
}
