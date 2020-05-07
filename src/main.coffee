
'use strict'

############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'PARAGATE'
debug                     = CND.get_logger 'debug',     badge
alert                     = CND.get_logger 'alert',     badge
whisper                   = CND.get_logger 'whisper',   badge
warn                      = CND.get_logger 'warn',      badge
help                      = CND.get_logger 'help',      badge
urge                      = CND.get_logger 'urge',      badge
info                      = CND.get_logger 'info',      badge
#...........................................................................................................
Multimix                  = require 'multimix'
MAIN                      = @


#===========================================================================================================
class Paragate extends Multimix
  # @extend   object_with_class_properties
  # @include require './cataloguing'
  @include MAIN

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    super()
    @GRAMMAR      = require './grammar'
    @HTML         = require './htmlish.grammar'
    @RXWS         = require './regex-whitespace.grammar'
    @MKTS         = require './markdownish.grammar'
    @CHRSUBSETTER = require './chrsubsetter.grammar'
    return @

module.exports = new Paragate()

# ############################################################################################################
# if module is require.main then do =>


