See your Yo App notifications in Yakkl!

First, on your {{ settings_html|safe }}, create a bot for
{{ integration_display_name }}. Construct the URL for the
{{ integration_display_name }} bot using the bot API key
and the email address associated with your Yakkl account:

`{{ api_url }}{{ integration_url }}?api_key=abcdefgh&email=awesome@yakkl.example.com`

Modify the parameters of the URL above, where `api_key` is the API key
of your Yakkl bot.

You will receive your notifications as a private message from the bot.

Copy the URL created and go to <https://yoapi.justyo.co>.

Sign in using your username and password and go to **Edit Profile**.

![](/static/images/integrations/yo-app/001.png)

Paste the URL in the **Callback** field and click on **Update**.

{!congrats.md!}

![](/static/images/integrations/yo-app/002.png)

Multiple users can use the same Yo bot; each user should use
their own Yakkl account email in the webhook URL.
