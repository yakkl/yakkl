# Construct a narrow

A **narrow** is a set of filters for Yakkl messages, that can be based
on many different factors (like sender, stream, topic, search
keywords, etc.).  Narrows are used in various places in the the Yakkl
API (most importantly, in the API for fetching messages).

It is simplest to explain the algorithm for encoding a search as a
narrow using a single example.  Consider the following search query
(written as it would be entered in the Yakkl webapp's search box).  It
filters for messages sent on stream `announce`, not sent by
`iago@yakkl.com`, and containing the phrase `cool sunglasses`:

```
stream:announce -sender:iago@yakkl.com cool sunglasses
```

This query would be JSON-encoded for use in the Yakkl API using JSON
as a list of simple objects, as follows:

```json
[
    {
        "operator": "stream",
        "operand": "announce"
    },
    {
        "operator": "sender",
        "operand": "iago@yakkl.com",
        "negated": true
    },
    {
        "operator": "search",
        "operand": "cool sunglasses"
    }
]
```

The full set of search/narrowing options supported by the Yakkl API is
documented in
[the Yakkl Help Center article on search](/help/search-for-messages).
There are a few additional options that we don't document there
because they are primarily useful to API clients:

* `pm-with:1234`: Search 1-on-1 messages by user ID `1234`.
