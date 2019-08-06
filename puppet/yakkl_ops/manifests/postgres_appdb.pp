class yakkl_ops::postgres_appdb {
  include yakkl_ops::postgres_common
  include yakkl::postgres_appdb_tuned

  file { "/etc/postgresql/${yakkl::base::postgres_version}/main/pg_hba.conf":
    ensure  => file,
    require => Package["postgresql-${yakkl::base::postgres_version}"],
    owner   => 'postgres',
    group   => 'postgres',
    mode    => '0640',
    source  => 'puppet:///modules/yakkl_ops/postgresql/pg_hba.conf',
  }

  file { "/usr/share/postgresql/${yakkl::base::postgres_version}/yakkl_nagios_setup.sql":
    ensure  => file,
    require => Package["postgresql-${yakkl::base::postgres_version}"],
    owner   => 'postgres',
    group   => 'postgres',
    mode    => '0640',
    source  => 'puppet:///modules/yakkl_ops/postgresql/yakkl_nagios_setup.sql',
  }

}
