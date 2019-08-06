# Incoming email integration

Yakkl's incoming email gateway integration makes it possible to send
messages into Yakkl by sending an email.  It's highly recommended
because it enables:

* When users reply to one of Yakkl's missed message email
  notifications from their email client, the reply can go directly
  into Yakkl.
* Integrating third-party services that can send email notifications
  into Yakkl.  See the [integration
  documentation](https://yakkl.com/integrations/doc/email) for
  details.

Once this integration is configured, each stream will have a special
email address displayed on the stream settings page.  Emails sent to
that address will be delivered into the stream.

There are two ways to configure Yakkl's email gateway:

  1. Local delivery (recommended): A postfix server runs on the Yakkl
    server and passes the emails directly to Yakkl.
  1. Polling: A cron job running on the Yakkl server checks an IMAP
    inbox (`username@example.com`) every minute for new emails.

The local delivery configuration is preferred for production because
it supports nicer looking email addresses and has no cron delay.  The
polling option is convenient for testing/developing this feature
because it doesn't require a public IP address or setting up MX
records in DNS.

## Local delivery setup

Yakkl's puppet configuration provides everything needed to run this
integration; you just need to enable and configure it as follows.

The main decision you need to make is what email domain you want to
use for the gateway; for this discussion we'll use
`emaildomain.example.com`.  The email addresses used by the gateway
will look like `foo@emaildomain.example.com`, so we recommend using
`EXTERNAL_HOST` here.

We will use `hostname.example.com` as the hostname of the Yakkl server
(this will usually also be the same as `EXTERNAL_HOST`, unless you are
using an [HTTP reverse proxy][reverse-proxy]).

1. Using your DNS provider, create a DNS MX (mail exchange) record
   configuring email for `emaildomain.example.com` to be processed by
   `hostname.example.com`.  You can check your work using this command:

    ```
    $ dig +short emaildomain.example.com -t MX
    1 hostname.example.com
    ```

1.  Login to your Yakkl server; the remaining steps all happen there.

1. Add `, yakkl::postfix_localmail` to `puppet_classes` in
   `/etc/yakkl/yakkl.conf`.  A typical value after this change is:
   ```
   puppet_classes = yakkl::voyager, yakkl::postfix_localmail
   ```

1.  If `hostname.example.com` is different from
   `emaildomain.example.com`, add a section to `/etc/yakkl/yakkl.conf`
   on your Yakkl server like this:

    ```
    [postfix]
    mailname = emaildomain.example.com
    ```

    This tells postfix to expect to receive emails at addresses ending
    with `@emaildomain.example.com`, overriding the default of
    `@hostname.example.com`.

1. Run `/home/yakkl/deployments/current/scripts/yakkl-puppet-apply`
   (and answer `y`) to apply your new `/etc/yakkl/yakkl.conf`
   configuration to your Yakkl server.

1. Edit `/etc/yakkl/settings.py`, and set `EMAIL_GATEWAY_PATTERN`
   to `"%s@emaildomain.example.com"`.

1. Restart your Yakkl server with
   `/home/yakkl/deployments/current/scripts/restart-server`.

Congratulations!  The integration should be fully operational.

[reverse-proxy]: ../production/deployment.html#putting-the-yakkl-application-behind-a-reverse-proxy

## Polling setup

1. Create an email account dedicated to Yakkl's email gateway
  messages.  We assume the address is of the form
  `username@example.com`.  The email provider needs to support the
  standard model of delivering emails sent to
  `username+stuff@example.com` to the `username@example.com` inbox.

1. Edit `/etc/yakkl/settings.py`, and set `EMAIL_GATEWAY_PATTERN` to
   `"username+%s@example.com"`.

1. Set up IMAP for your email account and obtain the authentication details.
  ([Here's how it works with Gmail](https://support.google.com/mail/answer/7126229?hl=en))

1. Configure IMAP access in the appropriate Yakkl settings:
    * Login and server connection details in `/etc/yakkl/settings.py`
      in the email gateway integration section (`EMAIL_GATEWAY_LOGIN` and others).
    * Password in `/etc/yakkl/yakkl-secrets.conf` as `email_gateway_password`.

1. Install a cron job to poll the inbox every minute for new messages:
    ```
    cd /home/yakkl/deployments/current/
    sudo cp puppet/yakkl/files/cron.d/email-mirror /etc/cron.d/
    ```

Congratulations!  The integration should be fully operational.
