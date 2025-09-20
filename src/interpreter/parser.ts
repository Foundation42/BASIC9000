import { tokenize, Token, TokenType, type TokenizerOptions } from './tokenizer.js';
import type {
  AssignmentStatementNode,
  AwaitExpressionNode,
  ArrayLiteralNode,
  BooleanLiteralNode,
  BinaryExpressionNode,
  CallExpressionNode,
  EndStatementNode,
  ErrorStatementNode,
  ExpressionNode,
  ExpressionStatementNode,
  ForStatementNode,
  GosubStatementNode,
  GotoStatementNode,
  IdentifierNode,
  IfStatementNode,
  LetStatementNode,
  LineNode,
  MemberExpressionNode,
  NextStatementNode,
  NullLiteralNode,
  NumberLiteralNode,
  SpawnStatementNode,
  PrintArgument,
  PrintStatementNode,
  ProgramNode,
  RecordLiteralField,
  RecordLiteralNode,
  ReturnStatementNode,
  StopStatementNode,
  StatementNode,
  StringLiteralNode,
  TryCatchStatementNode,
  TypeAnnotationNode,
  TypeDeclarationNode,
  TypeFieldNode,
  UnaryExpressionNode
} from './ast.js';

export class ParseError extends Error {
  constructor(message: string, public readonly token: Token) {
    super(`${message} (line ${token.line}, column ${token.column})`);
    this.name = 'ParseError';
  }
}

export interface ParserOptions extends TokenizerOptions {}

export function parseSource(source: string, options: ParserOptions = {}): ProgramNode {
  const tokens = tokenize(source, options);
  return parseTokens(tokens);
}

export function parseTokens(tokens: Token[]): ProgramNode {
  const parser = new Parser(tokens);
  return parser.parseProgram();
}

const TYPE_KEYWORDS = new Set(['NUMBER', 'STRING', 'BOOL', 'BOOLEAN', 'ANY', 'ARRAY', 'RECORD', 'BYTES']);

class Parser {
  private current = 0;
  private atLineStart = true;

  constructor(private readonly tokens: Token[]) {}

  public parseProgram(): ProgramNode {
    const lines: LineNode[] = [];

    while (!this.isAtEnd()) {
      if (this.match(TokenType.Newline)) {
        this.atLineStart = true;
        continue;
      }

      const lineNumber = this.atLineStart && this.check(TokenType.Number)
        ? this.consumeNumberLiteral()
        : undefined;

      this.atLineStart = false;
      const statements: StatementNode[] = [];
      if (!this.check(TokenType.Newline) && !this.check(TokenType.EOF)) {
        statements.push(this.parseStatement());
        while (this.match(TokenType.Colon)) {
          if (this.check(TokenType.Newline) || this.check(TokenType.EOF)) {
            break;
          }
          statements.push(this.parseStatement());
        }
      }

      lines.push({ lineNumber, statements });

      if (this.match(TokenType.Newline)) {
        this.atLineStart = true;
      } else if (!this.isAtEnd()) {
        this.consume(TokenType.Newline, 'Expected newline or end of input after statement group');
        this.atLineStart = true;
      }
    }

    return { type: 'Program', lines };
  }

  private parseStatement(): StatementNode {
    if (this.matchKeyword('LET')) {
      const keyword = this.previous();
      return this.parseLetStatement(keyword);
    }

    if (this.matchKeyword('TYPE')) {
      const keyword = this.previous();
      return this.parseTypeDeclaration(keyword);
    }

    if (this.matchKeyword('PRINT') || this.matchKeyword('?')) {
      const keyword = this.previous();
      return this.parsePrintStatement(keyword);
    }

    if (this.matchKeyword('IF')) {
      const keyword = this.previous();
      return this.parseIfStatement(keyword);
    }

    if (this.matchKeyword('FOR')) {
      const keyword = this.previous();
      return this.parseForStatement(keyword);
    }

    if (this.matchKeyword('NEXT')) {
      const keyword = this.previous();
      return this.parseNextStatement(keyword);
    }

    if (this.matchKeyword('GOTO')) {
      const keyword = this.previous();
      return this.parseGotoStatement(keyword);
    }

    if (this.matchKeyword('GOSUB')) {
      const keyword = this.previous();
      return this.parseGosubStatement(keyword);
    }

    if (this.matchKeyword('RETURN')) {
      const keyword = this.previous();
      return { type: 'ReturnStatement', token: keyword } satisfies ReturnStatementNode;
    }

    if (this.matchKeyword('SPAWN')) {
      const keyword = this.previous();
      return this.parseSpawnStatement(keyword);
    }

    if (this.matchKeyword('STOP')) {
      const keyword = this.previous();
      return { type: 'StopStatement', token: keyword } satisfies StopStatementNode;
    }

    if (this.matchKeyword('END')) {
      const keyword = this.previous();
      return { type: 'EndStatement', token: keyword } satisfies EndStatementNode;
    }

    if (this.matchKeyword('TRY')) {
      const keyword = this.previous();
      return this.parseTryCatchStatement(keyword);
    }

    if (this.matchKeyword('ERROR')) {
      const keyword = this.previous();
      return this.parseErrorStatement(keyword);
    }

    // Check for assignment (including member assignment like p.x = 5)
    if (this.check(TokenType.Identifier)) {
      const savedPosition = this.current;

      // Try to parse as assignment target
      try {
        this.parseAssignmentTarget(); // Just parse to check if valid
        if (this.check(TokenType.Operator) && this.peek().lexeme === '=') {
          // It's an assignment!
          this.current = savedPosition; // Reset and parse properly
          return this.parseAssignmentStatement();
        }
      } catch {
        // Not a valid assignment target
      }

      // Reset position
      this.current = savedPosition;
    }

    const expression = this.parseExpression();
    const token = this.getExpressionToken(expression);
    return { type: 'ExpressionStatement', token, expression } satisfies ExpressionStatementNode;
  }

  private parseLetStatement(keyword: Token): LetStatementNode {
    const target = this.parseAssignmentTarget();
    let typeAnnotation: TypeAnnotationNode | undefined;

    if (this.isKeyword('AS')) {
      if (target.type !== 'Identifier') {
        throw new ParseError('Type annotations require a simple identifier', this.peek());
      }
      this.consumeKeyword('AS');
      typeAnnotation = this.parseTypeAnnotation();
    }

    this.consumeOperator('=');
    const value = this.parseExpression();
    return { type: 'LetStatement', token: keyword, target, typeAnnotation, value } satisfies LetStatementNode;
  }

  private parseAssignmentStatement(): AssignmentStatementNode {
    const target = this.parseAssignmentTarget();
    const token = this.getTargetToken(target);
    this.consumeOperator('=');
    const value = this.parseExpression();
    return { type: 'AssignmentStatement', token, target, value } satisfies AssignmentStatementNode;
  }

  private parseTypeDeclaration(keyword: Token): TypeDeclarationNode {
    const name = this.parseIdentifier();
    const fields: TypeFieldNode[] = [];
    let closed = false;

    while (!this.isAtEnd()) {
      if (this.matchKeyword('ENDTYPE')) {
        closed = true;
        break;
      }

      if (this.matchKeyword('END')) {
        this.consumeKeyword('TYPE');
        closed = true;
        break;
      }

      if (this.match(TokenType.Newline)) {
        continue;
      }

      const fieldName = this.parseIdentifier();
      this.consumeKeyword('AS');
      const annotation = this.parseTypeAnnotation();
      fields.push({ name: fieldName, annotation } satisfies TypeFieldNode);

      if (this.match(TokenType.Comma)) {
        continue;
      }

      if (this.match(TokenType.Newline)) {
        continue;
      }
    }

    if (!closed) {
      throw new ParseError('Unterminated TYPE declaration', keyword);
    }

    return { type: 'TypeDeclaration', token: keyword, name, fields } satisfies TypeDeclarationNode;
  }

  private parsePrintStatement(keyword: Token): PrintStatementNode {
    const args: PrintArgument[] = [];
    let trailing: PrintStatementNode['trailing'] = 'newline';

    if (this.checkTerminator()) {
      return { type: 'PrintStatement', token: keyword, arguments: args, trailing: 'newline' };
    }

    while (true) {
      const expression = this.parseExpression();
      let separator: PrintArgument['separator'];

      if (this.match(TokenType.Comma)) {
        separator = 'comma';
        trailing = 'space';
      } else if (this.match(TokenType.Semicolon)) {
        separator = 'semicolon';
        trailing = 'none';
      }

      args.push({ expression, separator });

      if (!separator) {
        trailing = 'newline';
        break;
      }

      if (this.checkTerminator() || this.check(TokenType.Colon)) {
        break;
      }
    }

    return { type: 'PrintStatement', token: keyword, arguments: args, trailing };
  }

  private parseIfStatement(keyword: Token): IfStatementNode {
    const condition = this.parseExpression();
    this.consumeKeyword('THEN');

    // Check if this is a multi-line IF block (THEN followed by newline)
    const isBlock = this.check(TokenType.Newline);

    let thenBranch: StatementNode[];
    let elseBranch: StatementNode[] | undefined;

    if (isBlock) {
      // Multi-line block IF statement
      this.match(TokenType.Newline); // Consume the newline after THEN
      thenBranch = this.parseBlockStatements(['ELSE', 'END']);

      if (this.matchKeyword('ELSE')) {
        this.match(TokenType.Newline); // Consume optional newline after ELSE
        elseBranch = this.parseBlockStatements(['END']);
      }

      // Consume END IF
      this.consumeKeyword('END');
      this.consumeKeyword('IF');
    } else {
      // Single-line IF statement
      thenBranch = this.parseInlineStatements(['ELSE']);
      if (this.matchKeyword('ELSE')) {
        elseBranch = this.parseInlineStatements([]);
      }
    }

    return { type: 'IfStatement', token: keyword, condition, thenBranch, elseBranch };
  }

  private parseForStatement(keyword: Token): ForStatementNode {
    const iterator = this.parseIdentifier();
    this.consumeOperator('=');
    const start = this.parseExpression();
    this.consumeKeyword('TO');
    const end = this.parseExpression();
    let step: ExpressionNode | undefined;
    if (this.matchKeyword('STEP')) {
      step = this.parseExpression();
    }
    return { type: 'ForStatement', token: keyword, iterator, start, end, step };
  }

  private parseNextStatement(keyword: Token): NextStatementNode {
    let iterator: IdentifierNode | undefined;
    if (this.check(TokenType.Identifier)) {
      iterator = this.parseIdentifier();
    }
    return { type: 'NextStatement', token: keyword, iterator };
  }

  private parseGotoStatement(keyword: Token): GotoStatementNode {
    const target = this.parseExpression();
    return { type: 'GotoStatement', token: keyword, target };
  }

  private parseGosubStatement(keyword: Token): GosubStatementNode {
    const target = this.parseExpression();
    return { type: 'GosubStatement', token: keyword, target };
  }

  private parseInlineStatements(stopKeywords: string[]): StatementNode[] {
    const statements: StatementNode[] = [];
    if (this.checkTerminator() || this.checkUpcomingKeyword(stopKeywords)) {
      return statements;
    }
    statements.push(this.parseStatement());
    while (this.match(TokenType.Colon)) {
      if (this.checkTerminator() || this.checkUpcomingKeyword(stopKeywords)) {
        break;
      }
      statements.push(this.parseStatement());
    }
    return statements;
  }

  private parseBlockStatements(stopKeywords: string[]): StatementNode[] {
    const statements: StatementNode[] = [];

    // Skip any leading newlines
    while (this.match(TokenType.Newline)) {
      // Skip empty lines
    }

    while (!this.isAtEnd() && !this.checkUpcomingKeyword(stopKeywords)) {
      // Skip empty lines
      if (this.match(TokenType.Newline)) {
        continue;
      }

      // Parse the line number if present
      if (this.check(TokenType.Number) && this.atLineStart) {
        this.advance(); // Skip line number in block contexts
        const statement = this.parseStatement();
        statements.push(statement);
      } else {
        statements.push(this.parseStatement());
      }

      // Consume the newline after the statement
      if (!this.isAtEnd()) {
        this.match(TokenType.Newline);
      }
    }

    return statements;
  }

  private parseAssignmentTarget(): IdentifierNode | MemberExpressionNode {
    const identifier = this.parseIdentifier();
    let target: IdentifierNode | MemberExpressionNode = identifier;
    while (this.match(TokenType.Dot)) {
      const property = this.parseMemberProperty();
      target = { type: 'MemberExpression', object: target, property } satisfies MemberExpressionNode;
    }
    return target;
  }

  private parseSpawnStatement(keyword: Token): SpawnStatementNode {
    const routine = this.parseExpression();
    return { type: 'SpawnStatement', token: keyword, routine } satisfies SpawnStatementNode;
  }

  private parseTryCatchStatement(keyword: Token): TryCatchStatementNode {
    const tryBlock: StatementNode[] = [];
    let catchClause: TryCatchStatementNode['catchClause'] = undefined;
    let finallyBlock: StatementNode[] | undefined = undefined;

    // Skip newlines after TRY
    while (this.match(TokenType.Newline)) {
      // consume
    }

    // Parse TRY block until CATCH, FINALLY, or END TRY
    while (!this.isAtEnd()) {
      if (this.isKeyword('CATCH') || this.isKeyword('FINALLY') ||
          (this.isKeyword('END') && this.peekNextKeyword('TRY'))) {
        break;
      }

      if (this.match(TokenType.Newline)) {
        continue;
      }

      tryBlock.push(this.parseStatement());
    }

    // Parse CATCH clause if present
    if (this.matchKeyword('CATCH')) {
      const catchVar = this.parseIdentifier();

      // Skip newlines after CATCH variable
      while (this.match(TokenType.Newline)) {
        // consume
      }

      const catchBlock: StatementNode[] = [];
      while (!this.isAtEnd()) {
        if (this.isKeyword('FINALLY') ||
            (this.isKeyword('END') && this.peekNextKeyword('TRY'))) {
          break;
        }

        if (this.match(TokenType.Newline)) {
          continue;
        }

        catchBlock.push(this.parseStatement());
      }

      catchClause = {
        variable: catchVar,
        block: catchBlock
      };
    }

    // Parse FINALLY block if present
    if (this.matchKeyword('FINALLY')) {
      // Skip newlines after FINALLY
      while (this.match(TokenType.Newline)) {
        // consume
      }

      finallyBlock = [];
      while (!this.isAtEnd()) {
        if (this.isKeyword('END') && this.peekNextKeyword('TRY')) {
          break;
        }

        if (this.match(TokenType.Newline)) {
          continue;
        }

        finallyBlock.push(this.parseStatement());
      }
    }

    // Expect END TRY
    if (!this.matchKeyword('END')) {
      throw new ParseError('Expected END TRY', this.peek());
    }
    if (!this.matchKeyword('TRY')) {
      throw new ParseError('Expected TRY after END', this.peek());
    }

    return {
      type: 'TryCatchStatement',
      token: keyword,
      tryBlock,
      catchClause,
      finallyBlock
    } satisfies TryCatchStatementNode;
  }

  private parseErrorStatement(keyword: Token): ErrorStatementNode {
    const message = this.parseExpression();
    return { type: 'ErrorStatement', token: keyword, message } satisfies ErrorStatementNode;
  }

  private peekNextKeyword(keyword: string): boolean {
    const next = this.tokens[this.current + 1];
    if (!next) return false;
    return next.type === TokenType.Keyword && next.lexeme.toUpperCase() === keyword.toUpperCase();
  }

  private parseExpression(): ExpressionNode {
    return this.parseOr();
  }

  private parseOr(): ExpressionNode {
    let expr = this.parseAnd();
    while (this.matchKeyword('OR')) {
      const operator = this.previous();
      const right = this.parseAnd();
      expr = { type: 'BinaryExpression', operator, left: expr, right } satisfies BinaryExpressionNode;
    }
    return expr;
  }

  private parseAnd(): ExpressionNode {
    let expr = this.parseEquality();
    while (this.matchKeyword('AND')) {
      const operator = this.previous();
      const right = this.parseEquality();
      expr = { type: 'BinaryExpression', operator, left: expr, right } satisfies BinaryExpressionNode;
    }
    return expr;
  }

  private parseEquality(): ExpressionNode {
    let expr = this.parseComparison();
    while (this.matchOperator('=', '<>')) {
      const operator = this.previous();
      const right = this.parseComparison();
      expr = { type: 'BinaryExpression', operator, left: expr, right } satisfies BinaryExpressionNode;
    }
    return expr;
  }

  private parseComparison(): ExpressionNode {
    let expr = this.parseTerm();
    while (this.matchOperator('<', '<=', '>', '>=')) {
      const operator = this.previous();
      const right = this.parseTerm();
      expr = { type: 'BinaryExpression', operator, left: expr, right } satisfies BinaryExpressionNode;
    }
    return expr;
  }

  private parseTerm(): ExpressionNode {
    let expr = this.parseFactor();
    while (this.matchOperator('+', '-')) {
      const operator = this.previous();
      const right = this.parseFactor();
      expr = { type: 'BinaryExpression', operator, left: expr, right } satisfies BinaryExpressionNode;
    }
    return expr;
  }

  private parseFactor(): ExpressionNode {
    let expr = this.parsePower();
    while (true) {
      if (this.matchOperator('*', '/')) {
        const operator = this.previous();
        const right = this.parsePower();
        expr = { type: 'BinaryExpression', operator, left: expr, right } satisfies BinaryExpressionNode;
        continue;
      }
      if (this.matchKeyword('MOD')) {
        const operator = this.previous();
        const right = this.parsePower();
        expr = { type: 'BinaryExpression', operator, left: expr, right } satisfies BinaryExpressionNode;
        continue;
      }
      break;
    }
    return expr;
  }

  private parsePower(): ExpressionNode {
    let expr = this.parseUnary();
    while (this.matchOperator('^')) {
      const operator = this.previous();
      const right = this.parseUnary();
      expr = { type: 'BinaryExpression', operator, left: expr, right } satisfies BinaryExpressionNode;
    }
    return expr;
  }

  private parseUnary(): ExpressionNode {
    if (this.matchOperator('+', '-')) {
      const operator = this.previous();
      const operand = this.parseUnary();
      return { type: 'UnaryExpression', operator, operand } satisfies UnaryExpressionNode;
    }
    if (this.matchKeyword('NOT')) {
      const operator = this.previous();
      const operand = this.parseUnary();
      return { type: 'UnaryExpression', operator, operand } satisfies UnaryExpressionNode;
    }
    if (this.matchKeyword('AWAIT')) {
      const keyword = this.previous();
      const expression = this.parseUnary();
      return { type: 'AwaitExpression', keyword, expression } satisfies AwaitExpressionNode;
    }
    return this.parseCallMember();
  }

  private parseCallMember(): ExpressionNode {
    let expr = this.parsePrimary();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.match(TokenType.LeftParen)) {
        const args: ExpressionNode[] = [];
        if (!this.check(TokenType.RightParen)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.Comma));
        }
        const closingParen = this.consume(TokenType.RightParen, 'Expected closing parenthesis after arguments');
        expr = { type: 'CallExpression', callee: expr, args, closingParen } satisfies CallExpressionNode;
        continue;
      }

      if (this.match(TokenType.Dot)) {
        const property = this.parseMemberProperty();
        expr = { type: 'MemberExpression', object: expr, property } satisfies MemberExpressionNode;
        continue;
      }

      break;
    }

    return expr;
  }

  private parsePrimary(): ExpressionNode {
    if (this.matchKeyword('TRUE')) {
      const token = this.previous();
      return { type: 'BooleanLiteral', value: true, token } satisfies BooleanLiteralNode;
    }

    if (this.matchKeyword('FALSE')) {
      const token = this.previous();
      return { type: 'BooleanLiteral', value: false, token } satisfies BooleanLiteralNode;
    }

    if (this.matchKeyword('NULL')) {
      const token = this.previous();
      return { type: 'NullLiteral', token } satisfies NullLiteralNode;
    }

    if (this.match(TokenType.Number)) {
      const token = this.previous();
      const value = typeof token.literal === 'number' ? token.literal : Number(token.lexeme);
      return { type: 'NumberLiteral', value, token } satisfies NumberLiteralNode;
    }

    if (this.match(TokenType.String)) {
      const token = this.previous();
      const value = typeof token.literal === 'string' ? token.literal : token.lexeme;
      return { type: 'StringLiteral', value, token } satisfies StringLiteralNode;
    }

    if (this.match(TokenType.Identifier)) {
      const token = this.previous();
      const identifier = { type: 'Identifier', name: token.lexeme, token } satisfies IdentifierNode;
      if (this.match(TokenType.LeftBrace)) {
        const fields = this.parseRecordLiteralFields();
        this.consume(TokenType.RightBrace, 'Expected closing brace in record literal');
        return {
          type: 'RecordLiteral',
          typeName: identifier,
          fields,
          token
        } satisfies RecordLiteralNode;
      }
      return identifier;
    }

    if (this.match(TokenType.LeftParen)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RightParen, 'Expected closing parenthesis');
      return expr;
    }

    if (this.match(TokenType.LeftBracket)) {
      const token = this.previous();
      const elements: ExpressionNode[] = [];
      if (!this.check(TokenType.RightBracket)) {
        do {
          elements.push(this.parseExpression());
        } while (this.match(TokenType.Comma));
      }
      this.consume(TokenType.RightBracket, 'Expected closing bracket');
      return { type: 'ArrayLiteral', elements, token } satisfies ArrayLiteralNode;
    }

    throw new ParseError('Expected expression', this.peek());
  }

  private parseIdentifier(): IdentifierNode {
    if (!this.match(TokenType.Identifier)) {
      throw new ParseError('Expected identifier', this.peek());
    }
    const token = this.previous();
    return { type: 'Identifier', name: token.lexeme, token } satisfies IdentifierNode;
  }

  private parseTypeAnnotation(): TypeAnnotationNode {
    const token = this.consumeTypeNameToken('Expected type name');
    let typeArguments: TypeAnnotationNode[] | undefined;

    if (this.matchOperator('<')) {
      const args: TypeAnnotationNode[] = [];
      do {
        args.push(this.parseTypeAnnotation());
      } while (this.match(TokenType.Comma));
      this.consumeOperator('>');
      typeArguments = args;
    }

    return {
      type: 'TypeAnnotation',
      name: token.lexeme,
      token,
      typeArguments
    } satisfies TypeAnnotationNode;
  }

  private parseRecordLiteralFields(): RecordLiteralField[] {
    const fields: RecordLiteralField[] = [];
    this.skipNewlines();

    if (this.check(TokenType.RightBrace)) {
      return fields;
    }

    while (true) {
      this.skipNewlines();
      const name = this.parseIdentifier();
      this.consume(TokenType.Colon, 'Expected colon after field name');
      const value = this.parseExpression();
      fields.push({ name, value } satisfies RecordLiteralField);

      this.skipNewlines();

      if (this.match(TokenType.Comma)) {
        continue;
      }

      this.skipNewlines();

      if (this.check(TokenType.RightBrace)) {
        break;
      }

      if (this.check(TokenType.EOF)) {
        throw new ParseError('Unterminated record literal', this.peek());
      }
    }

    return fields;
  }

  private parseMemberProperty(): IdentifierNode {
    if (this.check(TokenType.Identifier) || this.check(TokenType.Keyword)) {
      const token = this.advance();
      return { type: 'Identifier', name: token.lexeme, token } satisfies IdentifierNode;
    }
    throw new ParseError('Expected identifier', this.peek());
  }

  private getTargetToken(target: IdentifierNode | MemberExpressionNode): Token {
    return target.type === 'Identifier' ? target.token : target.property.token;
  }

  private consumeNumberLiteral(): number {
    const token = this.consume(TokenType.Number, 'Expected line number');
    if (typeof token.literal !== 'number') {
      throw new ParseError('Invalid line number literal', token);
    }
    return token.literal;
  }

  private consumeKeyword(keyword: string): Token {
    if (this.matchKeyword(keyword)) {
      return this.previous();
    }
    throw new ParseError(`Expected keyword ${keyword}`, this.peek());
  }

  private consumeOperator(operator: string): Token {
    if (this.matchOperator(operator)) {
      return this.previous();
    }
    throw new ParseError(`Expected operator '${operator}'`, this.peek());
  }

  private checkUpcomingKeyword(keywords: string[]): boolean {
    if (keywords.length === 0) {
      return false;
    }
    if (!this.check(TokenType.Keyword)) {
      return false;
    }
    const lexeme = this.peek().lexeme.toUpperCase();
    return keywords.includes(lexeme);
  }

  private checkTerminator(): boolean {
    return this.check(TokenType.Newline) || this.check(TokenType.EOF);
  }


  private getExpressionToken(expression: ExpressionNode): Token {
    switch (expression.type) {
      case 'NumberLiteral':
      case 'StringLiteral':
      case 'Identifier':
        return expression.token;
      case 'UnaryExpression':
        return expression.operator;
      case 'BinaryExpression':
        return this.getExpressionToken(expression.left);
      case 'CallExpression':
        return this.getExpressionToken(expression.callee);
      case 'MemberExpression':
        return this.getExpressionToken(expression.object);
      case 'AwaitExpression':
        return expression.keyword;
      case 'ArrayLiteral':
        return expression.token;
      case 'BooleanLiteral':
        return expression.token;
      case 'NullLiteral':
        return expression.token;
      case 'RecordLiteral':
        return expression.token;
      default: {
        const exhaustiveCheck: never = expression;
        throw exhaustiveCheck;
      }
    }
  }

  private consumeTypeNameToken(message: string): Token {
    if (this.match(TokenType.Identifier)) {
      return this.previous();
    }

    if (this.match(TokenType.Keyword)) {
      const token = this.previous();
      if (!TYPE_KEYWORDS.has(token.lexeme.toUpperCase())) {
        throw new ParseError(message, token);
      }
      return token;
    }

    throw new ParseError(message, this.peek());
  }

  private skipNewlines(): void {
    let consumed = false;
    while (this.match(TokenType.Newline)) {
      consumed = true;
    }
    if (consumed) {
      this.atLineStart = true;
    }
  }

  private isKeyword(keyword: string): boolean {
    if (!this.check(TokenType.Keyword)) {
      return false;
    }
    return this.peek().lexeme.toUpperCase() === keyword.toUpperCase();
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current += 1;
      this.atLineStart = false;
    }
    return this.tokens[this.current - 1];
  }

  private match(type: TokenType): boolean {
    if (!this.check(type)) {
      return false;
    }
    this.advance();
    return true;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return type === TokenType.EOF;
    }
    return this.peek().type === type;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw new ParseError(message, this.peek());
  }

  private matchKeyword(keyword: string): boolean {
    if (!this.check(TokenType.Keyword)) {
      return false;
    }
    if (this.peek().lexeme.toUpperCase() !== keyword.toUpperCase()) {
      return false;
    }
    this.advance();
    return true;
  }

  private matchOperator(...operators: string[]): boolean {
    if (!this.check(TokenType.Operator)) {
      return false;
    }
    if (!operators.includes(this.peek().lexeme)) {
      return false;
    }
    this.advance();
    return true;
  }
}
