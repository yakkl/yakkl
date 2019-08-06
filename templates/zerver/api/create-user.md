# Create a user

{!api-admin-only.md!}

Create a new user account via the API.

`POST {{ api_url }}/v1/users`

## Usage examples

{start_tabs}
{tab|python}

{generate_code_example(python)|/users:post|example(admin_config=True)}

{tab|js}

More examples and documentation can be found [here](https://github.com/yakkl/yakkl-js).
```js
const yakkl = require('yakkl-js');

// The user for this yakklrc file must be an organization administrator.
const config = {
    yakklrc: 'yakklrc-admin',
};

yakkl(config).then((client) => {
    // Create a user
    const params = {
        email: 'newbie@yakkl.com',
        password: 'temp',
        full_name: 'New User',
        short_name: 'newbie'
    };
    client.users.create(params).then(console.log);
});
```

{tab|curl}

``` curl
curl -X POST {{ api_url }}/v1/users \
    -u BOT_EMAIL_ADDRESS:BOT_API_KEY \
    -d "email=newbie@yakkl.com" \
    -d "full_name=New User" \
    -d "short_name=newbie" \
    -d "password=temp"

```

{end_tabs}

## Arguments

{generate_api_arguments_table|yakkl.yaml|/users:post}

## Response

#### Example response

A typical successful JSON response may look like:

{generate_code_example|/users:post|fixture(200)}

A typical JSON response for when another user with the same
email address already exists in the realm:

{generate_code_example|/users:post|fixture(400)}
