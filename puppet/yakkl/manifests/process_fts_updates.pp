class yakkl::process_fts_updates {
  case $::osfamily {
    'debian': {
      $fts_updates_packages = [
        # Needed to run process_fts_updates
        'python3-psycopg2', # TODO: use a virtualenv instead
      ]
      yakkl::safepackage { $fts_updates_packages: ensure => 'installed' }
    }
    'redhat': {
      exec {'pip_process_fts_updates':
        command => 'python3 -m pip install psycopg2',
      }
    }
    default: {
      fail('osfamily not supported')
    }
  }

  file { '/usr/local/bin/process_fts_updates':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0755',
    source => 'puppet:///modules/yakkl/postgresql/process_fts_updates',
  }

  file { "${yakkl::common::supervisor_conf_dir}/yakkl_db.conf":
    ensure  => file,
    require => Package[supervisor],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    source  => 'puppet:///modules/yakkl/supervisor/conf.d/yakkl_db.conf',
    notify  => Service[$yakkl::common::supervisor_service],
  }
}
