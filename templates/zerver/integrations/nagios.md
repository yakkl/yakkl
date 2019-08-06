{!create-stream.md!}

{!download-python-bindings.md!}

Next, on your {{ settings_html|safe }}, create a bot for
{{ integration_display_name }}.

Next, open `integrations/nagios/yakklrc.example` in your favorite
editor, and change the following lines to specify the email address
and API key for your Nagios bot, saving it to `/etc/nagios3/yakklrc`
on your Nagios server:

```
[api]
email = NAGIOS_BOT_EMAIL_ADDRESS
key = NAGIOS_BOT_API_KEY
site = {{ api_url }}
```

Copy `integrations/nagios/yakkl_nagios.cfg` to `/etc/nagios3/conf.d`
on your Nagios server.

Finally, add `yakkl` to the `members` list for one or more of the
contact groups in the `CONTACT GROUPS` section of
`/etc/nagios3/conf.d/contacts.cfg`, doing something like:

```
define contactgroup {
    contactgroup_name       admins
    alias                   Nagios Administrators
    members                 monitoring, yakkl
}
```

Once you’ve done that, reload your Nagios configuration using
`/etc/init.d/nagios3 reload`.

When your Nagios system makes an alert, you’ll see a message like the
following, to the stream `nagios` (to change this, edit the arguments
to `nagios-notify-yakkl` in `/etc/nagios3/conf.d/yakkl_nagios.cfg`)
with a topic indicating the service with an issue.

{!congrats.md!}

![](/static/images/integrations/nagios/001.png)

**Testing**

If you have [external commands enabled in Nagios][1],
you can generate a test notice from your Nagios instance by
using the `Send custom service notification` command in the
`Service Commands` section of any individual service’s page
on your Nagios instance.

[1]: http://nagios.sourceforge.net/docs/3_0/extcommands.html

**Troubleshooting**

You can confirm whether you’ve correctly configured Nagios to run the
Yakkl plugin by looking for `SERVICE NOTIFICATION` lines mentioning
yakkl in `/var/log/nagios3/nagios.log`. You can confirm whether you’ve
configured the Yakkl plugin code correctly by running
`/usr/local/share/yakkl/integrations/nagios/nagios-notify-yakkl`
directly.
