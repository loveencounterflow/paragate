(function() {
  'use strict';
  var CND, Chrsubsetter, GRAMMAR, INTERTEXT, MAIN, Multimix, alert, assign, badge, count_chrs, debug, echo, freeze, help, info, isa, jr, lets, log, rpr, type_of, types, urge, validate, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  badge = 'PARAGATE/GRAMMARS/CHRSUBSETTER';

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

  INTERTEXT = require('intertext');

  ({rpr} = INTERTEXT.export());

  Multimix = require('multimix');

  //-----------------------------------------------------------------------------------------------------------
  this._create_preset_default = function(preset) {
    /* TAINT also allow regexes outside of objects? */
    /* TAINT validate regexes? no anchor, sticky, unicode */
    this.sets = [
      {
        name: 'spaces',
        match: /\s+/yu
      },
      {
        /* less specific */
      name: 'punctuations',
        match: /[=,.;:!?]+/yu
      },
      {
        name: 'signs',
        match: /[-+]+/yu
      },
      {
        name: 'digits',
        match: /[0-8]+/yu
      },
      {
        name: 'newlines',
        match: /\n+/yu
      },
      {
        name: 'ucletters',
        match: /[A-Z]+/yu
      },
      {
        name: 'lcletters',
        match: /[a-z]+/yu
      }
    ];
/* more specific */    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._create_preset_blocks = function(preset) {
    var first, first_cid_txt, i, last, last_cid_txt, len, match, name, ref;
    this.sets = [];
    ref = INTERTEXT.UCD.get_block_list();
    for (i = 0, len = ref.length; i < len; i++) {
      ({first, last, name} = ref[i]);
      first_cid_txt = first.toString(16);
      last_cid_txt = last.toString(16);
      match = new RegExp(`[\\u{${first_cid_txt}}-\\u{${last_cid_txt}}]+`, 'yu');
      name = name.replace(/\s/g, '_');
      this.sets.push({name, match});
    }
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._create_preset_planes = function(preset) {
    var first_cid_txt, i, last_cid_txt, match, name, plane, plane_prfx;
    this.sets = [];
    for (plane = i = 0x00; i <= 16; plane = ++i) {
      plane_prfx = (plane.toString(16)).padStart(2, '0');
      first_cid_txt = `${plane_prfx}0000`;
      last_cid_txt = `${plane_prfx}ffff`;
      match = new RegExp(`[\\u{${first_cid_txt}}-\\u{${last_cid_txt}}]+`, 'yu');
      name = `plane-${plane_prfx}`;
      this.sets.push({name, match});
    }
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._create_preset_halfplanes = function(preset) {
    var first_cid_txt, half, i, j, last_cid_txt, len, match, name, plane, plane_prfx, ref, sfx;
    this.sets = [];
    for (plane = i = 0x00; i <= 16; plane = ++i) {
      ref = [0, 1];
      for (j = 0, len = ref.length; j < len; j++) {
        half = ref[j];
        plane_prfx = (plane.toString(16)).padStart(2, '0');
        if (half === 0) {
          sfx = 'lo';
          first_cid_txt = `${plane_prfx}0000`;
          last_cid_txt = `${plane_prfx}7fff`;
        } else {
          sfx = 'hi';
          first_cid_txt = `${plane_prfx}8000`;
          last_cid_txt = `${plane_prfx}ffff`;
        }
        match = new RegExp(`[\\u{${first_cid_txt}}-\\u{${last_cid_txt}}]+`, 'yu');
        name = `halfplane-${plane_prfx}.${sfx}`;
        this.sets.push({name, match});
      }
    }
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._create_preset_words = function(preset) {
    /* thx to https://mathiasbynens.be/notes/es-unicode-property-escapes */
    this.sets = [
      {
        name: 'word',
        match: /[\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Connector_Punctuation}\p{Join_Control}]+/yu
      }
    ];
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  // count_chrs = ( text ) -> ( text.split   /// . ///u       ).length - 1
  count_chrs = function(text) {
    return (text.replace(/./gu, '.')).length;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.parse = function(source) {
    var $key, $vnr, R1, chr_idx, column, flush_other, found, get_vnr, last_cat_idx, last_chr_idx, line, match, other_start, other_stop, set, set_idx, start, stop, text;
    validate.text(source);
    R1 = [];
    chr_idx = 0;
    last_chr_idx = source.length - 1;
    set_idx = null;
    last_cat_idx = this.sets.length - 1;
    other_start = null;
    other_stop = null;
    set = null;
    found = false;
    $vnr = null;
    line = 1;
    column = 1;
    text = null;
    //.........................................................................................................
    get_vnr = () => {
      var R2, prv_line, ref, ref1;
      if (!this.track_lines) {
        return [start];
      }
      R2 = [line, column];
      prv_line = line;
      line += (ref = (ref1 = text.match(/\n/g)) != null ? ref1.length : void 0) != null ? ref : 0;
      column = (prv_line === line ? column : 1) + count_chrs((text.match(/[^\n]*$/))[0]);
      return R2;
    };
    //.........................................................................................................
    flush_other = () => {
      var start, stop;
      if (other_start == null) {
        return;
      }
      start = other_start;
      stop = other_stop;
      text = source.slice(start, stop);
      $vnr = get_vnr();
      //.......................................................................................................
      R1.push({
        $key: '^other',
        start,
        stop,
        text,
        $vnr,
        $: '^Б1^'
      });
      other_start = null;
      other_stop = null;
      return null;
    };
    while (true) {
      if (chr_idx > last_chr_idx) {
        //.........................................................................................................
        break;
      }
      set_idx = last_cat_idx + 1;
      found = false;
      while (true) {
        //.......................................................................................................
        set_idx--;
        if (set_idx < 0) {
          break;
        }
        set = this.sets[set_idx];
        set.match.lastIndex = chr_idx;
        if ((match = source.match(set.match)) == null) {
          /* TAINT some serious naming calamity here */
          continue;
        }
        //.....................................................................................................
        flush_other();
        [text] = match;
        start = chr_idx;
        chr_idx += text.length;
        stop = chr_idx;
        found = true;
        $key = '^' + set.name;
        $vnr = get_vnr();
        R1.push({
          $key,
          start,
          stop,
          text,
          $vnr,
          $: '^Б2^'
        });
        break;
      }
      //.......................................................................................................
      if (!found) {
        if (other_start == null) {
          other_start = chr_idx;
        }
        other_stop = (other_stop != null ? other_stop : other_start) + 1;
        chr_idx += 1;
      }
    }
    //.........................................................................................................
    flush_other();
    return freeze(R1);
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  MAIN = this;

  Chrsubsetter = (function() {
    class Chrsubsetter extends Multimix {
      //---------------------------------------------------------------------------------------------------------
      constructor(settings = null) {
        var defaults;
        super();
        defaults = {
          name: null,
          track_lines: true,
          preset: 'default'
        };
        settings = {...defaults, ...settings};
        validate.boolean(settings.track_lines);
        validate.nonempty_text(settings.preset);
        if ((settings.name != null) || (settings.preset === 'default')) {
          if (settings.name == null) {
            settings.name = 'chrsubsetter';
          }
          validate.nonempty_text(settings.name);
          this.name = settings.name;
        } else {
          this.name = `css/${settings.preset}`;
        }
        this.track_lines = settings.track_lines;
        this.preset = settings.preset;
        this._create_preset();
        return this;
      }

      //---------------------------------------------------------------------------------------------------------
      _create_preset() {
        var method;
        if (!(method = this[`_create_preset_${this.preset}`])) {
          throw new Error(`^4487^ unknown preset ${rpr(this.preset)}`);
        }
        method.apply(this);
        return null;
      }

    };

    Chrsubsetter.include(MAIN, {
      overwrite: true
    });

    return Chrsubsetter;

  }).call(this);

  //###########################################################################################################
  module.exports = {
    Chrsubsetter,
    grammar: new Chrsubsetter()
  };

}).call(this);
