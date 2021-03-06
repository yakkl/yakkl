# Create User Group

Create a new [user group](/help/user-groups).

`POST {{ api_url }}/v1/user_groups/create`

## Usage examples

{start_tabs}
{tab|python}

{generate_code_example(python)|/user_groups/create:post|example}

{tab|curl}

``` curl
curl -X POST {{ api_url }}/v1/user_groups/create \
    -u BOT_EMAIL_ADDRESS:BOT_API_KEY \
    -d 'name="marketing"' \
    -d 'description="The marketing team"' \
    -d 'members=[1,2,3,4]'
```

{end_tabs}

## Arguments

{generate_api_arguments_table|yakkl.yaml|/user_groups/create:post}

## Response

#### Example response

A typical successful JSON response may look like:

{generate_code_example|/user_groups/create:post|fixture(200)}

An example JSON error response for when the one of the users does not exist:

{generate_code_example|/user_groups/create:post|fixture(400)}
