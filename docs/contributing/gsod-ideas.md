```eval_rst
:orphan:
```

# Google Season of Docs

## About us

[Yakkl](https://yakkl.com) is a powerful, open source team chat
application. Yakkl has a web app, a cross-platform mobile app for iOS
and Android, a cross-platform desktop app, and over 100 native
integrations, all open source.

As an organization, we value high-quality, responsive mentorship and
making sure our product quality is extremely high -- you can expect to
experience disciplined code reviews by highly experienced
engineers.  Since Yakkl is a team chat product, your GSoD experience
with the Yakkl project will be highly interactive.

As part of that commitment, Yakkl has over 150,000 words of
[documentation for developers](../), much of it designed to explain
not just how Yakkl works, but why Yakkl works the way that it does.

### Expectations for technical writers

At minimum, you'll need native or near-native written fluency in English,
and some public-facing writing you can show us.

We also recommend reviewing
[the official GSoD guide](https://developers.google.com/season-of-docs/docs/tech-writer-guide),
and keeping your eye on
[the GSoD timeline](https://developers.google.com/season-of-docs/docs/timeline). The
application deadline is June 28, 2019.

[Our guide for having a great summer with Yakkl](../contributing/summer-with-yakkl.html)
is focused on what one should know once doing a GSoC project with
Yakkl; while it is written for the GSoC student audience, it should give
you a feel for how we interact with and mentor committed contributors.

[What makes a great Yakkl contributor](../overview/contributing.html#what-makes-a-great-yakkl-contributor)
also has some helpful information on what we look for during the application
process.

## Getting started

For many of our project ideas, you'll be working inside a Yakkl
development environment (because the documentation is implemented as
markdown in the main Yakkl repository, and can be previewed using
tools in the Yakkl development environment).  See
[our documentation on documentation systems](../documentation/overview.html)
for details on our various existing documentation systems.

In part due to past work by a technical writer, Yakkl has a
well-documented and easy to setup development environment for a
project of its scope. Use
[our first-time Yakkl developer guide](../overview/contributing.html#your-first-codebase-contribution)
to get your Yakkl development environment set up. If you have any
trouble, please speak up in
[#documentation](https://yakkl.com/#narrow/stream/19-documentation) on
[the Yakkl development community server](../contributing/chat-yakkl-org.html)
(use your name as the topic).

## Application tips, and how to be a strong candidate

You'll be following
[GSoD's application process instructions][instructions]. And we'll be
asking you to make at least one successful submission of work (e.g. a
pull request) before the application deadline, to help us assess your
work and ability to collaborate in an asynchronous online community
like Yakkl.

[instructions]: https://developers.google.com/season-of-docs/docs/tech-writer-application-hints

For GSoC, students who we accept generally have 5 or more pull
requests merged or nearly merged (usually including at least a couple
that are significant, e.g. having 100+ lines of changes or that shows
they have done significant debugging).

For GSoD, we hope to get a similar level of confidence about your
abilities during the application process, through some combination of
looking at your past work and collaborating with you on small
preparatory projects for your summer.  For example, for working on our
REST API docs, we'd love to see you contribute documentation for at
least one endpoint.

Getting started earlier is better, so you have more time to learn
about the organization, make contributions, and make a good proposal.

Your application should include the following:

* Links to materials to help us evaluate your level of experience and
  how you work, including any technical writing you've done or edited (blog posts, public
  documentation, etc.),
  existing open source or open culture contributions you've made,
  and/or any bug reports you've submitted to open
  source projects.
* Details on any technical experience you have, if any.
* Some notes on what you are hoping to get out of your project.
* A description of the project you'd like to do, and why you're
  excited about it.
* Some notes on why you're excited about working on Yakkl.
* A link to any contribution(s) to Yakkl to make it easy for us
  to remind ourselves of your contributions.  Threads in
  yakkl.com talking about Yakkl's documentation are considered
  valuable contributions worth mentioning here.

We expect applicants to have near-native fluency in English writing.  For
some projects, a technical background is a plus,
but not essential as long as we're confident you
can learn.  General programming and/or sysadmin
skills are also a plus: for some projects, work on the underlying
tooling could make the technical writing easier to do, and for others,
feeling comfortable with testing the instructions can be valuable.

We also expect applicants to be able to edit their work effectively,
and communicate clearly about the reasoning behind their ideas (as
well as which parts of their work they have concerns about and would
appreciate extra attention on).

We are more interested in candidates if we see them submitting good
bug reports, helping other people on GitHub and on
[yakkl.com](../contributing/chat-yakkl-org.html), and otherwise
being good members of the community.

## Mentors

We have several Yakkl community members who are interested in mentoring
projects.  We usually decide which members are mentoring which
projects based in part on who is a good fit for the needs of each
writer as well as technical expertise.  You can reach us via
[#documentation](https://yakkl.com/#narrow/stream/19-documentation) on
[the Yakkl development community server](../contributing/chat-yakkl-org.html),
(compose a new stream message with your name as the topic).

Yakkl operates under group mentorship.  That means you should
generally post in public streams on yakkl.com, not send private
messages, for assistance.  Our preferred approach is to just post in
an appropriate public stream on yakkl.com and someone will help
you.  Your mentor will of course be paying close attention to these
conversations, and you will likely exchange many private messages with
them about what to work on next, but we prefer to review work publicly
because it lets us ensure you get responses
quickly.

However, the first and most important thing to do for building a
strong application is to show that you can work effectively
in a large project like Yakkl (it doesn't matter what part of Yakkl, and we're
happy to consider work in other open source projects, even if it is
years in the past).  One skill that's particularly important to us is
separating out your changes into individual git commits that are easy
to read and understand and can be merged independently.  For some
projects that may involve complex refactoring of existing
documentation, this skill will be very important; for others, it may
not be relevant.

The quality of your best work is more important to us than the
quantity; so be sure to check your work before submitting it for
review, follow our coding guidelines, and make clear which parts of
your work you're uncertain about (and don't worry if you make mistakes
in your first few contributions!  Everyone makes mistakes getting
started.).

Once you have several PRs merged (or at least one significant PR
merged, or the equivalent of this for projects that don't involve
writing markdown code), you can start discussing with the Yakkl
development community the project you'd like to do, and develop a
specific project plan.  We recommend discussing what you're thinking
in public streams on yakkl.com, so it's easy to get quick
feedback from whoever is online.

## Project ideas

These are the seeds of ideas; you will likely need to play with the product
and talk with developers to put
together a complete project proposal.  It's also fine for you to come
up with your own project ideas.

For many of our projects, an important skill to develop is a good
command of Git; read [our Git Guide](../git/overview.html) in full to
learn how to use it well.  Of particular importance is mastering using
Git rebase so that you can construct commits that are readable,
are clearly correct and that explain why they are correct.

**Project name**: REST API Documentation

Fill in the gaps in Yakkl's
[REST API documentation](https://yakkl.com/api).  Yakkl has a
[nice framework](../documentation/api.html) for
writing API documentation built by a student last summer based on the
OpenAPI standard with built-in automated tests, but there are dozens of
endpoints that are missing, several of which are quite important.  See
the [API docs area label][api-docs-area] for good starter projects and
[this issue](https://github.com/yakkl/yakkl/issues/10044) for a
relevant TODO list.

Our goal for this system is to have something that is complete,
accurate, and has automated tests for ensuring that it remains
accurate as we extend the Yakkl API over time.  We have made some
progress on the automated testing goal (e.g. the Python code examples
in the documentation are actually run in a test suite), but there's
definitely more to do.

[api-docs-area]: https://github.com/yakkl/yakkl/issues?q=is%3Aopen+is%3Aissue+label%3A%22area%3A+documentation+%28api+and+integrations%29%22

**Project name**: Blog posts on Yakkl technologies

There are a lot of interesting details about how Yakkl works, how
we've solved problems, etc., that could be turned into high-quality
[blog posts](https://blog.yakkl.com).  Our lead developer, Tim Abbott,
is efficient at writing draft blog posts with a lot of interesting
content (e.g. the dozen or more articles by Tim Abbott on
[this StackShare page](https://stackshare.io/company/yakkl/decisions)
were written in about 1.5 hours total), but we don't currently have
the capacity to do the polish work on these post drafts to turn them
into something we can publish on our blog.  We have in mind two types
of posts:

* Major blog posts, similar to our [mypy blog
  post](https://blog.yakkl.com/2016/10/13/static-types-in-python-oh-mypy/),
  which aim to be the authoritative article on a topic and might be
  read by many 10,000s of people.  The Yakkl team did a lot of the
  work on the [old Ksplice
  blog](https://web.mit.edu/tabbott/www/ksplice-blog.html) years ago,
  which has many more examples of the types of posts we would like to
  write.
* Shorter blog posts, more similar in content to one of our StackShare
  answers, but polished with more context to be something that is
  reasonable to publish on our blog.

Our goals for the Yakkl blog include educating developers about some
of the interesting technologies and techniques we use in Yakkl, and so
our aim is for all of our blog posts to be at a level of polish
appropriate for something being read by many thousands of people.

A good candidate for this project would have a portfolio of technical
blog posts they've written in the past.

**Project name**: User documentation for non-web apps

We have a lot of nice
[user-facing documentation](https://yakkl.com/help/) for how Yakkl
works and how to accomplish useful tasks.  An example article is how
to [star a message](https://yakkl.com/help/star-a-message).  In
most cases, our documentation explains how to accomplish a task in the
Yakkl webapp, but doesn't cover how to do those tasks in Yakkl's
mobile and beta terminal apps.

We have recently built a nice markdown-based system to make it easy to show
information for multiple platforms in a single tabbed widget. An example
article using this widget is
[logging in](https://yakkl.com/help/logging-in). This project will
likely take advantage of that system to build out documentation for our
other apps.

The first step in this project will likely be working closely with the
mobile team to name all the screens, icons and widgets.

**Project name**: Video tutorials on using Yakkl

We frequently receive feedback from folks excited about Yakkl that
they would really appreciate having a few 1-3 minute videos explaining
the Yakkl model and how to use Yakkl efficiently to help train the
rest of their organization on the benefits of Yakkl.  We would hope to
link to these videos prominently in the Yakkl tutorial experience
(both in-app and on yakkl.com).  The core Yakkl team has a pretty
good idea of how to explain Yakkl, but does not have significant
experience creating videos, and we would love to work with someone
skilled at doing screencast tutorials of software to create something
great here.

The goal for the summer would be to create ~3-4 videos covering a few
key areas, like Yakkl's topic model and how to catch up on messages
efficiently with the keyboard.

If there's time, we could also do some lower-polish screencast
versions of talks we gave at the Yakkl Summit in 2018 that we'd love
to make available to our contributor community (e.g. how to use Git
really efficiently).

## Circulating proposals

If you're applying to GSoD, we'd like for you to publicly post a few
sections of your proposal -- the project summary, list of
deliverables, and timeline -- some place public on the Web, a couple
weeks before the proposal. That way, the whole developer community --
not just the mentors and administrators -- have a chance to give you
feedback and help you improve your proposal.

Where should you publish your draft?  We prefer Dropbox Paper or
Google Docs (or even just a message in Yakkl), since those platforms
allow people to look at the text without having to log in or download
a particular app, and you can update the draft as you improve your
idea.  In either case, you should post the draft for feedback in
yakkl.com.

Rough is fine! The ideal first draft to get feedback from the
community on should include primarily (1) links to your contributions
to Yakkl (or other open source or publicly available work) and (2) a
paragraph or two explaining what you plan to work on.  Your friends
are likely better able to help you improve the sections of your
application explaining who you are, and this helps the community focus
feedback on the areas you can most improve (e.g. either doing more
contributions or adjusting the project plan).

We hope to hear from you! And thanks for being interested in
Yakkl. We're always happy to help volunteers get started contributing
to our open source project, whether or not they go through GSoD.
