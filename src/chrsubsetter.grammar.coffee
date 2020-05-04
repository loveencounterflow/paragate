
'use strict'

############################################################################################################
CND                       = require 'cnd'
badge                     = 'PARAGATE/GRAMMARS/CHRSUBSETTER'
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
types                     = require '../paragate/lib/types'
{ isa
  type_of
  validate }              = types
GRAMMAR                   = require '../paragate/lib/grammar'
INTERTEXT                 = require 'intertext'
{ rpr }                   = INTERTEXT.export()
Multimix                  = require '../paragate/node_modules/multimix'



#-----------------------------------------------------------------------------------------------------------
@_create_preset_default = ( preset ) ->
  ### TAINT also allow regexes outside of objects? ###
  ### TAINT validate regexes? no anchor, sticky, unicode ###
  @sets = [
    { name: 'spaces',       match: /// \s+         ///yu, } ### less specific ###
    { name: 'punctuations', match: /// [=,.;:!?]+  ///yu, }
    { name: 'signs',        match: /// [-+]+       ///yu, }
    { name: 'digits',       match: /// [0-8]+      ///yu, }
    { name: 'newlines',     match: /// \n+         ///yu, }
    { name: 'ucletters',    match: /// [A-Z]+      ///yu, }
    { name: 'lcletters',    match: /// [a-z]+      ///yu, } ### more specific ###
    ]
  return null

#-----------------------------------------------------------------------------------------------------------
@_create_preset_blocks = ( preset ) ->
  @sets = []
  for { first, last, name, } in INTERTEXT.UCD.get_block_list()
    first_cid_txt = first.toString  16
    last_cid_txt  = last.toString   16
    match         = new RegExp "[\\u{#{first_cid_txt}}-\\u{#{last_cid_txt}}]+", 'yu'
    name          = name.replace /\s/g, '_'
    @sets.push { name, match, }
  return null

#-----------------------------------------------------------------------------------------------------------
@_create_preset_planes = ( preset ) ->
  @sets = []
  for plane in [ 0x00 .. 0x10 ]
    plane_prfx    = ( plane.toString 16 ).padStart 2, '0'
    first_cid_txt = "#{plane_prfx}0000"
    last_cid_txt  = "#{plane_prfx}ffff"
    match         = new RegExp "[\\u{#{first_cid_txt}}-\\u{#{last_cid_txt}}]+", 'yu'
    name          = "plane-#{plane_prfx}"
    @sets.push { name, match, }
  return null

#-----------------------------------------------------------------------------------------------------------
@_create_preset_halfplanes = ( preset ) ->
  @sets = []
  for plane in [ 0x00 .. 0x10 ]
    for half in [ 0, 1, ]
      plane_prfx    = ( plane.toString 16 ).padStart 2, '0'
      if half is 0
        sfx           = 'lo'
        first_cid_txt = "#{plane_prfx}0000"
        last_cid_txt  = "#{plane_prfx}7fff"
      else
        sfx           = 'hi'
        first_cid_txt = "#{plane_prfx}8000"
        last_cid_txt  = "#{plane_prfx}ffff"
      match         = new RegExp "[\\u{#{first_cid_txt}}-\\u{#{last_cid_txt}}]+", 'yu'
      name          = "halfplane-#{plane_prfx}.#{sfx}"
      @sets.push { name, match, }
  return null

#-----------------------------------------------------------------------------------------------------------
@_create_preset_words = ( preset ) ->
  ### thx to https://mathiasbynens.be/notes/es-unicode-property-escapes ###
  @sets = [
    { name: 'word', match: /// [
      \p{Alphabetic}
      \p{Mark}
      \p{Decimal_Number}
      \p{Connector_Punctuation}
      \p{Join_Control}
      ]+ ///yu, }
    ]
  return null

#-----------------------------------------------------------------------------------------------------------
# count_chrs = ( text ) -> ( text.split   /// . ///u       ).length - 1
count_chrs = ( text ) -> ( text.replace /// . ///gu, '.' ).length

#-----------------------------------------------------------------------------------------------------------
@parse = ( source ) ->
  validate.text source
  R1            = []
  chr_idx       = 0
  last_chr_idx  = source.length - 1
  set_idx       = null
  last_cat_idx  = @sets.length - 1
  other_start   = null
  other_stop    = null
  set           = null
  found         = false
  $vnr          = null
  line          = 1
  column        = 1
  text          = null
  #.........................................................................................................
  get_vnr = =>
    return [ start, ] unless @track_lines
    R2        = [ line, column, ]
    prv_line  = line
    line     += ( text.match /\n/g )?.length ? 0
    column    = ( if prv_line is line then column else 1 ) + count_chrs ( text.match /[^\n]*$/ )[ 0 ]
    return R2
  #.........................................................................................................
  flush_other = =>
    return unless other_start?
    start = other_start
    stop  = other_stop
    text  = source[ start ... stop ]
    $vnr  = get_vnr()
    #.......................................................................................................
    R1.push { $key: '^other', start, stop, text, $vnr, $: '^Б1^' }
    other_start = null
    other_stop  = null
    return null
  #.........................................................................................................
  loop
    break if chr_idx > last_chr_idx
    set_idx = last_cat_idx + 1
    found   = false
    #.......................................................................................................
    loop
      set_idx--
      break if set_idx < 0
      set                  = @sets[ set_idx ]
      set.match.lastIndex  = chr_idx
      ### TAINT some serious naming calamity here ###
      continue unless ( match = source.match set.match )?
      #.....................................................................................................
      flush_other()
      [ text, ] = match
      start     = chr_idx
      chr_idx  += text.length
      stop      = chr_idx
      found     = true
      $key      = '^' + set.name
      $vnr      = get_vnr()
      R1.push { $key, start, stop, text, $vnr, $: '^Б2^', }
      break
    #.......................................................................................................
    unless found
      other_start  ?= chr_idx
      other_stop    = ( other_stop ? other_start ) + 1
      chr_idx      += 1
  #.........................................................................................................
  flush_other()
  return freeze R1

#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
MAIN = @
class Chrsubsetter extends Multimix
  @include MAIN, { overwrite: true, }

  #---------------------------------------------------------------------------------------------------------
  constructor: ( settings = null ) ->
    super()
    defaults      = { name: null, track_lines: true, preset: 'default', }
    settings      = { defaults..., settings..., }
    validate.boolean        settings.track_lines
    validate.nonempty_text  settings.preset
    if settings.name? or ( settings.preset is 'default' )
      settings.name  ?= 'chrsubsetter'
      validate.nonempty_text settings.name
      @name           = settings.name
    else
      @name           = "css/#{settings.preset}"
    @track_lines  = settings.track_lines
    @preset       = settings.preset
    @_create_preset()
    return @

  #---------------------------------------------------------------------------------------------------------
  _create_preset: ->
    unless ( method = @[ "_create_preset_#{@preset}" ] )
      throw new Error "^4487^ unknown preset #{rpr @preset}"
    method.apply @
    return null


############################################################################################################
module.exports = { Chrsubsetter, grammar: new Chrsubsetter(), }







