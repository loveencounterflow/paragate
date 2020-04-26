
'use strict'

############################################################################################################
CND                       = require 'cnd'
badge                     = 'INTERTEXT/GRAMMARS/INDENTATION'
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
space_re                  = /\x20+/y




###
 This example demonstrate implementing a lexer for a language using python style indentation.
 This is achieved by using custom Token patterns which allow running user defined logic
 to match tokens.

 The logic is simple:
 - Indentation tokens (indent, dedent) can only be created for whitespace on the beginning of a line.
 - Change in the 'level' of the indentation will create either indent(increase) or dedent(decrease).
 - Same indentation level will be parsed as 'regular' whitespace and be ignored.
 - To implement this the previous Ident levels will be saved in a stack.

 For additional details on custom token patterns, see the docs:
 https://github.com/SAP/chevrotain/blob/master/docs/custom_token_patterns.md


###

{ createToken
  createTokenInstance
  Lexer }                 = require 'chevrotain'

# State required for matching the indentations
indent_stack = [ 0, ]

#-----------------------------------------------------------------------------------------------------------
is_empty      = ( x     ) -> x.length is 0
last_of       = ( x     ) -> x[ x.length - 1 ]
start_of_last = ( x     ) -> x[ x.length - 1 ].startOffset
in_this_order = ( x, y  ) -> ( start_of_last x ) < ( start_of_last y )

#-----------------------------------------------------------------------------------------------------------
find_last_index = ( list, predicate ) ->
  ### Copy of Lodash `findLastIndex()` ###
  R = list.length
  loop
    R--
    return R if predicate list[ R ]
  return R

#-----------------------------------------------------------------------------------------------------------
vnr_from_text_and_position = ( text, position ) ->
  ### TAINT coordinates use code units, not code points, so columns may be off in the presence of 32bit
  characters. ###
  lines       = text[ ... position ].split '\n'
  line_count  = lines.length
  return [ line_count, lines[ line_count - 1 ].length + 1, ]

#-----------------------------------------------------------------------------------------------------------
match_leading_ws = ( text, start, matched_tokens, groups, type ) ->
  ### This custom Token matcher uses Lexer context ('matched_tokens' and 'groups' arguments) combined with
  state via closure ('indent_stack' and 'lastTextMatched') to match indentation.

  @param {string} text - the full text to lex, sent by the Chevrotain lexer.
  @param {number} start - the offset (index) to start matching in the text.
  @param {IToken[]} matched_tokens - Tokens lexed so far, sent by the Chevrotain Lexer.
  @param {object} groups - Token groups already lexed, sent by the Chevrotain Lexer.
  @param {string} type - determines if this function matches indent or dedent tokens.
  @returns {*} ###
  # whisper '^119822^1', '------------------------------------------------'
  # urge '^119822-2^', "indent_stack", rpr indent_stack
  #.........................................................................................................
  nls                   = groups.nl
  no_matched_nls        = is_empty nls
  no_matched_tokens     = is_empty matched_tokens
  has_matched_nls       = not no_matched_nls
  has_matched_tokens    = not no_matched_tokens
  #.........................................................................................................
  only_nls_so_far       = no_matched_tokens and has_matched_nls
  has_matched_both      = has_matched_tokens and has_matched_nls
  is_first_line         = no_matched_tokens and no_matched_nls
  is_start_of_line      = only_nls_so_far or has_matched_both and in_this_order matched_tokens, nls
  #.........................................................................................................
  # indentation can only be matched at the start of a line.
  if ( is_first_line or is_start_of_line )
    match               = null
    level_now           = null
    level_prv           = last_of indent_stack
    space_re.lastIndex  = start
    match               = space_re.exec text
    #.......................................................................................................
    if match? then  level_now = match[ 0 ].length
    else            level_now = 0
    #.......................................................................................................
    # deeper indentation
    if ( level_now > level_prv ) and ( type is 'indent' )
      indent_stack.push level_now
      return match
    #.......................................................................................................
    # shallower indentation
    if ( level_now < level_prv ) and ( type is 'outdent' )
      mirror_idx = find_last_index indent_stack, ( space_count ) => space_count is level_now
      # any outdent must match some previous indentation level.
      if ( mirror_idx is -1 )
        throw new Error "invalid outdent at start: ${start}"
      dedent_count = indent_stack.length - mirror_idx - 1
      #.....................................................................................................
      # This is a little tricky
      # 1. If there is no match (0 level indent) than this custom token
      #    matcher would return 'null' and so we need to add all the required outdents ourselves.
      # 2. If there was match (> 0 level indent) than we need to add minus one number of outsents
      #    because the lexer would create one due to returning a none null result.
      counter_start = if match? then 1 else 0
      for _ in [ counter_start ... dedent_count ]
        # info '^119822-3^', "pop", rpr indent_stack
        indent_stack.pop()
        # info '^119822-4^', "pop", rpr indent_stack
        $vnr = vnr_from_text_and_position text, start
        dedent_token = createTokenInstance dedent, '', start, start, $vnr[ 0 ], null, $vnr[ 1 ]
        dedent_token.$vnr = $vnr
        dedent_token.$    = '^i1^'
        matched_tokens.push dedent_token
      #.....................................................................................................
      # even though we are adding fewer outdents directly we still need to update the indent stack fully.
      # info '^119822-5^', "pop", rpr indent_stack
      indent_stack.pop() if counter_start is 1
      # info '^119822-6^', "pop", rpr indent_stack
      # debug '^119822-7^', "indent_stack", rpr indent_stack
      return match
    # same indent, this should be lexed as simple whitespace and ignored
    # debug '^119822-8^', "indent_stack", rpr indent_stack
    return null
  # indentation cannot be matched under other circumstances
  # debug '^119822-9^', "indent_stack", rpr indent_stack
  return null

#-----------------------------------------------------------------------------------------------------------
match_indent  = ( text, start, matched_tokens, groups ) -> match_leading_ws text, start, matched_tokens, groups, 'indent'
match_dedent  = ( text, start, matched_tokens, groups ) -> match_leading_ws text, start, matched_tokens, groups, 'outdent'

# #-----------------------------------------------------------------------------------------------------------
# match_blank = ( text, start, matched_tokens, groups ) ->
#   debug '^334^', rpr ( ( t.tokenType?.name ? '???' ) for t in matched_tokens )
#   debug '^334^', rpr ( ( t.tokenType?.name ? '???' ) for t in groups.nl )
#   debug '^334^', rpr ( ( t.image ? '???' ) for t in groups.nl )
#   ### TAINT WIP ###
#   #^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#   # info '^119822-3^', "match", rpr match
#   xxx_pattern           = /(?<blank>\x20*)(?=\n|$)/y
#   xxx_pattern.lastIndex = start
#   if ( match = text.match xxx_pattern )?
#     info '^119822-3^', "blank", rpr match
#     # text  = match.groups.blank
#     # stop  = start + text.length
#     # ( groups.nl ?= [] ).push createTokenInstance blank, text, start, stop
#     # return match
#   return null

#-----------------------------------------------------------------------------------------------------------
# indentation tokens must appear before Spaces, otherwise all indentation will always be consumed as spaces.
# dedent must appear before indent for handling zero spaces outdents.
# By setting group of newlines to "nl" they are saved in the lexer result
# and thus we can check before creating an indentation token that the last token matched was a newline.
token_defs = [
  # blank   = createToken { name: 'blank',    pattern: match_blank, }
  newline = createToken { name: 'T_newline',  pattern: /\n|\r\n?/, group: 'nl', }
  dedent  = createToken { name: 'T_dedent',   pattern: match_dedent,  line_breaks: false, }
  indent  = createToken { name: 'T_indent',   pattern: match_indent,  line_breaks: false, }
  line    = createToken { name: 'T_line',     pattern: /[^\n]+/, }
  ]

#-----------------------------------------------------------------------------------------------------------
indentation_lexer = new Lexer token_defs, { positionTracking: 'full', ensureOptimizations: false, }


# #-----------------------------------------------------------------------------------------------------------
# @summarize = ( t, grammar ) ->
#   #---------------------------------------------------------------------------------------------------------
#   @RULE 'document', =>
#     @MANY =>
#       @OR [
#         # { ALT: => @SUBRULE @indent_line_and_nl  }
#         # { ALT: => @SUBRULE @line_and_nl  }
#         # { ALT: => @CONSUME t.newline  }
#         # { ALT: => @CONSUME t.dedent  }
#         # { ALT: => @CONSUME t.indent   }
#         # { ALT: => @CONSUME t.line     }
#         # { ALT: => @SUBRULE @P_indent_line_and_nl }
#         # { ALT: => @SUBRULE @P_line_and_nl        }
#         { ALT: => @SUBRULE @P_newline            }
#         { ALT: => @SUBRULE @P_dedent             }
#         { ALT: => @SUBRULE @P_indent             }
#         { ALT: => @SUBRULE @P_line               }
#         ]
#   #---------------------------------------------------------------------------------------------------------
#   @RULE 'P_indent_line_and_nl', =>
#     @CONSUME t.T_indent
#     @CONSUME t.T_line
#     @CONSUME t.T_newline
#   #---------------------------------------------------------------------------------------------------------
#   @RULE 'P_line_and_nl', =>
#     @CONSUME t.T_line
#     @CONSUME t.T_newline
#   #---------------------------------------------------------------------------------------------------------
#   @RULE 'P_newline',  => @CONSUME t.T_newline
#   @RULE 'P_dedent',   => @CONSUME t.T_dedent
#   @RULE 'P_indent',   => @CONSUME t.T_indent
#   @RULE 'P_line',     => @CONSUME t.T_line
#   return null

#-----------------------------------------------------------------------------------------------------------
### TAINT inplement in `datom/vnr` ###
XXX_DATOM_VNR_append = ( d, nr ) ->
  # validate.vnr d if @settings.validate
  return [ d..., nr, ]

#-----------------------------------------------------------------------------------------------------------
@linearize = ( source, tree, level = 0 ) ->
  # R = [ ( @get_my_prototype().linearize source, tree, level )..., ]
  # if level is 0
  #   for kid in tree.kids
  #     debug '^220998^', rpr kid
  for d from @get_my_prototype().linearize source, tree, level
    # debug '^387^', rpr d
    yield d
  position  = @source.length
  nr        = 0
  while indent_stack.length > 1
    indent_stack.pop()
    nr++
    $vnr = [ +Infinity, -nr, ]
    yield { $key: '^token', name: 'T_dedent', start: position, stop: position, text: '', $vnr, $: '^i4^', }
  return null

#-----------------------------------------------------------------------------------------------------------
sort_chevrotain_tokens = ( tokens ) ->
  ### TAINT use VNR to sort ###
  tokens.sort ( a, b ) ->
    return a.endOffset - b.endOffset if ( a.startOffset is b.startOffset )
    return a.startOffset - b.startOffset
  return tokens


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
MAIN = @
class Indention_grammar extends GRAMMAR.Grammar
  @include MAIN, { overwrite: true, }

  #---------------------------------------------------------------------------------------------------------
  constructor: ( settings = null ) ->
    super 'indentation_grammar', null, { lexer: indentation_lexer, }
    return @

  #---------------------------------------------------------------------------------------------------------
  on_before_tokenize:  ( raw_tokens ) ->
    indent_stack.length = 1
    return null

  #---------------------------------------------------------------------------------------------------------
  on_before_parse: ( tokens, groups ) ->
    ### TAINT maybe provide API to merge tokens with groups ###
    tokens.splice tokens.length, 0, groups.nl...
    sort_chevrotain_tokens tokens
    return tokens

indentation_grammar = new Indention_grammar()
module.exports      = { indentation_grammar, Indention_grammar, }







