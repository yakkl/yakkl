class yakkl::base {
  include yakkl::common
  case $::osfamily {
    'debian': {
      $release_name = $::operatingsystemrelease ? {
        # Debian releases
        /^7.[0-9]*/ => 'wheezy',
        /^8.[0-9]*/ => 'jessie',
        /^9.[0-9]*/ => 'stretch',
        # Ubuntu releases
        '12.04' => 'precise',
        '14.04' => 'trusty',
        '15.04' => 'vivid',
        '15.10' => 'wily',
        '16.04' => 'xenial',
        '18.04' => 'bionic',
      }
      $base_packages = [
        # Accurate time is essential
        'ntp',
        # Used in scripts including install-yarn.sh
        'curl',
        'wget',
        # Used to read /etc/yakkl/yakkl.conf for `yakklconf` puppet function
        'crudini',
        # Used for tools like sponge
        'moreutils',
        # Used in scripts
        'netcat',
        # Nagios plugins; needed to ensure $yakkl::common::nagios_plugins exists
        'nagios-plugins-basic',
        # Required for using HTTPS in apt repositories.
        'apt-transport-https',
        # Needed for the cron jobs installed by puppet
        'cron',
      ]
    }
    'redhat': {
      $release_name = "${::operatingsystem}${::operatingsystemmajrelease}"
      $base_packages = [
        'ntp',
        'curl',
        'wget',
        'crudini',
        'moreutils',
        'nmap-ncat',
        'nagios-plugins',  # there is no dummy package on CentOS 7
        'cronie'
      ]
    }
    default: {
      fail('osfamily not supported')
    }
  }
  package { $base_packages: ensure => 'installed' }

  $postgres_version = $release_name ? {
    'wheezy'  => '9.1',
    'jessie'  => '9.4',
    'stretch' => '9.6',
    'precise' => '9.1',
    'trusty'  => '9.3',
    'vivid'   => '9.4',
    'wily'    => '9.4',
    'xenial'  => '9.5',
    'bionic'  => '10',
    'CentOS7' => '10',
  }

  $normal_queues = [
    'deferred_work',
    'digest_emails',
    'email_mirror',
    'embed_links',
    'embedded_bots',
    'error_reports',
    'feedback_messages',
    'invites',
    'missedmessage_email_senders',
    'email_senders',
    'missedmessage_emails',
    'missedmessage_mobile_notifications',
    'outgoing_webhooks',
    'signups',
    'slow_queries',
    'user_activity',
    'user_activity_interval',
    'user_presence',
  ]

  # We can't use the built-in $memorysize fact because it's a string with human-readable units
  # Meanwhile $memorysize_mb is a string, and can't be compared with integers in puppet 4.
  $total_memory = regsubst(file('/proc/meminfo'), '^.*MemTotal:\s*(\d+) kB.*$', '\1', 'M') * 1024
  $total_memory_mb = $total_memory / 1024 / 1024

  group { 'yakkl':
    ensure     => present,
  }

  user { 'yakkl':
    ensure     => present,
    require    => Group['yakkl'],
    gid        => 'yakkl',
    shell      => '/bin/bash',
    home       => '/home/yakkl',
    managehome => true,
  }

  file { '/etc/yakkl':
    ensure => 'directory',
    mode   => '0644',
    owner  => 'yakkl',
    group  => 'yakkl',
  }
  file { ['/etc/yakkl/yakkl.conf', '/etc/yakkl/settings.py']:
    ensure  => 'file',
    require => File['/etc/yakkl'],
    mode    => '0644',
    owner   => 'yakkl',
    group   => 'yakkl',
  }
  file { '/etc/yakkl/yakkl-secrets.conf':
    ensure  => 'file',
    require => File['/etc/yakkl'],
    mode    => '0640',
    owner   => 'yakkl',
    group   => 'yakkl',
  }

  file { '/etc/security/limits.conf':
    ensure => file,
    mode   => '0640',
    owner  => 'root',
    group  => 'root',
    source => 'puppet:///modules/yakkl/limits.conf',
  }

  # This directory is written to by cron jobs for reading by Nagios
  file { '/var/lib/nagios_state/':
    ensure => directory,
    group  => 'yakkl',
    mode   => '0774',
  }

  file { '/var/log/yakkl':
    ensure => 'directory',
    owner  => 'yakkl',
    group  => 'yakkl',
    mode   => '0640',
  }

  file { '/var/log/yakkl/queue_error':
    ensure => 'directory',
    owner  => 'yakkl',
    group  => 'yakkl',
    mode   => '0640',
  }

  file { "${yakkl::common::nagios_plugins_dir}/yakkl_base":
    require => Package[$yakkl::common::nagios_plugins],
    recurse => true,
    purge   => true,
    owner   => 'root',
    group   => 'root',
    mode    => '0755',
    source  => 'puppet:///modules/yakkl/nagios_plugins/yakkl_base',
  }
}
