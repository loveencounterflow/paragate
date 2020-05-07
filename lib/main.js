(function() {
  'use strict';
  var CND, MAIN, Multimix, Paragate, alert, badge, debug, help, info, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'PARAGATE';

  debug = CND.get_logger('debug', badge);

  alert = CND.get_logger('alert', badge);

  whisper = CND.get_logger('whisper', badge);

  warn = CND.get_logger('warn', badge);

  help = CND.get_logger('help', badge);

  urge = CND.get_logger('urge', badge);

  info = CND.get_logger('info', badge);

  //...........................................................................................................
  Multimix = require('multimix');

  MAIN = this;

  Paragate = (function() {
    //===========================================================================================================
    class Paragate extends Multimix {
      //---------------------------------------------------------------------------------------------------------
      constructor() {
        super();
        this.GRAMMAR = require('./grammar');
        this.HTML = require('./htmlish.grammar');
        this.RXWS = require('./regex-whitespace.grammar');
        this.MKTS = require('./markdownish.grammar');
        this.CHRSUBSETTER = require('./chrsubsetter.grammar');
        return this;
      }

    };

    // @extend   object_with_class_properties
    // @include require './cataloguing'
    Paragate.include(MAIN);

    return Paragate;

  }).call(this);

  module.exports = new Paragate();

  // ############################################################################################################
// if module is require.main then do =>

}).call(this);
