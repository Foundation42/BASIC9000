export enum TokenType {
  Number = 'NUMBER',
  String = 'STRING',
  Identifier = 'IDENTIFIER',
  Keyword = 'KEYWORD',
  Operator = 'OPERATOR',
  Comma = 'COMMA',
  Colon = 'COLON',
  Dot = 'DOT',
  DotDotDot = 'DOT_DOT_DOT',
  Semicolon = 'SEMICOLON',
  Newline = 'NEWLINE',
  LeftParen = 'LEFT_PAREN',
  RightParen = 'RIGHT_PAREN',
  LeftBracket = 'LEFT_BRACKET',
  RightBracket = 'RIGHT_BRACKET',
  LeftBrace = 'LEFT_BRACE',
  RightBrace = 'RIGHT_BRACE',
  Comment = 'COMMENT',
  EOF = 'EOF'
}

export type TokenLiteral = string | number | boolean | null | undefined;

export interface Token {
  type: TokenType;
  lexeme: string;
  literal: TokenLiteral;
  line: number;
  column: number;
}

export class TokenizeError extends Error {
  public readonly line: number;
  public readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(`${message} (line ${line}, column ${column})`);
    this.name = 'TokenizeError';
    this.line = line;
    this.column = column;
  }
}

const KEYWORDS = new Set<string>([
  'PRINT',
  'LET',
  'INPUT',
  'IF',
  'THEN',
  'ELSE',
  'FOR',
  'TO',
  'STEP',
  'NEXT',
  'RETURN',
  'END',
  'STOP',
  'AND',
  'OR',
  'NOT',
  'MOD',
  'NEW',
  'SUB',
  'FUNCTION',
  'ASYNC',
  'AWAIT',
  'MODULE',
  'IMPORT',
  'SELECT',
  'CASE',
  'WHILE',
  'WEND',
  'DO',
  'LOOP',
  'ON',
  'ERROR',
  'TRY',
  'CATCH',
  'FINALLY',
  'DEFER',
  'RESUME',
  'ROUTINE',
  'WITH',
  'PERSISTENCE',
  'SPAWN',
  'KILL',
  'LIST',
  'DIM',
  'AS',
  'CONST',
  'TYPE',
  'STRUCT',
  'ENDTYPE',
  'REF',
  'CALL',
  'EXIT',
  'CONTINUE',
  'PROPERTY',
  'GET',
  'SET',
  'ENDSTRUCT',
  'CHANNEL',
  'BUFFER',
  'SEND',
  'RECEIVE',
  'BROADCAST',
  'SLEEP',
  'YIELD',
  'TRUE',
  'FALSE',
  'NULL',
  'PUBLIC',
  'SPREAD',
  'AIFUNC',
  'PROMPT',
  'SYSTEM',
  'EXPECT',
  'USING'
]);

const SINGLE_CHAR_OPERATORS = new Map<string, TokenType>([
  ['+', TokenType.Operator],
  ['-', TokenType.Operator],
  ['*', TokenType.Operator],
  ['/', TokenType.Operator],
  ['^', TokenType.Operator],
  ['=', TokenType.Operator],
  ['>', TokenType.Operator],
  ['<', TokenType.Operator],
  ['(', TokenType.LeftParen],
  [')', TokenType.RightParen],
  ['[', TokenType.LeftBracket],
  [']', TokenType.RightBracket],
  ['{', TokenType.LeftBrace],
  ['}', TokenType.RightBrace],
  [',', TokenType.Comma],
  [':', TokenType.Colon],
  [';', TokenType.Semicolon],
  ['?', TokenType.Operator]
]);

const MULTI_CHAR_OPERATORS = new Set(['<>', '<=', '>=']);

export interface TokenizerOptions {
  includeComments?: boolean;
}

interface Cursor {
  source: string;
  index: number;
  line: number;
  column: number;
}

/**
 * Tokenize BASIC9000 source into a flat token stream.
 */
export function tokenize(source: string, options: TokenizerOptions = {}): Token[] {
  const cursor: Cursor = {
    source,
    index: 0,
    line: 1,
    column: 1
  };

  const tokens: Token[] = [];
  const includeComments = Boolean(options.includeComments);

  while (!isAtEnd(cursor)) {
    const char = peek(cursor);
    if (char === undefined) {
      break;
    }

    if (char === '\n') {
      advance(cursor);
      tokens.push(createToken(TokenType.Newline, '\n', undefined, cursor.line - 1, 1));
      continue;
    }

    if (char === '\r') {
      advance(cursor);
      if (peek(cursor) === '\n') {
        advance(cursor);
      }
      tokens.push(createToken(TokenType.Newline, '\n', undefined, cursor.line - 1, 1));
      continue;
    }

    if (isWhitespace(char)) {
      advance(cursor);
      continue;
    }

    if (char === '"') {
      tokens.push(scanString(cursor));
      continue;
    }

    if (char === '\'') {
      const token = scanApostropheComment(cursor);
      if (includeComments) {
        tokens.push(token);
      }
      skipToLineEnd(cursor);
      continue;
    }

    if (isDigit(char)) {
      tokens.push(scanNumber(cursor));
      continue;
    }

    if (isIdentifierStart(char)) {
      const prevToken = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
      const afterDot = prevToken?.type === TokenType.Dot;
      const token = scanIdentifierOrKeyword(cursor, includeComments, afterDot);
      if (token) {
        tokens.push(token);
      }
      continue;
    }

    if (char === '.') {
      const position = { line: cursor.line, column: cursor.column };
      const nextChar = peekNext(cursor);
      const afterNextChar = cursor.source[cursor.index + 2];
      // Check for spread operator (...)
      if (nextChar === '.' && afterNextChar === '.') {
        advance(cursor); // consume first .
        advance(cursor); // consume second .
        advance(cursor); // consume third .
        tokens.push({
          type: TokenType.DotDotDot,
          lexeme: '...',
          literal: undefined,
          line: position.line,
          column: position.column
        });
      } else {
        advance(cursor);
        tokens.push({
          type: TokenType.Dot,
          lexeme: '.',
          literal: undefined,
          line: position.line,
          column: position.column
        });
      }
      continue;
    }

    const singleCharToken = SINGLE_CHAR_OPERATORS.get(char);
    if (singleCharToken) {
      const startLine = cursor.line;
      const startColumn = cursor.column;
      advance(cursor);

      if (char === '<' || char === '>') {
        const maybeEqual = peek(cursor) ?? '';
        const combined = char + maybeEqual;
        if (maybeEqual && MULTI_CHAR_OPERATORS.has(combined)) {
          advance(cursor);
          tokens.push(createToken(TokenType.Operator, combined, undefined, startLine, startColumn));
          continue;
        }
      }

      tokens.push(createToken(singleCharToken, char, undefined, startLine, startColumn));
      continue;
    }

    throw new TokenizeError(`Unexpected character '${char}'`, cursor.line, cursor.column);
  }

  tokens.push(createToken(TokenType.EOF, '', undefined, cursor.line, cursor.column));
  return tokens;
}

function scanString(cursor: Cursor): Token {
  const startLine = cursor.line;
  const startColumn = cursor.column;
  advance(cursor); // opening quote
  let lexeme = '"';
  let value = '';

  while (!isAtEnd(cursor)) {
    const char = peek(cursor);
    if (char === '"') {
      advance(cursor);
      lexeme += '"';
      if (peek(cursor) === '"') {
        // escaped quote
        advance(cursor);
        lexeme += '"';
        value += '"';
        continue;
      }
      return createToken(TokenType.String, lexeme, value, startLine, startColumn);
    }

    if (char === '\n' || char === '\r') {
      throw new TokenizeError('Unterminated string literal', cursor.line, cursor.column);
    }

    advance(cursor);
    lexeme += char;
    value += char;
  }

  throw new TokenizeError('Unterminated string literal', startLine, startColumn);
}

function scanNumber(cursor: Cursor): Token {
  const startLine = cursor.line;
  const startColumn = cursor.column;
  let lexeme = '';

  while (true) {
    const digit = peek(cursor);
    if (!isDigit(digit)) {
      break;
    }
    lexeme += digit;
    advance(cursor);
  }

  if (peek(cursor) === '.' && isDigit(peekNext(cursor))) {
    lexeme += '.';
    advance(cursor);
    while (isDigit(peek(cursor))) {
      lexeme += peek(cursor);
      advance(cursor);
    }
  }

  const exponentChar = peek(cursor);
  if (exponentChar && /[eEdD]/.test(exponentChar)) {
    const next = peekNext(cursor);
    if (next && (isDigit(next) || next === '+' || next === '-')) {
      lexeme += exponentChar;
      advance(cursor);
      if (next === '+' || next === '-') {
        lexeme += next;
        advance(cursor);
      }
      if (!isDigit(peek(cursor))) {
        throw new TokenizeError('Exponent part must include digits', cursor.line, cursor.column);
      }
      while (isDigit(peek(cursor))) {
        lexeme += peek(cursor);
        advance(cursor);
      }
    }
  }

  const value = Number(lexeme);
  if (Number.isNaN(value)) {
    throw new TokenizeError('Invalid numeric literal', startLine, startColumn);
  }

  return createToken(TokenType.Number, lexeme, value, startLine, startColumn);
}

const LOWERCASE_SCOLDS = [
  (got: string, want: string) =>
    `'${got}'? This is BASIC, not basic. Use ${want}.`,
  (got: string, want: string) =>
    `I know what you meant by '${got}', but the year is 1983 and CAPS LOCK is LAW. Use ${want}.`,
  (got: string, want: string) =>
    `?DIGNITY ERROR: '${got}' lacks the authority of ${want}. HOLD SHIFT AND TRY AGAIN.`,
  (got: string, want: string) =>
    `Nice try, but '${got}' doesn't fly here. This machine demands ${want}.`,
  (got: string, want: string) =>
    `'${got}'?! Were you raised in a UNIX terminal? We use ${want} in this house.`,
  (got: string, want: string) =>
    `Sir/Madam, this is a BASIC9000. We speak in ${want}, not '${got}'.`,
  (got: string, want: string) =>
    `CAPS LOCK is not optional — it's a way of life. '${got}' should be ${want}.`,
  (got: string, want: string) =>
    `The ghost of Kemeny and Kurtz weeps at '${got}'. They demand ${want}.`,
];

function lowercaseScold(got: string, want: string): string {
  const index = simpleHash(got) % LOWERCASE_SCOLDS.length;
  return LOWERCASE_SCOLDS[index](got, want);
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function scanIdentifierOrKeyword(cursor: Cursor, includeComments: boolean, afterDot = false): Token | null {
  const startLine = cursor.line;
  const startColumn = cursor.column;
  let lexeme = '';

  while (isIdentifierPart(peek(cursor))) {
    lexeme += peek(cursor);
    advance(cursor);
  }

  const suffix = peek(cursor);
  if (suffix && isTypeSuffix(suffix)) {
    lexeme += suffix;
    advance(cursor);
  }

  const upper = lexeme.toUpperCase();

  if (upper === 'REM') {
    if (lexeme !== 'REM' && !afterDot) {
      throw new TokenizeError(
        lowercaseScold(lexeme, 'REM'),
        startLine, startColumn
      );
    }
    if (includeComments) {
      const commentText = readCommentRemainder(cursor);
      return createToken(TokenType.Comment, `REM${commentText.raw}`, commentText.text, startLine, startColumn);
    }
    skipToLineEnd(cursor);
    return null;
  }

  if (KEYWORDS.has(upper) && !afterDot) {
    if (lexeme !== upper) {
      throw new TokenizeError(
        lowercaseScold(lexeme, upper),
        startLine, startColumn
      );
    }
    if (upper === 'TRUE') {
      return createToken(TokenType.Keyword, upper, true, startLine, startColumn);
    }
    if (upper === 'FALSE') {
      return createToken(TokenType.Keyword, upper, false, startLine, startColumn);
    }
    if (upper === 'NULL') {
      return createToken(TokenType.Keyword, upper, null, startLine, startColumn);
    }
    return createToken(TokenType.Keyword, upper, undefined, startLine, startColumn);
  }

  return createToken(TokenType.Identifier, lexeme, undefined, startLine, startColumn);
}

function scanApostropheComment(cursor: Cursor): Token {
  const startLine = cursor.line;
  const startColumn = cursor.column;
  advance(cursor); // Consume apostrophe
  const remainder = readUntilLineEnd(cursor);
  return createToken(TokenType.Comment, `'${remainder.raw}`, remainder.text, startLine, startColumn);
}

function readCommentRemainder(cursor: Cursor): { raw: string; text: string } {
  const remainder = readUntilLineEnd(cursor);
  return remainder;
}

function readUntilLineEnd(cursor: Cursor): { raw: string; text: string } {
  let raw = '';
  let text = '';
  while (!isAtEnd(cursor)) {
    const char = peek(cursor);
    if (char === '\n' || char === '\r') {
      break;
    }
    raw += char;
    advance(cursor);
    text += char;
  }
  return { raw, text: text.trimStart() };
}

function skipToLineEnd(cursor: Cursor): void {
  while (!isAtEnd(cursor)) {
    const char = peek(cursor);
    if (char === '\n' || char === '\r') {
      return;
    }
    advance(cursor);
  }
}

function isWhitespace(char: string | undefined): boolean {
  return char === ' ' || char === '\t' || char === '\f' || char === '\v';
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= '0' && char <= '9';
}

function isIdentifierStart(char: string | undefined): boolean {
  if (!char) {
    return false;
  }
  const code = char.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    char === '_' ||
    char === '#'
  );
}

function isIdentifierPart(char: string | undefined): boolean {
  if (!char) {
    return false;
  }
  const code = char.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    (code >= 48 && code <= 57) ||
    char === '_' ||
    char === '#'
  );
}

function isTypeSuffix(char: string | undefined): boolean {
  return char === '$' || char === '%' || char === '!' || char === '&' || char === '#';
}

function peek(cursor: Cursor): string | undefined {
  return cursor.source[cursor.index];
}

function peekNext(cursor: Cursor): string | undefined {
  return cursor.source[cursor.index + 1];
}

function advance(cursor: Cursor): string | undefined {
  const char = cursor.source[cursor.index];
  if (char === '\n') {
    cursor.line += 1;
    cursor.column = 1;
  } else {
    cursor.column += 1;
  }
  cursor.index += 1;
  return char;
}

function isAtEnd(cursor: Cursor): boolean {
  return cursor.index >= cursor.source.length;
}

function createToken(
  type: TokenType,
  lexeme: string,
  literal: TokenLiteral,
  line: number,
  column: number
): Token {
  return { type, lexeme, literal, line, column };
}
