# Fetch a development API key

For easy testing of mobile apps and other clients and against Yakkl
development servers, we support fetching a Yakkl API key for any user
on the development server without authentication (so that they can
implement analogues of the one-click login process available for Yakkl
development servers on the web).

**Note:** This endpoint is only available on Yakkl development
servers; for obvious security reasons it will always return an error
in a Yakkl production server.

`POST {{ api_url }}/v1/dev_fetch_api_key`

## Usage examples

{start_tabs}
{tab|curl}

``` curl
curl -X POST {{ api_url }}/v1/dev_fetch_api_key \
    -u BOT_EMAIL_ADDRESS:BOT_API_KEY \
    -d "username=iago@yakkl.com"
```

{end_tabs}

## Arguments

{generate_api_arguments_table|yakkl.yaml|/dev_fetch_api_key:post}

## Response

#### Return values

* `api_key`: The API key that can be used to authenticate as the requested
    user.
* `email`: The email address of the user who owns the API key.

#### Example response

A typical successful JSON response may look like:

{generate_code_example|/dev_fetch_api_key:post|fixture(200)}
