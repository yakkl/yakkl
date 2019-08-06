# postgres_appdb_tuned extends postgres_appdb_base by automatically
# generating tuned database configuration.
class yakkl::postgres_appdb_tuned {
  include yakkl::postgres_appdb_base

  $postgres_conf = $::osfamily ? {
    'debian' => "/etc/postgresql/${yakkl::base::postgres_version}/main/postgresql.conf",
    'redhat' => "/var/lib/pgsql/${yakkl::base::postgres_version}/data/postgresql.conf",
  }
  $postgres_restart = $::osfamily ? {
    'debian' => "pg_ctlcluster ${yakkl::base::postgres_version} main restart",
    'redhat' => "systemctl restart postgresql-${yakkl::base::postgres_version}",
  }

  $half_memory = $yakkl::base::total_memory / 2
  $half_memory_pages = $half_memory / 4096

  $work_mem = $yakkl::base::total_memory_mb / 512
  $shared_buffers = $yakkl::base::total_memory_mb / 8
  $effective_cache_size = $yakkl::base::total_memory_mb * 10 / 32
  $maintenance_work_mem = $yakkl::base::total_memory_mb / 32

  $random_page_cost = yakklconf('postgresql', 'random_page_cost', undef)
  $effective_io_concurrency = yakklconf('postgresql', 'effective_io_concurrency', undef)
  $replication = yakklconf('postgresql', 'replication', undef)
  $listen_addresses = yakklconf('postgresql', 'listen_addresses', undef)

  $ssl_cert_file = yakklconf('postgresql', 'ssl_cert_file', undef)
  $ssl_key_file = yakklconf('postgresql', 'ssl_key_file', undef)
  $ssl_ca_file = yakklconf('postgresql', 'ssl_ca_file', undef)

  file { $postgres_conf:
    ensure  => file,
    require => Package[$yakkl::postgres_appdb_base::postgresql],
    owner   => 'postgres',
    group   => 'postgres',
    mode    => '0644',
    content => template("yakkl/postgresql/${yakkl::base::postgres_version}/postgresql.conf.template.erb"),
  }

  exec { $postgres_restart:
    require     => Package[$yakkl::postgres_appdb_base::postgresql],
    refreshonly => true,
    subscribe   => [ File[$postgres_conf] ]
  }
}
