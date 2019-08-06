{!create-stream.md!}

{!download-python-bindings.md!}

{!change-yakkl-config-file.md!}

Also, change the following lines:

```
STREAM_FOR_NOTIFICATIONS = "trac"
TRAC_BASE_TICKET_URL = "https://trac.example.com/ticket"
```

Set `STREAM_FOR_NOTIFICATIONS` to the name of the stream
you'd like the notifications to be sent to.

Copy `integrations/trac/yakkl_trac.py` and
`integrations/trac/yakkl_trac_config.py` into your Trac installation’s
`plugins/` subdirectory. Once you’ve done that, edit your Trac
installation’s `conf/trac.ini` to add `yakkl_trac` to the
`[components]` section, as follows:

```bash
[components]
yakkl_trac = enabled
```

You may then need to restart Trac (or Apache) so that Trac will load
our plugin.

When people open new tickets (or edit existing tickets), notifications
will be sent to the stream `trac` (or whatever you
configured above) with a topic that matches the ticket name.

{!congrats.md!}

![](/static/images/integrations/trac/001.png)

**Additional trac configuration**

After using the plugin for a while, you may want to customize which
changes to tickets result in a Yakkl notification using the
`TRAC_NOTIFY_FIELDS` setting in `yakkl_trac_config.py`.
