Mirror an IRC channel in Yakkl!

### Install the bridge software

1. Clone the Yakkl API repository, and install its dependencies.

    ```
    git clone https://github.com/yakkl/python-yakkl-api.git
    cd python-yakkl-api
    python3 ./tools/provision
    ```

    This will create a new Python virtualenv. You'll run the bridge service
    inside this virtualenv.

1. Activate the virtualenv by running the `source` command printed
   at the end of the output of the previous step.

1. Install the bridge software in your virtualenv, by running:
    ```
    pip install -r yakkl/integrations/bridge_with_irc/requirements.txt
    ```

### Configure the bridge

1. In Yakkl, [create a bot](/help/add-a-bot-or-integration), using **Generic bot**
   for the bot type. Download the bot's `yakklrc` configuration file to your
   computer.

1. [Subscribe the bot](/help/add-or-remove-users-from-a-stream) to the Yakkl
   stream that will contain the mirror.

1. Inside the virtualenv you created above, run
   ```
   python irc-mirror.py --irc-server=IRC_SERVER --channel=<CHANNEL> --nick-prefix=<NICK> \
   --stream=<STREAM> [--topic=<TOPIC>] \
   --site=<yakkl.site> --user=<bot-email> \
   --api-key=<api-key>
   ```

    `--topic` is a Yakkl topic, is optionally specified, defaults to "IRC".

Example command:
```
./irc-mirror.py --irc-server=irc.freenode.net --channel='#python-mypy' --nick-prefix=irc_mirror \
--stream='test here' --topic='#mypy' \
--site="https://yakkl.com" --user=bot@email.com \
--api-key=DeaDbEEf
```

**Congratulations! You're done!**

Your Yakkl messages may look like:

![](/static/images/integrations/irc/001.png)

Your IRC messages may look like:

![](/static/images/integrations/irc/002.png)
