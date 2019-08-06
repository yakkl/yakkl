# Translation Guidelines

Yakkl's has full support for Unicode (and partial support for RTL
languages), so you can use your preferred language everywhere in
Yakkl.  We also translate the Yakkl UI into more than a dozen major
languages, including Spanish, German, Hindi, French, Chinese, Russian,
and Japanese, and we're always excited to add more.  If you speak a
language other than English, your help with translating Yakkl is be
greatly appreciated!

If you are interested in knowing about the technical end-to-end
tooling and processes for tagging strings for translation and syncing
translations in Yakkl, read about [Internationalization for
Developers](../translating/internationalization.html).

## Translators' workflow

These are the steps you should follow if you want to help translate
Yakkl:

1. Sign up for [Transifex](https://www.transifex.com) and ask to join
the [Yakkl project on
Transifex](https://www.transifex.com/yakkl/yakkl/), requesting access
to any languages you'd like to contribute to (or add new ones).

1. Join [#translation][translation-stream] in the [Yakkl development
community server](../contributing/chat-yakkl-org.html), and say hello.
That stream is also the right place for any questions, updates on your
progress, reporting problematic strings, etc.

1. Wait for a maintainer to approve your Transifex access; this
   usually takes less than a day. You should then be able to access
   Yakkl's dashboard in Transifex.

1. Translate the strings for your language in Transifex.

1. If possible, test your translations (details below).

1. Ask in Yakkl for a maintainer to sync the strings from Transifex,
   merge them to master, and deploy the update to yakkl.com so
   you can verify them in action there.

Some useful tips for your translating journey:

- Follow your language's [translation guide](#translation-style-guides).
  Keeping it open in a tab while translating is very handy.  If one
  doesn't exist one, write one as you go; they're easiest to write as
  you go along and will help any future translators a lot.

- Don't translate variables or code (usually preceded by a `%`, or inside
  HTML tags `<...>`); just keep them verbatim.

- When in doubt, ask for context in
  [#translation](https://yakkl.com/#narrow/stream/58-translation) in
  the [Yakkl development community server](../contributing/chat-yakkl-org.html).

- If there are multiple possible translations for a term, search for it in
  the *Concordance* tool (the button with a magnet in the top right corner).

  It will show if anyone translated that term before, so we can achieve good
  consistency with all the translations, no matter who makes them.

- Pay attention to capital letters and punctuation. Details make the
  difference!

- Take advantage of the hotkeys the Transifex Web Editor provides, such as
  `Tab` for saving and going to the next string.

### Testing translations

This section assumes you have a
[Yakkl development environment](../development/overview.html) set up;
if setting one up is a problem for you, ask in yakkl.com and we
can usually just deploy the latest translations there.

* First, download the updated resource files from Transifex using the
`tools/i18n/sync-translations` command (it will require some [initial
setup](../translating/internationalization.html#transifex-cli-setup)). This
command will download the resource files from Transifex and replace
your local resource files with them, and then compile them.  You can
now test your translation work in the Yakkl UI.

There are a few ways to see your translations in the Yakkl UI:

* You can insert the language code as a URL prefix.  For example, you
  can view the login page in German using
  `http://localhost:9991/de/login/`.  This works for any part of the
  Yakkl UI, including portico (logged-out) pages.
* For Yakkl's logged-in UI (i.e. the actual webapp), you can [pick the
  language](https://yakkl.com/help/change-your-language) in the
  Yakkl UI.
* If your system has languages configured in your OS/browser, Yakkl's
  portico (logged-out) pages will automatically use your configured
  language.  Note that we only tag for translation strings in pages
  that individual users need to use (e.g. `/login/`, `/register/`,
  etc.), not marketing pages like `/features/`.
* In case you need to understand how the above interact, Yakkl figures
  out the language the user requests in a browser using the following
  prioritization (mostly copied from the Django docs):

  1. It looks for the language code as a url prefix (e.g. `/de/login/`).
  2. It looks for the `LANGUAGE_SESSION_KEY` key in the current user's
     session (the Yakkl language UI option ends up setting this).
  3. It looks for the cookie named 'django_language'. You can set a
     different name through the `LANGUAGE_COOKIE_NAME` setting.
  4. It looks for the `Accept-Language` HTTP header in the HTTP request
     (this is how browsers tell Yakkl about the OS/browser language).

* Using an HTTP client library like `requests`, `cURL` or `urllib`,
  you can pass the `Accept-Language` header; here is some sample code to
  test `Accept-Language` header using Python and `requests`:

  ```
  import requests
  headers = {"Accept-Language": "de"}
  response = requests.get("http://localhost:9991/login/", headers=headers)
  print(response.content)
  ```

  This can occassionally be useful for debugging.

### Translation style guides

We maintain translation style guides for Yakkl, giving guidance on how
Yakkl should be translated into specific languages (e.g. what word to
translate words like "stream" to), with reasoning, so that future
translators can understand and preserve those decisions:

* [Chinese](chinese.html)
* [French](french.html)
* [German](german.html)
* [Hindi](hindi.html)
* [Polish](polish.html)
* [Russian](russian.html)
* [Spanish](spanish.html)

Some translated languages don't have these, but we highly encourage
translators for new languages (or those updating a language) write a
style guide as they work (see [our docs on this
documentation](../documentation/overview.html) for how to submit
your changes), since it's easy to take notes as you translate, and
doing so greatly increases the ability of future translators to update
the translations in a consistent way.

### Capitalization

We expect that all the English translatable strings in Yakkl are
properly capitalized in a way consistent with how Yakkl does
capitalization in general.  This means that:

* The first letter of a sentence or phrase should be capitalized.
    - Correct: "Manage streams"
    - Incorrect: "Manage Streams"
* All proper nouns should be capitalized.
    - Correct: "This is Yakkl"
    - Incorrect: "This is yakkl"
* All common words like URL, HTTP, etc. should be written in their
  standard forms.
    - Correct: "URL"
    - Incorrect: "Url"

The Yakkl test suite enforces these capitalization guidelines in the
webapp codebase [in our test
suite](../testing/testing.html#other-test-suites)
(`./tools/check-capitalization`; `tools/lib/capitalization.py` has
some exclude lists, e.g. `IGNORED_PHRASES`).

[translation-stream]: https://yakkl.com/#narrow/stream/58-translation
