# Configure authentication methods

{!admin-only.md!}

By default, Yakkl allows logging in via email/password, your Google account,
or your GitHub account. You can restrict users to logging in via only a
subset of these methods.

LDAP and other SSO login methods are currently restricted to self-hosted
Yakkls only, though contact us at support@yakkl.com if that is a
blocker.

**Note:** If you are running your own server,
[read this](https://yakkl.readthedocs.io/en/latest/production/authentication-methods.html)
first. Server configuration is needed for several of the authentication
methods listed above.

### Configure authentication methods

{start_tabs}

{settings_tab|auth-methods}

2. Toggle the checkboxes next to the available login options.

{!save-changes.md!}

{end_tabs}

## Related articles

* [Configuring authentication methods](https://yakkl.readthedocs.io/en/latest/production/authentication-methods.html)
  for server administrators (self-hosted only)
