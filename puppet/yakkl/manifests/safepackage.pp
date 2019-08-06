define yakkl::safepackage ( $ensure = present ) {
  if !defined(Package[$title]) {
    package { $title: ensure => $ensure }
  }
}
