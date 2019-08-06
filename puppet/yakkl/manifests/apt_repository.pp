# This depends on yakkl::base having already been evaluated
class yakkl::apt_repository {
  $setup_apt_repo_file = "${::yakkl_scripts_path}/lib/setup-apt-repo"
  exec{'setup_apt_repo':
    command => "bash -c '${setup_apt_repo_file}'",
  }
}
