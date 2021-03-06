# Update subscription properties

This endpoint is used to update the user's personal settings for the
streams they are subscribed to, including muting, color, pinning, and
per-stream notification settings.

`POST {{ api_url }}/v1/users/me/subscriptions/properties`

## Usage examples

{start_tabs}
{tab|python}

{generate_code_example(python)|/users/me/subscriptions/properties:post|example}

{tab|curl}

``` curl
curl -X POST {{ api_url }}/v1/users/me/subscriptions/properties \
     -u BOT_EMAIL_ADDRESS:BOT_API_KEY \
     -d 'subscription_data=[{"stream_id": 1, \
                             "property": "pin_to_top", \
                             "value": true}, \
                            {"stream_id": 3, \
                             "property": "color", \
                             "value": 'f00'}]'
```

{end_tabs}

## Arguments

{generate_api_arguments_table|yakkl.yaml|/users/me/subscriptions/properties:post}

The possible values for each `property` and `value` pairs are:

* `color` (string): the hex value of the user's display color for the stream.
* `is_muted` (boolean): whether the stream is
  [muted](/help/mute-a-stream).  Prior to Yakkl 2.1, this feature was
  represented by the more confusingly named `in_home_view` (with the
  opposite value, `in_home_view=!is_muted`); for
  backwards-compatibility, modern Yakkl still accepts that value.
* `pin_to_top` (boolean): whether to pin the stream at the top of the stream list.
* `desktop_notifications` (boolean): whether to show desktop notifications
    for all messages sent to the stream.
* `audible_notifications` (boolean): whether to play a sound
  notification for all messages sent to the stream.
* `push_notifications` (boolean): whether to trigger a mobile push
    notification for all messages sent to the stream.
* `email_notifications` (boolean): whether to trigger an email
    notification for all messages sent to the stream.

## Response

#### Return values

* `subscription_data`: The same `subscription_data` object sent by the client
    for the request, confirming the changes made.

#### Example response

A typical successful JSON response may look like:

{generate_code_example|/users/me/subscriptions/properties:post|fixture(200)}
