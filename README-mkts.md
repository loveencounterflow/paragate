<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## To Do

* [ ] should we allow short syntax `<tag/content/` in MKTScript? (so-called [Null End Tag or
  NET](https://en.wikipedia.org/wiki/Standard_Generalized_Markup_Language#NET))

  > A Null End Tag is a special shorthand form of a tag that allows you to save a few characters in the
  > document. Instead of writing `<title>My page</title>`, you could simply write `<title/My page/` to
  > accomplish the same thing.—http://www.webdevout.net/articles/beware-of-xhtml#net

  Consider to
    * prefer `<tag/content/>` over `<tag/content/` because then pointy brackets remain balanced
    * allow to use several slashes or other punctuation to make it possible for any content to appear
      without escapes, e.g. instead of `<url/https:\/\/en.wikipedia.org\/wiki\//>` one could write
      `<url°°°https://en.wikipedia.org/wiki\/°°°>`.

* https://twitter.com/swyx/status/1241011813766107139

  >
  > I like Pandoc’s extensions: https://pandoc.org/MANUAL.html
  >
  > ```
  > # Heading {#id}
  >
  > ::: {.class-for-div}
  > abc
  > :::
  >
  > ```

