Get information on new or updated Redmine issues right in
Yakkl with our Yakkl Redmine plugin!

_Note: this setup must be done by a Redmine Administrator._

### Installing

Follow the [Redmine plugin installation guide][1].  Start by changing
to the Redmine instance root directory: `cd /path/to/redmine/instance`

1. Clone the [Yakkl Redmine plugin repository][2] into the `plugins` subdirectory
   of your Redmine instance.
   `git clone https://github.com/yakkl/yakkl-redmine-plugin plugins/redmine_yakkl`

2. Update the Redmine database by running (for Rake 2.X, see
   the guide for instructions for older versions):
   `rake redmine:plugins:migrate RAILS_ENV=production`

3. Restart your Redmine instance.

The Yakkl plugin is now registered with Redmine!

### Global settings

On your {{ settings_html|safe }}, create a new Redmine bot.

To configure Yakkl notification global settings, in Redmine click the
**Administration** link in the top left, then click the **Plugins** link on the
Administration page, and click the **Configure** link to the right of
the Yakkl plugin description. Fill out the settings:

* Yakkl URL (`{{ yakkl_url }}`)
* Bot's email address
* Bot's API key

### Project settings

Create the stream you'd like to use for the project's notifications.

Visit the project's **Settings** page in Redmine, and fill out the
**Yakkl** tab:

* Stream name
* Get notified on assignments (enable/disable)
* Get notified on issue updates (enable/disable)
* Get notified on milestone progress (enable/disable)

{!congrats.md!}

![](/static/images/integrations/redmine/001.png)

[1]: http://www.redmine.org/projects/redmine/wiki/Plugins
[2]: https://github.com/yakkl/yakkl-redmine-plugin
