(function() {
  'use strict';
  var CHVTN, CND, DATOM, Grammar, MAIN, Multimix, alert, assign, badge, datom_from_token, debug, echo, freeze, help, info, is_given, isa, jr, lets, log, new_grammar, new_ref, new_token, rpr, set_class_name, type_of, types, urge, validate, vnr_from_parser_error, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'PARAGATE/GRAMMARS/GRAMMAR';

  log = CND.get_logger('plain', badge);

  info = CND.get_logger('info', badge);

  whisper = CND.get_logger('whisper', badge);

  alert = CND.get_logger('alert', badge);

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  help = CND.get_logger('help', badge);

  urge = CND.get_logger('urge', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  ({assign, jr} = CND);

  CHVTN = require('chevrotain');

  DATOM = new (require('datom')).Datom({
    dirty: false
  });

  ({lets, freeze} = DATOM.export());

  types = require('./types');

  ({isa, validate, type_of} = types);

  Multimix = require('multimix');

  MAIN = this;

  is_given = function(x) {
    return ![null, void 0, 0/0, ''].includes(x);
  };

  //-----------------------------------------------------------------------------------------------------------
  /* thx to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name */
  set_class_name = function(clasz, name) {
    return Object.defineProperty(clasz, 'name', {
      value: name,
      writable: false
    });
  };

  //-----------------------------------------------------------------------------------------------------------
  new_ref = function(d, $) {
    var ref;
    if ((ref = d.$) != null) {
      while (ref.startsWith('^')) {
        ref = ref.slice(1);
      }
      $ += ref;
    }
    return $;
  };

  //===========================================================================================================
  // PARSING & LINEARIZATION
  //-----------------------------------------------------------------------------------------------------------
  this.on_before_tokenize = function(source) {
    return source;
  };

  this.on_before_parse = function(raw_tokens) {
    return raw_tokens;
  };

  this.on_after_parse = function(ds) {
    return ds;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.parse = function(source) {
    var R, _, cst, datoms, errors, group, i, j, len, len1, lexer_errors, parser_errors, ref1, ref2, ref3, ref4, ref5, token, tokenization, tree;
    this.source = source;
    //.........................................................................................................
    /* TAINT re-introduce possibility to choose lexer mode */
    source = (ref1 = this.on_before_tokenize(source)) != null ? ref1 : source;
    tokenization = this.lexer.tokenize(source); // @settings.lexer_mode
    lexer_errors = this._adapt_lexer_errors(source, tokenization);
    ref2 = tokenization.groups;
    for (_ in ref2) {
      group = ref2[_];
      for (i = 0, len = group.length; i < len; i++) {
        token = group[i];
        token.$vnr = [token.startLine, token.startColumn];
        token.$ = new_ref(token, '^Γ1^');
      }
    }
    ref3 = tokenization.tokens;
    for (j = 0, len1 = ref3.length; j < len1; j++) {
      token = ref3[j];
      token.$vnr = [token.startLine, token.startColumn];
      token.$ = new_ref(token, '^Γ2^');
    }
    //.........................................................................................................
    this.parser.input = (ref4 = this.on_before_parse(tokenization.tokens, tokenization.groups)) != null ? ref4 : tokenization.tokens;
    cst = this.parser[this.settings.parser_start]();
    tree = this._adapt_tree(source, cst);
    errors = {
      lexer: tokenization.errors,
      parser: this.parser.errors
    };
    parser_errors = this._adapt_parser_errors(source, errors.parser);
    errors = lexer_errors.concat(parser_errors);
    tree = lets(tree, function(tree) {
      return tree.errors = errors;
    });
    datoms = this.linearize(source, tree);
    R = [...datoms, ...errors];
    R = (ref5 = this.on_after_parse(R)) != null ? ref5 : R;
    return freeze(this._sort_nodes(R));
  };

  //-----------------------------------------------------------------------------------------------------------
  this._sort_nodes = function(nodes) {
    /* R.sort ( a, b ) -> according to DATOM/VNR fair sorting */
    return nodes.sort(function(a, b) {
      var ref1, ref2, ref3, ref4, ref5, ref6;
      a = (ref1 = a.$vnr) != null ? ref1 : [(ref2 = a.start) != null ? ref2 : -2e308, (ref3 = a.stop) != null ? ref3 : -2e308];
      b = (ref4 = b.$vnr) != null ? ref4 : [(ref5 = b.start) != null ? ref5 : -2e308, (ref6 = b.stop) != null ? ref6 : -2e308];
      return DATOM.VNR.cmp_fair(a, b);
    });
  };

  //-----------------------------------------------------------------------------------------------------------
  this.linearize = function*(source, tree, level = 0) {
    /* In most cases to be overridden by client grammar. */
    var $key, $vnr, i, kid, len, name, ref1, ref2, ref3, start, stop, text;
    ({$key, name, start, stop, text} = tree);
    //.........................................................................................................
    switch ($key) {
      //.......................................................................................................
      case '^token':
        yield tree;
        break;
      //.......................................................................................................
      case '^document':
        yield ({
          $key: '<document',
          name,
          start,
          stop,
          text,
          $vnr: [-2e308],
          $: new_ref(tree, '^Γ4^')
        });
        ref1 = tree.kids;
        for (i = 0, len = ref1.length; i < len; i++) {
          kid = ref1[i];
          yield* this.linearize(source, kid, level + 1);
        }
        yield ({
          $key: '>document',
          name,
          start: stop,
          stop,
          $vnr: [+2e308],
          $: new_ref(tree, '^Γ6^')
        });
        break;
      //.......................................................................................................
      case '^node':
        $vnr = (ref2 = (ref3 = tree.kids[0]) != null ? ref3.$vnr : void 0) != null ? ref2 : null;
        if ($vnr != null) {
          yield ({
            $key: '^node',
            name,
            start,
            stop,
            text,
            $vnr,
            $: new_ref(tree, '^Γ9^')
          });
        } else {
          yield ({
            $key: '^node',
            name,
            start,
            stop,
            text,
            $: new_ref(tree, '^Γ10^')
          });
        }
        break;
      default:
        if ($key !== '^node') {
          //.......................................................................................................
          throw new Error(`^445^ unknown $key ${rpr($key)}`);
        }
    }
    //.........................................................................................................
    return null;
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this._adapt_tree = function(source, cst) {
    var $key, R, name, text;
    if (cst == null) {
      $key = '^node';
      name = 'document';
      text = source;
      /* TAINT add VNR */
      return freeze({
        $key,
        name,
        kids: [],
        start: 0,
        stop: source.length,
        text,
        $: '^Γ13^'
      });
    }
    R = this._adapt_tree_inner(source, cst);
    if (R.$key === '^node' && R.name === 'document') {
      R.$key = '^document';
      delete R.name;
    }
    return freeze(R);
  };

  //-----------------------------------------------------------------------------------------------------------
  this._adapt_tree_inner = function(source, tree) {
    var R, i, key, kid, len, ref1, ref2, ref3, ref4, ref5, ref6, token, tokens;
    R = datom_from_token(tree);
    if (tree.children == null) {
      return R;
    }
    //.........................................................................................................
    R.kids = [];
    R.kidkeys = new Set();
    R.ukids = {}; // **u**nique **kids**
    ref1 = tree.children;
    for (key in ref1) {
      tokens = ref1[key];
      R.kidkeys.add(key);
      for (i = 0, len = tokens.length; i < len; i++) {
        token = tokens[i];
        R.kids.push(kid = this._adapt_tree_inner(source, token));
      }
      if (tokens.length === 1) {
        R.ukids[key] = kid;
      }
    }
    R.kids.sort(function(a, b) {
      return a.start - b.start;
    });
    R.start = (ref2 = (ref3 = R.kids[0]) != null ? ref3.start : void 0) != null ? ref2 : -1;
    R.stop = (ref4 = (ref5 = R.kids[((ref6 = R.kids) != null ? ref6.length : void 0) - 1]) != null ? ref5.stop : void 0) != null ? ref4 : -1;
    R.text = source.slice(R.start, R.stop);
    R.kidkeys = [...R.kidkeys];
    return R;
  };

  //===========================================================================================================
  // ERROR TREATMENT
  //-----------------------------------------------------------------------------------------------------------
  this._adapt_lexer_errors = function(source, tokenization) {
    var $key, $vnr, R, code, column, error, i, len, length, line, message, offset, origin, ref1, start, stop, text;
    R = [];
    origin = 'lexer';
    $key = '^error';
    ref1 = tokenization.errors;
    for (i = 0, len = ref1.length; i < len; i++) {
      error = ref1[i];
      ({offset, length, message, line, column} = error);
      start = offset;
      stop = offset + length;
      text = source.slice(start, stop);
      $vnr = (is_given(line)) && (is_given(column)) ? [line, column] : null;
      if (message.startsWith('extraneous')) {
        code = 'extraneous';
      } else {
        code = 'other';
      }
      if ($vnr != null) {
        R.push({
          $key,
          code,
          origin,
          message,
          text,
          start,
          stop,
          $vnr,
          $: '^Γ14^'
        });
      } else {
        R.push({
          $key,
          code,
          origin,
          message,
          text,
          start,
          stop,
          $: '^Γ15^'
        });
      }
    }
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  vnr_from_parser_error = function(error) {
    var R, colnr, i, key, len, linenr, ref1, token;
    R = null;
    ref1 = ['token', 'previousToken'];
    for (i = 0, len = ref1.length; i < len; i++) {
      key = ref1[i];
      token = error[key];
      if ((R = token != null ? token.$vnr : void 0) != null) {
        break;
      }
      if ((is_given(linenr = token.startLine)) && (is_given(colnr = token.startColumn))) {
        R = [linenr, colnr];
        break;
      }
    }
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._adapt_parser_errors = function(source, errors) {
    /* TAINT code duplication */
    /* TAINT code duplication */
    var $key, $vnr, R, chvtname, code, error, i, len, message, origin, ref1, ref2, start, stop, text;
    R = [];
    origin = 'parser';
    $key = '^error';
    for (i = 0, len = errors.length; i < len; i++) {
      error = errors[i];
      ({
        /* TAINT use `error.resyncedTokens`??? */
        name: chvtname,
        message
      } = error);
      $vnr = vnr_from_parser_error(error);
      text = error.token.image;
      start = error.token.startOffset;
      stop = start + ((ref1 = text != null ? text.length : void 0) != null ? ref1 : start);
      //.......................................................................................................
      switch (chvtname) {
        case 'NotAllInputParsedException':
          code = 'extraneous';
          break;
        case 'MismatchedTokenException':
          code = 'mismatch';
          break;
        case 'NoViableAltException':
          code = 'missing';
          break;
        default:
          code = 'other';
      }
      if (isa.not_given(text)) {
        text = error.previousToken.image;
      }
      if (isa.not_given(start)) {
        start = error.previousToken.startOffset;
      }
      if (isa.not_given(start)) {
        start = 0;
      }
      if (isa.not_given(stop)) {
        stop = start + ((ref2 = text != null ? text.length : void 0) != null ? ref2 : 0);
      }
      if (isa.not_given(text)) {
        text = source.slice(start, stop);
      }
      if ($vnr != null) {
        R.push({
          $key,
          code,
          chvtname,
          origin,
          message,
          text,
          start,
          stop,
          $vnr,
          $: '^Γ16^'
        });
      } else {
        R.push({
          $key,
          code,
          chvtname,
          origin,
          message,
          text,
          start,
          stop,
          $: '^Γ17^'
        });
      }
    }
    return R;
  };

  // #-----------------------------------------------------------------------------------------------------------
  // @_all_children_of_token = ( token ) ->
  //   ### TAINT make generally accessible to grammar? ###
  //   ### TAINT tokens in groups might be missing??? ###
  //   return [] unless ( c = token.children )?
  //   return ( ts for _, ts of c ).flat Infinity

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this._walk_tokendefs = function*() {
    var _, ref1, tokendefs;
    if ((type_of(this.lexer.lexerDefinition)) === 'list') {
      yield* this.lexer.lexerDefinition;
      return null;
    }
    ref1 = this.lexer.lexerDefinition.modes;
    for (_ in ref1) {
      tokendefs = ref1[_];
      yield* tokendefs;
    }
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._token_map_from_lexer = function() {
    /* Helper function so we can accept a `Lexer` instance to instantiate a parser. */
    var R, ref1, tokendef;
    R = {};
    ref1 = this._walk_tokendefs();
    for (tokendef of ref1) {
      R[tokendef.name] = tokendef;
    }
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  datom_from_token = function(token) {
    var $, $key, $vnr, column, line, name, ref1, ref2, ref3, start, stop, text;
    text = token.image;
    start = token.startOffset;
    stop = start + ((ref1 = text != null ? text.length : void 0) != null ? ref1 : 0);
    $vnr = null;
    $ = '^Γ18^';
    if (token.$vnr != null) {
      $ = '^Γ19^';
      $vnr = token.$vnr;
    } else if ((is_given(line = token.startLine)) && (is_given(column = token.startColumn))) {
      $ = '^Γ20^';
      $vnr = [line, column];
    }
    $ = new_ref(token, $);
    if ((name = (ref2 = token.tokenType) != null ? ref2.name : void 0) != null) {
      $key = '^token';
    } else {
      $key = '^node';
      name = (ref3 = token.name) != null ? ref3 : '???';
    }
    if ($vnr != null) {
      return {$key, name, text, start, stop, $vnr, $};
    }
    return {$key, name, text, start, stop, $};
  };

  //===========================================================================================================
  // LEXER, PARSER, GRAMMAR
  //-----------------------------------------------------------------------------------------------------------
  this._get_lexer_definition = function() {
    var R, description, mode, mode_name, modes, ref1, target, token_name;
    modes = {};
    R = {
      defaultMode: null,
      modes
    };
    ref1 = this.lexer_modes;
    //.........................................................................................................
    for (mode_name in ref1) {
      mode = ref1[mode_name];
      if (R.defaultMode == null) {
        R.defaultMode = mode_name;
      }
      modes[mode_name] = target = [];
/* TAINT validate */
//.......................................................................................................
      for (token_name in mode) {
        description = mode[token_name];
        if (description.match === null) {
          description.match = (function() {
            return null;
          });
        }
        validate.paragate_parsers_lexer_token_description(description);
        target.push(new_token(token_name, description));
      }
    }
    //.........................................................................................................
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  new_token = function(name, description) {
    /* TAINT should set `line_breaks` automatically where required by Chevrotain */
    var settings, switch_mode;
    settings = {};
    settings.name = name;
    settings.pattern = description.match;
    if (description.switch_mode != null) {
      settings.switch_mode = description.switch_mode;
    }
    if (description.pop_mode != null) {
      settings.pop_mode = description.pop_mode;
    }
    if (description.push_mode != null) {
      settings.push_mode = description.push_mode;
    }
    if (description.group != null) {
      settings.group = description.group;
    }
    if (description.skip != null) {
      settings.skip = description.skip;
    }
    if (description.line_breaks != null) {
      settings.line_breaks = description.line_breaks;
    }
    /* TAINT validate */
    if ((switch_mode = settings.switch_mode) != null) {
      delete settings.switch_mode;
      settings.pop_mode = true;
      settings.push_mode = switch_mode;
    }
    if (settings.skip) {
      delete settings.skip;
      if (settings.group != null) {
        throw new Error(`^3382^ can only set one of \`skip\`, \`group\`; got ${rpr(settings.skip)}, ${rpr(settings.group)}`);
      }
      settings.group = CHVTN.Lexer.SKIPPED;
    }
    return CHVTN.createToken(settings);
  };

  //-----------------------------------------------------------------------------------------------------------
  this._new_lexer = function(name) {
    var R, lexer_definition, settings;
    //.........................................................................................................
    if (this.description == null) {
      if ((R = this.settings.lexer) != null) {
        return R;
      }
      throw new Error("^730274^ must give either `lexer_modes` in description or provide `lexer` setting");
    }
    //.........................................................................................................
    settings = {
      positionTracking: 'full',
      ensureOptimizations: false,
      lineTerminatorCharacters: ['\n'],
      lineTerminatorsPattern: /\n/g,
      errorMessageProvider: {
        buildUnexpectedCharactersMessage: function(source, start, length, line, column) {
          /* see https://sap.github.io/chevrotain/docs/features/custom_errors.html */
          var text;
          text = source.slice(start, start + length);
          return `extraneous characters on line ${line != null ? line : '?'} column ${column != null ? column : '?'}: ${jr(text)}`;
        }
      }
    };
    //.........................................................................................................
    R = class R extends CHVTN.Lexer {};
    //.........................................................................................................
    set_class_name(R, `${name}_lexer`);
    lexer_definition = this._get_lexer_definition();
    return new R(lexer_definition, settings);
  };

  //-----------------------------------------------------------------------------------------------------------
  this._generate_summarizer = function() {
    var alternatives, ref1, tokendef;
    alternatives = [];
    ref1 = this._walk_tokendefs();
    for (tokendef of ref1) {
      (function(tokendef) {
        return alternatives.push({
          ALT: function() {
            return this.CONSUME(tokendef);
          }
        });
      })(tokendef);
    }
    this.summarize = function(t) {
      return this.RULE('document', function() {
        return this.MANY(function() {
          return this.OR(alternatives);
        });
      });
    };
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._new_parser = function(name) {
    var R, grammar;
    if (this.summarize == null) {
      this._generate_summarizer();
    }
    grammar = this;
    //.........................................................................................................
    R = class R extends CHVTN.CstParser {
      //.......................................................................................................
      constructor(lexer) {
        /* TAINT validate lexer */
        var tokensMap;
        tokensMap = grammar._token_map_from_lexer();
        super(tokensMap, {
          nodeLocationTracking: 'full',
          recoveryEnabled: true
        });
        this.setup(this.tokensMap);
        return this;
      }

      //.......................................................................................................
      setup(t) {
        grammar.summarize.call(this, t, grammar);
        return this.performSelfAnalysis();
      }

      //.......................................................................................................
      RULE(rule_name, ...P) {
        var base;
        if ((base = grammar.settings).parser_start == null) {
          base.parser_start = rule_name;
        }
        return super.RULE(rule_name, ...P);
      }

    };
    //.........................................................................................................
    set_class_name(R, `${name}_parser`);
    return new R(grammar.lexer);
  };

  Grammar = (function() {
    //-----------------------------------------------------------------------------------------------------------
    class Grammar extends Multimix {
      //---------------------------------------------------------------------------------------------------------
      constructor(name, description, settings = null) {
        var defaults, k, v;
        super();
        validate.nonempty_text(name);
        // validate.paragate_grammar_description  description
        // validate.paragate_grammar_settings     settings
        defaults = {
          parser_start: null
        };
        this.name = name;
        this.description = description;
        this.settings = {...defaults, ...settings};
        this.source = null;
        //.......................................................................................................
        /* TAINT use Multimix method? property descriptors? */
        if (description != null) {
          for (k in description) {
            v = description[k];
            this[k] = v;
          }
        }
        //.......................................................................................................
        this.lexer = this._new_lexer(name);
        this.parser = this._new_parser(name);
        return this;
      }

    };

    Grammar.include(MAIN, {
      overwrite: false
    });

    return Grammar;

  }).call(this);

  //-----------------------------------------------------------------------------------------------------------
  new_grammar = function(name, description, settings = null) {
    var R;
    /* Same as `new Grammar name, description, settings` except that the returned instance's class name
     will be `${name}_grammar`; commonly used by grammars as shortcut to instantiate grammar without having
     to declare a derived class. */
    R = class R extends Grammar {};
    set_class_name(R, `${name}_grammar`);
    return new R(name, description, settings);
  };

  //###########################################################################################################
  module.exports = {Grammar, new_grammar};

}).call(this);
