class yakkl_ops::redis {
  include yakkl_ops::base
  include yakkl::redis

  # Need redis_password in its own file for Nagios
  file { '/var/lib/nagios/redis_password':
    ensure  => file,
    mode    => '0600',
    owner   => 'nagios',
    group   => 'nagios',
    content => "${yakkl::redis::redis_password}\n",
  }
}
