# The Yakkl API

Yakkl's APIs allow you to integrate other services with Yakkl.  This
guide should help you find the API you need:

* First, check if the tool you'd like to integrate with Yakkl
  [already has a native integration](/integrations).
* Next, check if [Zapier](https://zapier.com/apps) or
  [IFTTT](https://ifttt.com/search) has an integration.
  [Yakkl's Zapier integration](/integrations/doc/zapier) and
  [Yakkl's IFTTT integration](/integrations/doc/ifttt) often allow
  integrating a new service with Yakkl without writing any code.
* If you'd like to send content into Yakkl, you can
  [write a native incoming webhook integration](/api/incoming-webhooks-overview)
  or use [Yakkl's API for sending messages](/api/send-message).
* If you're building an interactive bot that reacts to activity inside
  Yakkl, you'll want to look at Yakkl's
  [Python framework for interactive bots](/api/running-bots) or
  [Yakkl's real-time events API](/api/get-events-from-queue).

And if you still need to build your own integration with Yakkl, check out
the full [REST API](/api/rest), generally starting with
[installing the API client bindings](/api/installation-instructions).

In case you already know how you want to build your integration and you're
just looking for an API key, we've got you covered [here](/api/api-keys).
