{!create-stream.md!}

{!create-a-bot.md!}

### Install the plugin

Install the "Yakkl" plugin by going to
**Manage Jenkins > Manage Plugins > Available**,
typing in **Yakkl**, and clicking **Install without
restart**.

![](/static/images/integrations/jenkins/001.png)

### Configure the plugin

Once the plugin is installed, configure it by going to
**Manage Jenkins > Configure System**. Scroll to the section
labeled **Yakkl Notification Settings**, and specify your
Yakkl server address, bot's email address and API key.
Optionally, you may configure a default stream or topic. You can also enable
smart notifications (i.e. only receive notifications when a build fails or
recovers from a failed state).

(If you don't see this option, you may first need to restart
Jenkins.)

![](/static/images/integrations/jenkins/002.png)

### Configure a post-build action for your project

Once you've done that, it's time to configure one of your
freestyle projects to use the Yakkl notification plugin. On your
Jenkins project page, click **Configure** on the left sidebar. Scroll to
the bottom until you find the section labeled **Post-build
Actions**. Click the dropdown and select **Yakkl Notification**.
It should look as shown below. If you'd rather not use the defaults from
the global configuration, you can set a custom stream and topic.
If you don't specify a custom topic, the project name will be used as the
topic instead.
Then click **Save**.

![](/static/images/integrations/jenkins/003.png)

When your builds fail or succeed, you'll see a message as shown below.

{!congrats.md!}

![](/static/images/integrations/jenkins/004.png)

### Advanced use cases

Besides the **Yakkl Notification** post-build action, this plugin
also supports the **Yakkl Send** action.
To learn more, see the [plugin's README](https://github.com/jenkinsci/yakkl-plugin).

### Troubleshooting

1. Did you set up a post-build action for your project?

1. Does the stream you picked (e.g. `jenkins`) already exist?
   If not, create the stream and make sure you're subscribed to it.

1. Are your API key and email address correct? Test them
   using [our curl API](/api).

1. Configure a Jenkins log recorder for **jenkins.plugins.yakkl**
   and check why your messages fail to send.