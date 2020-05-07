(function() {
  'use strict';
  var CND, GRAMMAR, Htmlish_grammar, alert, assign, badge, dd, debug, echo, freeze, grammar, help, info, isa, jr, lets, log, rpr, type_of, types, urge, validate, warn, whisper;

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
  ({lets, freeze} = (new (require('datom')).Datom({
    dirty: false
  })).export());

  types = require('./types');

  ({isa, type_of, validate} = types);

  GRAMMAR = require('./grammar');

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.lexer_modes = {
    //.........................................................................................................
    outside_mode: {
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
        match: /[^<]+/
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
    var $key, $vnr, _, atrs, attribute, attributes, i, j, k, len, len1, name, ref, ref1, ref2, ref3, ref4, ref5, start, start1, stop, stop2, subtree, text, text1, text2, text3, token_name, type, ukid, ukids, v, x;
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
        case 'o_text':
        case 'stm_text':
          yield dd({
            $key: '^text',
            start,
            stop,
            text,
            $vnr,
            $: '^ѱ1^'
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
            $: '^ѱ2^'
          });
          break;
        case 'o_comment':
          yield dd({
            $key: '^comment',
            start,
            stop,
            text,
            $vnr,
            $: '^ѱ3^'
          });
          break;
        case 'o_pi':
          yield dd({
            $key: '^pi',
            start,
            stop,
            text,
            $vnr,
            $: '^ѱ4^'
          });
          break;
        case 'o_doctype':
          yield dd({
            $key: '^doctype',
            start,
            stop,
            text,
            $vnr,
            $: '^ѱ5^'
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
            $: '^ѱ6^'
          });
          if (text2 !== '') {
            yield dd({
              $key: '^text',
              start: start1,
              stop: stop2,
              text: text2,
              $vnr,
              $: '^ѱ7^'
            });
          }
          yield dd({
            $key: '>cdata',
            start: stop2,
            stop,
            text: text3,
            $vnr,
            $: '^ѱ8^'
          });
          break;
        default:
          yield dd({
            $key: '^unknown',
            $value: tree,
            $vnr,
            $: '^ѱ9^'
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
      yield dd({
        $key: '<document',
        start: 0,
        stop: 0,
        source,
        errors: tree.errors,
        $vnr: [-2e308],
        $: '^ѱ10^'
      });
      ref = tree.kids;
      for (i = 0, len = ref.length; i < len; i++) {
        subtree = ref[i];
        yield* this.linearize(source, subtree, level + 1);
      }
      x = text.length;
      yield dd({
        $key: '>document',
        start: x,
        stop: x,
        $vnr: [2e308],
        $: '^ѱ11^'
      });
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
          yield dd({
            $key,
            name,
            type,
            text,
            start,
            stop,
            atrs,
            $vnr,
            $: '^ѱ12^'
          });
        } else {
          yield dd({
            $key,
            name,
            type,
            text,
            start,
            stop,
            $vnr,
            $: '^ѱ13^'
          });
        }
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
          $: '^ѱ14^'
        });
        break;
      default:
        //.......................................................................................................
        yield dd({
          $key: '^unknown',
          $value: tree,
          $vnr,
          $: '^ѱ15^'
        });
    }
    return null;
  };

  //###########################################################################################################
  /* TAINT this seems backwards (but works?) */
  grammar = GRAMMAR.new_grammar('Htmlish', this);

  Htmlish_grammar = grammar.constructor;

  module.exports = {Htmlish_grammar, grammar};

}).call(this);
