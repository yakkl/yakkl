Yakkl supports integration with Perforce as a [trigger][1]
that fires once a changelist is submitted and committed.
To do this:

[1]: http://www.perforce.com/perforce/doc.current/manuals/p4sag/chapter.scripting.html

{!download-python-bindings.md!}

The Perforce trigger will be installed to a location like
`/usr/local/share/yakkl/integrations/perforce`.

{!change-yakkl-config-file.md!}

If you have a P4Web viewer set up, you may change `P4_WEB`
to point at the base URL of the server. If this is configured,
then the changelist number of each commit will be converted to
a hyperlink that displays the commit details on P4Web.

Edit your [trigger table][2] with `p4 triggers` and add an entry
something like the following:

    notify_yakkl change-commit //depot/... "/usr/local/share/yakkl/integrations/perforce/yakkl_change-commit.py %change% %changeroot%"

[2]: http://www.perforce.com/perforce/doc.current/manuals/p4sag/chapter.scripting.html#d0e14583

By default, this hook will send to streams of the form
`depot_subdirectory-commits`. So, a changelist that modifies
files in `//depot/foo/bar/baz` will result in a message to
stream `foo-commits`. Messages about changelists that modify
files in the depot root or files in multiple direct subdirectories
of the depot root will be sent to `depot-commits`.
If you'd prefer different behavior, such as all commits across your
depot going to one stream, change it now in `yakkl_perforce_config.py`.
Make sure that everyone interested in getting these post-commit Yakkls
is subscribed to the relevant streams!

By default, this hook will send a message to Yakkl even if the
destination stream does not yet exist. Messages to nonexistent
streams prompt the Yakkl Notification Bot to inform the bot's
owner by private message that they may wish to create the stream.
If this behaviour is undesirable, for example with a large and busy
Perforce server, change the `YAKKL_IGNORE_MISSING_STREAM`
variable in `yakkl_perforce_config.py` to `True`.
This will change the hook's behaviour to first check whether the
destination stream exists and silently drop messages if it does not.

{!congrats.md!}

![](/static/images/integrations/perforce/001.png)
