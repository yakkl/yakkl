class yakkl::static_asset_compiler {
  include yakkl::common
  case $::osfamily {
    'debian': {
      $static_asset_compiler_packages = [
        # Used by makemessages i18n
        'gettext',
      ]
    }
    'redhat': {
      $static_asset_compiler_packages = [
        'gettext',
      ]
    }
    default: {
      fail('osfamily not supported')
    }
  }

  yakkl::safepackage { $static_asset_compiler_packages: ensure => 'installed' }
}
