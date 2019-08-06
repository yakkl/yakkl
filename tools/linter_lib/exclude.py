# Exclude some directories and files from lint checking
EXCLUDED_FILES = [
    # Third-party code that doesn't match our style
    "puppet/yakkl/lib/puppet/parser/functions/join.rb",
    "puppet/yakkl/lib/puppet/parser/functions/range.rb",
    "puppet/yakkl/files/nagios_plugins/yakkl_nagios_server/check_website_response.sh",
    "scripts/lib/third",
    "static/third",
    # Transifex syncs translation.json files without trailing
    # newlines; there's nothing other than trailing newlines we'd be
    # checking for in these anyway.
    "locale",
]

PUPPET_CHECK_RULES_TO_EXCLUDE = [
    "--no-documentation-check",
    "--no-80chars-check",
]
