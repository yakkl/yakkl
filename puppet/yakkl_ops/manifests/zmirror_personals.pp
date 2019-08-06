class yakkl_ops::zmirror_personals {
  include yakkl_ops::base
  include yakkl_ops::apt_repository_debathena
  include yakkl::supervisor

  $zmirror_packages = [# Packages needed to run the mirror
    'libzephyr4-krb5',
    'zephyr-clients',
    'krb5-config',
    'krb5-user',
    'debathena-kerberos-config',
    'debathena-zephyr-config',
    # Packages needed to build pyzephyr
    'libzephyr-dev',
    'comerr-dev',
    'python3-dev',
    'python-dev',
    'cython3',
    'cython',
  ]
  package { $zmirror_packages:
    ensure  => 'installed',
    require => Exec['setup_apt_repo_debathena'],
  }

  file { ['/home/yakkl/api-keys', '/home/yakkl/zephyr_sessions', '/home/yakkl/ccache',
          '/home/yakkl/mirror_status']:
    ensure => directory,
    mode   => '0644',
    owner  => 'yakkl',
    group  => 'yakkl',
  }

  file { '/etc/cron.d/test_zephyr_personal_mirrors':
    ensure => file,
    owner  => 'root',
    group  => 'root',
    mode   => '0644',
    source => 'puppet:///modules/yakkl_ops/cron.d/test_zephyr_personal_mirrors',
  }

  file { '/usr/lib/nagios/plugins/yakkl_zephyr_mirror':
    require => Package[nagios-plugins-basic],
    recurse => true,
    purge   => true,
    owner   => 'root',
    group   => 'root',
    mode    => '0755',
    source  => 'puppet:///modules/yakkl_ops/nagios_plugins/yakkl_zephyr_mirror',
  }

  # TODO: Do the rest of our setup, which includes at least:
  # Building patched libzephyr4-krb5 from davidben's roost branch and installing that
  #  (to add ZLoadSession/ZDumpSession).
  # Building python-zephyr after cloning it from https://github.com/ebroder/python-zephyr
  #  (patched with tabbott's branch to add dump_session and load_session using the above)
}
