
'use strict'

############################################################################################################
CND                       = require 'cnd'
badge                     = 'INTERTEXT/GRAMMARS/GRAMMAR'
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
CHVTN                     = require 'chevrotain'
warn "^34448^ using 'apps/datom' instead of 'datom'"
DATOM                     = new ( require '../../../apps/datom' ).Datom { dirty: false, }
{ lets
  freeze }                = DATOM.export()
types                     = require './types'
{ isa
  validate
  type_of }               = types
Multimix                  = require 'multimix'
MAIN                      = @
warn "^33098^ should use `require '../..` instead of `../../apps/intertext`"
INTERTEXT                 = require '../../../apps/intertext'
{ rpr }                   = INTERTEXT.export()
is_given                  = ( x ) -> not [ null, undefined, NaN, '', ].includes x
#-----------------------------------------------------------------------------------------------------------
### thx to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name ###
set_class_name            = ( clasz, name ) -> Object.defineProperty clasz, 'name', { value: name, writable: false, }

#-----------------------------------------------------------------------------------------------------------
new_ref = ( d, $ ) ->
  if ( ref = d.$ )?
    ref = ref[ 1 .. ] while ref.startsWith '^'
    $  += ref
  return $

#===========================================================================================================
# PARSING & LINEARIZATION
#-----------------------------------------------------------------------------------------------------------
@on_before_tokenize = ( source      ) -> source
@on_before_parse    = ( raw_tokens  ) -> raw_tokens
@on_after_parse     = ( ds          ) -> ds

#-----------------------------------------------------------------------------------------------------------
@parse = ( source ) ->
  @source = source
  #.........................................................................................................
  ### TAINT re-introduce possibility to choose lexer mode ###
  source                  = ( @on_before_tokenize source ) ? source
  tokenization            = @lexer.tokenize source # @settings.lexer_mode
  lexer_errors            = @_adapt_lexer_errors source, tokenization
  for _, group of tokenization.groups
    for token in group
      token.$vnr  = [ token.startLine, token.startColumn, ]
      token.$     = new_ref token, '^Γ1^'
  for token in tokenization.tokens
    token.$vnr  = [ token.startLine, token.startColumn, ]
    token.$     = new_ref token, '^Γ2^'
  #.........................................................................................................
  @parser.input     = ( @on_before_parse tokenization.tokens, tokenization.groups ) ? tokenization.tokens
  cst               = @parser[ @settings.parser_start ]()
  tree              = @_adapt_tree source, cst
  errors            = { lexer: tokenization.errors, parser: @parser.errors, }
  parser_errors     = @_adapt_parser_errors source, errors.parser
  errors            = lexer_errors.concat parser_errors
  tree              = lets tree, ( tree ) -> tree.errors = errors
  datoms            = @linearize source, tree
  R                 = [ datoms..., errors..., ]
  R                 = ( @on_after_parse R ) ? R
  return freeze @_sort_nodes R

#-----------------------------------------------------------------------------------------------------------
@_sort_nodes = ( nodes ) ->
  ### R.sort ( a, b ) -> according to DATOM/VNR fair sorting ###
  return nodes.sort ( a, b ) ->
    a = a.$vnr ? [ a.start ? -Infinity, a.stop ? -Infinity, ]
    b = b.$vnr ? [ b.start ? -Infinity, b.stop ? -Infinity, ]
    DATOM.VNR.cmp_fair a, b

#-----------------------------------------------------------------------------------------------------------
@linearize = ( source, tree, level = 0 ) ->
  ### In most cases to be overridden by client grammar. ###
  { $key
    name
    start
    stop
    text } = tree
  #.........................................................................................................
  switch $key
    #.......................................................................................................
    when '^token' then yield tree
    #.......................................................................................................
    when '^document'
      yield { $key: '<document', name, start, stop, text, $vnr: [ -Infinity, ], $: ( new_ref tree, '^Γ4^' ), }
      for kid in tree.kids
        yield from @linearize source, kid, level + 1
      yield { $key: '>document', name, start: stop, stop, $vnr: [ +Infinity, ], $: ( new_ref tree, '^Γ6^' ), }
    #.......................................................................................................
    when '^node'
      $vnr = tree.kids[ 0 ]?.$vnr ? null
      if $vnr? then yield { $key: '^node', name, start, stop, text, $vnr, $: ( new_ref tree, '^Γ9^' ), }
      else          yield { $key: '^node', name, start, stop, text,       $: ( new_ref tree, '^Γ10^' ), }
    #.......................................................................................................
    else throw new Error "^445^ unknown $key #{rpr $key}" unless $key is '^node'
  #.........................................................................................................
  return null


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
@_adapt_tree = ( source, cst ) ->
  unless cst?
    $key  = '^node'
    name  = 'document'
    text  = source
    ### TAINT add VNR ###
    return freeze { $key, name, kids: [], start: 0, stop: source.length, text, $: '^Γ13^', }
  R = @_adapt_tree_inner source, cst
  if R.$key is '^node' and R.name is 'document'
    R.$key = '^document'
    delete R.name
  return freeze R

#-----------------------------------------------------------------------------------------------------------
@_adapt_tree_inner = ( source, tree ) ->
  R = datom_from_token tree
  return R unless tree.children?
  #.........................................................................................................
  R.kids    = []
  R.kidkeys = new Set()
  R.ukids   = {} # **u**nique **kids**
  for key, tokens of tree.children
    R.kidkeys.add key
    for token in tokens
      R.kids.push kid = @_adapt_tree_inner source, token
    if tokens.length is 1
      R.ukids[ key ] = kid
  R.kids.sort ( a, b ) -> a.start - b.start
  R.start   = R.kids[ 0                   ]?.start  ? -1
  R.stop    = R.kids[ R.kids?.length - 1  ]?.stop   ? -1
  R.text    = source[ R.start ... R.stop ]
  R.kidkeys = [ R.kidkeys..., ]
  return R


#===========================================================================================================
# ERROR TREATMENT
#-----------------------------------------------------------------------------------------------------------
@_adapt_lexer_errors = ( source, tokenization ) ->
  R       = []
  origin  = 'lexer'
  $key    = '^error'
  for error in tokenization.errors
    { offset
      length
      message
      line
      column  } = error
    start       = offset
    stop        = offset + length
    text        = source[ start ... stop ]
    $vnr        = if ( is_given line ) and ( is_given column ) then [ line, column, ] else null
    if message.startsWith 'extraneous' then code = 'extraneous'
    else                                    code = 'other'
    if $vnr? then R.push { $key, code, origin, message, text, start, stop, $vnr, $: '^Γ14^', }
    else          R.push { $key, code, origin, message, text, start, stop,       $: '^Γ15^', }
  return R

#-----------------------------------------------------------------------------------------------------------
vnr_from_parser_error = ( error ) ->
  R = null
  for key in [ 'token', 'previousToken', ]
    token = error[ key ]
    break if ( R = token?.$vnr )?
    if ( is_given line_nr = token.startLine ) and ( is_given col_nr = token.startColumn )
      R = [ line_nr, col_nr, ]
      break
  return R

#-----------------------------------------------------------------------------------------------------------
@_adapt_parser_errors = ( source, errors ) ->
  R           = []
  origin      = 'parser'
  $key        = '^error'
  for error in errors
    ### TAINT use `error.resyncedTokens`??? ###
    { name: chvtname
      message         } = error
    $vnr                = vnr_from_parser_error error
    ### TAINT code duplication ###
    text                = error.token.image
    start               = error.token.startOffset
    stop                = start + ( text?.length ? start )
    #.......................................................................................................
    switch chvtname
      when 'NotAllInputParsedException' then  code = 'extraneous'
      when 'MismatchedTokenException'   then  code = 'mismatch'
      when 'NoViableAltException'       then  code = 'missing'
      else                                    code = 'other'
    text    = error.previousToken.image               if isa.not_given text
    start   = error.previousToken.startOffset         if isa.not_given start
    ### TAINT code duplication ###
    start   = 0                                       if isa.not_given start
    stop    = start + ( text?.length ? 0 )            if isa.not_given stop
    text    = source[ start ... stop ]  if isa.not_given text
    if $vnr? then R.push { $key, code, chvtname, origin, message, text, start, stop, $vnr,  $: '^Γ16^', }
    else          R.push { $key, code, chvtname, origin, message, text, start, stop,        $: '^Γ17^', }
  return R

# #-----------------------------------------------------------------------------------------------------------
# @_all_children_of_token = ( token ) ->
#   ### TAINT make generally accessible to grammar? ###
#   ### TAINT tokens in groups might be missing??? ###
#   return [] unless ( c = token.children )?
#   return ( ts for _, ts of c ).flat Infinity


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
@_walk_tokendefs = ->
  if ( type_of @lexer.lexerDefinition ) is 'list'
    yield from @lexer.lexerDefinition
    return null
  for _, tokendefs of @lexer.lexerDefinition.modes
    yield from tokendefs
  return null

#-----------------------------------------------------------------------------------------------------------
@_token_map_from_lexer = ->
  ### Helper function so we can accept a `Lexer` instance to instantiate a parser. ###
  R                   = {}
  R[ tokendef.name ]  = tokendef for tokendef from @_walk_tokendefs()
  return R

#-----------------------------------------------------------------------------------------------------------
datom_from_token = ( token ) ->
  text  = token.image
  start = token.startOffset
  stop  = start + ( text?.length ? 0 )
  $vnr  = null
  $     = '^Γ18^'
  if token.$vnr?
    $     = '^Γ19^'
    $vnr  = token.$vnr
  else if ( is_given line = token.startLine ) and ( is_given column = token.startColumn )
    $     = '^Γ20^'
    $vnr = [ line, column, ]
  $ = new_ref token, $
  if ( name = token.tokenType?.name )?
    $key = '^token'
  else
    $key = '^node'
    name = token.name ? '???'
  return { $key, name, text, start, stop, $vnr, $, } if $vnr?
  return { $key, name, text, start, stop,       $, }


#===========================================================================================================
# LEXER, PARSER, GRAMMAR
#-----------------------------------------------------------------------------------------------------------
@_get_lexer_definition = ->
  modes             = {}
  R                 = { defaultMode: null, modes, }
  #.........................................................................................................
  for mode_name, mode of @lexer_modes
    R.defaultMode      ?= mode_name
    modes[ mode_name ]  = target  = []
    ### TAINT validate ###
    #.......................................................................................................
    for token_name, description of mode
      description.match = ( -> null ) if description.match is null
      validate.intertext_parsers_lexer_token_description description
      target.push new_token token_name, description
  #.........................................................................................................
  return R

#-----------------------------------------------------------------------------------------------------------
new_token = ( name, description ) ->
  ### TAINT should set `line_breaks` automatically where required by Chevrotain ###
  settings                = {}
  settings.name           = name
  settings.pattern        = description.match
  settings.switch_mode    = description.switch_mode if description.switch_mode?
  settings.pop_mode       = description.pop_mode    if description.pop_mode?
  settings.push_mode      = description.push_mode   if description.push_mode?
  settings.group          = description.group       if description.group?
  settings.skip           = description.skip        if description.skip?
  settings.line_breaks    = description.line_breaks if description.line_breaks?
  ### TAINT validate ###
  if ( switch_mode = settings.switch_mode )?
    delete settings.switch_mode
    settings.pop_mode   = true
    settings.push_mode  = switch_mode
  if settings.skip
    delete settings.skip
    if settings.group?
      throw new Error "^3382^ can only set one of `skip`, `group`; got #{rpr settings.skip}, #{rpr settings.group}"
    settings.group = CHVTN.Lexer.SKIPPED
  return CHVTN.createToken settings

#-----------------------------------------------------------------------------------------------------------
@_new_lexer = ( name ) ->
  #.........................................................................................................
  unless @description?
    return R if ( R = @settings.lexer )?
    throw new Error "^730274^ must give either `lexer_modes` in description or provide `lexer` setting"
  #.........................................................................................................
  settings =
    positionTracking:           'full',
    ensureOptimizations:        false
    lineTerminatorCharacters:   [ '\n', ],
    lineTerminatorsPattern:     /\n/g,
    errorMessageProvider:
      buildUnexpectedCharactersMessage: ( source, start, length, line, column ) ->
        ### see https://sap.github.io/chevrotain/docs/features/custom_errors.html ###
        text = source[ start ... start + length ]
        return "extraneous characters on line #{line ? '?'} column #{column ? '?'}: #{jr text}"
  #.........................................................................................................
  class R extends CHVTN.Lexer
  #.........................................................................................................
  set_class_name R, "#{name}_lexer"
  lexer_definition = @_get_lexer_definition()
  return new R lexer_definition, settings

#-----------------------------------------------------------------------------------------------------------
@_generate_summarizer = ->
  alternatives = []
  for tokendef from @_walk_tokendefs()
    do ( tokendef ) ->
      alternatives.push { ALT: -> @CONSUME tokendef }
  @summarize = ( t ) ->
    @RULE 'document', ->
      @MANY ->
        @OR alternatives
  return null

#-----------------------------------------------------------------------------------------------------------
@_new_parser = ( name ) ->
  @_generate_summarizer() unless @summarize?
  grammar = @
  #.........................................................................................................
  class R extends CHVTN.CstParser
    #.......................................................................................................
    constructor: ( lexer ) ->
      ### TAINT validate lexer ###
      tokensMap = grammar._token_map_from_lexer()
      super tokensMap, { nodeLocationTracking: 'full', recoveryEnabled: true, }
      @setup @tokensMap
      return @
    #.......................................................................................................
    setup: ( t ) ->
      grammar.summarize.call @, t, grammar
      @performSelfAnalysis()
    #.......................................................................................................
    RULE: ( rule_name, P... ) ->
      grammar.settings.parser_start ?= rule_name
      return super rule_name, P...
  #.........................................................................................................
  set_class_name R, "#{name}_parser"
  return new R grammar.lexer

#-----------------------------------------------------------------------------------------------------------
class Grammar extends Multimix
  @include MAIN,        { overwrite: false, }

  #---------------------------------------------------------------------------------------------------------
  constructor: ( name, description, settings = null ) ->
    super()
    validate.nonempty_text name
    # validate.intertext_grammar_description  description
    # validate.intertext_grammar_settings     settings
    defaults        = { parser_start: null, }
    @name           = name
    @description    = description
    @settings       = { defaults..., settings..., }
    @source         = null
    #.......................................................................................................
    ### TAINT use Multimix method? property descriptors? ###
    if description?
      @[ k ] = v for k, v of description
    #.......................................................................................................
    @lexer          = @_new_lexer   name
    @parser         = @_new_parser  name
    return @

#-----------------------------------------------------------------------------------------------------------
new_grammar = ( name, description, settings = null ) ->
  ### Same as `new Grammar name, description, settings` except that the returned instance's class name
  will be `${name}_grammar`; commonly used by grammars as shortcut to instantiate grammar without having
  to declare a derived class. ###
  class R extends Grammar
  set_class_name R, "#{name}_grammar"
  return new R name, description, settings


############################################################################################################
module.exports = { Grammar, new_grammar, }





