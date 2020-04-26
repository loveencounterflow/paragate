
'use strict'

############################################################################################################
CND                       = require 'cnd'
badge                     = 'INTERTEXT/GRAMMARS/ASCIISORTER'
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
INTERTEXT                 = require 'intertext'
{ rpr }                   = INTERTEXT.export()

#-----------------------------------------------------------------------------------------------------------
new_ref = ( this_ref, prv_ref ) ->
  ### TAINT implement as optional functionality of `DATOM.new_datom()` ###
  return ( this_ref + prv_ref ).replace /\^+/g, '^'

#-----------------------------------------------------------------------------------------------------------
dd = ( d, ref = null ) ->
  ### TAINT implement as optional functionality of `DATOM.new_datom()` ###
  # debug '^3334^', ( rpr d ), ( rpr ref.$ ), ( rpr new_ref d, ref ) if ref?
  d.$ = new_ref d.$, ref.$ if ref?.$?
  for k of d
    delete d[ k ] if d[ k ] in [ undefined, null, '', ]
  return d

#-----------------------------------------------------------------------------------------------------------
### A function to perform matches; a matcher function may, but doesn't have to use regexes; if it does,
it can use features not currently supported by Chevrotain (e.g. Unicode flag). Observe that in order to
avoid generating a new string for each character tested, we prefer to use the 'sticky flag' (`/.../y`)
and set `lastIndex`. It is probably a good idea to define patterns outside of matcher functions for better
performance. ###
match_ucletter = ( text, start ) ->
  pattern           = /[A-Z]+/y
  pattern.lastIndex = start
  if ( match = text.match pattern )?
    return [ match[ 0 ], ]
  return null

#-----------------------------------------------------------------------------------------------------------
_match_catchall_with_function = ( matcher, text, start, last_idx ) ->
  last_idx = Math.min text.length, last_idx
  for idx in [ start ... last_idx ]
    return idx if ( matcher text, idx )?
  return null

#-----------------------------------------------------------------------------------------------------------
match_catchall = ( text, start ) ->
  ###

  xxx Assuming this token matcher has been put last, try all other token matchers for all positions starting
  from the current, recording their matching index. From all indexes, find the smallest index, if any, and
  return the text (wrapped in a list) between the current index and that minimal matching index, or else
  `null`.

  Optimizations:
    * need only consider smallest index,
    * so no need to build list of results,
    * and no need for function matchers to be called after current best result.

  ###
  nearest = +Infinity
  #.........................................................................................................
  for _, { match: matcher, } of XXXX_LEXER_MODES.basic_mode
    break if ( matcher is match_catchall ) ### stop here b/c this matcher must come last or act as if so ###
    idx = null
    #.......................................................................................................
    switch type = type_of matcher
      #.....................................................................................................
      when 'regex'
        my_matcher            = new RegExp matcher, 'g'
        my_matcher.lastIndex  = start
        continue unless ( match = my_matcher.exec text )?
        idx = match.index
      #.....................................................................................................
      when 'function'
        idx = _match_catchall_with_function matcher, text, start, nearest
      else throw new Error "^47478^ unknown matcher type #{rpr type}"
    #.......................................................................................................
    if idx? and idx < nearest
      nearest = idx
  #.........................................................................................................
  return [ text[ start ... nearest ] ] ### using `Infinity` for upper bound is OK ###

#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
@lexer_modes = XXXX_LEXER_MODES =
  #.........................................................................................................
  basic_mode:
    T_lcletters:      { match: /[a-z]+/,          }
    # custom patterns should explicitly specify the line_breaks property
    T_ucletters:      { match: match_ucletter,  line_breaks: false, } ### match by function; used for advanced matching ###
    T_newline:        { match: /\n/,        }
    T_digits:         { match: /[0-8]+/,        }
    # lbrace:           { match: /[(\[{]+/,       }
    # rbrace:           { match: /[)\]}]+/,       }
    # quote:            { match: /['"]+/,         }
    T_sign:           { match: /[-+]/,          }
    T_punctuation:    { match: /[=,.;:!?]+/,    }
    T_spaces:         { match: /\s+/,           }
    T_catchalls:      { match: match_catchall, line_breaks: false, }

#-----------------------------------------------------------------------------------------------------------
### Minimal summarizer that could be generated where missing: ###
@summarize = ( t, grammar ) ->
  # debug '^33442^', rpr grammar.settings
  @RULE 'document', =>
    @MANY =>
      @OR [
        { ALT: => @SUBRULE @P_alphanumeric    }
        { ALT: => @SUBRULE @P_number          }
        { ALT: => @CONSUME t.T_lcletters      }
        { ALT: => @CONSUME t.T_ucletters      }
        { ALT: => @CONSUME t.T_newline        }
        # { ALT: => @CONSUME t.T_digits         }
        # { ALT: => @CONSUME t.lbrace           }
        # { ALT: => @CONSUME t.rbrace           }
        # { ALT: => @CONSUME t.quote            }
        { ALT: => @CONSUME t.T_punctuation    }
        { ALT: => @CONSUME t.T_spaces         }
        { ALT: => @CONSUME t.T_sign           }
        { ALT: => @CONSUME t.T_catchalls      }
        ]
  @RULE 'P_alphanumeric', =>
    @OR [
      { ALT: => @CONSUME t.T_lcletters        }
      { ALT: => @CONSUME t.T_ucletters        }
      ]
    @CONSUME t.T_digits
  @RULE 'P_number', =>
    @OPTION => @CONSUME t.T_sign
    @CONSUME t.T_digits

#-----------------------------------------------------------------------------------------------------------
@linearize = ( source, tree, level = 0 ) ->
  return null unless tree?
  #.........................................................................................................
  { name: token_name
    $key
    start
    stop
    text
    $vnr } = tree
  #.........................................................................................................
  if $key is '^token'
    switch token_name
      when 'T_lcletters' then yield dd { $key: '^text',   type: 'lower', start, stop, text, $vnr, $: '^α1^', }, tree
      when 'T_ucletters' then yield dd { $key: '^text',   type: 'upper', start, stop, text, $vnr, $: '^α2^', }, tree
      when 'T_digits'    then yield dd { $key: '^number',                start, stop, text, $vnr, $: '^α2^', }, tree
      when 'T_catchalls' then yield dd { $key: '^text',   type: 'other', start, stop, text, $vnr, $: '^α3^', }, tree
      else yield dd { $key: '^unknown', text, start, stop, $value: tree, $vnr, $: '^α4^', }, tree
    return null
  throw new Error "^445^ unknown $key #{rpr $key}" unless $key in [ '^document', '^node', ]
  #.........................................................................................................
  { ukids } = tree
  ### NOTE we assume that unique kids exist and that values are stored in source order ###
  for _, ukid of ukids
    $vnr = ukid.$vnr
    break
  #.........................................................................................................
  if $key is '^document'
    yield dd { $key: '<document', start: 0, stop: 0, source, errors: tree.errors, $vnr: [ -Infinity, ], $: '^α5^', }
    for subtree in tree.kids
      yield from @linearize source, subtree, level + 1
    x = text.length
    yield dd { $key: '>document', start: x, stop: x, $vnr: [ Infinity, ], $: '^α6^', }
    return null
  #.........................................................................................................
  debug '^3332^', ( rpr token_name ), ( rpr tree )
  switch token_name
    #.......................................................................................................
    when 'P_alphanumeric'
      $key = '^alphanumeric'
      if      tree.ukids.T_lcletters?       then type = 'lower'
      else if tree.ukids.T_ucletters?       then type = 'upper'
      yield dd { $key, type, text, start, stop, $vnr, $: '^α7^', }
    #.......................................................................................................
    when 'P_number'
      $key  = '^number'
      type  = switch tree.ukids.T_sign.text ? '+'
        when '+' then 'positive'
        when '-' then 'negative'
      yield dd { $key, type, text, start, stop, type, $vnr, $: '^α7^', }
    #.......................................................................................................
    else yield dd { $key: '^unknown', text, start, stop, $value: tree, $vnr, $: '^α8^', }
  return null


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
ASCIISORTER = @
class Asciisorter extends GRAMMAR.Grammar
  constructor: ( settings = null ) ->
    settings  = assign { use_summarize: true, }, settings
    name      = if settings.use_summarize then 'asciisorter' else 'asciiautosumm'
    super name, ASCIISORTER, settings
    unless @settings.use_summarize
      delete @linearize
      delete @summarize
      @parser = @_new_parser name
    return @

asciisorter = new Asciisorter()
module.exports = { asciisorter, Asciisorter, }




