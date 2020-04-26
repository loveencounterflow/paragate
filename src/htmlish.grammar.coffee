
'use strict'

############################################################################################################
CND                       = require 'cnd'
badge                     = 'INTERTEXT/GRAMMARS/HTMLISH'
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


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
@lexer_modes =
  #.........................................................................................................
  outside_mode:
    o_comment:        { match: /<!--[\s\S]*?-->/,                 line_breaks: true,            }
    o_cdata:          { match: /<!\[CDATA\[[\s\S]*?]]>/,                                        }
    o_doctype:        { match: /<!DOCTYPE\s+[^>]*>/,                                            }
    o_xmldecl:        { match: /<\?xml\s+[\s\S]*?\?>/,                                          }
    o_pi:             { match: /<\?[\s\S]*?\?>/,                                                }
    i_slash_open:     { match: /<\//,                             push_mode: "inside_mode",     }
    i_open:           { match: /</,                               push_mode: "inside_mode",     }
    o_text:           { match: /[^<]+/,                                                         }
  #.........................................................................................................
  inside_mode:
    i_close:          { match: />/,                               pop_mode: true,               }
    i_special_close:  { match: /\?>/,                             pop_mode: true,               }
    i_slash_close:    { match: /\/>/,                             pop_mode: true,               }
    stm_slash1:       { match: /\/(?!>)/,                         push_mode: 'slashtext_mode',  }
    i_slash:          { match: /\//,                                                            }
    v_equals:         { match: /\s*=\s*/,                         push_mode: 'value_mode',      }
    i_name:           { match: /[^\s!?=\{\[\(<\/>\)\]\}'"]+/,                                   }
    i_whitespace:     { match: /[ \t\r\n]/,                       skip: true,                   }
  #.........................................................................................................
  slashtext_mode:
    stm_slash2:       { match: /\//,                              switch_mode: "outside_mode",  }
    stm_text:         { match: /[^\/]+/,                                                        }
  #.........................................................................................................
  value_mode:
    v_value:          { match: /"[^"]*"|'[^']*'|[^>\s\/]+/,       pop_mode: true,               }

#-----------------------------------------------------------------------------------------------------------
@summarize = ( t ) ->
  # `t` is an object whose keys are token names and whose values are token patterns
  #---------------------------------------------------------------------------------------------------------
  @RULE 'document', =>
    @MANY =>
      @OR [
        { ALT: => @CONSUME t.o_doctype    }
        { ALT: => @CONSUME t.o_xmldecl    }
        { ALT: => @CONSUME t.o_pi         }
        { ALT: => @CONSUME t.o_cdata      }
        { ALT: => @CONSUME t.o_comment    }
        { ALT: => @CONSUME t.o_text       }
        { ALT: => @CONSUME t.stm_text     }
        { ALT: => @SUBRULE @osntag        }
        { ALT: => @SUBRULE @ctag          }
        { ALT: => @CONSUME t.stm_slash2   }
        ]

  #---------------------------------------------------------------------------------------------------------
  @RULE 'osntag', => ### `<a b=c>`, `<a b=c/>`, or `<a b=c/` ###
    @CONSUME t.i_open
    @CONSUME t.i_name
    @OPTION => @SUBRULE @attributes
    @OR [
      { ALT: => @CONSUME t.i_close        }
      { ALT: => @CONSUME t.i_slash_close  }
      { ALT: => @CONSUME t.stm_slash1     }
      ]

  #---------------------------------------------------------------------------------------------------------
  @RULE 'ctag', => ### `</a>` ###
    @CONSUME t.i_slash_open
    @CONSUME t.i_name
    @CONSUME t.i_close

  #---------------------------------------------------------------------------------------------------------
  @RULE 'attributes', =>
    @AT_LEAST_ONE => @SUBRULE @attribute

  #---------------------------------------------------------------------------------------------------------
  @RULE 'attribute', =>
    @CONSUME t.i_name
    @OPTION =>
      @CONSUME t.v_equals
      @CONSUME t.v_value

#-----------------------------------------------------------------------------------------------------------
dd = ( d ) ->
  ### TAINT implement as optional functionality of `DATOM.new_datom()` ###
  for k of d
    delete d[ k ] if d[ k ] in [ undefined, null, '', ]
  return d

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
      when 'o_text', 'stm_text'   then  yield dd { $key: '^text',                start, stop, text, $vnr, $: '^ѱ1^', }
      when 'stm_slash2'           then  yield dd { $key: '>tag', type: 'nctag',  start, stop, text, $vnr, $: '^ѱ2^', }
      when 'o_comment'            then  yield dd { $key: '^comment',             start, stop, text, $vnr, $: '^ѱ3^', }
      when 'o_pi'                 then  yield dd { $key: '^pi',                  start, stop, text, $vnr, $: '^ѱ4^', }
      when 'o_doctype'            then  yield dd { $key: '^doctype',             start, stop, text, $vnr, $: '^ѱ5^', }
      when 'o_cdata'
        start1  = start + 9
        stop2   = stop  - 3
        text1   = source[ start   ... start1  ]
        text2   = source[ start1  ... stop2   ]
        text3   = source[ stop2   ... stop    ]
        yield dd { $key: '<cdata', start,          stop: start1, text: text1, $vnr, $: '^ѱ6^', }
        yield dd { $key: '^text',  start: start1,  stop: stop2,  text: text2, $vnr, $: '^ѱ7^', } if text2 isnt ''
        yield dd { $key: '>cdata', start: stop2,   stop,         text: text3, $vnr, $: '^ѱ8^', }
      else yield dd { $key: '^unknown', $value: tree, $vnr, $: '^ѱ9^', }
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
    yield dd { $key: '<document', start: 0, stop: 0, source, errors: tree.errors, $vnr: [ -Infinity, ], $: '^ѱ10^', }
    for subtree in tree.kids
      yield from @linearize source, subtree, level + 1
    x = text.length
    yield dd { $key: '>document', start: x, stop: x, $vnr: [ Infinity, ], $: '^ѱ11^', }
    return null
  #.........................................................................................................
  return null unless ( name = tree.ukids?.i_name?.text )? ### may happen when parsing errors occur ###
  switch token_name
    #.......................................................................................................
    when 'osntag'
      $key = '<tag'
      if      tree.ukids.i_close?       then type = 'otag'
      else if tree.ukids.i_slash_close? then type = 'stag'; $key = '^tag'
      else if tree.ukids.stm_slash1?    then type = 'ntag'
      if ( attributes = tree.ukids.attributes )?
        atrs = {}
        for attribute in attributes.kids
          k         = attribute.ukids.i_name.text
          v         = attribute.ukids.v_value?.text ? true
          atrs[ k ] = v
        yield dd { $key, name, type, text, start, stop, atrs, $vnr, $: '^ѱ12^', }
      else
        yield dd { $key, name, type, text, start, stop, $vnr, $: '^ѱ13^', }
    #.......................................................................................................
    when 'ctag'
      yield dd { $key: '>tag', name, type: 'ctag', text, start, stop, $vnr, $: '^ѱ14^', }
    #.......................................................................................................
    else yield dd { $key: '^unknown', $value: tree, $vnr, $: '^ѱ15^', }
  return null


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
module.exports = GRAMMAR.new_grammar 'Htmlish', @




