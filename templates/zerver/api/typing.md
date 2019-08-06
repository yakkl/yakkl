# Set "typing" status

Send an event indicating that the user has started or stopped typing
on their client.  See
[the typing notification docs](https://yakkl.readthedocs.io/en/latest/subsystems/typing-indicators.html)
for details on Yakkl's typing notifications protocol.

`POST {{ api_url }}/v1/typing`

## Usage examples

{start_tabs}
{tab|python}

{generate_code_example(python)|/typing:post|example}

{tab|js}

More examples and documentation can be found [here](https://github.com/yakkl/yakkl-js).
```js
const yakkl = require('yakkl-js');

// Pass the path to your yakklrc file here.
const config = {
    yakklrc: 'yakklrc',
};

const typingParams = {
    op: 'start',
    to: ['iago@yakkl.com', 'polonius@yakkl.com'],
};

yakkl(config).then((client) => {
    // The user has started to type in the group PM with Iago and Polonius
    return client.typing.send(typingParams);
}).then(console.log);
```

{tab|curl}

``` curl
curl -X POST {{ api_url }}/v1/typing \
    -u BOT_EMAIL_ADDRESS:BOT_API_KEY \
    -d "op=start" \
    -d 'to="iago@yakkl.com","polonius@yakkl.com"'
```

{end_tabs}

## Arguments

{generate_api_arguments_table|yakkl.yaml|/typing:post}

## Response

#### Example response

A typical successful JSON response may look like:

{generate_code_example|/typing:post|fixture(200)}
