import { tokenize, Token, TokenType, type TokenizerOptions } from './tokenizer.js';
import type {
  AssignmentStatementNode,
  AwaitExpressionNode,
  ArrayLiteralNode,
  ObjectLiteralNode,
  ObjectLiteralField,
  BooleanLiteralNode,
  BinaryExpressionNode,
  CallExpressionNode,
  IndexExpressionNode,
  EndStatementNode,
  ErrorStatementNode,
  ExitStatementNode,
  ExpressionNode,
  ExpressionStatementNode,
  ForStatementNode,
  WhileStatementNode,
  DoWhileStatementNode,
  FunctionStatementNode,
  IdentifierNode,
  IfStatementNode,
  InputStatementNode,
  LetStatementNode,
  LineNode,
  MemberExpressionNode,
  NextStatementNode,
  NullLiteralNode,
  NumberLiteralNode,
  ParameterNode,
  SpreadExpressionNode,
  NewExpressionNode,
  PrintArgument,
  PrintStatementNode,
  ProgramNode,
  RecordLiteralField,
  RecordLiteralNode,
  ReturnStatementNode,
  StopStatementNode,
  StatementNode,
  StringLiteralNode,
  SubStatementNode,
  TryCatchStatementNode,
  TypeAnnotationNode,
  TypeDeclarationNode,
  TypeFieldNode,
  UnaryExpressionNode,
  WithStatementNode,
  WithFieldNode,
  SelectCaseStatementNode,
  CaseClause,
  PropertyStatementNode,
  ConditionalExpressionNode,
  DeferStatementNode,
  DeferBlockStatementNode,
  ContinueStatementNode,
  SendStatementNode,
  RecvExpressionNode,
  SpawnExpressionNode,
  PromptTemplateNode,
  PromptTemplateSegment,
  AIFuncDeclarationNode,
  AIFuncExpectNode,
  AIFuncExpectClause,
  AIFuncNumberRangeClause,
  AIFuncLengthClause,
  AIFuncRecordConstraintClause
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

    if (this.matchKeyword('INPUT')) {
      const keyword = this.previous();
      return this.parseInputStatement(keyword);
    }

    if (this.matchKeyword('IF')) {
      const keyword = this.previous();
      return this.parseIfStatement(keyword);
    }

    if (this.matchKeyword('FOR')) {
      const keyword = this.previous();
      return this.parseForStatement(keyword);
    }
    if (this.matchKeyword('WHILE')) {
      const keyword = this.previous();
      return this.parseWhileStatement(keyword);
    }
    if (this.matchKeyword('DO')) {
      const keyword = this.previous();
      return this.parseDoWhileStatement(keyword);
    }

    if (this.matchKeyword('NEXT')) {
      const keyword = this.previous();
      return this.parseNextStatement(keyword);
    }


    if (this.matchKeyword('RETURN')) {
      const keyword = this.previous();
      // Check if RETURN has a value (for functions)
      let value: ExpressionNode | undefined;
      if (!this.checkTerminator() && !this.check(TokenType.Colon)) {
        value = this.parseExpression();
      }
      return { type: 'ReturnStatement', token: keyword, value } satisfies ReturnStatementNode;
    }

    if (this.matchKeyword('FUNCTION')) {
      const keyword = this.previous();
      return this.parseFunctionStatement(keyword);
    }

    if (this.matchKeyword('SUB')) {
      const keyword = this.previous();
      return this.parseSubStatement(keyword);
    }

    if (this.matchKeyword('AIFUNC')) {
      const keyword = this.previous();
      return this.parseAIFuncDeclaration(keyword);
    }

    if (this.matchKeyword('PROPERTY')) {
      const keyword = this.previous();
      return this.parsePropertyStatement(keyword);
    }

    if (this.matchKeyword('EXIT')) {
      const keyword = this.previous();
      return this.parseExitStatement(keyword);
    }

    if (this.matchKeyword('CONTINUE')) {
      const keyword = this.previous();
      return this.parseContinueStatement(keyword);
    }

    if (this.matchKeyword('WITH')) {
      const keyword = this.previous();
      return this.parseWithStatement(keyword);
    }

    if (this.matchKeyword('SELECT')) {
      const keyword = this.previous();
      return this.parseSelectCaseStatement(keyword);
    }

    if (this.matchKeyword('SEND')) {
      const keyword = this.previous();
      return this.parseSendStatement(keyword);
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

    if (this.matchKeyword('DEFER')) {
      const keyword = this.previous();
      return this.parseDeferStatement(keyword);
    }

    if (this.matchKeyword('ERROR')) {
      const keyword = this.previous();
      return this.parseErrorStatement(keyword);
    }

    if (this.matchKeyword('CALL')) {
      // CALL is optional syntax for calling SUBs
      // Just parse the expression statement that follows
      const expression = this.parseExpression();
      const token = this.getExpressionToken(expression);
      return { type: 'ExpressionStatement', token, expression } satisfies ExpressionStatementNode;
    }

    // Check for assignment (including member assignment like p.x = 5 and WITH field .x = 5)
    if (this.check(TokenType.Identifier) || this.check(TokenType.Dot)) {
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
    let spreadFields: string[] | undefined;

    // Check for SPREAD annotation
    if (this.matchKeyword('SPREAD')) {
      this.consume(TokenType.LeftParen, "Expected '(' after SPREAD");
      spreadFields = [];
      do {
        const fieldName = this.parseIdentifier();
        spreadFields.push(fieldName.name);
      } while (this.match(TokenType.Comma));
      this.consume(TokenType.RightParen, "Expected ')' after SPREAD fields");
    }

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

      // Allow keywords as field names in TYPE definitions
      const fieldName = this.parseFieldName();
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

    return { type: 'TypeDeclaration', token: keyword, name, fields, spreadFields } satisfies TypeDeclarationNode;
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

  private parseInputStatement(keyword: Token): InputStatementNode {
    let prompt: ExpressionNode | undefined;

    // Check if there's a prompt string
    if (this.check(TokenType.String)) {
      prompt = this.parseExpression();
      this.consume(TokenType.Comma, "Expected ',' after INPUT prompt");
    }

    // Get the variable to store the input
    const variable = this.parseIdentifier();

    return { type: 'InputStatement', token: keyword, prompt, variable };
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

  private parseWhileStatement(keyword: Token): WhileStatementNode {
    const condition = this.parseExpression();

    // Skip optional newlines after condition
    while (this.match(TokenType.Newline)) {
      // consume
    }

    const body: StatementNode[] = [];
    while (!this.isAtEnd()) {
      if (this.matchKeyword('WEND')) {
        break;
      }

      if (this.match(TokenType.Newline)) {
        continue;
      }

      body.push(this.parseStatement());
    }

    return { type: 'WhileStatement', token: keyword, condition, body };
  }

  private parseDoWhileStatement(keyword: Token): DoWhileStatementNode {
    // Skip optional newlines after DO
    while (this.match(TokenType.Newline)) {
      // consume
    }

    const body: StatementNode[] = [];
    while (!this.isAtEnd()) {
      if (this.matchKeyword('WHILE')) {
        break;
      }

      if (this.match(TokenType.Newline)) {
        continue;
      }

      body.push(this.parseStatement());
    }

    // Parse the WHILE condition at the end
    const condition = this.parseExpression();

    return { type: 'DoWhileStatement', token: keyword, condition, body };
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

  private parseAssignmentTarget(): IdentifierNode | MemberExpressionNode | WithFieldNode {
    // Check for WITH field shorthand (.field)
    if (this.check(TokenType.Dot)) {
      const dotToken = this.advance();
      const field = this.parseMemberProperty();
      return { type: 'WithField', field, token: dotToken } satisfies WithFieldNode;
    }

    const identifier = this.parseIdentifier();
    let target: IdentifierNode | MemberExpressionNode = identifier;
    while (this.match(TokenType.Dot)) {
      const property = this.parseMemberProperty();
      target = { type: 'MemberExpression', object: target, property } satisfies MemberExpressionNode;
    }
    return target;
  }

  private parseSpawnExpression(token: Token): SpawnExpressionNode {
    const routine = this.parseExpression();
    return { type: 'SpawnExpression', token, routine } satisfies SpawnExpressionNode;
  }

  private parseSendStatement(keyword: Token): SendStatementNode {
    const target = this.parseExpression();
    this.consume(TokenType.Comma, 'Expected comma after SEND target');
    const message = this.parseExpression();
    return { type: 'SendStatement', token: keyword, target, message } satisfies SendStatementNode;
  }

  private parseRecvExpression(token: Token): RecvExpressionNode {
    let timeout: ExpressionNode | undefined;

    // Check for optional timeout parameter: RECV(timeout)
    if (this.match(TokenType.LeftParen)) {
      if (!this.check(TokenType.RightParen)) {
        timeout = this.parseExpression();
      }
      this.consume(TokenType.RightParen, 'Expected ) after RECV timeout');
    }

    return { type: 'RecvExpression', token, timeout } satisfies RecvExpressionNode;
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

  private parseDeferStatement(keyword: Token): DeferStatementNode | DeferBlockStatementNode {
    // Check if this is the block form: DEFER followed by newline
    if (this.check(TokenType.Newline) || this.check(TokenType.EOF)) {
      // Block form: DEFER ... END DEFER
      const block: StatementNode[] = [];

      // Skip newlines after DEFER
      while (this.match(TokenType.Newline)) {
        // consume newlines
      }

      // Parse statements until END DEFER
      while (!this.isAtEnd()) {
        if (this.isKeyword('END') && this.peekNextKeyword('DEFER')) {
          break;
        }

        if (this.match(TokenType.Newline)) {
          continue;
        }

        block.push(this.parseStatement());
      }

      // Expect END DEFER
      if (!this.matchKeyword('END')) {
        throw new ParseError('Expected END DEFER', this.peek());
      }
      if (!this.matchKeyword('DEFER')) {
        throw new ParseError('Expected DEFER after END', this.peek());
      }

      return {
        type: 'DeferBlockStatement',
        token: keyword,
        block
      } satisfies DeferBlockStatementNode;
    } else {
      // Single statement form: DEFER <statement>
      const statement = this.parseStatement();

      return {
        type: 'DeferStatement',
        token: keyword,
        statement
      } satisfies DeferStatementNode;
    }
  }

  private parseErrorStatement(keyword: Token): ErrorStatementNode {
    const message = this.parseExpression();
    return { type: 'ErrorStatement', token: keyword, message } satisfies ErrorStatementNode;
  }

  private parseFunctionStatement(keyword: Token): FunctionStatementNode {
    const name = this.parseIdentifier();

    // Parse parameters
    this.consume(TokenType.LeftParen, 'Expected ( after function name');
    const parameters = this.parseParameterList();
    this.consume(TokenType.RightParen, 'Expected ) after parameters');

    // Parse return type if present
    let returnType: TypeAnnotationNode | undefined;
    if (this.isKeyword('AS')) {
      this.consumeKeyword('AS');
      returnType = this.parseTypeAnnotation();
    }

    // Skip newlines
    while (this.match(TokenType.Newline)) {
      // consume
    }

    // Parse function body
    const body: StatementNode[] = [];
    while (!this.isAtEnd()) {
      if (this.isKeyword('END') && this.peekNextKeyword('FUNCTION')) {
        break;
      }

      if (this.match(TokenType.Newline)) {
        continue;
      }

      body.push(this.parseStatement());
    }

    // Consume END FUNCTION
    if (!this.matchKeyword('END')) {
      throw new ParseError('Expected END FUNCTION', this.peek());
    }
    if (!this.matchKeyword('FUNCTION')) {
      throw new ParseError('Expected FUNCTION after END', this.peek());
    }

    return {
      type: 'FunctionStatement',
      token: keyword,
      name,
      parameters,
      returnType,
      body
    } satisfies FunctionStatementNode;
  }

  private parseSubStatement(keyword: Token): SubStatementNode {
    const name = this.parseIdentifier();

    // Parse parameters
    this.consume(TokenType.LeftParen, 'Expected ( after sub name');
    const parameters = this.parseParameterList();
    this.consume(TokenType.RightParen, 'Expected ) after parameters');

    // Skip newlines
    while (this.match(TokenType.Newline)) {
      // consume
    }

    // Parse sub body
    const body: StatementNode[] = [];
    while (!this.isAtEnd()) {
      if (this.isKeyword('END') && this.peekNextKeyword('SUB')) {
        break;
      }

      if (this.match(TokenType.Newline)) {
        continue;
      }

      body.push(this.parseStatement());
    }

    // Consume END SUB
    if (!this.matchKeyword('END')) {
      throw new ParseError('Expected END SUB', this.peek());
    }
    if (!this.matchKeyword('SUB')) {
      throw new ParseError('Expected SUB after END', this.peek());
    }

    return {
      type: 'SubStatement',
      token: keyword,
      name,
      parameters,
      body
    } satisfies SubStatementNode;
  }

  private parseAIFuncDeclaration(keyword: Token): AIFuncDeclarationNode {
    const receiver = this.parseIdentifier();
    this.consume(TokenType.Dot, 'Expected "." after receiver name in AIFUNC declaration');
    const name = this.parseIdentifier();

    this.consume(TokenType.LeftParen, 'Expected "(" after function name in AIFUNC declaration');
    const parameters = this.parseParameterList();
    this.consume(TokenType.RightParen, 'Expected ")" after parameters in AIFUNC declaration');

    this.consumeKeyword('AS');
    const returnType = this.parseTypeAnnotation();

    let usingExpression: ExpressionNode | undefined;
    this.skipNewlines();
    if (this.matchKeyword('USING')) {
      usingExpression = this.parseExpression();
    }

    let systemPrompt: string | undefined;
    this.skipNewlines();
    if (this.matchKeyword('SYSTEM')) {
      const systemToken = this.consume(TokenType.String, 'Expected string literal after SYSTEM');
      systemPrompt = typeof systemToken.literal === 'string' ? systemToken.literal : systemToken.lexeme;
    }

    this.skipNewlines();
    this.consumeKeyword('PROMPT');
    const promptToken = this.consume(TokenType.String, 'Expected string literal after PROMPT');
    const prompt = this.createPromptTemplate(promptToken);

    this.skipNewlines();
    let expect: AIFuncExpectNode | undefined;
    if (this.matchKeyword('EXPECT')) {
      expect = this.parseAIFuncExpect();
    }

    while (this.match(TokenType.Newline)) {
      // Allow blank lines before END AIFUNC
    }

    this.consumeKeyword('END');
    this.consumeKeyword('AIFUNC');

    const selfParameter = this.createSelfParameter(receiver);

    return {
      type: 'AIFuncDeclaration',
      token: keyword,
      receiver: {
        type: 'Identifier',
        name: receiver.name,
        token: receiver.token
      },
      name,
      selfParameter,
      parameters,
      returnType,
      usingExpression,
      systemPrompt,
      prompt,
      expect
    } satisfies AIFuncDeclarationNode;
  }

  private createSelfParameter(receiver: IdentifierNode): ParameterNode {
    const identifier: IdentifierNode = {
      type: 'Identifier',
      name: receiver.name,
      token: receiver.token
    };

    const typeToken = this.createSyntheticToken('AIAssistant', receiver.token, TokenType.Identifier);
    const typeAnnotation: TypeAnnotationNode = {
      type: 'TypeAnnotation',
      name: 'AIAssistant',
      token: typeToken
    };

    return {
      name: identifier,
      typeAnnotation,
      isRef: false,
      isVarArgs: false
    } satisfies ParameterNode;
  }

  private createPromptTemplate(token: Token): PromptTemplateNode {
    const raw = typeof token.literal === 'string' ? token.literal : token.lexeme;
    const segments: PromptTemplateSegment[] = [];
    let buffer = '';
    let index = 0;

    const flushBuffer = () => {
      if (buffer.length > 0) {
        segments.push({ type: 'text', value: buffer });
        buffer = '';
      }
    };

    while (index < raw.length) {
      if (raw[index] === '\\' && raw[index + 1] === '$' && raw[index + 2] === '{') {
        buffer += '${';
        index += 3;
        continue;
      }

      if (raw[index] === '$' && raw[index + 1] === '{') {
        flushBuffer();
        const closeIndex = raw.indexOf('}', index + 2);
        if (closeIndex === -1) {
          throw new ParseError('Unterminated ${} placeholder in PROMPT string', token);
        }
        const placeholder = raw.slice(index + 2, closeIndex).trim();
        if (!placeholder) {
          throw new ParseError('Empty ${} placeholder in PROMPT string', token);
        }
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(placeholder)) {
          throw new ParseError('Prompt placeholders must be simple identifiers', token);
        }
        const placeholderToken = this.createSyntheticToken(placeholder, token, TokenType.Identifier);
        const identifier: IdentifierNode = {
          type: 'Identifier',
          name: placeholder,
          token: placeholderToken
        };
        segments.push({ type: 'placeholder', identifier });
        index = closeIndex + 1;
        continue;
      }

      buffer += raw[index];
      index += 1;
    }

    flushBuffer();

    return {
      type: 'PromptTemplate',
      token,
      segments
    } satisfies PromptTemplateNode;
  }

  private createSyntheticToken(lexeme: string, base: Token, type: TokenType): Token {
    return {
      type,
      lexeme,
      literal: undefined,
      line: base.line,
      column: base.column
    } satisfies Token;
  }

  private parseAIFuncExpect(): AIFuncExpectNode {
    const expectToken = this.previous();
    const clauses: AIFuncExpectClause[] = [];

    this.skipNewlines();

    clauses.push(...this.parseAIFuncExpectClauses());

    return {
      token: expectToken,
      clauses
    } satisfies AIFuncExpectNode;
  }

  private parseAIFuncExpectClauses(): AIFuncExpectClause[] {
    if (this.matchIdentifierName('RANGE')) {
      return [this.parseAIFuncRangeClause()];
    }

    if (this.matchIdentifierName('LENGTH')) {
      return [this.parseAIFuncLengthClause()];
    }

    if (this.match(TokenType.LeftBrace)) {
      return this.parseAIFuncRecordClauses();
    }

    throw new ParseError('Unsupported EXPECT clause', this.peek());
  }

  private parseAIFuncRangeClause(): AIFuncNumberRangeClause {
    this.skipNewlines();
    this.consume(TokenType.LeftBracket, 'Expected "[" after RANGE');
    this.skipNewlines();
    const min = this.parseNumericLiteralValue('Expected number for RANGE lower bound');
    this.skipNewlines();
    this.consume(TokenType.Comma, 'Expected "," between RANGE bounds');
    this.skipNewlines();
    const max = this.parseNumericLiteralValue('Expected number for RANGE upper bound');
    this.skipNewlines();
    this.consume(TokenType.RightBracket, 'Expected "]" after RANGE bounds');

    if (min > max) {
      throw new ParseError('RANGE upper bound must be greater than or equal to lower bound', this.peek());
    }

    return {
      kind: 'number-range',
      min,
      max
    } satisfies AIFuncNumberRangeClause;
  }

  private parseAIFuncLengthClause(): AIFuncLengthClause {
    this.skipNewlines();
    const min = this.parseNumericLiteralValue('Expected numeric length value');
    let max = min;
    let hasRange = false;

    this.skipNewlines();
    if (this.match(TokenType.Dot) && this.match(TokenType.Dot)) {
      hasRange = true;
      this.skipNewlines();
      max = this.parseNumericLiteralValue('Expected upper bound for length range');
    }

    if (hasRange && max < min) {
      throw new ParseError('LENGTH upper bound must be greater than or equal to lower bound', this.peek());
    }

    return {
      kind: 'length',
      min,
      max: hasRange ? max : min
    } satisfies AIFuncLengthClause;
  }

  private parseAIFuncRecordClauses(): AIFuncExpectClause[] {
    const clauses: AIFuncExpectClause[] = [];
    this.skipNewlines();

    if (!this.check(TokenType.RightBrace)) {
      do {
        this.skipNewlines();
        const field = this.parseIdentifier();
        this.skipNewlines();
        this.consume(TokenType.Colon, 'Expected ":" after field name in EXPECT record clause');
        this.skipNewlines();

        if (this.matchIdentifierName('LENGTH')) {
          const constraint = this.parseAIFuncLengthClause();
          clauses.push({
            kind: 'record',
            field: field.name,
            constraint
          } satisfies AIFuncRecordConstraintClause);
        } else {
          throw new ParseError('Only LENGTH constraints are supported inside EXPECT { } for now', this.peek());
        }

        this.skipNewlines();
      } while (this.match(TokenType.Comma));
    }

    this.consume(TokenType.RightBrace, 'Expected "}" after EXPECT record constraints');
    return clauses;
  }

  private parseNumericLiteralValue(message: string): number {
    let sign = 1;
    if (this.matchOperator('+', '-')) {
      const operator = this.previous();
      sign = operator.lexeme === '-' ? -1 : 1;
    }

    const token = this.consume(TokenType.Number, message);
    const value = typeof token.literal === 'number' ? token.literal : Number(token.lexeme);
    if (Number.isNaN(value)) {
      throw new ParseError('Invalid numeric literal', token);
    }
    return sign * value;
  }

  private matchIdentifierName(name: string): boolean {
    if (this.check(TokenType.Identifier) && this.peek().lexeme.toUpperCase() === name.toUpperCase()) {
      this.advance();
      return true;
    }
    return false;
  }

  private parsePropertyStatement(keyword: Token): PropertyStatementNode {
    // Parse TypeName.PropertyName
    const typeName = this.parseIdentifier();
    this.consume(TokenType.Dot, 'Expected . after type name');
    const name = this.parseIdentifier();

    // Parse (self AS TypeName)
    this.consume(TokenType.LeftParen, 'Expected ( after property name');
    const selfParam = this.parsePropertyParameter();
    this.consume(TokenType.RightParen, 'Expected ) after parameter');

    // Parse AS ReturnType
    this.consumeKeyword('AS');
    const returnType = this.parseTypeAnnotation();

    // Parse GET or SET
    let accessorType: 'GET' | 'SET';
    if (this.matchKeyword('GET')) {
      accessorType = 'GET';
    } else if (this.matchKeyword('SET')) {
      accessorType = 'SET';
    } else {
      throw new ParseError('Expected GET or SET after property return type', this.peek());
    }

    // Skip newlines
    while (this.match(TokenType.Newline)) {
      // consume
    }

    // Parse property body
    const body: StatementNode[] = [];
    while (!this.isAtEnd()) {
      if (this.isKeyword('END') && this.peekNextKeyword('PROPERTY')) {
        break;
      }

      if (this.match(TokenType.Newline)) {
        continue;
      }

      body.push(this.parseStatement());
    }

    // Consume END PROPERTY
    if (!this.matchKeyword('END')) {
      throw new ParseError('Expected END PROPERTY', this.peek());
    }
    if (!this.matchKeyword('PROPERTY')) {
      throw new ParseError('Expected PROPERTY after END', this.peek());
    }

    return {
      type: 'PropertyStatement',
      token: keyword,
      typeName,
      name,
      selfParam,
      returnType,
      accessorType,
      body
    } satisfies PropertyStatementNode;
  }

  private parsePropertyParameter(): ParameterNode {
    const name = this.parseIdentifier();
    let typeAnnotation: TypeAnnotationNode | undefined;

    if (this.isKeyword('AS')) {
      this.consumeKeyword('AS');
      typeAnnotation = this.parseTypeAnnotation();
    }

    return {
      name,
      typeAnnotation
    };
  }

  private parseExitStatement(keyword: Token): ExitStatementNode {
    let exitType: 'SUB' | 'FUNCTION' | 'FOR';
    if (this.matchKeyword('SUB')) {
      exitType = 'SUB';
    } else if (this.matchKeyword('FUNCTION')) {
      exitType = 'FUNCTION';
    } else if (this.matchKeyword('FOR')) {
      exitType = 'FOR';
    } else {
      throw new ParseError('Expected SUB, FUNCTION, or FOR after EXIT', this.peek());
    }

    return {
      type: 'ExitStatement',
      token: keyword,
      exitType
    } satisfies ExitStatementNode;
  }

  private parseContinueStatement(keyword: Token): ContinueStatementNode {
    return {
      type: 'ContinueStatement',
      token: keyword
    } satisfies ContinueStatementNode;
  }

  private parseWithStatement(keyword: Token): WithStatementNode {
    // Parse the object expression
    const object = this.parseExpression();

    // Skip newlines
    while (this.match(TokenType.Newline)) {
      // consume
    }

    // Parse body until END WITH
    const body: StatementNode[] = [];
    while (!this.isAtEnd()) {
      if (this.isKeyword('END') && this.peekNextKeyword('WITH')) {
        break;
      }

      if (this.match(TokenType.Newline)) {
        continue;
      }

      body.push(this.parseStatement());
    }

    // Consume END WITH
    if (!this.matchKeyword('END')) {
      throw new ParseError('Expected END WITH', this.peek());
    }
    if (!this.matchKeyword('WITH')) {
      throw new ParseError('Expected WITH after END', this.peek());
    }

    return {
      type: 'WithStatement',
      token: keyword,
      object,
      body
    } satisfies WithStatementNode;
  }

  private parseSelectCaseStatement(keyword: Token): SelectCaseStatementNode {
    // Parse SELECT CASE expression
    this.consumeKeyword('CASE');
    const expression = this.parseExpression();

    // Skip newlines
    while (this.match(TokenType.Newline)) {
      // consume
    }

    const cases: CaseClause[] = [];
    let elseCase: StatementNode[] | undefined;

    // Parse CASE clauses until END SELECT
    while (!this.isAtEnd()) {
      if (this.isKeyword('END') && this.peekNextKeyword('SELECT')) {
        break;
      }

      if (this.match(TokenType.Newline)) {
        continue;
      }

      if (this.matchKeyword('CASE')) {
        // Check for CASE ELSE
        if (this.matchKeyword('ELSE')) {
          // Parse ELSE case body
          elseCase = [];
          while (!this.isAtEnd()) {
            if (this.isKeyword('CASE') || (this.isKeyword('END') && this.peekNextKeyword('SELECT'))) {
              break;
            }
            if (this.match(TokenType.Newline)) {
              continue;
            }
            elseCase.push(this.parseStatement());
          }
        } else {
          // Parse CASE values (comma-separated)
          const values: ExpressionNode[] = [];
          do {
            values.push(this.parseExpression());
          } while (this.match(TokenType.Comma));

          // Skip newlines after CASE values
          while (this.match(TokenType.Newline)) {
            // consume
          }

          // Parse CASE body
          const statements: StatementNode[] = [];
          while (!this.isAtEnd()) {
            if (this.isKeyword('CASE') || (this.isKeyword('END') && this.peekNextKeyword('SELECT'))) {
              break;
            }
            if (this.match(TokenType.Newline)) {
              continue;
            }
            statements.push(this.parseStatement());
          }

          cases.push({ values, statements });
        }
      }
    }

    // Consume END SELECT
    if (!this.matchKeyword('END')) {
      throw new ParseError('Expected END SELECT', this.peek());
    }
    if (!this.matchKeyword('SELECT')) {
      throw new ParseError('Expected SELECT after END', this.peek());
    }

    return {
      type: 'SelectCaseStatement',
      token: keyword,
      expression,
      cases,
      elseCase
    } satisfies SelectCaseStatementNode;
  }

  private parseParameterList(): ParameterNode[] {
    const parameters: ParameterNode[] = [];

    if (this.check(TokenType.RightParen)) {
      return parameters;
    }

    do {
      let isRef = false;
      let isVarArgs = false;

      // Check for REF keyword
      if (this.matchKeyword('REF')) {
        isRef = true;
      }

      // Check for varargs (...)
      if (this.matchOperator('...')) {
        isVarArgs = true;
        parameters.push({
          name: { type: 'Identifier', name: 'varargs', token: this.previous() },
          isVarArgs
        });
        break; // Varargs must be last
      }

      const name = this.parseIdentifier();
      let typeAnnotation: TypeAnnotationNode | undefined;
      let defaultValue: ExpressionNode | undefined;

      // Parse type annotation
      if (this.isKeyword('AS')) {
        this.consumeKeyword('AS');
        typeAnnotation = this.parseTypeAnnotation();
      }

      // Parse default value
      if (this.check(TokenType.Operator) && this.peek().lexeme === '=') {
        this.advance(); // consume =
        defaultValue = this.parseExpression();
      }

      parameters.push({
        name,
        typeAnnotation,
        defaultValue,
        isRef
      });
    } while (this.match(TokenType.Comma));

    return parameters;
  }

  private peekNextKeyword(keyword: string): boolean {
    const next = this.tokens[this.current + 1];
    if (!next) return false;
    return next.type === TokenType.Keyword && next.lexeme.toUpperCase() === keyword.toUpperCase();
  }

  private parseExpression(): ExpressionNode {
    return this.parseConditional();
  }

  private parseConditional(): ExpressionNode {
    let expr = this.parseOr();

    if (this.matchOperator('?')) {
      const questionToken = this.previous();
      const whenTrue = this.parseExpression();
      this.consume(TokenType.Colon, "Expected ':' after true branch in ternary expression");
      const whenFalse = this.parseExpression();

      expr = {
        type: 'ConditionalExpression',
        condition: expr,
        whenTrue,
        whenFalse,
        questionToken
      } satisfies ConditionalExpressionNode;
    }

    return expr;
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
    if (this.match(TokenType.DotDotDot)) {
      const token = this.previous();
      const target = this.parsePrimary();
      return { type: 'SpreadExpression', token, target } satisfies SpreadExpressionNode;
    }
    if (this.matchKeyword('NEW')) {
      return this.parseNewExpression();
    }
    return this.parseCallMember();
  }

  private parseNewExpression(): ExpressionNode {
    const token = this.previous(); // NEW keyword

    // Expect a type name (identifier)
    const typeName = this.consume(TokenType.Identifier, 'Expected type name after NEW') as Token;
    const typeNameNode: IdentifierNode = {
      type: 'Identifier',
      name: typeName.lexeme,
      token: typeName
    };

    // Expect opening parenthesis
    this.consume(TokenType.LeftParen, 'Expected "(" after type name in NEW expression');

    // Parse arguments
    const args: ExpressionNode[] = [];
    if (!this.check(TokenType.RightParen)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.Comma));
    }

    this.consume(TokenType.RightParen, 'Expected ")" after NEW expression arguments');

    return {
      type: 'NewExpression',
      typeName: typeNameNode,
      args,
      token
    } as NewExpressionNode;
  }

  private parseCallMember(): ExpressionNode {
    let expr = this.parsePrimary();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.match(TokenType.LeftParen)) {
        const args: ExpressionNode[] = [];
        if (!this.check(TokenType.RightParen)) {
          do {
            const arg = this.parseExpression();
            args.push(arg);
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

      if (this.match(TokenType.LeftBracket)) {
        const index = this.parseExpression();
        this.consume(TokenType.RightBracket, 'Expected closing bracket after array index');
        expr = { type: 'IndexExpression', object: expr, index } satisfies IndexExpressionNode;
        continue;
      }

      if (this.match(TokenType.DotDotDot)) {
        const token = this.previous();
        expr = { type: 'SpreadExpression', token, target: expr } satisfies SpreadExpressionNode;
        continue;
      }

      break;
    }

    return expr;
  }

  private parsePrimary(): ExpressionNode {
    // Check for WITH field shorthand (.field)
    if (this.check(TokenType.Dot)) {
      const dotToken = this.advance();
      const field = this.parseMemberProperty();
      return { type: 'WithField', field, token: dotToken } satisfies WithFieldNode;
    }

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
    if (this.matchKeyword('RECV') || this.matchKeyword('RECEIVE')) {
      const token = this.previous();
      return this.parseRecvExpression(token);
    }
    if (this.matchKeyword('SPAWN')) {
      const token = this.previous();
      return this.parseSpawnExpression(token);
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

    if (this.match(TokenType.LeftBrace)) {
      const token = this.previous();
      const fields: ObjectLiteralField[] = [];
      if (!this.check(TokenType.RightBrace)) {
        do {
          const name = this.consume(TokenType.Identifier, 'Expected field name').lexeme;
          this.consume(TokenType.Colon, 'Expected colon after field name');
          const value = this.parseExpression();
          fields.push({ name, value });
        } while (this.match(TokenType.Comma));
      }
      this.consume(TokenType.RightBrace, 'Expected closing brace');
      return { type: 'ObjectLiteral', fields, token } satisfies ObjectLiteralNode;
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

  private parseFieldName(): IdentifierNode {
    // In TYPE fields, allow keywords as field names
    if (this.match(TokenType.Identifier) || this.match(TokenType.Keyword)) {
      const token = this.previous();
      return { type: 'Identifier', name: token.lexeme, token } satisfies IdentifierNode;
    }
    throw new ParseError('Expected field name', this.peek());
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
      // Allow keywords as field names in record literals
      let name: IdentifierNode;
      if (this.check(TokenType.Keyword)) {
        const token = this.advance();
        name = { type: 'Identifier', name: token.lexeme, token };
      } else {
        name = this.parseIdentifier();
      }
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

  private getTargetToken(target: IdentifierNode | MemberExpressionNode | WithFieldNode): Token {
    if (target.type === 'Identifier') return target.token;
    if (target.type === 'MemberExpression') return target.property.token;
    return target.token; // WithField
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
      case 'IndexExpression':
        return this.getExpressionToken(expression.object);
      case 'AwaitExpression':
        return expression.keyword;
      case 'ArrayLiteral':
        return expression.token;
      case 'ObjectLiteral':
        return expression.token;
      case 'BooleanLiteral':
        return expression.token;
      case 'NullLiteral':
        return expression.token;
      case 'RecordLiteral':
        return expression.token;
      case 'WithField':
        return expression.token;
      case 'ConditionalExpression':
        return expression.questionToken;
      case 'SpreadExpression':
        return expression.token;
      case 'NewExpression':
        return expression.token;
      case 'RecvExpression':
        return expression.token;
      case 'SpawnExpression':
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
