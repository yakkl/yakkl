# Troubleshooting

Yakkl uses [Supervisor](http://supervisord.org/index.html) to monitor
and control its many Python services. Read the next section, [Using
supervisorctl](#using-supervisorctl), to learn how to use the
Supervisor client to monitor and manage services.

If you haven't already, now might be a good time to read Yakkl's [architectural
overview](../overview/architecture-overview.html), particularly the
[Components](../overview/architecture-overview.html#components) section. This will help you
understand the many services Yakkl uses.

If you encounter issues while running Yakkl, take a look at Yakkl's logs, which
are located in  `/var/log/yakkl/`. That directory contains one log file for
each service, plus `errors.log` (has all errors), `server.log` (has logs from
the Django and Tornado servers), and `workers.log` (has combined logs from the
queue workers).

The section [troubleshooting services](#troubleshooting-services)
on this page includes details about how to fix common issues with Yakkl services.

If you run into additional problems, [please report
them](https://github.com/yakkl/yakkl/issues) so that we can update
this page!  The Yakkl installation scripts logs its full output to
`/var/log/yakkl/install.log`, so please include the context for any
tracebacks from that log.

## Using supervisorctl

To see what Yakkl-related services are configured to
use Supervisor, look at `/etc/supervisor/conf.d/yakkl.conf` and
`/etc/supervisor/conf.d/yakkl-db.conf`.

Use the supervisor client `supervisorctl` to list the status of, stop, start,
and restart various services.

### Checking status with `supervisorctl status`

You can check if the yakkl application is running using:
```
supervisorctl status
```

When everything is running as expected, you will see something like this:

```
process-fts-updates                                             RUNNING   pid 2194, uptime 1:13:11
yakkl-django                                                    RUNNING   pid 2192, uptime 1:13:11
yakkl-senders:yakkl-events-message_sender-0                     RUNNING   pid 2209, uptime 1:13:11
yakkl-senders:yakkl-events-message_sender-1                     RUNNING   pid 2210, uptime 1:13:11
yakkl-senders:yakkl-events-message_sender-2                     RUNNING   pid 2211, uptime 1:13:11
yakkl-senders:yakkl-events-message_sender-3                     RUNNING   pid 2212, uptime 1:13:11
yakkl-senders:yakkl-events-message_sender-4                     RUNNING   pid 2208, uptime 1:13:11
yakkl-tornado                                                   RUNNING   pid 2193, uptime 1:13:11
yakkl-workers:yakkl-deliver-enqueued-emails                     STARTING
yakkl-workers:yakkl-events-confirmation-emails                  RUNNING   pid 2199, uptime 1:13:11
yakkl-workers:yakkl-events-digest_emails                        RUNNING   pid 2205, uptime 1:13:11
yakkl-workers:yakkl-events-email_mirror                         RUNNING   pid 2203, uptime 1:13:11
yakkl-workers:yakkl-events-error_reports                        RUNNING   pid 2200, uptime 1:13:11
yakkl-workers:yakkl-events-feedback_messages                    RUNNING   pid 2207, uptime 1:13:11
yakkl-workers:yakkl-events-missedmessage_mobile_notifications   RUNNING   pid 2204, uptime 1:13:11
yakkl-workers:yakkl-events-missedmessage_reminders              RUNNING   pid 2206, uptime 1:13:11
yakkl-workers:yakkl-events-signups                              RUNNING   pid 2198, uptime 1:13:11
yakkl-workers:yakkl-events-slowqueries                          RUNNING   pid 2202, uptime 1:13:11
yakkl-workers:yakkl-events-user-activity                        RUNNING   pid 2197, uptime 1:13:11
yakkl-workers:yakkl-events-user-activity-interval               RUNNING   pid 2196, uptime 1:13:11
yakkl-workers:yakkl-events-user-presence                        RUNNING   pid 2195, uptime 1:13:11
```

### Restarting services with `supervisorctl restart all`

After you change configuration in `/etc/yakkl/settings.py` or fix a
misconfiguration, you will often want to restart the Yakkl application.
You can restart Yakkl using:

```
supervisorctl restart all
```

### Stopping services with `supervisorctl stop all`

Similarly, you can stop Yakkl using:

```
supervisorctl stop all
```

## Troubleshooting services

The Yakkl application uses several major open source services to store
and cache data, queue messages, and otherwise support the Yakkl
application:

* postgresql
* rabbitmq-server
* nginx
* redis
* memcached

If one of these services is not installed or functioning correctly,
Yakkl will not work.  Below we detail some common configuration
problems and how to resolve them:

* An AMQPConnectionError traceback or error running rabbitmqctl
  usually means that RabbitMQ is not running; to fix this, try:
  ```
  service rabbitmq-server restart
  ```
  If RabbitMQ fails to start, the problem is often that you are using
  a virtual machine with broken DNS configuration; you can often
  correct this by configuring `/etc/hosts` properly.

* If your browser reports no webserver is running, that is likely
  because nginx is not configured properly and thus failed to start.
  nginx will fail to start if you configured SSL incorrectly or did
  not provide SSL certificates.  To fix this, configure them properly
  and then run:
  ```
  service nginx restart
  ```

* If your host is being port scanned by unauthorized users, you may see
  messages in `/var/log/yakkl/server.log` like
  ```
  2017-02-22 14:11:33,537 ERROR Invalid HTTP_HOST header: '10.2.3.4'. You may need to add u'10.2.3.4' to ALLOWED_HOSTS.
  ```
  Django uses the hostnames configured in `ALLOWED_HOSTS` to identify
  legitimate requests and block others. When an incoming request does
  not have the correct HTTP Host header, Django rejects it and logs the
  attempt. For more on this issue, see the [Django release notes on Host header
  poisoning](https://www.djangoproject.com/weblog/2013/feb/19/security/#s-issue-host-header-poisoning)
