
'use strict'

############################################################################################################
CND                       = require 'cnd'
badge                     = 'PARAGATE/GRAMMARS/REGEXWS'
rpr                       = CND.rpr
log                       = CND.get_logger 'plain',     badge
info                      = CND.get_logger 'info',      badge
whisper                   = CND.get_logger 'whisper',   badge
alert                     = CND.get_logger 'alert',     badge
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
help                      = CND.get_logger 'help',      badge
urge                      = CND.get_logger 'urge',      badge
echo                      = CND.echo.bind CND
#...........................................................................................................
{ assign
  jr }                    = CND
# CHVTN                     = require 'chevrotain'
{ lets
  freeze }                = ( new ( require 'datom' ).Datom { dirty: false, } ).export()
types                     = require './types'
{ isa
  type_of
  validate }              = types
GRAMMAR                   = require './grammar'
space_re                  = /\x20+/y
Multimix                  = require 'multimix'


#-----------------------------------------------------------------------------------------------------------
@$parse = ->
  SP        = require 'steampipes'
  linenr    = 0
  start     = null
  stop      = 0
  level     = 0
  dent      = null
  nl        = '\n'
  level     = null
  first     = Symbol 'first'
  last      = Symbol 'last'
  ### TAINT code duplication ###
  pipeline  = []
  pipeline.push $dlines_from_lines = SP.$ { first, last, }, ( d, send ) =>
    if d is first
      return send { $key: '<document', start, stop, $vnr: [ -Infinity, ], $: '^ρξ1^' }
    if d is last
      start = stop
      return send { $key: '>document', start, stop, $vnr: [ +Infinity, ], $: '^ρξ2^' }
    unless isa.text d
      return send d
    line  = d
    start = stop
    stop += line.length + 1 # NOTE: assuming line was terminated with single newline
    linenr++
    { dent, text, } = ( line.match @dent_re ).groups
    level           = dent.length
    line            = line + '\n'
    send { $key: '^dline', start, stop, text, dent, line, level, nl, $vnr: [ linenr, 1, ], $: '^ρξ3^', }
    return null
  # if @as_blocks
  pipeline.push $freeze = SP.$ ( d, send ) => send freeze d
  return SP.pull pipeline...

#-----------------------------------------------------------------------------------------------------------
@parse = ( source ) ->
  validate.text source
  R           = []
  lines       = source.split @nl_re
  linenr      = 0
  colnr       = 1
  nl          = ''
  #.........................................................................................................
  start = 0
  stop  = source.length
  R.push { $key: '<document', start, stop, source, $vnr: [ -Infinity, ], $: '^ρξ4^' }
  ### TAINT code duplication ###
  for idx in [ 0 .. lines.length ] by 2
    line            = lines[ idx     ]
    nl              = lines[ idx + 1 ] ? ''
    stop            = start + line.length + nl.length
    linenr++
    { dent, text, } = ( line.match @dent_re ).groups
    level           = dent.length
    line           += nl
    R.push { $key: '^dline', start, stop, dent, text, nl, line, level, $vnr: [ linenr, colnr ], $: '^ρξ5^' }
    start           = stop
  start = stop = source.length
  R.push { $key: '>document', start, stop, $vnr: [ +Infinity, ], $: '^ρξ6^' }
  #.........................................................................................................
  return freeze if @as_blocks then ( @_as_blocks R ) else R

#-----------------------------------------------------------------------------------------------------------
@_as_blocks = ( dlines ) ->
  R           = []
  blocks      = []
  blanks      = []
  prv_level   = null
  #.........................................................................................................
  consolidate = ( $key, buffer ) ->
    first       = buffer[ 0 ]
    last        = buffer[ buffer.length - 1 ]
    start       = first.start
    stop        = last.stop
    $vnr        = first.$vnr
    level       = first.level ? 0
    linecount   = buffer.length
    # debug '^223^', rpr buffer
    if $key is '^block' then  text  = ( (          d.text + d.nl ) for d in buffer ).join ''
    else                      text  = ( ( d.dent + d.text + d.nl ) for d in buffer ).join ''
    return { $key, start, stop, text, level, linecount, $vnr, $: '^ρξ7^', }
  #.........................................................................................................
  flush = ( $key, collection ) ->
    return collection unless collection.length > 0
    R.push consolidate $key, collection
    return []
  #.........................................................................................................
  R.push dlines[ 0 ]
  for idx in [ 1 ... dlines.length - 1 ]
    d = dlines[ idx ]
    unless d.$key is '^dline'
      R.push d
      continue
    if @blank_re.test d.line
      blocks = flush '^block', blocks
      blanks.push d
      continue
    ### TAINT account for differing levels ###
    blanks    = flush '^blank', blanks
    blocks    = flush '^block', blocks if prv_level isnt d.level
    prv_level = d.level
    blocks.push d
  #.........................................................................................................
  blanks = flush '^blank', blanks
  blocks = flush '^block', blocks
  R.push dlines[ dlines.length - 1 ]
  return R

#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
MAIN = @
class Rxws_grammar extends Multimix
  @include MAIN, { overwrite: true, }

  #---------------------------------------------------------------------------------------------------------
  constructor: ( settings = null ) ->
    super()
    defaults =
      nl_re:      /(\n)/ ### NOTE might also use `/(\n|\r\n?)/` ###
      dent_re:    /^(?<dent>\x20*)(?<text>.*)/
      blank_re:   /^\s*$/
      name:       'rxws_grammar'
      as_blocks:   true
    settings    = { defaults..., settings..., }
    @name       = settings.name
    @nl_re      = settings.nl_re
    @dent_re    = settings.dent_re
    @blank_re   = settings.blank_re
    @as_blocks  = settings.as_blocks
    return @


############################################################################################################
module.exports = { Rxws_grammar, grammar: new Rxws_grammar(), }







