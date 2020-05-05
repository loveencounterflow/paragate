(function() {
  'use strict';
  var CND, GRAMMAR, MAIN, Multimix, Rxws_grammar, alert, assign, badge, debug, echo, freeze, help, info, isa, jr, lets, log, rpr, space_re, type_of, types, urge, validate, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  badge = 'PARAGATE/GRAMMARS/REGEXWS';

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

  space_re = /\x20+/y;

  Multimix = require('multimix');

  //-----------------------------------------------------------------------------------------------------------
  this.$parse = function() {
    var SP, dent, first, last, level, linenr, start, stop;
    SP = require('steampipes');
    linenr = 0;
    start = null;
    stop = 0;
    level = 0;
    dent = null;
    first = Symbol('first');
    last = Symbol('last');
    return SP.$({first, last}, (d, send) => {
      var text;
      debug('^333442^', rpr(d));
      if (d === first) {
        return send({
          $key: '<document',
          start,
          stop,
          $vnr: [-2e308],
          $: '^r1^'
        });
      }
      if (d === last) {
        return send({
          $key: '>document',
          start,
          stop,
          $vnr: [+2e308],
          $: '^r1^'
        });
      }
      if (!isa.text(d)) {
        return send(d);
      }
      text = d;
      start = stop;
      stop += text.length + 1; // NOTE: assuming line was terminated with single newline
      linenr++;
      send(freeze({
        $key: '^text',
        start,
        stop,
        text,
        $vnr: [linenr],
        $: '^r1^'
      }));
      return null;
    });
  };

  //-----------------------------------------------------------------------------------------------------------
  this.parse = function(source) {
    var R, colnr, dent, i, idx, level, line, linenr, lines, nl, ref, ref1, start, stop, text;
    validate.text(source);
    R = [];
    lines = source.split(this.nl_re);
    linenr = 0;
    colnr = 1;
    nl = '';
    //.........................................................................................................
    start = 0;
    stop = source.length;
    R.push({
      $key: '<document',
      start,
      stop,
      source,
      $vnr: [-2e308],
      $: '^r1^'
    });
    for (idx = i = 0, ref = lines.length; i <= ref; idx = i += 2) {
      line = lines[idx];
      nl = (ref1 = lines[idx + 1]) != null ? ref1 : '';
      stop = start + line.length + nl.length;
      linenr++;
      ({dent, text} = (line.match(this.dent_re)).groups);
      level = dent.length;
      line += nl;
      R.push({
        $key: '^dline',
        start,
        stop,
        dent,
        text,
        nl,
        line,
        level,
        $vnr: [linenr, colnr],
        $: '^r2^'
      });
      start = stop;
    }
    start = stop = source.length;
    R.push({
      $key: '>document',
      start,
      stop,
      $vnr: [+2e308],
      $: '^r3^'
    });
    //.........................................................................................................
    return freeze(this.as_blocks ? this._as_blocks(R) : R);
  };

  //-----------------------------------------------------------------------------------------------------------
  this._as_blocks = function(dlines) {
    /* TAINT account for differing levels */
    var R, blanks, blocks, consolidate, d, flush, i, idx, prv_level, ref;
    R = [];
    blocks = [];
    blanks = [];
    prv_level = null;
    //.........................................................................................................
    consolidate = function($key, buffer) {
      var $vnr, d, first, last, level, linecount, ref, start, stop, text;
      first = buffer[0];
      last = buffer[buffer.length - 1];
      start = first.start;
      stop = last.stop;
      $vnr = first.$vnr;
      level = (ref = first.level) != null ? ref : 0;
      linecount = buffer.length;
      // debug '^223^', rpr buffer
      if ($key === '^block') {
        text = ((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = buffer.length; i < len; i++) {
            d = buffer[i];
            results.push(d.text + d.nl);
          }
          return results;
        })()).join('');
      } else {
        text = ((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = buffer.length; i < len; i++) {
            d = buffer[i];
            results.push(d.dent + d.text + d.nl);
          }
          return results;
        })()).join('');
      }
      return {
        $key,
        start,
        stop,
        text,
        level,
        linecount,
        $vnr,
        $: '^r4^'
      };
    };
    //.........................................................................................................
    flush = function($key, collection) {
      if (!(collection.length > 0)) {
        return collection;
      }
      R.push(consolidate($key, collection));
      return [];
    };
    //.........................................................................................................
    R.push(dlines[0]);
    for (idx = i = 1, ref = dlines.length - 1; (1 <= ref ? i < ref : i > ref); idx = 1 <= ref ? ++i : --i) {
      d = dlines[idx];
      if (d.$key !== '^dline') {
        R.push(d);
        continue;
      }
      if (this.blank_re.test(d.line)) {
        blocks = flush('^block', blocks);
        blanks.push(d);
        continue;
      }
      blanks = flush('^blank', blanks);
      if (prv_level !== d.level) {
        blocks = flush('^block', blocks);
      }
      prv_level = d.level;
      blocks.push(d);
    }
    //.........................................................................................................
    blanks = flush('^blank', blanks);
    blocks = flush('^block', blocks);
    R.push(dlines[dlines.length - 1]);
    return R;
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  MAIN = this;

  Rxws_grammar = (function() {
    class Rxws_grammar extends Multimix {
      //---------------------------------------------------------------------------------------------------------
      constructor(settings = null) {
        var defaults;
        super();
        defaults = {
          nl_re: /(\n)//* NOTE might also use `/(\n|\r\n?)/` */,
          dent_re: /^(?<dent>\x20*)(?<text>.*)/,
          blank_re: /^\s*$/,
          name: 'rxws_grammar',
          as_blocks: true
        };
        settings = {...defaults, ...settings};
        this.name = settings.name;
        this.nl_re = settings.nl_re;
        this.dent_re = settings.dent_re;
        this.blank_re = settings.blank_re;
        this.as_blocks = settings.as_blocks;
        return this;
      }

    };

    Rxws_grammar.include(MAIN, {
      overwrite: true
    });

    return Rxws_grammar;

  }).call(this);

  //###########################################################################################################
  module.exports = {
    Rxws_grammar,
    grammar: new Rxws_grammar()
  };

}).call(this);
