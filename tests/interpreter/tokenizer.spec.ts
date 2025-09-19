import { describe, expect, it } from 'vitest';
import { tokenize, TokenType, TokenizeError } from '../../src/interpreter/tokenizer.js';

describe('tokenize', () => {
  it('tokenizes a simple statement with optional line number', () => {
    const tokens = tokenize('10 PRINT "HELLO"');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.Number,
      TokenType.Keyword,
      TokenType.String,
      TokenType.EOF
    ]);
    expect(tokens[0].literal).toBe(10);
    expect(tokens[2].literal).toBe('HELLO');
  });

  it('emits newline tokens preserving order', () => {
    const tokens = tokenize('PRINT "HI"\nPRINT "BYE"');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.Keyword,
      TokenType.String,
      TokenType.Newline,
      TokenType.Keyword,
      TokenType.String,
      TokenType.EOF
    ]);
  });

  it('handles type suffixes and member access', () => {
    const tokens = tokenize('LET name$ = JSON.PARSE(data$)');
    expect(tokens.map((t) => t.lexeme)).toEqual([
      'LET',
      'name$',
      '=',
      'JSON',
      '.',
      'PARSE',
      '(',
      'data$',
      ')',
      ''
    ]);
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.Keyword,
      TokenType.Identifier,
      TokenType.Operator,
      TokenType.Identifier,
      TokenType.Dot,
      TokenType.Identifier,
      TokenType.LeftParen,
      TokenType.Identifier,
      TokenType.RightParen,
      TokenType.EOF
    ]);
  });

  it('reads comments when requested', () => {
    const tokens = tokenize("PRINT ' test" , { includeComments: true });
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.Keyword,
      TokenType.Comment,
      TokenType.EOF
    ]);
    expect(tokens[1].literal).toBe('test');
  });

  it('skips comments by default', () => {
    const tokens = tokenize("REM hello world\nPRINT 1");
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.Newline,
      TokenType.Keyword,
      TokenType.Number,
      TokenType.EOF
    ]);
  });

  it('supports multi-character operators', () => {
    const tokens = tokenize('IF A <> B THEN');
    expect(tokens.map((t) => t.lexeme)).toEqual([
      'IF',
      'A',
      '<>',
      'B',
      'THEN',
      ''
    ]);
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.Keyword,
      TokenType.Identifier,
      TokenType.Operator,
      TokenType.Identifier,
      TokenType.Keyword,
      TokenType.EOF
    ]);
  });

  it('parses floating point and exponent notation', () => {
    const tokens = tokenize('VALUE = 1.5E-3');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.Identifier,
      TokenType.Operator,
      TokenType.Number,
      TokenType.EOF
    ]);
    expect(tokens[2].literal).toBeCloseTo(0.0015);
  });

  it('throws on unterminated strings', () => {
    expect(() => tokenize('PRINT "oops')).toThrow(TokenizeError);
  });
});
