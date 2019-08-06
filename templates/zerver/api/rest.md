# The Yakkl REST API

The Yakkl REST API powers the Yakkl web and mobile apps, so anything
you can do in Yakkl, you can do with Yakkl's REST API.  To use this API:

* You'll need to [get an API key](/api/api-keys).  You will likely
  want to [create a bot](/help/add-a-bot-or-integration), unless you're
  using the API to interact with
  your own account (e.g. exporting your personal message history).
* Choose what language you'd like to use.  You can download the
  [Python or JavaScript bindings](/api/installation-instructions), or
  just make HTTP requests with your favorite programming language.  If
  you're making your own HTTP requests, you'll want to send the
  appropriate HTTP Basic Authentication headers; see each endpoint's
  `curl` option for details on the request format.
* The Yakkl API has a standard
  [system for reporting errors](/api/rest-error-handling).

Most other details are covered in the documentation for the individual
endpoints:

!!! tip ""
    You may use the `client.call_endpoint` method of our Python API
    bindings to call an endpoint that isn't documented here. For an
    example, see [Upload a custom emoji](/api/upload-custom-emoji).

{!rest-endpoints.md!}

Since Yakkl is open source, you can also consult the
[Yakkl server source code](https://github.com/yakkl/yakkl/) as a
workaround for how to do anything not documented here.
