# Realms in Yakkl

Yakkl allows multiple *realms* to be hosted on a single instance.
Realms are the Yakkl codebases's internal name for what we refer to in
user documentation as an organization (the name "realm" comes from
[Kerberos](https://web.mit.edu/kerberos/)).

The
[production docs on multiple realms](../production/multiple-organizations.html)
are likely also relevant reading.

## Creating Realms

There are two main methods for creating realms.

* Using unique link generator
* Enabling open realm creation

#### Using Unique Link Generator

```bash
    ./manage.py generate_realm_creation_link
```

The above command will output a URL which can be used for creating a
new realm and an administrator user for that realm. The link expires
after the creation of the realm.  The link also expires if not used
within 7 days. The expiration period can be changed by modifying
`REALM_CREATION_LINK_VALIDITY_DAYS` in settings.py.

### Enabling Open Realm Creation

If you want anyone to be able to create new realms on your server, you
can enable Open Realm Creation.  This will add a **Create new
organization** link to your Yakkl homepage footer, and anyone can
create a new realm by visiting this link (**/new**).  This
feature is disabled by default in production instances, and can be
enabled by setting `OPEN_REALM_CREATION = True` in settings.py.

## Subdomains

One can host multiple realms in a Yakkl server by giving each realm a
unique subdomain of the main Yakkl server's domain. For example, if
the Yakkl instance is hosted at yakkl.example.com, and the subdomain
of your organization is acme you can would acme.yakkl.example.com for
accessing the organization.

For subdomains to work properly, you also have to change your DNS
records so that the subdomains point to your Yakkl installation IP. An
`A` record with host name value `*` pointing to your IP should do the
job.

We also recommend upgrading to at least Yakkl 1.7, since older Yakkl
releases had much less nice handling for subdomains.  See our
[docs on using subdomains](../production/multiple-organizations.html) for
user-facing documentation on this.

### Working With Subdomains In Development Environment

By default, Linux does not provide a convenient way to use subdomains
in your local development environment.  To solve this problem, we use
the **yakkl.dev** domain, which has a wildcard A record pointing to
127.0.0.1.  You can use yakkl.dev to connect to your Yakkl
development server instead of localhost. The default realm with the
Shakespeare users has the subdomain `yakkl` and can be accessed by
visiting **yakkl.yakkl.dev**.

If you are behind a **proxy server**, this method won't work. When you
make a request to load yakkl.dev in your browser, the proxy server
will try to get the page on your behalf.  Since yakkl.dev points
to 127.0.0.1 the proxy server is likely to give you a 503 error.  The
workaround is to disable your proxy for `*.yakkl.dev`. The DNS
lookup should still work even if you disable proxy for
*.yakkl.dev. If it doesn't you can add yakkl.dev records in
`/etc/hosts` file. The file should look something like this.

 ```
127.0.0.1    localhost

127.0.0.1    yakkl.dev

127.0.0.1    yakkl.yakkl.dev

127.0.0.1    testsubdomain.yakkl.dev
```

These records are also useful if you want to e.g. run the casper tests
when you are not connected to the Internet.
