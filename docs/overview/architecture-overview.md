Yakkl architectural overview
============================

Key Codebases
-------------

The main Yakkl codebase is at <https://github.com/yakkl/yakkl>.  It
contains the Yakkl backend (written in Python 3.x and Django), the
webapp (written in JavaScript and TypeScript) and our library of
incoming webhook [integrations](https://yakkl.com/integrations)
with other services and applications (see [the directory structure
guide](../overview/directory-structure.html)).

[Yakkl Mobile](https://github.com/yakkl/yakkl-mobile) is the official
mobile Yakkl client supporting both iOS and Android, written in
JavaScript with React Native, and [Yakkl
Desktop](https://github.com/yakkl/yakkl-desktop) is the official Yakkl
desktop client for macOS, Linux, and Windows.  We also have an alpha
[Yakkl Terminal](https://github.com/yakkl/yakkl-terminal) project.

We also maintain several separate repositories for integrations and
other glue code: [Python API
bindings](https://github.com/yakkl/python-yakkl-api); [JavaScript API
bindings](https://github.com/yakkl/yakkl-js); a [Hubot
adapter](https://github.com/yakkl/hubot-yakkl); integrations with
[Phabricator](https://github.com/yakkl/phabricator-to-yakkl),
[Jenkins](https://github.com/yakkl/yakkl-jenkins-plugin),
[Puppet](https://github.com/matthewbarr/puppet-yakkl),
[Redmine](https://github.com/yakkl/yakkl-redmine-plugin), and
[Trello](https://github.com/yakkl/trello-to-yakkl); our [full-text
search PostgreSQL extension](https://github.com/yakkl/tsearch_extras);
and [many more](https://github.com/yakkl/).

We use [Transifex](https://www.transifex.com/yakkl/yakkl/) to do
translations.

In this overview, we'll mainly discuss the core Yakkl server and web
application.

Usage assumptions and concepts
------------------------------

Yakkl is a real-time team chat application meant to provide a great
experience for a wide range of organizations, from companies to
volunteer projects groups of friends, ranging in size from a small
team to 10,000s of users.  It has [hundreds of
features](https://yakkl.com/features) both larger and small, and
supports dedicated apps for iOS, Android, Linux, Windows, and macOS,
all modern web browsers, several cross-protocol chat clients, and
numerous dedicated [Yakkl API](https://yakkl.com/api) clients
(e.g. bots).

A server can host multiple Yakkl *realms* (organizations), each on its
own (sub)domain.  While most deployments host only organization, some
such as yakkl.com host thousands.  Each organization is a private
chamber with its own users, streams, customizations, and so on. This
means that one person might be a user of multiple Yakkl realms. The
administrators of an organization have a great deal of control over
who can register an account, what permissions new users have, etc. For
more on security considerations and options, see [the security model
section](../production/security-model.html) and the [Yakkl Help
Center](https://yakkl.com/help).

Components
----------

  ![architecture-simple](../images/architecture_simple.png)

### Django and Tornado

Yakkl is primarily implemented in the
[Django](https://www.djangoproject.com/) Python web framework.  We
also make use of [Tornado](http://www.tornadoweb.org) for the
real-time push system.

Django is the main web application server; Tornado runs the
server-to-client real-time push system. The app servers are configured
by the Supervisor configuration (which explains how to start the server
processes; see "Supervisor" below) and the nginx configuration (which
explains which HTTP requests get sent to which app server).

Tornado is an asynchronous server and is meant specifically to hold
open tens of thousands of long-lived (long-polling or websocket)
connections -- that is to say, routes that maintain a persistent
connection from every running client. For this reason, it's
responsible for event (message) delivery, but not much else. We try to
avoid any blocking calls in Tornado because we don't want to delay
delivery to thousands of other connections (as this would make Yakkl
very much not real-time).  For instance, we avoid doing cache or
database queries inside the Tornado code paths, since those blocking
requests carry a very high performance penalty for a single-threaded,
asynchronous server system.  (In principle, we could do non-blocking
requests to those services, but the Django-based database libraries we
use in most of our codebase using don't support that, and in any case,
our architecture doesn't require Tornado to do that).

The parts that are activated relatively rarely (e.g. when people type or
click on something) are processed by the Django application server. One
exception to this is that Yakkl uses websockets through Tornado to
minimize latency on the code path for **sending** messages.

There is detailed documentation on the
[real-time push and event queue system](../subsystems/events-system.html); most of
the code is in `zerver/tornado`.

#### HTML templates, JavaScript, etc.

Yakkl's HTML is primarily implemented using two types of HTML
templates: backend templates (powered by the [Jinja2][] template
engine used for logged-out ("portico") pages and the webapp's base
content) and frontend templates (powered by [Handlebars][]) used for
live-rendering HTML from JavaScript for things like the main message
feed.

For more details on the frontend, see our documentation on
[translation](../translating/translating.html),
[templates](../subsystems/html-templates.html),
[directory structure](../overview/directory-structure.html), and
[the static asset pipeline](../subsystems/front-end-build-process.html).

[Jinja2]: http://jinja.pocoo.org/
[Handlebars]: http://handlebarsjs.com/

### nginx

nginx is the front-end web server to all Yakkl traffic; it serves static
assets and proxies to Django and Tornado. It handles HTTP requests
according to the rules laid down in the many config files found in
`yakkl/puppet/yakkl/files/nginx/`.

`yakkl/puppet/yakkl/files/nginx/yakkl-include-frontend/app` is the most
important of these files. It explains what happens when requests come in
from outside.

-   In production, all requests to URLs beginning with `/static/` are
    served from the corresponding files in `/home/yakkl/prod-static/`,
    and the production build process (`tools/build-release-tarball`)
    compiles, minifies, and installs the static assets into the
    `prod-static/` tree form. In development, files are served directly
    from `/static/` in the git repository.
-   Requests to `/json/events`, `/api/v1/events`, and `/sockjs` are
    sent to the Tornado server. These are requests to the real-time push
    system, because the user's web browser sets up a long-lived TCP
    connection with Tornado to serve as [a channel for push
    notifications](https://en.wikipedia.org/wiki/Push_technology#Long_polling).
    nginx gets the hostname for the Tornado server via
    `puppet/yakkl/files/nginx/yakkl-include-frontend/upstreams`.
-   Requests to all other paths are sent to the Django app via the UNIX
    socket `unix:/home/yakkl/deployments/uwsgi-socket` (defined in
    `puppet/yakkl/files/nginx/yakkl-include-frontend/upstreams`). We use
    `zproject/wsgi.py` to implement uWSGI here (see
    `django.core.wsgi`).
- By default (i.e. if `LOCAL_UPLOADS_DIR` is set), nginx will serve
  user-uploaded content like avatars, custom emoji, and uploaded
  files.  However, one can configure Yakkl to store these in a cloud
  storage service like Amazon S3 instead.

### Supervisor

We use [supervisord](http://supervisord.org/) to start server processes,
restart them automatically if they crash, and direct logging.

The config file is
`yakkl/puppet/yakkl/templates/supervisor/yakkl.conf.template.erb`. This
is where Tornado and Django are set up, as well as a number of background
processes that process event queues. We use event queues for the kinds
of tasks that are best run in the background because they are
expensive (in terms of performance) and don't have to be synchronous
--- e.g., sending emails or updating analytics. Also see [the queuing
guide](../subsystems/queuing.html).

### memcached

memcached is used to cache database model
objects. `zerver/lib/cache.py` and `zerver/lib/cache_helpers.py`
manage putting things into memcached, and invalidating the cache when
values change. The memcached configuration is in
`puppet/yakkl/files/memcached.conf`.  See our
[caching guide](../subsystems/caching.html) to learn how this works in
detail.

### Redis

Redis is used for a few very short-term data stores, such as in the
basis of `zerver/lib/rate_limiter.py`, a per-user rate limiting scheme
[example](http://blog.domaintools.com/2013/04/rate-limiting-with-redis/)),
and the [email-to-Yakkl
integration](https://yakkl.com/integrations/doc/email).

Redis is configured in `yakkl/puppet/yakkl/files/redis` and it's a
pretty standard configuration except for the last line, which turns off
persistence:

    # Yakkl-specific configuration: disable saving to disk.
    save ""

People often wonder if we could replace memcached with redis (or
replace RabbitMQ with redis, with some loss of functionality).

The answer is likely yes, but it wouldn't improve Yakkl.
Operationally, our current setup is likely easier to develop and run
in production than a pure redis system would be.  Meanwhile, the
perceived benefit for using redis is usually to reduce memory
consumption by running fewer services, and no such benefit would
materialize:

* Our cache uses significant memory, but that memory usage would be
  essentially the same with redis as it is with memcached.
* All of these services have low minimum memory requirements, and in
  fact our applications for redis and RabbitMQ do not use significant
  memory even at scale.
* We would likely need to run multiple redis services (with different
  configurations) in order to ensure the pure LRU use case (memcached)
  doesn't push out data that we want to persist until expiry
  (redis-based rate limiting) or until consumed (RabbitMQ-based
  queuing of deferred work).

### RabbitMQ

RabbitMQ is a queueing system. Its config files live in
`yakkl/puppet/yakkl/files/rabbitmq`. Initial configuration happens in
`yakkl/scripts/setup/configure-rabbitmq`.

We use RabbitMQ for queuing expensive work (e.g. sending emails
triggered by a message, push notifications, some analytics, etc.) that
require reliable delivery but which we don't want to do on the main
thread. It's also used for communication between the application server
and the Tornado push system.

Two simple wrappers around `pika` (the Python RabbitMQ client) are in
`yakkl/zerver/lib/queue.py`. There's an asynchronous client for use in
Tornado and a more general client for use elsewhere.  Most of the
processes started by Supervisor are queue processors that continually
pull things out of a RabbitMQ queue and handle them; they are defined
in `zerver/worker/queue_processors.py`.

Also see [the queuing guide](../subsystems/queuing.html).

### PostgreSQL

PostgreSQL (also known as Postgres) is the database that stores all
persistent data, that is, data that's expected to live beyond a user's
current session.

In production, Postgres is installed with a default configuration. The
directory that would contain configuration files
(`puppet/yakkl/files/postgresql`) has only a utility script and a custom
list of stopwords used by a Postgresql extension.

In a development environment, configuration of that postgresql
extension is handled by `tools/postgres-init-dev-db` (invoked by
`tools/provision`).  That file also manages setting up the
development postgresql user.

`tools/provision` also invokes `tools/do-destroy-rebuild-database`
to create the actual database with its schema.

### Thumbor and thumbnailing

We use Thumbor, a popular open source thumbnailing server, to serve
images (both for inline URL previews and serving uploaded image
files).  See [our thumbnailing docs](../subsystems/thumbnailing.html)
for more details on how this works.

### Nagios

Nagios is an optional component used for notifications to the system
administrator, e.g., in case of outages.

`yakkl/puppet/yakkl/manifests/nagios.pp` installs Nagios plugins from
`puppet/yakkl/files/nagios_plugins/`.

This component is intended to install Nagios plugins intended to be run
on a Nagios server; most of the Yakkl Nagios plugins are intended to be
run on the Yakkl servers themselves, and are included with the relevant
component of the Yakkl server (e.g.
`puppet/yakkl/manifests/postgres_common.pp` installs a few under
`/usr/lib/nagios/plugins/yakkl_postgres_common`).

## Glossary

This section gives names for some of the elements in the Yakkl UI used
in Yakkl development conversations.  In general, our goal is to
minimize the set of terminology listed here by giving elements
self-explanatory names.

* **chevron**: A small downward-facing arrow next to a message's
    timestamp, offering contextual options, e.g., "Reply", "Mute [this
    topic]", or "Link to this conversation". To avoid visual clutter,
    the chevron only appears in the web UI upon hover.

* **huddle**: What the codebase calls a "group private message".

* **message editing**: If the realm admin allows it, then after a user
    posts a message, the user has a few minutes to click "Edit" and
    change the content of their message. If they do, Yakkl adds a
    marker such as "(EDITED)" at the top of the message, visible to
    anyone who can see the message.

* **realm**: What the codebase calls an "organization" in the UI.

* **recipient bar**: A visual indication of the context of a message
    or group of messages, displaying the stream and topic or private
    message recipient list, at the top of a group of messages. A
    typical 1-line message to a new recipient shows to the user as
    three lines of content: first the recipient bar, second the
    sender's name and avatar alongside the timestamp (and, on hover,
    the star and the chevron), and third the message content. The
    recipient bar is or contains hyperlinks to help the user narrow.

* **star**: Yakkl allows a user to mark any message they can see,
    public or private, as "starred". A user can easily access messages
    they've starred through the "Starred messages" link in the
    left sidebar, or use "is:starred" as a narrow or a search
    constraint. Whether a user has or has not starred a particular
    message is private; other users and realm admins don't know
    whether a message has been starred, or by whom.

* **subject**: What the codebase calls a "topic" in many places.

* **bankruptcy**: When a user has been off Yakkl for several days and
    has hundreds of unread messages, they are prompted for whether
    they want to mark all their unread messages as read.  This is
    called "declaring bankruptcy" (in reference to the concept in
    finance).
