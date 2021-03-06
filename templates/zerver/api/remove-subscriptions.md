# Remove subscriptions

Unsubscribe yourself or other users from one or more streams.

`DELETE {{ api_url }}/v1/users/me/subscriptions`

## Usage examples

{start_tabs}
{tab|python}

{generate_code_example(python)|/users/me/subscriptions:delete|example}

{tab|js}

More examples and documentation can be found [here](https://github.com/yakkl/yakkl-js).
```js
const yakkl = require('yakkl-js');

// Pass the path to your yakklrc file here.
const config = {
    yakklrc: 'yakklrc',
};

yakkl(config).then((client) => {
    // Unsubscribe from the stream "Denmark"
    const meParams = {
        subscriptions: JSON.stringify(['Denmark']),
    };
    client.users.me.subscriptions.remove(meParams).then(console.log);

    // Unsubscribe Zoe from the stream "Denmark"
    const zoeParams = {
        subscriptions: JSON.stringify(['Denmark']),
        principals: JSON.stringify(['ZOE@yakkl.com']),
    };
    client.users.me.subscriptions.remove(zoeParams).then(console.log);
});
```

{tab|curl}

``` curl
curl -X "DELETE" {{ api_url }}/v1/users/me/subscriptions \
    -u BOT_EMAIL_ADDRESS:BOT_API_KEY \
    -d 'subscriptions=["Denmark"]'
```

You may specify the `principals` argument like so:

``` curl
curl -X "DELETE" {{ api_url }}/v1/users/me/subscriptions \
    -u BOT_EMAIL_ADDRESS:BOT_API_KEY \
    -d 'subscriptions=["Denmark"]' \
    -d 'principals=["ZOE@yakkl.com"]'
```

**Note**: Unsubscribing another user from a stream requires
administrative privileges.

{end_tabs}

## Arguments

{generate_api_arguments_table|yakkl.yaml|/users/me/subscriptions:delete}

#### Return values

* `removed`: A list of the names of streams which were unsubscribed from as
  a result of the query.

* `not_subscribed`: A list of the names of streams that the user is already
  unsubscribed from, and hence doesn't need to be unsubscribed.

#### Example response

A typical successful JSON response may look like:

{generate_code_example|/users/me/subscriptions:delete|fixture(200)}

A typical failed JSON response for when the target stream does not exist:

{generate_code_example|/users/me/subscriptions:delete|fixture(400)}
