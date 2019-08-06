class yakkl_ops::git {
  include yakkl_ops::base

  $git_packages = [ ]
  package { $git_packages: ensure => 'installed' }

  file { '/home/git/repositories/eng/yakkl.git/hooks':
    ensure => 'directory',
    owner  => 'git',
    group  => 'git',
    mode   => '0755',
  }

  file { '/home/git/repositories/eng/yakkl.git/hooks/post-receive':
    ensure => 'link',
    target => '/home/yakkl/yakkl/tools/post-receive',
  }
}
