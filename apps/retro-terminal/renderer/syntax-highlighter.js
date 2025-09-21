// BASIC9000 Syntax Highlighter for Terminal Display

const KEYWORDS = [
  // Core BASIC keywords
  'LET', 'PRINT', 'IF', 'THEN', 'ELSE', 'END', 'FOR', 'TO', 'NEXT', 'WHILE', 'WEND',
  'DO', 'LOOP', 'RETURN', 'REM', 'DIM', 'FUNCTION', 'SUB',
  // Modern control flow
  'SELECT', 'CASE', 'SPAWN', 'ROUTINE', 'WITH', 'TRY', 'CATCH', 'FINALLY', 'THROW',
  'EXIT', 'CALL', 'ASYNC', 'AWAIT',
  // Type system
  'TYPE', 'AS', 'PROPERTY', 'REF', 'SPREAD', 'CONST', 'NEW',
  // Data types and literals
  'TRUE', 'FALSE', 'NULL',
  // Terminal commands
  'STOP', 'RUN', 'LIST', 'CLEAR', 'HELP', 'TRACE', 'BREAK', 'DESCRIBE'
];

const BUILT_IN_FUNCTIONS = [
  'HTTP', 'JSON', 'ARRAY', 'STR', 'TIME', 'SYS', 'FS', 'TERMINAL', 'WS',
  'GET', 'POST', 'STATUS', 'PARSE', 'STRINGIFY', 'SORT', 'REVERSE', 'JOIN',
  'LENGTH', 'LEFT', 'RIGHT', 'MID', 'FIND', 'REPLACE', 'NOW', 'FORMAT',
  'SLEEP', 'PLATFORM', 'TICKS', 'READ', 'WRITE', 'DELETE', 'APPEND', 'COPY',
  'BELL', 'OVERLAY', 'CONNECT', 'SEND', 'RECEIVE', 'CLOSE',
  // AI namespace
  'AI', 'CREATE', 'CHAT', 'KEY', 'ANTHROPIC', 'OPENAI',
  // Math namespace
  'MATH', 'PI', 'E', 'SIN', 'COS', 'TAN', 'ATN', 'SQR', 'ABS', 'INT', 'RND', 'SGN',
  'EXP', 'LOG', 'SQRT', 'POW', 'FLOOR', 'CEIL', 'ROUND', 'LOG10', 'MIN', 'MAX',
  'CLAMP', 'DEG2RAD', 'RAD2DEG', 'DISTANCE',
  // Canvas namespace
  'CANVAS', 'NEW', 'SIZE', 'CLEAR', 'LINE', 'RECT', 'CIRCLE', 'ARC', 'ELLIPSE',
  'TRIANGLE', 'POLYGON', 'BEZIER', 'QUADRATIC', 'TEXT', 'FILL', 'STROKE', 'COLOR',
  'LINEWIDTH', 'LINECAP', 'LINEJOIN', 'FONT', 'TEXTALIGN', 'SAVE', 'RESTORE',
  'TRANSLATE', 'ROTATE', 'SCALE', 'TRANSFORM', 'SETTRANSFORM', 'RESETRANSFORM',
  'CLIP', 'BEGINPATH', 'CLOSEPATH', 'MOVETO', 'LINETO', 'CURVETO', 'QUADTO',
  'ARCTO', 'GRADIENT', 'PATTERN', 'IMAGE', 'GETPIXEL', 'SETPIXEL', 'IMAGEDATA',
  'PUTIMAGEDATA', 'GETIMAGEDATA', 'CREATEIMAGEDATA', 'SHADOW', 'GLOBALPHA',
  'COMPOSITE', 'BLEND', 'FILTER', 'MOUSEX', 'MOUSEY', 'CLICKED', 'SHOW', 'HIDE',
  'ZINDEX', 'DESTROY',
  // Config namespace
  'CONFIG', 'LOAD',
  // Random namespace
  'RANDOM',
  // String functions (global)
  'MID$', 'LEFT$', 'RIGHT$', 'INSTR', 'SPACE$', 'STRING$', 'STR$', 'CHR$', 'VAL', 'ASC', 'LEN'
];

const COLORS = {
  keyword: '\x1b[94m',         // Bright Blue
  string: '\x1b[32m',          // Green
  number: '\x1b[38;5;208m',    // Orange (256 color)
  identifier: '\x1b[37m',      // White
  comment: '\x1b[90m',         // Gray
  operator: '\x1b[36m',        // Cyan
  builtin: '\x1b[35m',         // Magenta
  reset: '\x1b[0m',            // Reset to default
  default: '\x1b[37m'          // White (default)
};

class SyntaxHighlighter {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.keywordPattern = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'gi');
    this.builtinPattern = new RegExp(`\\b(${BUILT_IN_FUNCTIONS.join('|')})\\b`, 'gi');
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  highlightLine(line) {
    if (!this.enabled) {
      return line;
    }

    // Handle comments first (REM or ')
    const commentMatch = line.match(/^(\s*\d+\s+)?(REM\b|')/i);
    if (commentMatch) {
      const commentStart = commentMatch.index + (commentMatch[1] || '').length;
      const beforeComment = line.substring(0, commentStart);
      const comment = line.substring(commentStart);
      return this.highlightTokens(beforeComment) + COLORS.comment + comment + COLORS.reset;
    }

    return this.highlightTokens(line);
  }

  highlightTokens(text) {
    let result = '';
    let position = 0;

    // Split into tokens first, then classify them
    // This regex matches: strings, numbers, words, operators, whitespace
    const tokens = [];
    const tokenPattern = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\d+\.?\d*)|([A-Za-z_][A-Za-z0-9_]*\$?%?#?)|([+\-*\/<>=(),\[\]{}:;])|(\s+)|(.)/g;

    let match;
    while ((match = tokenPattern.exec(text)) !== null) {
      tokens.push({
        text: match[0],
        index: match.index,
        isString: !!(match[1] || match[2]),
        isNumber: !!match[3],
        isWord: !!match[4],
        isOperator: !!match[5],
        isWhitespace: !!match[6],
        isOther: !!match[7]
      });
    }

    // Now process each token
    tokens.forEach(token => {
      if (token.isString) {
        result += COLORS.string + token.text + COLORS.reset;
      } else if (token.isNumber) {
        result += COLORS.number + token.text + COLORS.reset;
      } else if (token.isWord) {
        const upperWord = token.text.toUpperCase();
        const baseWord = upperWord.replace(/[$%#]$/, ''); // Remove type suffix
        if (KEYWORDS.includes(baseWord)) {
          result += COLORS.keyword + token.text + COLORS.reset;
        } else if (this.isBuiltinFunction(token.text)) {
          result += COLORS.builtin + token.text + COLORS.reset;
        } else {
          result += COLORS.identifier + token.text + COLORS.reset;
        }
      } else if (token.isOperator) {
        result += COLORS.operator + token.text + COLORS.reset;
      } else if (token.isWhitespace) {
        result += token.text;
      } else {
        result += COLORS.default + token.text + COLORS.reset;
      }
    });

    return result;
  }

  isBuiltinFunction(word) {
    // Check for namespace.function pattern
    const parts = word.split('.');
    if (parts.length === 2) {
      return BUILT_IN_FUNCTIONS.includes(parts[0].toUpperCase()) ||
             BUILT_IN_FUNCTIONS.includes(parts[1].toUpperCase());
    }
    return BUILT_IN_FUNCTIONS.includes(word.toUpperCase());
  }
}

// Export for use in renderer.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyntaxHighlighter;
} else {
  window.SyntaxHighlighter = SyntaxHighlighter;
}