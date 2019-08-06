# This depends on yakkl::base having already been evaluated
class yakkl::yum_repository {
  $setup_yum_repo_file = "${::yakkl_scripts_path}/lib/setup-yum-repo"
  exec{'setup_yum_repo':
    command => "bash -c '${setup_yum_repo_file} --prod'",
  }
}
