

## Creating a Parser from an InterText Chevrotain Grammar


* greatly simplified API as compared to Chevrotain API
* greatly simplified data structures as compared to Chevrotain objects
* need three pieces to define a parser:
	1)	a `lexer_modes` object with named 'modes' that contain, in essence, token patterns;
	2)	a `summarize()` method with rules to turn token patterns into nodes;
	3) 	a `linearize()` method to turn a tree of tokens and nodes into a sequence of datoms.

two types of intermediate objects:
* `^token`s, which result from lexing the source according to the patterns registered in `lexer_modes`, and
* `^node`s, which result from applying the rules (i.e. patterns over sequences of `^token`s) as laid down in
  the `summarize` method.


## Features

* can use factory method `new_grammar name, description, settings` to instantiate grammar
* can use `class Mygrammar extends Grammar` to declare grammar class, use `new Mygrammar name, description,
  settings` to instantiate grammar
* can use `new_grammar name, description, { lexer, }` or `new Mygrammar name, description, { lexer, }` to
	use custom lexer instance
* can use hooks:

	* `on_before_tokenize: ( source ) ->`,
	* `on_before_parse: ( raw_tokens ) ->`,
	* `on_after_parse: ( datoms ) ->`

	Hook methods that return `null` or `undefined` will implicitly leave the passed arguments as-is (except
	where objects get modified; this will possibly be fixed in a future version by freezing all arguments)

## See Also

* [YCombinator Hacker News Discussion](https://news.ycombinator.com/item?id=11238769)