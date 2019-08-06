class yakkl::redis {
  case $::osfamily {
    'debian': {
      $redis = 'redis-server'
      $redis_dir = '/etc/redis'
    }
    'redhat': {
      $redis = 'redis'
      $redis_dir = '/etc'
    }
    default: {
      fail('osfamily not supported')
    }
  }
  $redis_packages = [ # The server itself
                      $redis,
                      ]

  package { $redis_packages: ensure => 'installed' }

  $file = "${redis_dir}/redis.conf"
  $yakkl_redisconf = "${redis_dir}/zuli-redis.conf"
  $line = "include ${yakkl_redisconf}"
  exec { 'redis':
    unless  => "/bin/grep -Fxqe '${line}' '${file}'",
    path    => '/bin',
    command => "bash -c \"(/bin/echo; /bin/echo '# Include Yakkl-specific configuration'; /bin/echo '${line}') >> '${file}'\"",
    require => [Package[$redis],
                File[$yakkl_redisconf],
                Exec['rediscleanup']],
  }

  exec { 'rediscleanup':
    onlyif  => "echo '80a4cee76bac751576c3db8916fc50a6ea319428 ${file}' | sha1sum -c",
    command => "head -n-3 ${file} | sponge ${file}",
  }

  $redis_password = yakklsecret('secrets', 'redis_password', '')
  file { $yakkl_redisconf:
    ensure  => file,
    require => Package[$redis],
    owner   => 'redis',
    group   => 'redis',
    mode    => '0640',
    content => template('yakkl/yakkl-redis.template.erb'),
  }

  service { $redis:
    ensure    => running,
    subscribe => [File[$yakkl_redisconf],
                  Exec['redis']],
  }
}
