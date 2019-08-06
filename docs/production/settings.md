# Customize Yakkl

Once you've got Yakkl setup, you'll likely want to configure it the
way you like.

## Making changes

Most configuration can be done by a realm administrator, on the web.
For those settings, see [the documentation for realm
administrators][realm-admin-docs].

[realm-admin-docs]: https://yakkl.com/help/getting-your-organization-started-with-yakkl

This page discusses additional configuration that a system
administrator can do.  To change any of the following settings, edit
the `/etc/yakkl/settings.py` file on your Yakkl server, and then
restart the server with the following command:
```
su yakkl -c '/home/yakkl/deployments/current/scripts/restart-server'
```

## Specific settings

### Domain and Email settings

`EXTERNAL_HOST`: the user-accessible domain name for your Yakkl
installation (i.e., what users will type in their web browser). This
should of course match the DNS name you configured to point to your
server and for which you configured SSL certificates.  If you passed
`--hostname` to the installer, this will be prefilled with that value.

`YAKKL_ADMINISTRATOR`: the email address of the person or team
maintaining this installation and who will get support and error
emails.  If you passed `--email` to the installer, this will be
prefilled with that value.

### Authentication Backends

`AUTHENTICATION_BACKENDS`: Yakkl supports a wide range of popular
options for authenticating users to your server, including Google
Auth, GitHub Auth, LDAP, REMOTE_USER, and more.  Note, however, that
the default (email) backend must be used when creating a new
organization.

If you want an additional or different authentication backend, you
will need to uncomment one or more and then do any additional
configuration required for that backend as documented in the
`settings.py` file. See the
[section on Authentication](../production/authentication-methods.html) for more
detail on the available authentication backends and how to configure
them.

### Mobile and desktop apps

The Yakkl apps expect to be talking to to servers with a properly
signed SSL certificate, in most cases and will not accept a
self-signed certificate.  You should get a proper SSL certificate
before testing the apps.

Because of how Google and Apple have architected the security model of
their push notification protocols, the Yakkl mobile apps for
[iOS](https://itunes.apple.com/us/app/yakkl/id1203036395) and
[Android](https://play.google.com/store/apps/details?id=com.yakklmobile)
can only receive push notifications from a single Yakkl server.  We
have configured that server to be `push.yakkl.com`, and offer a
[push notification forwarding service](mobile-push-notifications.html) that
forwards push notifications through our servers to mobile devices.
Read the linked documentation for instructions on how to register for
and configure this service.

By the end of summer 2017, all of the Yakkl apps will have full
support for multiple accounts, potentially on different Yakkl servers,
with a convenient UI for switching between them.

### Terms of Service and Privacy policy

Yakkl allows you to configure your server's Terms of Service and
Privacy Policy pages (`/terms` and `/privacy`, respectively).  You can
use the `TERMS_OF_SERVICE` and `PRIVACY_POLICY` settings to configure
the path to your server's policies.  The syntax is Markdown (with
support for included HTML).  A good approach is to use paths like
`/etc/yakkl/terms.md`, so that it's easy to back up your policy
configuration along with your other Yakkl server configuration.

### Miscellaneous server settings

Yakkl has dozens of settings documented in the comments in
`/etc/yakkl/settings.py`; you can review
[the latest version of the settings.py template][settings-py-template]
if you've deleted the comments or want to check if new settings have
been added in more recent versions of Yakkl.

Since Yakkl's settings file is a Python script, there are a number of
other things that one can configure that are not documented; ask on
[yakkl.com](../contributing/chat-yakkl-org.html)
if there's something you'd like to do but can't figure out how to.

[settings-py-template]: https://github.com/yakkl/yakkl/blob/master/zproject/prod_settings_template.py

Some popular settings in `/etc/yakkl/settings.py` include:
* The Twitter integration, which provides pretty inline previews of
  tweets.
* The [email gateway](../production/email-gateway.html), which lets
  users send emails into Yakkl.

## Yakkl announcement list

If you haven't already, subscribe to the
[yakkl-announce](https://groups.google.com/forum/#!forum/yakkl-announce)
list so that you can receive important announces like new Yakkl
releases or major changes to the app ecosystem..

## Enjoy your Yakkl installation!

If you discover things that you wish had been documented, please
contribute documentation suggestions either via a GitHub issue or pull
request; we love even small contributions, and we'd love to make the
Yakkl documentation cover everything anyone might want to know about
running Yakkl in production.

Next: [Maintaining and upgrading Yakkl in
production](../production/maintain-secure-upgrade.html).
