# Render message

Render a message to HTML.

`POST {{ api_url }}/v1/messages/render`

## Usage examples

{start_tabs}
{tab|python}

{generate_code_example(python)|/messages/render:post|example}

{tab|js}

More examples and documentation can be found [here](https://github.com/yakkl/yakkl-js).
```js
const yakkl = require('yakkl-js');

// Pass the path to your yakklrc file here.
const config = {
    yakklrc: 'yakklrc',
};

yakkl(config).then((client) => {
    // Render a message
    const params = {
        content: '**foo**',
    };

    client.messages.render(params).then(console.log);
});
```

{tab|curl}

``` curl
curl -X POST {{ api_url }}/v1/messages/render \
    -u BOT_EMAIL_ADDRESS:BOT_API_KEY \
    -d $"content=**foo**"

```

{end_tabs}

## Arguments

{generate_api_arguments_table|yakkl.yaml|/messages/render:post}

## Response

#### Return values

* `rendered`: The rendered HTML.

#### Example response

A typical successful JSON response may look like:

{generate_code_example|/messages/render:post|fixture(200)}
