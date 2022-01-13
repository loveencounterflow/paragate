(function() {
  'use strict';
  var $parse, CND, GRAMMAR, Htmlish_grammar, MAIN, PGTH, alert, assign, badge, dd, debug, echo, freeze, grammar, help, info, isa, jr, lets, log, merge_texts, new_datom, new_grammar, parse, rpr, type_of, types, urge, validate, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  badge = 'PARAGATE/GRAMMARS/HTMLISH';

  rpr = CND.rpr;

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

  // CHVTN                     = require 'chevrotain'
  ({new_datom, lets, freeze} = (new (require('datom')).Datom({
    dirty: false
  })).export());

  types = require('./types');

  ({isa, type_of, validate} = types);

  GRAMMAR = require('./grammar');

  ({
    HTMLISH: PGTH
  } = require('intertext'));

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.lexer_modes = {
    //.........................................................................................................
    outside_mode: {
      o_escaped: {
        match: /\\./u
      },
      o_comment: {
        match: /<!--[\s\S]*?-->/,
        line_breaks: true
      },
      o_cdata: {
        match: /<!\[CDATA\[[\s\S]*?]]>/
      },
      o_doctype: {
        match: /<!DOCTYPE\s+[^>]*>/
      },
      o_xmldecl: {
        match: /<\?xml\s+[\s\S]*?\?>/
      },
      o_pi: {
        match: /<\?[\s\S]*?\?>/
      },
      i_slash_open: {
        match: /<\//,
        push_mode: "inside_mode"
      },
      i_open: {
        match: /</,
        push_mode: "inside_mode"
      },
      o_text: {
        match: /[^<\\]+/
      }
    },
    //.........................................................................................................
    inside_mode: {
      i_close: {
        match: />/,
        pop_mode: true
      },
      i_special_close: {
        match: /\?>/,
        pop_mode: true
      },
      i_slash_close: {
        match: /\/>/,
        pop_mode: true
      },
      stm_slash1: {
        match: /\/(?!>)/,
        push_mode: 'slashtext_mode'
      },
      i_slash: {
        match: /\//
      },
      v_equals: {
        match: /\s*=\s*/,
        push_mode: 'value_mode'
      },
      i_name: {
        match: /[^\s!?=\{\[\(<\/>\)\]\}'"]+/
      },
      i_whitespace: {
        match: /[ \t\r\n]/,
        skip: true
      }
    },
    //.........................................................................................................
    slashtext_mode: {
      stm_slash2: {
        match: /\//,
        switch_mode: "outside_mode"
      },
      stm_text: {
        match: /[^\/]+/
      }
    },
    //.........................................................................................................
    value_mode: {
      v_value: {
        match: /"[^"]*"|'[^']*'|[^>\s\/]+/,
        pop_mode: true
      }
    }
  };

  //-----------------------------------------------------------------------------------------------------------
  this.summarize = function(t) {
    // `t` is an object whose keys are token names and whose values are token patterns
    //---------------------------------------------------------------------------------------------------------
    this.RULE('document', () => {
      return this.MANY(() => {
        return this.OR([
          {
            ALT: () => {
              return this.CONSUME(t.o_escaped);
            }
          },
          {
            ALT: () => {
              return this.CONSUME(t.o_doctype);
            }
          },
          {
            ALT: () => {
              return this.CONSUME(t.o_xmldecl);
            }
          },
          {
            ALT: () => {
              return this.CONSUME(t.o_pi);
            }
          },
          {
            ALT: () => {
              return this.CONSUME(t.o_cdata);
            }
          },
          {
            ALT: () => {
              return this.CONSUME(t.o_comment);
            }
          },
          {
            ALT: () => {
              return this.CONSUME(t.o_text);
            }
          },
          {
            ALT: () => {
              return this.CONSUME(t.stm_text);
            }
          },
          {
            ALT: () => {
              return this.SUBRULE(this.osntag);
            }
          },
          {
            ALT: () => {
              return this.SUBRULE(this.ctag);
            }
          },
          {
            ALT: () => {
              return this.CONSUME(t.stm_slash2);
            }
          }
        ]);
      });
    });
    //---------------------------------------------------------------------------------------------------------
    this.RULE('osntag', ()/* `<a b=c>`, `<a b=c/>`, or `<a b=c/` */ => {
      this.CONSUME(t.i_open);
      this.CONSUME(t.i_name);
      this.OPTION(() => {
        return this.SUBRULE(this.attributes);
      });
      return this.OR([
        {
          ALT: () => {
            return this.CONSUME(t.i_close);
          }
        },
        {
          ALT: () => {
            return this.CONSUME(t.i_slash_close);
          }
        },
        {
          ALT: () => {
            return this.CONSUME(t.stm_slash1);
          }
        }
      ]);
    });
    //---------------------------------------------------------------------------------------------------------
    this.RULE('ctag', ()/* `</a>` */ => {
      this.CONSUME(t.i_slash_open);
      this.CONSUME(t.i_name);
      return this.CONSUME(t.i_close);
    });
    //---------------------------------------------------------------------------------------------------------
    this.RULE('attributes', () => {
      return this.AT_LEAST_ONE(() => {
        return this.SUBRULE(this.attribute);
      });
    });
    //---------------------------------------------------------------------------------------------------------
    return this.RULE('attribute', () => {
      this.CONSUME(t.i_name);
      return this.OPTION(() => {
        this.CONSUME(t.v_equals);
        return this.CONSUME(t.v_value);
      });
    });
  };

  //-----------------------------------------------------------------------------------------------------------
  dd = function(d) {
    var k, ref;
/* TAINT implement as optional functionality of `DATOM.new_datom()` */
    for (k in d) {
      if ((ref = d[k]) === (void 0) || ref === null || ref === '') {
        delete d[k];
      }
    }
    return d;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.linearize = function*(source, tree, level = 0) {
    var $key, $vnr, _, atrs, attribute, attributes, c, clasz, d, e, i, j, k, l, len, len1, len2, name, ref, ref1, ref2, ref3, ref4, ref5, ref6, start, start1, stop, stop2, subtree, text, text1, text2, text3, token_name, type, ukid, ukids, v, x;
    if (tree == null) {
      return null;
    }
    ({
      //.........................................................................................................
      name: token_name,
      $key,
      start,
      stop,
      text,
      $vnr
    } = tree);
    //.........................................................................................................
    if ($key === '^token') {
      switch (token_name) {
        case 'o_escaped':
          yield dd({
            $key: '^text',
            start,
            stop,
            text,
            $vnr,
            $: '^Ω1^'
          });
          break;
        case 'o_text':
        case 'stm_text':
          yield dd({
            $key: '^text',
            start,
            stop,
            text,
            $vnr,
            $: '^Ω2^'
          });
          break;
        case 'stm_slash2':
          yield dd({
            $key: '>tag',
            type: 'nctag',
            start,
            stop,
            text,
            $vnr,
            $: '^Ω3^'
          });
          break;
        case 'o_comment':
          yield dd({
            $key: '^comment',
            start,
            stop,
            text,
            $vnr,
            $: '^Ω4^'
          });
          break;
        case 'o_pi':
          yield dd({
            $key: '^pi',
            start,
            stop,
            text,
            $vnr,
            $: '^Ω5^'
          });
          break;
        case 'o_doctype':
          yield dd({
            $key: '^doctype',
            start,
            stop,
            text,
            $vnr,
            $: '^Ω6^'
          });
          break;
        case 'o_cdata':
          start1 = start + 9;
          stop2 = stop - 3;
          text1 = source.slice(start, start1);
          text2 = source.slice(start1, stop2);
          text3 = source.slice(stop2, stop);
          yield dd({
            $key: '<cdata',
            start,
            stop: start1,
            text: text1,
            $vnr,
            $: '^Ω7^'
          });
          if (text2 !== '') {
            yield dd({
              $key: '^text',
              start: start1,
              stop: stop2,
              text: text2,
              $vnr,
              $: '^Ω8^'
            });
          }
          yield dd({
            $key: '>cdata',
            start: stop2,
            stop,
            text: text3,
            $vnr,
            $: '^Ω9^'
          });
          break;
        default:
          yield dd({
            $key: '^unknown',
            $value: tree,
            $vnr,
            $: '^Ω10^'
          });
      }
      return null;
    }
    if ($key !== '^document' && $key !== '^node') {
      throw new Error(`^445^ unknown $key ${rpr($key)}`);
    }
    //.........................................................................................................
    ({ukids} = tree);
/* NOTE we assume that unique kids exist and that values are stored in source order */
    for (_ in ukids) {
      ukid = ukids[_];
      $vnr = ukid.$vnr;
      break;
    }
    //.........................................................................................................
    if ($key === '^document') {
      if (!this.settings.bare) {
        yield dd({
          $key: '<document',
          start: 0,
          stop: 0,
          source,
          errors: tree.errors,
          $vnr: [-2e308],
          $: '^Ω11^'
        });
      }
      ref = tree.kids;
      for (i = 0, len = ref.length; i < len; i++) {
        subtree = ref[i];
        yield* this.linearize(source, subtree, level + 1);
      }
      x = text.length;
      if (!this.settings.bare) {
        yield dd({
          $key: '>document',
          start: x,
          stop: x,
          $vnr: [2e308],
          $: '^Ω12^'
        });
      }
      return null;
    }
    if ((name = (ref1 = tree.ukids) != null ? (ref2 = ref1.i_name) != null ? ref2.text : void 0 : void 0) == null) {
      //.........................................................................................................
      return null;
    }
    switch (/* may happen when parsing errors occur */token_name) {
      //.......................................................................................................
      case 'osntag':
        $key = '<tag';
        if (tree.ukids.i_close != null) {
          type = 'otag';
        } else if (tree.ukids.i_slash_close != null) {
          type = 'stag';
          $key = '^tag';
        } else if (tree.ukids.stm_slash1 != null) {
          type = 'ntag';
        }
        if ((attributes = tree.ukids.attributes) != null) {
          atrs = {};
          ref3 = attributes.kids;
          for (j = 0, len1 = ref3.length; j < len1; j++) {
            attribute = ref3[j];
            k = attribute.ukids.i_name.text;
            v = (ref4 = (ref5 = attribute.ukids.v_value) != null ? ref5.text : void 0) != null ? ref4 : true;
            atrs[k] = v;
          }
          d = {
            $key,
            name,
            type,
            text,
            start,
            stop,
            atrs,
            $vnr,
            $: '^Ω13^'
          };
        } else {
          d = {
            $key,
            name,
            type,
            text,
            start,
            stop,
            $vnr,
            $: '^Ω14^'
          };
        }
        //.....................................................................................................
        // parse compact tag name:
        if ((d.name != null) && d.name !== '') {
          e = this._parse_compact_tagname(d.name);
          if (e.id != null) {
            if (d.id != null) {
              throw new Error(`^paragate/htmlish/linearize@1^ duplicate IDs in ${rpr(d)}`);
            }
            d.id = e.id;
          }
          if (e.prefix != null) {
            if (d.prefix != null) {
              throw new Error(`^paragate/htmlish/linearize@1^ duplicate prefixes in ${rpr(d)}`);
            }
            d.prefix = e.prefix;
          }
          if (e.class != null) {
            clasz = d.class != null ? new Set(d.class.split(/\s+/)) : new Set();
            ref6 = e.class;
            for (l = 0, len2 = ref6.length; l < len2; l++) {
              c = ref6[l];
              clasz.add(c);
            }
            d.class = [...clasz];
          }
          if (e.name != null) {
            d.name = e.name;
          }
        }
        //.....................................................................................................
        yield dd(d);
        break;
      //.......................................................................................................
      case 'ctag':
        yield dd({
          $key: '>tag',
          name,
          type: 'ctag',
          text,
          start,
          stop,
          $vnr,
          $: '^Ω15^'
        });
        break;
      default:
        //.......................................................................................................
        yield dd({
          $key: '^unknown',
          $value: tree,
          $vnr,
          $: '^Ω16^'
        });
    }
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._parse_compact_tagname = function(text) {
    return PGTH.parse_compact_tagname(text, true);
  };

  //-----------------------------------------------------------------------------------------------------------
  $parse = function(grammar = null) {
    var SP, line_nr;
    SP = require('steampipes');
    if (grammar == null) {
      grammar = new new_grammar({
        bare: true
      });
    }
    line_nr = 0;
    return SP.$(function(line, send) {
      var d, i, len, ref;
      line_nr++;
      send(new_datom('^newline', {
        $vnr: [line_nr, 0],
        $: '^Ω17^'
      }));
      ref = grammar.parse(line);
      for (i = 0, len = ref.length; i < len; i++) {
        d = ref[i];
        send(lets(d, function(d) {
          return d.$vnr[0] = line_nr;
        }));
      }
      return null;
    });
  };

  //-----------------------------------------------------------------------------------------------------------
  merge_texts = function(d1, d2) {
    var R;
    // { '$key': '^text', start: 0, stop: 7, text: 'before ', '$vnr': [ 1, 1 ], '$': '^Ω18^' }
    R = {
      $key: '^text',
      start: d1.start,
      stop: d2.stop,
      text: d1.text + d2.text,
      $vnr: d1.$vnr,
      $: d1.$
    };
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  parse = function(...P) {
    var R, d, i, idx, len, prv_d, tokens;
    tokens = this._parse(...P);
    R = [];
    prv_d = null;
    for (idx = i = 0, len = tokens.length; i < len; idx = ++i) {
      d = tokens[idx];
      if (d.$key === '^text') {
        if ((prv_d != null) && (prv_d.$key === '^text')) {
          prv_d = merge_texts(prv_d, d);
          continue;
        }
        prv_d = d;
        continue;
      }
      if (prv_d) {
        R.push(prv_d);
      }
      prv_d = null;
      R.push(d);
    }
    if (prv_d != null) {
      R.push(prv_d);
    }
    return freeze(R);
  };

  //###########################################################################################################
  /* TAINT this seems backwards (but works?) */
  MAIN = this;

  new_grammar = function(settings) {
    var R;
    R = GRAMMAR.new_grammar('Htmlish', MAIN, settings);
    R._parse = R.parse;
    R.parse = parse;
    return R;
  };

  grammar = new_grammar();

  Htmlish_grammar = grammar.constructor;

  module.exports = {Htmlish_grammar, grammar, new_grammar, $parse};

}).call(this);

//# sourceMappingURL=htmlish.grammar.js.map