# Configuring the Python bindings

Yakkl provides a set of tools that allows interacting with its API more
easily, called the [Python bindings](https://pypi.python.org/pypi/yakkl/).
One of the most notable use cases for these bindings are bots developed
using Yakkl's [bot framework](/api/writing-bots).

In order to use them, you need to configure them with your API key and other
settings. There are two ways to achieve that:

 - With a file called `.yakklrc`, located in your home directory.
 - With
   [environment variables](https://en.wikipedia.org/wiki/Environment_variable)
   set up in your host machine.

A `.yakklrc` file is a plain text document that looks like this:

```
[api]
key=<api key from the web interface>
email=<your email address>
site=<your Yakkl server's URI>
...
```

The keys you can use in this file (and their equivalent environment variables)
can be found in the following table:

<table class="table">
    <thead>
        <tr>
            <th><code>.yakklrc</code> key</th>
            <th>Environment variable</th>
            <th>Required</th>
            <th>Description</th>
        </tr>
    </thead>
    <tr>
        <td><code>key</code></td>
        <td><code>YAKKL_API_KEY</code></td>
        <td>Yes</td>
        <td>
            <a href="/api/api-keys">API key</a>, which you can get through
            Yakkl's web interface.
        </td>
    </tr>
    <tr>
        <td><code>email</code></td>
        <td><code>YAKKL_EMAIL</code></td>
        <td>Yes</td>
        <td>
            The email address of the user who owns the API key mentioned
            above.
        </td>
    </tr>
    <tr>
        <td><code>site</code></td>
        <td><code>YAKKL_SITE</code></td>
        <td>No</td>
        <td>
            URL where your Yakkl server is located.
        </td>
    </tr>
    <tr>
        <td><code>client_cert_key</code></td>
        <td><code>YAKKL_CERT_KEY</code></td>
        <td>No</td>
        <td>
            Path to the SSL/TLS private key that the binding should use to
            connect to the server.
        </td>
    </tr>
    <tr>
        <td><code>client_cert</code></td>
        <td><code>YAKKL_CERT</code></td>
        <td>No*</td>
        <td>
            The public counterpart of <code>client_cert_key</code>/
            <code>YAKKL_CERT_KEY</code>. <i>This setting is required if a cert
            key has been set.</i>
        </td>
    </tr>
    <tr>
        <td><code>client_bundle</code></td>
        <td><code>YAKKL_CERT_BUNDLE</code></td>
        <td>No</td>
        <td>
            Path where the server's PEM-encoded certificate is located. CA
            certificates are also accepted, in case those CA's have issued the
            server's certificate. Defaults to the built-in CA bundle trusted
            by Python.
        </td>
    </tr>
    <tr>
        <td><code>insecure</code></td>
        <td><code>YAKKL_ALLOW_INSECURE</code></td>
        <td>No</td>
        <td>
            Allows connecting to Yakkl servers with an invalid SSL/TLS
            certificate. Please note that enabling this will make the HTTPS
            connection insecure. Defaults to <code>false</code>.
        </td>
    </tr>
</table>
