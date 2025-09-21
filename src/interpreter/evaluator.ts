import type {
  ArrayLiteralNode,
  ObjectLiteralNode,
  IndexExpressionNode,
  AssignmentStatementNode,
  BinaryExpressionNode,
  CallExpressionNode,
  ExpressionNode,
  ExitStatementNode,
  ForStatementNode,
  FunctionStatementNode,
  IdentifierNode,
  IfStatementNode,
  InputStatementNode,
  LetStatementNode,
  LineNode,
  MemberExpressionNode,
  NextStatementNode,
  PrintStatementNode,
  ProgramNode,
  RecordLiteralNode,
  ReturnStatementNode,
  SpawnStatementNode,
  StatementNode,
  SubStatementNode,
  TryCatchStatementNode,
  ErrorStatementNode,
  TypeAnnotationNode,
  TypeDeclarationNode,
  UnaryExpressionNode,
  WithStatementNode,
  WithFieldNode,
  SelectCaseStatementNode,
  PropertyStatementNode,
  ConditionalExpressionNode,
  NewExpressionNode,
  DeferStatementNode,
  DeferBlockStatementNode,
  ContinueStatementNode,
  ParameterNode
} from './ast.js';
import {
  HostEnvironment,
  type HostFunctionContext,
  isHostFunction,
  isHostNamespace
} from './host.js';
import { createDefaultHostEnvironment } from './host-defaults.js';
import { RuntimeRecordValue, RefValue, isRecordValue, type RuntimeValue, type UserFunctionValue, type BoundFunctionValue } from './runtime-values.js';
import { parseSource, type ParserOptions } from './parser.js';
import type { Token } from './tokenizer.js';

export interface ExecutionOptions {
  readonly maxSteps?: number;
  readonly maxCallDepth?: number;
  readonly hostEnvironment?: HostEnvironment;
  readonly inputHandler?: () => Promise<string>;
}

export interface ExecutionResult {
  readonly outputs: readonly string[];
  readonly variables: Readonly<Record<string, RuntimeValue>>;
  readonly halted?: 'END' | 'STOP';
}

export class RuntimeError extends Error {
  constructor(message: string, public readonly token: Token) {
    super(`${message} (line ${token.line}, column ${token.column})`);
    this.name = 'RuntimeError';
  }
}

export async function executeProgram(
  program: ProgramNode,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const context = new ExecutionContext(options);
  const evaluator = new Evaluator(program, context, options);
  await evaluator.run();
  return context.finalize(evaluator.haltReason);
}

export async function executeSource(
  source: string,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  throw new Error('executeSource requires parsed program; use parseSource first.');
}

export class InterpreterSession {
  private readonly context: ExecutionContext;
  private haltReason: 'END' | 'STOP' | undefined;

  constructor(private readonly options: ExecutionOptions = {}) {
    this.context = new ExecutionContext(options);
  }

  public async run(source: string, parserOptions: ParserOptions = {}): Promise<ExecutionResult> {
    const program = parseSource(source, parserOptions);
    const evaluator = new Evaluator(program, this.context, this.options);
    await evaluator.run();
    this.haltReason = evaluator.haltReason;
    const result = this.context.finalize(this.haltReason);
    this.haltReason = undefined;
    return result;
  }

  public reset(): void {
    this.context.reset();
    this.haltReason = undefined;
  }
}

interface FunctionOverload {
  func: UserFunctionValue;
  signature: string;
  parameterTypes: string[];
}

class ExecutionContext {
  private readonly variables = new Map<string, RuntimeValue>();
  private readonly functions = new Map<string, FunctionOverload[]>(); // Function name -> overloads
  private readonly outputs: string[] = [];
  private currentPrintBuffer = '';
  private hasPendingBuffer = false;
  private readonly routines = new Set<string>();
  private readonly types = new Map<string, RuntimeTypeDefinition>();
  public deferStack: Array<{ type: 'statement', statement: StatementNode } | { type: 'block', statements: StatementNode[] }> = [];

  constructor(private readonly options: ExecutionOptions = {}) {}

  public getVariable(name: string): RuntimeValue {
    const key = normalizeIdentifier(name);
    if (this.variables.has(key)) {
      const value = this.variables.get(key)!;
      // If it's a RefValue, return the actual value it references
      if (value instanceof RefValue) {
        return value.get();
      }
      return value;
    }
    return defaultValueForIdentifier(name);
  }

  public getVariableRef(name: string): RuntimeValue | undefined {
    const key = normalizeIdentifier(name);
    return this.variables.get(key);
  }

  public setVariable(name: string, value: RuntimeValue, token: Token): void {
    const key = normalizeIdentifier(name);
    const existing = this.variables.get(key);

    // If the existing value is a RefValue, update the referenced value
    if (existing instanceof RefValue) {
      existing.set(value);
      return;
    }

    // If we're storing a RefValue directly (for REF parameters), store it as-is
    if (value instanceof RefValue) {
      this.variables.set(key, value);
      return;
    }

    const coerced = coerceValueForIdentifier(name, value, token);
    this.variables.set(key, coerced);
  }

  public setVariableWithType(name: string, value: RuntimeValue, typeName: string, token: Token): void {
    const key = normalizeIdentifier(name);
    const existing = this.variables.get(key);

    // If the existing value is a RefValue, update the referenced value
    if (existing instanceof RefValue) {
      existing.set(value);
      return;
    }

    // Don't coerce based on name when we have an explicit type
    // Just store the value as-is (runtime will handle type checking if needed)
    this.variables.set(key, value);
  }

  public hasVariable(name: string): boolean {
    const key = normalizeIdentifier(name);
    return this.variables.has(key);
  }

  private getParameterTypeSignature(parameters: readonly ParameterNode[]): string[] {
    return parameters.map(param => {
      if (param.typeAnnotation) {
        return param.typeAnnotation.name;
      }
      // For untyped parameters, use default BASIC typing rules
      const name = param.name.name;
      if (name.endsWith('$')) return 'STRING';
      if (name.endsWith('%')) return 'NUMBER';
      return 'ANY'; // Default type
    });
  }

  public registerFunction(func: UserFunctionValue): void {
    const funcName = normalizeIdentifier(func.name);
    const paramTypes = this.getParameterTypeSignature(func.parameters);
    const signature = `${func.name}(${paramTypes.join(', ')})`;

    const overload: FunctionOverload = {
      func,
      signature,
      parameterTypes: paramTypes
    };

    if (!this.functions.has(funcName)) {
      this.functions.set(funcName, []);
    }

    const overloads = this.functions.get(funcName)!;

    // Check for exact duplicate signatures
    const existingOverload = overloads.find(o =>
      o.parameterTypes.length === paramTypes.length &&
      o.parameterTypes.every((type, i) => type === paramTypes[i])
    );

    if (existingOverload) {
      throw new Error(`Function '${signature}' is already defined`);
    }

    overloads.push(overload);

    // For backwards compatibility, also store in variables map if it's the first overload
    if (overloads.length === 1) {
      this.variables.set(funcName, func);
    }
  }

  public findBestFunction(name: string, argTypes: string[]): UserFunctionValue | undefined {
    const funcName = normalizeIdentifier(name);
    const overloads = this.functions.get(funcName);

    if (!overloads || overloads.length === 0) {
      return undefined;
    }

    // Find exact matches first
    const exactMatches = overloads.filter(overload =>
      overload.parameterTypes.length === argTypes.length &&
      overload.parameterTypes.every((paramType, i) =>
        paramType === 'ANY' || argTypes[i] === 'ANY' || paramType === argTypes[i]
      )
    );

    if (exactMatches.length === 1) {
      return exactMatches[0].func;
    }

    if (exactMatches.length > 1) {
      const signatures = exactMatches.map(m => m.signature).join(', ');
      throw new Error(`Ambiguous UFCS call '${name}' with receiver ${argTypes[0] || 'unknown'}; candidates: ${signatures}`);
    }

    // If no exact match, return the first overload for backwards compatibility
    return overloads[0].func;
  }

  public getAllFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  public saveScope(): Map<string, RuntimeValue> {
    return new Map(this.variables);
  }

  public restoreScope(saved: Map<string, RuntimeValue>): void {
    this.variables.clear();
    for (const [key, value] of saved) {
      this.variables.set(key, value);
    }
  }

  public saveDeferScope(): Array<{ type: 'statement', statement: StatementNode } | { type: 'block', statements: StatementNode[] }> {
    return [...this.deferStack];
  }

  public restoreDeferScope(saved: Array<{ type: 'statement', statement: StatementNode } | { type: 'block', statements: StatementNode[] }>): void {
    this.deferStack = [...saved];
  }

  public writePrint(args: string[], trailing: PrintStatementNode['trailing']): void {
    if (!this.hasPendingBuffer) {
      this.currentPrintBuffer = '';
      this.hasPendingBuffer = true;
    }

    this.currentPrintBuffer += args.join('');

    if (trailing === 'space') {
      this.currentPrintBuffer += ' ';
      return;
    }

    if (trailing === 'none') {
      return;
    }

    this.outputs.push(this.currentPrintBuffer);
    this.currentPrintBuffer = '';
    this.hasPendingBuffer = false;
  }

  public flush(): void {
    if (this.hasPendingBuffer && this.currentPrintBuffer.length > 0) {
      this.outputs.push(this.currentPrintBuffer);
    }
    this.currentPrintBuffer = '';
    this.hasPendingBuffer = false;
  }

  public async readInput(): Promise<string> {
    // Flush any pending output before reading input
    this.flush();

    // Use the input handler if provided, otherwise return empty string
    if (this.options.inputHandler) {
      return await this.options.inputHandler();
    }

    // Default behavior: return empty string
    // In a real implementation, this would read from stdin or show a prompt
    return '';
  }

  public finalize(haltReason?: 'END' | 'STOP'): ExecutionResult {
    this.flush();
    const result: ExecutionResult = {
      outputs: this.outputs.slice(),
      variables: Object.fromEntries(this.variables.entries()),
      halted: haltReason
    };
    this.outputs.length = 0;
    this.currentPrintBuffer = '';
    this.hasPendingBuffer = false;
    return result;
  }

  public reset(): void {
    this.variables.clear();
    this.outputs.length = 0;
    this.currentPrintBuffer = '';
    this.hasPendingBuffer = false;
    this.routines.clear();
    this.types.clear();
  }

  public spawnRoutine(name: string): boolean {
    const key = normalizeIdentifier(name);
    if (this.routines.has(key)) {
      return false;
    }
    this.routines.add(key);
    return true;
  }

  public defineType(declaration: TypeDeclarationNode): void {
    const typeName = declaration.name.name;
    if (this.types.has(typeName)) {
      throw new RuntimeError(`Type '${typeName}' is already defined`, declaration.name.token);
    }

    const fieldOrder: string[] = [];
    const fieldMap = new Map<string, RuntimeTypeField>();

    for (const field of declaration.fields) {
      const fieldName = field.name.name;
      if (fieldMap.has(fieldName)) {
        throw new RuntimeError(
          `Duplicate field '${fieldName}' in TYPE ${typeName}`,
          field.name.token
        );
      }
      fieldOrder.push(fieldName);
      fieldMap.set(fieldName, {
        name: fieldName,
        annotation: field.annotation
      });
    }

    this.types.set(typeName, {
      name: typeName,
      fieldOrder,
      fields: fieldMap,
      spreadFields: declaration.spreadFields
    });
  }

  public getTypeDefinition(name: string): RuntimeTypeDefinition | undefined {
    return this.types.get(name);
  }
}

class Evaluator {
  private readonly lineIndexByNumber = new Map<number, number>();
  private readonly forBindings = new Map<string, ForBinding>();
  private readonly forStack: ForFrame[] = [];
  private readonly hostEnvironment: HostEnvironment;
  private stepCount = 0;
  public haltReason: 'END' | 'STOP' | undefined;
  private readonly withStack: RuntimeValue[] = [];

  constructor(
    private readonly program: ProgramNode,
    private readonly context: ExecutionContext,
    private readonly options: ExecutionOptions
  ) {
    this.hostEnvironment = options.hostEnvironment ?? createDefaultHostEnvironment();
    program.lines.forEach((line, index) => {
      if (typeof line.lineNumber === 'number') {
        this.lineIndexByNumber.set(line.lineNumber, index);
      }
    });
    this.buildLoopBindings();
  }

  public async run(): Promise<void> {
    const { lines } = this.program;
    let lineIndex = 0;
    let statementIndex = 0;

    try {
      while (lineIndex < lines.length && !this.haltReason) {
        const line = lines[lineIndex]!;
        const signal = await this.executeLine(line, lineIndex, statementIndex);

        if (!signal) {
          lineIndex += 1;
          statementIndex = 0;
          continue;
        }

        if (signal.type === 'jump') {
          lineIndex = signal.targetLineIndex;
          statementIndex = signal.targetStatementIndex ?? 0;
          continue;
        }

        if (signal.type === 'halt') {
          this.haltReason = signal.reason;
          break;
        }

        if (signal.type === 'break' || signal.type === 'continue') {
          // These signals should be handled by FOR loops
          // If we reach here, there's no FOR loop to handle them
          throw new RuntimeError(
            signal.type === 'break' ? 'EXIT FOR outside of loop' : 'CONTINUE outside of loop',
            { type: 'EOF' as any, lexeme: '', literal: undefined, line: lineIndex + 1, column: 1 }
          );
        }
      }
    } finally {
      // Execute any remaining DEFER statements at global scope
      // This ensures DEFER works at the global level like it does in functions
      await this.executeDeferStack();
    }
  }

  private async executeLine(
    line: LineNode,
    lineIndex: number,
    startStatementIndex: number
  ): Promise<StatementSignal | undefined> {
    for (let i = startStatementIndex; i < line.statements.length; i += 1) {
      const statement = line.statements[i]!;
      this.ensureWithinStepBudget(statement.token);
      const signal = await this.executeStatement(statement, { lineIndex, statementIndex: i });
      if (signal) {
        return signal;
      }
    }
    return undefined;
  }

  private async executeStatement(
    statement: StatementNode,
    position: StatementPosition
  ): Promise<StatementSignal | undefined> {
    switch (statement.type) {
      case 'LetStatement':
        return this.executeLet(statement);
      case 'AssignmentStatement':
        return this.executeAssignment(statement);
      case 'PrintStatement':
        return this.executePrint(statement);
      case 'InputStatement':
        return this.executeInput(statement);
      case 'IfStatement':
        return this.executeIf(statement, position);
      case 'ForStatement':
        return this.executeFor(statement, position);
      case 'NextStatement':
        return this.executeNext(statement, position);
      case 'ReturnStatement':
        return this.executeReturn(statement);
      case 'StopStatement':
        return { type: 'halt', reason: 'STOP' };
      case 'EndStatement':
        return { type: 'halt', reason: 'END' };
      case 'SpawnStatement':
        return this.executeSpawn(statement);
      case 'ExpressionStatement':
        await this.evaluateExpression(statement.expression);
        return undefined;
      case 'TypeDeclaration':
        this.context.defineType(statement);
        return undefined;
      case 'TryCatchStatement':
        return this.executeTryCatch(statement, position);
      case 'ErrorStatement':
        return this.executeError(statement);
      case 'FunctionStatement':
        return this.executeFunction(statement);
      case 'SubStatement':
        return this.executeSub(statement);
      case 'PropertyStatement':
        return this.executeProperty(statement);
      case 'ExitStatement':
        return this.executeExit(statement);
      case 'ContinueStatement':
        return this.executeContinue(statement);
      case 'WithStatement':
        return this.executeWith(statement, position);
      case 'SelectCaseStatement':
        return this.executeSelectCase(statement, position);
      case 'DeferStatement':
        return this.executeDeferStatement(statement, position);
      case 'DeferBlockStatement':
        return this.executeDeferBlockStatement(statement, position);
      default: {
        const exhaustiveCheck: never = statement;
        throw exhaustiveCheck;
      }
    }
  }

  private async executeLet(statement: LetStatementNode): Promise<StatementSignal | undefined> {
    const value = await this.evaluateExpression(statement.value);

    if (statement.target.type === 'Identifier') {
      // If there's a type annotation, use it instead of name-based coercion
      if (statement.typeAnnotation) {
        this.context.setVariableWithType(statement.target.name, value, statement.typeAnnotation.name, statement.token);
      } else {
        this.context.setVariable(statement.target.name, value, statement.token);
      }
    } else if (statement.target.type === 'MemberExpression') {
      // MemberExpression - for field assignment
      await this.assignToMember(statement.target, value);
    } else if (statement.target.type === 'WithField') {
      // WITH field assignment
      await this.assignToWithField(statement.target, value);
    }
    return undefined;
  }

  private async executeAssignment(
    statement: AssignmentStatementNode
  ): Promise<StatementSignal | undefined> {
    const value = await this.evaluateExpression(statement.value);

    if (statement.target.type === 'Identifier') {
      this.context.setVariable(statement.target.name, value, statement.token);
    } else if (statement.target.type === 'MemberExpression') {
      // MemberExpression - for field assignment
      await this.assignToMember(statement.target, value);
    } else if (statement.target.type === 'WithField') {
      // WITH field assignment
      await this.assignToWithField(statement.target, value);
    }
    return undefined;
  }

  private async executeSpawn(statement: SpawnStatementNode): Promise<StatementSignal | undefined> {
    const rawName = await this.evaluateExpression(statement.routine);
    const name = toStringValue(rawName) || 'ROUTINE';
    const added = this.context.spawnRoutine(name);
    const message = added
      ? `Routine ${name} spawned successfully`
      : `Routine ${name} already running`;
    this.context.writePrint([message], 'newline');
    return undefined;
  }

  private async executeTryCatch(
    statement: TryCatchStatementNode,
    position: StatementPosition
  ): Promise<StatementSignal | undefined> {
    let trySignal: StatementSignal | undefined = undefined;
    let errorValue: RuntimeValue | undefined = undefined;

    // Execute TRY block
    try {
      for (const stmt of statement.tryBlock) {
        const signal = await this.executeStatement(stmt, position);
        if (signal) {
          trySignal = signal;
          break;
        }
      }
    } catch (error) {
      // Caught an error - save it for CATCH block
      if (error instanceof RuntimeError) {
        errorValue = new RuntimeRecordValue('Error', [
          ['message', error.message],
          ['code', 0],
          ['line', error.token?.line ?? null],
          ['column', error.token?.column ?? null]
        ]);
      } else if (error instanceof Error) {
        errorValue = new RuntimeRecordValue('Error', [
          ['message', error.message],
          ['code', 0]
        ]);
      } else {
        errorValue = new RuntimeRecordValue('Error', [
          ['message', String(error)],
          ['code', 0]
        ]);
      }
    }

    // Execute CATCH block if there was an error and a catch clause exists
    if (errorValue && statement.catchClause) {
      // Set the catch variable
      const savedVar = this.context.hasVariable(statement.catchClause.variable.name)
        ? this.context.getVariable(statement.catchClause.variable.name)
        : undefined;

      this.context.setVariable(statement.catchClause.variable.name, errorValue, statement.token);

      try {
        for (const stmt of statement.catchClause.block) {
          const signal = await this.executeStatement(stmt, position);
          if (signal) {
            trySignal = signal;
            break;
          }
        }
      } finally {
        // Restore the catch variable
        if (savedVar !== undefined) {
          this.context.setVariable(statement.catchClause.variable.name, savedVar, statement.token);
        }
      }

      // Clear the error since it was handled
      errorValue = undefined;
    }

    // Execute FINALLY block if present
    if (statement.finallyBlock) {
      for (const stmt of statement.finallyBlock) {
        const signal = await this.executeStatement(stmt, position);
        if (signal) {
          trySignal = signal;
          break;
        }
      }
    }

    // Re-throw error if it wasn't handled
    if (errorValue) {
      const message = errorValue.get('message');
      throw new RuntimeError(toStringValue(message ?? 'Unknown error'), statement.token);
    }

    return trySignal;
  }

  private async executeError(statement: ErrorStatementNode): Promise<StatementSignal | undefined> {
    const message = await this.evaluateExpression(statement.message);
    throw new RuntimeError(toStringValue(message), statement.token);
  }

  private async executeDeferStatement(
    statement: DeferStatementNode,
    position: StatementPosition
  ): Promise<StatementSignal | undefined> {
    // Store the deferred statement for execution at scope exit
    // Capture values at DEFER point as per specification
    const capturedStatement = await this.captureDeferredStatement(statement.statement);
    this.context.deferStack.push(capturedStatement);

    return undefined;
  }

  private async executeDeferBlockStatement(
    statement: DeferBlockStatementNode,
    position: StatementPosition
  ): Promise<StatementSignal | undefined> {
    // Capture the entire block
    const capturedBlock = await this.captureDeferredBlock(statement.block);
    this.context.deferStack.push({ type: 'block', statements: capturedBlock });

    return undefined;
  }

  private async captureDeferredStatement(statement: StatementNode): Promise<any> {
    // For now, return the statement as-is since we need to execute it in the proper scope context
    // The specification says values should be captured at DEFER point, but for assignment statements,
    // the variable context should be preserved
    return { type: 'statement', statement };
  }

  private async captureDeferredBlock(statements: StatementNode[]): Promise<StatementNode[]> {
    // For now, return the statements as-is
    // In a full implementation, we would evaluate and capture values at this point
    return statements;
  }

  private async executeDeferStack(): Promise<void> {
    // Execute deferred operations in LIFO order
    const defers = [...this.context.deferStack].reverse();
    this.context.deferStack = [];

    for (const defer of defers) {
      try {
        if (defer.type === 'statement') {
          await this.executeStatement(defer.statement, { lineIndex: -1, statementIndex: 0 });
        } else {
          for (const stmt of defer.statements) {
            await this.executeStatement(stmt, { lineIndex: -1, statementIndex: 0 });
          }
        }
      } catch (error) {
        // According to DEFER.md: "If a deferred action throws/ERRORs, it replaces any in-flight error"
        throw error;
      }
    }
  }


  private async executePrint(statement: PrintStatementNode): Promise<StatementSignal | undefined> {
    if (statement.arguments.length === 0) {
      this.context.writePrint([''], statement.trailing ?? 'newline');
      return undefined;
    }

    const segments: string[] = [];
    for (let index = 0; index < statement.arguments.length; index += 1) {
      const arg = statement.arguments[index]!;
      const value = await this.evaluateExpression(arg.expression);
      segments.push(runtimeValueToString(value));
      if (arg.separator === 'comma') {
        segments.push('\t');
      } else if (arg.separator === 'semicolon') {
        // no extra characters
      } else if (index < statement.arguments.length - 1) {
        segments.push(' ');
      }
    }

    this.context.writePrint(segments, statement.trailing ?? 'newline');
    return undefined;
  }

  private async executeInput(statement: InputStatementNode): Promise<StatementSignal | undefined> {
    // Show prompt if provided
    if (statement.prompt) {
      const promptValue = await this.evaluateExpression(statement.prompt);
      const promptText = runtimeValueToString(promptValue);
      this.context.writePrint([promptText], 'none');
    }

    // Get input from the host environment
    const input = await this.context.readInput();

    // Store the input in the variable
    const varName = statement.variable.name;

    // Determine the type based on variable name suffix or try to parse as number
    let value: RuntimeValue;
    if (varName.endsWith('$')) {
      // String variable
      value = input;
    } else {
      // Try to parse as number, fall back to string
      const numValue = parseFloat(input);
      if (!isNaN(numValue)) {
        value = numValue;
      } else {
        value = input;
      }
    }

    this.context.setVariable(varName, value, statement.variable.token);
    return undefined;
  }

  private async executeIf(
    statement: IfStatementNode,
    position: StatementPosition
  ): Promise<StatementSignal | undefined> {
    const condition = await this.evaluateExpression(statement.condition);
    const branch = truthy(condition) ? statement.thenBranch : statement.elseBranch ?? [];
    for (const nested of branch) {
      const signal = await this.executeStatement(nested, position);
      if (signal) {
        return signal;
      }
    }
    return undefined;
  }


  private async assignToWithField(target: WithFieldNode, value: RuntimeValue): Promise<void> {
    // Get the current WITH object from the stack
    if (this.withStack.length === 0) {
      throw new RuntimeError('WITH field assignment outside of WITH block', target.token);
    }

    const withObject = this.withStack[this.withStack.length - 1];
    const fieldName = target.field.name;

    if (isRecordValue(withObject)) {
      if (!withObject.has(fieldName)) {
        throw new RuntimeError(
          `Type '${withObject.typeName}' has no field '${fieldName}'`,
          target.field.token
        );
      }
      withObject.set(fieldName, value);
      return;
    }

    throw new RuntimeError('Cannot assign to property of non-record value', target.field.token);
  }

  private async assignToMember(target: MemberExpressionNode, value: RuntimeValue): Promise<void> {
    // For member assignment like p.x = 5, we need to:
    // 1. If target.object is an Identifier, get the variable directly (not a copy)
    // 2. If it's a record, update its field

    if (target.object.type === 'Identifier') {
      // Get the actual record from the context
      const recordValue = this.context.getVariable(target.object.name);

      if (isRecordValue(recordValue)) {
        const fieldName = target.property.name;
        if (!recordValue.has(fieldName)) {
          throw new RuntimeError(
            `Type '${recordValue.typeName}' has no field '${fieldName}'`,
            target.property.token
          );
        }
        recordValue.set(fieldName, value);
        return;
      }
    }

    // For more complex expressions (like nested member access), evaluate the object
    const objectValue = await this.evaluateExpression(target.object);

    if (isRecordValue(objectValue)) {
      const fieldName = target.property.name;
      if (!objectValue.has(fieldName)) {
        throw new RuntimeError(
          `Type '${objectValue.typeName}' has no field '${fieldName}'`,
          target.property.token
        );
      }
      objectValue.set(fieldName, value);
      return;
    }

    throw new RuntimeError('Property assignment is not supported for this value', target.property.token);
  }

  private async evaluateExpression(expression: ExpressionNode): Promise<RuntimeValue> {
    switch (expression.type) {
      case 'NumberLiteral':
        return expression.value;
      case 'StringLiteral':
        return expression.value;
      case 'BooleanLiteral':
        return booleanToRuntime(expression.value);
      case 'NullLiteral':
        return null;
      case 'Identifier':
        return this.resolveIdentifier(expression);
      case 'ArrayLiteral':
        return this.evaluateArrayLiteral(expression);
      case 'ObjectLiteral':
        return this.evaluateObjectLiteral(expression);
      case 'RecordLiteral':
        return this.evaluateRecordLiteral(expression);
      case 'UnaryExpression':
        return this.evaluateUnary(expression);
      case 'BinaryExpression':
        return this.evaluateBinary(expression);
      case 'CallExpression':
        return this.evaluateCallExpression(expression);
      case 'MemberExpression':
        return this.evaluateMemberExpression(expression);
      case 'IndexExpression':
        return this.evaluateIndexExpression(expression);
      case 'AwaitExpression':
        throw new RuntimeError('AWAIT is not supported in this context', expression.keyword);
      case 'WithField':
        return this.evaluateWithField(expression);
      case 'ConditionalExpression':
        return this.evaluateConditional(expression);
      case 'SpreadExpression':
        throw new RuntimeError('Spread operator (...) can only be used in function calls', expression.token);
      case 'NewExpression':
        return this.evaluateNewExpression(expression);
      default: {
        const exhaustiveCheck: never = expression;
        throw exhaustiveCheck;
      }
    }
  }

  private async evaluateRecordLiteral(expression: RecordLiteralNode): Promise<RuntimeValue> {
    const typeName = expression.typeName.name;
    const typeDefinition = this.context.getTypeDefinition(typeName);

    if (!typeDefinition) {
      throw new RuntimeError(`Unknown type '${typeName}'`, expression.typeName.token);
    }

    const providedValues = new Map<string, RuntimeValue>();

    for (const field of expression.fields) {
      const fieldName = field.name.name;
      if (!typeDefinition.fields.has(fieldName)) {
        throw new RuntimeError(
          `Type '${typeName}' has no field '${fieldName}'`,
          field.name.token
        );
      }
      if (providedValues.has(fieldName)) {
        throw new RuntimeError(`Field '${fieldName}' provided more than once`, field.name.token);
      }
      const value = await this.evaluateExpression(field.value);
      providedValues.set(fieldName, value);
    }

    const ordered: [string, RuntimeValue][] = [];
    for (const fieldName of typeDefinition.fieldOrder) {
      if (!providedValues.has(fieldName)) {
        throw new RuntimeError(
          `Missing value for field '${fieldName}' in type '${typeName}'`,
          expression.token
        );
      }
      ordered.push([fieldName, providedValues.get(fieldName)!]);
    }

    return new RuntimeRecordValue(typeName, ordered);
  }

  private async evaluateWithField(expression: WithFieldNode): Promise<RuntimeValue> {
    // Get the current WITH object from the stack
    if (this.withStack.length === 0) {
      throw new RuntimeError('WITH field access outside of WITH block', expression.token);
    }

    const withObject = this.withStack[this.withStack.length - 1];

    // Access the field on the WITH object
    const fieldName = expression.field.name;

    if (isRecordValue(withObject)) {
      // First check if it's an actual field
      const value = withObject.get(fieldName);
      if (value !== undefined) {
        return value;
      }

      // Check for property getter
      const propertyKey = `${withObject.typeName}.${fieldName}`;
      const propertyFunc = this.context.getVariable(`__property_${propertyKey}`);

      if (propertyFunc && typeof propertyFunc === 'object' && propertyFunc !== null &&
          'kind' in propertyFunc && propertyFunc.kind === 'user-function') {
        // Properties are evaluated immediately with the object as self
        return await this.executeUserFunction(
          propertyFunc as UserFunctionValue,
          [withObject],
          expression.field.token,
          this.context.saveScope()
        );
      }

      // If not a field or property, check for UFCS
      const funcValue = this.context.getVariable(fieldName);
      if (funcValue && typeof funcValue === 'object' && funcValue !== null &&
          'kind' in funcValue && funcValue.kind === 'user-function') {
        // Return a bound function for UFCS
        return {
          kind: 'bound-function' as const,
          func: funcValue as UserFunctionValue,
          boundThis: withObject
        };
      }

      throw new RuntimeError(
        `Type '${withObject.typeName}' has no field '${fieldName}'`,
        expression.field.token
      );
    }

    throw new RuntimeError('WITH field access on non-record value', expression.token);
  }

  private async evaluateConditional(expression: ConditionalExpressionNode): Promise<RuntimeValue> {
    const condition = await this.evaluateExpression(expression.condition);
    const isTrue = truthy(condition);

    if (isTrue) {
      return this.evaluateExpression(expression.whenTrue);
    } else {
      return this.evaluateExpression(expression.whenFalse);
    }
  }

  private async evaluateNewExpression(expression: NewExpressionNode): Promise<RuntimeValue> {
    const typeName = expression.typeName.name;

    // First, check if it's a known type with a .NEW method
    // Look for TypeName.NEW in host namespaces
    const hostEntry = this.hostEnvironment.get(typeName);
    if (hostEntry && isHostNamespace(hostEntry)) {
      const newMethod = hostEntry.getMember('NEW');
      if (newMethod && isHostFunction(newMethod)) {
        // Evaluate arguments
        const args = await Promise.all(
          expression.args.map(arg => this.evaluateExpression(arg))
        );
        try {
          return await newMethod.invoke(args, this.makeHostFunctionContext(expression.token));
        } catch (error) {
          throw this.wrapHostError(error, expression.token);
        }
      }
    }

    // If no .NEW method found, check if it's a user-defined type
    const typeDeclaration = this.context.getVariable(`__type_${typeName}`);
    if (typeDeclaration && typeof typeDeclaration === 'object' && typeDeclaration !== null) {

      // For user-defined types, we'll create a default constructor
      // that takes arguments in field declaration order

      // For now, throw an error suggesting record literal syntax
      throw new RuntimeError(
        `Type '${typeName}' does not have a NEW constructor. Use record literal syntax: ${typeName} { field: value }`,
        expression.token
      );
    }

    // Check if it's a user-defined constructor function
    const constructorFunc = this.context.getVariable(typeName);
    if (constructorFunc && typeof constructorFunc === 'object' && constructorFunc !== null &&
        'kind' in constructorFunc && constructorFunc.kind === 'user-function') {

      // Call the constructor function
      const args = await Promise.all(
        expression.args.map(arg => this.evaluateExpression(arg))
      );

      const savedScope = this.context.saveScope();
      return this.executeUserFunction(constructorFunc as any, args, expression.token, savedScope);
    }

    throw new RuntimeError(`Unknown type or constructor '${typeName}'`, expression.token);
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }

  private getRuntimeValueType(value: RuntimeValue): string {
    if (typeof value === 'string') return 'STRING';
    if (typeof value === 'number') return 'NUMBER';
    if (typeof value === 'boolean') return 'BOOL';
    if (Array.isArray(value)) return 'ARRAY';
    if (isRecordValue(value)) return value.typeName;
    if (typeof value === 'object' && value !== null && 'kind' in value) {
      return (value as any).kind;
    }
    return 'ANY';
  }

  private getDidYouMeanSuggestion(methodName: string, objectTypeName: string): string {
    const suggestions: string[] = [];

    // Check user-defined functions
    const allFunctionNames = this.context.getAllFunctionNames();
    for (const name of allFunctionNames) {
      const distance = this.levenshteinDistance(methodName.toLowerCase(), name.toLowerCase());
      if (distance <= 2 && distance > 0) {
        suggestions.push(name);
      }
    }

    // Check host namespace functions
    const hostEnvironments = ['CANVAS', 'MATH', 'STRING', 'ARRAY', 'HTTP', 'TIME', 'SYS'];
    for (const nsName of hostEnvironments) {
      const namespace = this.hostEnvironment.get(nsName);
      if (namespace && isHostNamespace(namespace)) {
        const members = (namespace as any).listMembers?.() || [];
        for (const memberName of members) {
          const distance = this.levenshteinDistance(methodName.toLowerCase(), memberName.toLowerCase());
          if (distance <= 2 && distance > 0) {
            suggestions.push(memberName);
          }
        }
      }
    }

    if (suggestions.length > 0) {
      return ` (did you mean: ${suggestions.slice(0, 3).join(', ')}?)`;
    }
    return '';
  }

  private async evaluateMemberExpression(expression: MemberExpressionNode): Promise<RuntimeValue> {
    const objectValue = await this.evaluateExpression(expression.object);

    if (isHostNamespace(objectValue)) {
      const member = objectValue.getMember(expression.property.name);
      if (typeof member === 'undefined') {
        throw new RuntimeError(
          `Unknown member '${expression.property.name}' on ${objectValue.name}`,
          expression.property.token
        );
      }
      return member as RuntimeValue;
    }

    if (isRecordValue(objectValue)) {
      const fieldName = expression.property.name;

      // First, check if it's a field
      if (objectValue.has(fieldName)) {
        return objectValue.get(fieldName)!;
      }

      // Check for property getter
      const propertyKey = `${objectValue.typeName}.${fieldName}`;
      const propertyFunc = this.context.getVariable(`__property_${propertyKey}`);

      if (propertyFunc && typeof propertyFunc === 'object' && propertyFunc !== null &&
          'kind' in propertyFunc && propertyFunc.kind === 'user-function') {
        // Properties are evaluated immediately with the object as self
        return await this.executeUserFunction(
          propertyFunc as UserFunctionValue,
          [objectValue],
          expression.property.token,
          this.context.saveScope()
        );
      }

      // If not a field or property, check for UFCS - look for a function with this name
      const objectType = this.getRuntimeValueType(objectValue);
      const bestFunction = this.context.findBestFunction(fieldName, [objectType]);
      if (bestFunction) {
        // Return a bound function that will insert the object as the first argument
        return {
          kind: 'bound-function' as const,
          func: bestFunction,
          boundThis: objectValue
        };
      }

      const didYouMean = this.getDidYouMeanSuggestion(fieldName, objectValue.typeName);
      throw new RuntimeError(
        `No function '${fieldName}' matches receiver type ${objectValue.typeName} (tried: field, free function, block)${didYouMean}`,
        expression.property.token
      );
    }

    // Try UFCS for any value - look for a function or host namespace member
    const memberName = expression.property.name;

    // First check for user-defined functions with overloading
    const objectType = this.getRuntimeValueType(objectValue);
    const bestFunction = this.context.findBestFunction(memberName, [objectType]);
    if (bestFunction) {
      // Return a bound function that will insert the object as the first argument
      return {
        kind: 'bound-function' as const,
        func: bestFunction,
        boundThis: objectValue
      };
    }

    // Check for host namespace functions (like CANVAS.COLOR)
    // Try to find a namespace that might have this function
    const hostEnvironments = ['CANVAS', 'MATH', 'STRING', 'ARRAY']; // Common namespaces
    for (const nsName of hostEnvironments) {
      const namespace = this.hostEnvironment.get(nsName);
      if (namespace && isHostNamespace(namespace)) {
        const member = namespace.getMember(memberName);
        if (member && typeof member === 'object' && member !== null && 'kind' in member && member.kind === 'host-function') {
          // Return a bound function that will insert the object as the first argument
          return {
            kind: 'bound-host-function' as const,
            func: member as any,
            boundThis: objectValue
          };
        }
      }
    }

    const objectTypeName = typeof objectValue === 'object' && objectValue !== null && 'typeName' in objectValue
      ? objectValue.typeName as string
      : typeof objectValue;
    const didYouMean = this.getDidYouMeanSuggestion(memberName, objectTypeName);
    throw new RuntimeError(
      `No function '${memberName}' matches receiver type ${objectTypeName} (tried: field, free function, block)${didYouMean}`,
      expression.property.token
    );
  }

  private async evaluateIndexExpression(expression: IndexExpressionNode): Promise<RuntimeValue> {
    const objectValue = await this.evaluateExpression(expression.object);
    const indexValue = await this.evaluateExpression(expression.index);

    // Handle array indexing
    if (Array.isArray(objectValue)) {
      if (typeof indexValue !== 'number') {
        throw new RuntimeError('Array index must be a number', this.getExpressionToken(expression.index));
      }
      const index = Math.floor(indexValue);
      if (index < 0 || index >= objectValue.length) {
        throw new RuntimeError(`Array index ${index} out of bounds (length: ${objectValue.length})`, this.getExpressionToken(expression.index));
      }
      return objectValue[index];
    }

    // Handle record/object indexing
    if (isRecordValue(objectValue)) {
      if (typeof indexValue !== 'string') {
        throw new RuntimeError('Record index must be a string', this.getExpressionToken(expression.index));
      }
      if (!objectValue.has(indexValue)) {
        throw new RuntimeError(`Record does not have field '${indexValue}'`, this.getExpressionToken(expression.index));
      }
      return objectValue.get(indexValue)!;
    }

    throw new RuntimeError('Index access is not supported for this value', this.getExpressionToken(expression.object));
  }

  private async evaluateCallExpression(expression: CallExpressionNode): Promise<RuntimeValue> {
    const callee = await this.evaluateExpression(expression.callee);

    // We need to check if this is a user function to handle REF parameters
    // Save the scope once here and pass it through to avoid creating multiple copies
    let args: RuntimeValue[];
    let savedScope: Map<string, RuntimeValue> | undefined;

    if (typeof callee === 'object' && callee !== null && 'kind' in callee && callee.kind === 'user-function') {
      const func = callee as UserFunctionValue;
      savedScope = this.context.saveScope();
      args = await this.evaluateArgumentsForFunction(func, expression.args, expression.closingParen, 0, savedScope);
    } else if (typeof callee === 'object' && callee !== null && 'kind' in callee && callee.kind === 'bound-function') {
      const bound = callee as BoundFunctionValue;
      savedScope = this.context.saveScope();
      // For bound functions, the first parameter is the bound object, so we offset by 1
      args = await this.evaluateArgumentsForFunction(bound.func, expression.args, expression.closingParen, 1, savedScope);
    } else if (typeof callee === 'object' && callee !== null && 'kind' in callee && callee.kind === 'bound-host-function') {
      // For bound host functions, evaluate arguments normally with spread support
      args = await this.evaluateArgumentsWithSpread(expression.args);
    } else {
      // For host functions or unknown callables, evaluate normally with spread support
      args = await this.evaluateArgumentsWithSpread(expression.args);
    }

    return this.invokeCallable(callee, args, expression.closingParen, savedScope);
  }

  private async evaluateArgumentsWithSpread(argExpressions: ExpressionNode[]): Promise<RuntimeValue[]> {
    const result: RuntimeValue[] = [];

    for (const arg of argExpressions) {
      if (arg.type === 'SpreadExpression') {
        const target = await this.evaluateExpression(arg.target);
        const spreadValues = this.expandSpreadValue(target, arg.token);
        result.push(...spreadValues);
      } else {
        const value = await this.evaluateExpression(arg);
        result.push(value);
      }
    }

    return result;
  }

  private expandSpreadValue(value: RuntimeValue, token: Token): RuntimeValue[] {
    // Handle arrays
    if (Array.isArray(value)) {
      return value;
    }

    // Handle records with spread annotation
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'kind' in value && value.kind === 'record') {
      const record = value as RuntimeRecordValue;

      // Get the type declaration to check for spread fields
      const typeName = record.typeName;
      const typeDecl = this.context.getTypeDefinition(typeName);
      if (typeDecl && typeDecl.spreadFields) {
        // Return field values in spread order
        return typeDecl.spreadFields.map(fieldName => {
          if (!record.has(fieldName)) {
            throw new RuntimeError(`Missing field '${fieldName}' for spread operation on type '${typeName}'`, token);
          }
          return record.get(fieldName)!;
        });
      }

      throw new RuntimeError(`Cannot spread record type '${typeName}': missing SPREAD annotation`, token);
    }

    throw new RuntimeError(`Cannot spread non-array, non-record value`, token);
  }

  private async evaluateArgumentsForFunction(
    func: UserFunctionValue,
    argExpressions: ExpressionNode[],
    token: Token,
    paramOffset: number,
    savedScope: Map<string, RuntimeValue>
  ): Promise<RuntimeValue[]> {
    const args: RuntimeValue[] = [];

    for (let i = 0; i < argExpressions.length; i++) {
      const param = func.parameters[i + paramOffset];  // Apply offset for UFCS
      const argExpr = argExpressions[i];
      if (!argExpr) continue;

      if (param?.isRef) {
        // For REF parameters, we need to get a reference to the variable
        if (argExpr.type === 'Identifier') {
          const varName = argExpr.name;
          const normalizedName = normalizeIdentifier(varName);

          // Create a RefValue that directly accesses the saved scope Map
          const ref = new RefValue(
            varName,
            () => {
              const val = savedScope.get(normalizedName);
              return val !== undefined ? val : defaultValueForIdentifier(varName);
            },
            (newValue) => {
              const coerced = coerceValueForIdentifier(varName, newValue, token);
              savedScope.set(normalizedName, coerced);
            }
          );
          args.push(ref as any);
        } else if (argExpr.type === 'MemberExpression') {
          // Handle record field references
          const obj = await this.evaluateExpression(argExpr.object);
          if (!isRecordValue(obj)) {
            throw new RuntimeError('Cannot pass non-record field as REF parameter', token);
          }
          const fieldName = argExpr.property.name;
          // Create a RefValue that can get/set the field
          const ref = new RefValue(
            fieldName,
            () => {
              const val = obj.get(fieldName);
              if (val === undefined) {
                throw new RuntimeError(`Field '${fieldName}' not found`, argExpr.property.token);
              }
              return val;
            },
            (newValue) => obj.set(fieldName, newValue)
          );
          args.push(ref as any);
        } else {
          throw new RuntimeError('REF parameter requires a variable or field reference', token);
        }
      } else {
        // Normal parameter - evaluate the expression
        if (argExpr.type === 'SpreadExpression') {
          // Handle spread expressions
          const target = await this.evaluateExpression(argExpr.target);
          const spreadValues = this.expandSpreadValue(target, argExpr.token);
          args.push(...spreadValues);
        } else {
          args.push(await this.evaluateExpression(argExpr));
        }
      }
    }

    return args;
  }

  private async evaluateArrayLiteral(expression: ArrayLiteralNode): Promise<RuntimeValue> {
    const elements: RuntimeValue[] = [];
    for (const element of expression.elements) {
      elements.push(await this.evaluateExpression(element));
    }
    return elements;
  }

  private async evaluateObjectLiteral(expression: ObjectLiteralNode): Promise<RuntimeValue> {
    const fields: [string, RuntimeValue][] = [];
    for (const field of expression.fields) {
      const value = await this.evaluateExpression(field.value);
      fields.push([field.name, value]);
    }
    return new RuntimeRecordValue('Object', fields);
  }

  private async evaluateUnary(expression: UnaryExpressionNode): Promise<RuntimeValue> {
    const value = await this.evaluateExpression(expression.operand);
    const operator = expression.operator.lexeme.toUpperCase();

    if (operator === '+') {
      return toNumber(value, expression.operator);
    }

    if (operator === '-') {
      return -toNumber(value, expression.operator);
    }

    if (operator === 'NOT') {
      return booleanToRuntime(!truthy(value));
    }

    throw new RuntimeError(`Unsupported unary operator '${expression.operator.lexeme}'`, expression.operator);
  }

  private async evaluateBinary(expression: BinaryExpressionNode): Promise<RuntimeValue> {
    const left = await this.evaluateExpression(expression.left);
    const right = await this.evaluateExpression(expression.right);
    const operator = expression.operator.lexeme.toUpperCase();

    switch (operator) {
      case '+':
        if (typeof left === 'string' || typeof right === 'string') {
          return toStringValue(left) + toStringValue(right);
        }
        return toNumber(left, expression.operator) + toNumber(right, expression.operator);
      case '-':
        return toNumber(left, expression.operator) - toNumber(right, expression.operator);
      case '*':
        return toNumber(left, expression.operator) * toNumber(right, expression.operator);
      case '/':
        return toNumber(left, expression.operator) / toNumber(right, expression.operator);
      case '^':
        return Math.pow(toNumber(left, expression.operator), toNumber(right, expression.operator));
      case '=':
        return booleanToRuntime(equals(left, right));
      case '<>':
        return booleanToRuntime(!equals(left, right));
      case '<':
        return booleanToRuntime(compare(left, right) < 0);
      case '<=':
        return booleanToRuntime(compare(left, right) <= 0);
      case '>':
        return booleanToRuntime(compare(left, right) > 0);
      case '>=':
        return booleanToRuntime(compare(left, right) >= 0);
      case 'AND':
        return booleanToRuntime(truthy(left) && truthy(right));
      case 'OR':
        return booleanToRuntime(truthy(left) || truthy(right));
      case 'MOD':
        return modulo(toNumber(left, expression.operator), toNumber(right, expression.operator));
      default:
        throw new RuntimeError(`Unsupported operator '${expression.operator.lexeme}'`, expression.operator);
    }
  }

  private ensureWithinStepBudget(token: Token): void {
    this.stepCount += 1;
    const { maxSteps } = this.options;
    if (typeof maxSteps === 'number' && this.stepCount > maxSteps) {
      throw new RuntimeError('Exceeded maximum execution steps', token);
    }
  }

  private buildLoopBindings(): void {
    const stack: Array<{ pointer: StatementPointer; statement: ForStatementNode }> = [];

    this.program.lines.forEach((line, lineIndex) => {
      line.statements.forEach((statement, statementIndex) => {
        if (statement.type === 'ForStatement') {
          const pointer: StatementPointer = { lineIndex, statementIndex };
          stack.push({ pointer, statement });
          return;
        }

        if (statement.type === 'NextStatement') {
          let frameIndex = stack.length - 1;
          if (frameIndex < 0) {
            return;
          }

          if (statement.iterator) {
            const target = normalizeIdentifier(statement.iterator.name);
            for (let i = stack.length - 1; i >= 0; i -= 1) {
              const candidate = stack[i]!;
              if (normalizeIdentifier(candidate.statement.iterator.name) === target) {
                frameIndex = i;
                break;
              }
            }
          }

          const bindingSource = stack.splice(frameIndex, 1)[0];
          if (!bindingSource) {
            return;
          }

          const pointerKey = makePointerKey(bindingSource.pointer);
          const nextPointer: StatementPointer = { lineIndex, statementIndex };
          const afterNextPointer =
            this.findNextStatementPointer(lineIndex, statementIndex) ?? endPointer(this.program);
          this.forBindings.set(pointerKey, {
            nextPointer,
            afterNextPointer,
            nextToken: statement.token
          });
        }
      });
    });
  }

  private findNextStatementPointer(
    lineIndex: number,
    statementIndex: number
  ): StatementPointer | undefined {
    let currentLine = lineIndex;
    let currentStatement = statementIndex + 1;

    while (currentLine < this.program.lines.length) {
      const line = this.program.lines[currentLine]!;
      if (currentStatement < line.statements.length) {
        return { lineIndex: currentLine, statementIndex: currentStatement };
      }
      currentLine += 1;
      currentStatement = 0;
    }

    return undefined;
  }

  private async executeFor(
    statement: ForStatementNode,
    position: StatementPosition
  ): Promise<StatementSignal | undefined> {
    const iteratorName = statement.iterator.name;
    const startValue = toNumber(await this.evaluateExpression(statement.start), statement.token);
    const endValue = toNumber(await this.evaluateExpression(statement.end), statement.token);
    const stepValue = statement.step
      ? toNumber(await this.evaluateExpression(statement.step), statement.token)
      : 1;

    if (stepValue === 0) {
      throw new RuntimeError('FOR step cannot be zero', statement.token);
    }

    // Skip binding check if we're in a function context (negative lineIndex)
    let binding;
    if (position.lineIndex >= 0) {
      binding = this.forBindings.get(makePointerKey(position));
      if (!binding) {
        throw new RuntimeError('FOR without matching NEXT', statement.token);
      }
    }

    this.context.setVariable(iteratorName, startValue, statement.token);

    const continueCondition = stepValue > 0 ? startValue <= endValue : startValue >= endValue;
    if (!continueCondition) {
      if (binding) {
        const targetPointer = binding.afterNextPointer ?? endPointer(this.program);
        return {
          type: 'jump',
          targetLineIndex: targetPointer.lineIndex,
          targetStatementIndex: targetPointer.statementIndex
        };
      } else {
        // In function context, we need to skip the loop body
        // This is a simplified approach - just continue execution
        // The NEXT will handle the iteration
      }
    }

    if (binding) {
      const nextCandidate = this.findNextStatementPointer(position.lineIndex, position.statementIndex);
      const bodyPointer =
        nextCandidate && binding.nextPointer && !pointerEquals(nextCandidate, binding.nextPointer)
          ? nextCandidate
          : undefined;

      this.forStack.push({
        iteratorName,
        iteratorKey: normalizeIdentifier(iteratorName),
        end: endValue,
        step: stepValue,
        bodyPointer,
        nextPointer: binding.nextPointer,
        token: statement.token
      });
    } else {
      // In function context, we don't have pre-computed bindings
      // Just push a frame for tracking
      // The body starts at the next statement (position.statementIndex + 1)
      this.forStack.push({
        iteratorName,
        iteratorKey: normalizeIdentifier(iteratorName),
        end: endValue,
        step: stepValue,
        bodyPointer: { lineIndex: position.lineIndex, statementIndex: position.statementIndex + 1 },
        nextPointer: { lineIndex: position.lineIndex, statementIndex: position.statementIndex + 1 },
        token: statement.token
      });
    }

    return undefined;
  }

  private async executeNext(
    statement: NextStatementNode,
    position: StatementPosition
  ): Promise<StatementSignal | undefined> {
    if (this.forStack.length === 0) {
      throw new RuntimeError('NEXT without FOR', statement.token);
    }

    let frame = this.forStack[this.forStack.length - 1]!;

    if (statement.iterator) {
      const target = normalizeIdentifier(statement.iterator.name);
      const index = findLastIndex(this.forStack, (entry) => entry.iteratorKey === target);
      if (index === -1) {
        throw new RuntimeError('NEXT variable does not match any active FOR', statement.token);
      }
      if (index !== this.forStack.length - 1) {
        throw new RuntimeError('FOR loops must close in order', statement.token);
      }
      frame = this.forStack[index]!;
    }

    const currentValue = toNumber(this.context.getVariable(frame.iteratorName), statement.token);
    const nextValue = currentValue + frame.step;
    this.context.setVariable(frame.iteratorName, nextValue, statement.token);

    const continueCondition = frame.step > 0 ? nextValue <= frame.end : nextValue >= frame.end;
    if (continueCondition) {
      if (!frame.bodyPointer) {
        return { type: 'jump', targetLineIndex: frame.nextPointer.lineIndex, targetStatementIndex: frame.nextPointer.statementIndex };
      }
      return {
        type: 'jump',
        targetLineIndex: frame.bodyPointer.lineIndex,
        targetStatementIndex: frame.bodyPointer.statementIndex
      };
    }

    this.forStack.pop();
    return undefined;
  }


  private async executeFunction(statement: FunctionStatementNode): Promise<undefined> {
    // Store function definition in context with overloading support
    const functionValue: UserFunctionValue = {
      kind: 'user-function',
      name: statement.name.name,
      parameters: statement.parameters,
      returnType: statement.returnType,
      body: statement.body,
      isAsync: false
    };
    this.context.registerFunction(functionValue);
    return undefined;
  }

  private async executeSub(statement: SubStatementNode): Promise<undefined> {
    // Store sub definition in context with overloading support
    const subValue: UserFunctionValue = {
      kind: 'user-function',
      name: statement.name.name,
      parameters: statement.parameters,
      returnType: undefined, // SUBs don't return values
      body: statement.body,
      isAsync: false,
      isSub: true
    };
    this.context.registerFunction(subValue);
    return undefined;
  }

  private async executeProperty(statement: PropertyStatementNode): Promise<undefined> {
    // Store property definition as a special function
    // Properties are stored with key "TypeName.PropertyName"
    const propertyKey = `${statement.typeName.name}.${statement.name.name}`;

    const propertyValue: UserFunctionValue = {
      kind: 'user-function',
      name: propertyKey,
      parameters: [statement.selfParam],
      returnType: statement.returnType,
      body: statement.body,
      isAsync: false,
      isSub: false
    };

    // Store as a property (not a regular variable)
    this.context.setVariable(`__property_${propertyKey}`, propertyValue, statement.token);
    return undefined;
  }

  private async executeExit(statement: ExitStatementNode): Promise<StatementSignal> {
    if (statement.exitType === 'FOR') {
      return { type: 'break' };
    } else {
      // EXIT SUB or EXIT FUNCTION acts like RETURN
      return { type: 'return', value: null };
    }
  }

  private async executeContinue(statement: ContinueStatementNode): Promise<StatementSignal> {
    return { type: 'continue' };
  }

  private async executeWith(statement: WithStatementNode, position: StatementPosition): Promise<StatementSignal | undefined> {
    // Evaluate the object to use with WITH
    const object = await this.evaluateExpression(statement.object);

    // Push onto WITH stack
    this.withStack.push(object);

    try {
      // Execute body statements
      for (const stmt of statement.body) {
        const signal = await this.executeStatement(stmt, position);
        if (signal) {
          return signal;
        }
      }
    } finally {
      // Always pop from WITH stack
      this.withStack.pop();
    }

    return undefined;
  }

  private async executeSelectCase(statement: SelectCaseStatementNode, position: StatementPosition): Promise<StatementSignal | undefined> {
    // Evaluate the SELECT CASE expression once
    const selectValue = await this.evaluateExpression(statement.expression);

    // Check each CASE clause
    for (const caseClause of statement.cases) {
      // Check if any of the case values match
      let matched = false;
      for (const caseValue of caseClause.values) {
        const value = await this.evaluateExpression(caseValue);
        if (this.areValuesEqual(selectValue, value)) {
          matched = true;
          break;
        }
      }

      if (matched) {
        // Execute the statements for this case
        for (const stmt of caseClause.statements) {
          const signal = await this.executeStatement(stmt, position);
          if (signal) {
            return signal;
          }
        }
        // Exit after first matching case
        return undefined;
      }
    }

    // If no case matched, execute CASE ELSE if present
    if (statement.elseCase) {
      for (const stmt of statement.elseCase) {
        const signal = await this.executeStatement(stmt, position);
        if (signal) {
          return signal;
        }
      }
    }

    return undefined;
  }

  private areValuesEqual(a: RuntimeValue, b: RuntimeValue): boolean {
    // Simple equality check for runtime values
    if (a === b) return true;

    // Handle null
    if (a === null || b === null) return a === b;

    // Handle records (reference equality)
    if (isRecordValue(a) && isRecordValue(b)) {
      return a === b; // Reference equality for records
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.areValuesEqual(a[i], b[i])) return false;
      }
      return true;
    }

    // For primitives (numbers, strings, booleans)
    return a === b;
  }

  private async executeReturn(statement: ReturnStatementNode): Promise<StatementSignal> {
    // Function/Sub return
    let value: RuntimeValue = null;
    if (statement.value) {
      value = await this.evaluateExpression(statement.value);
    }
    return { type: 'return', value };
  }


  private resolveIdentifier(identifier: IdentifierNode): RuntimeValue {
    if (this.context.hasVariable(identifier.name)) {
      return this.context.getVariable(identifier.name);
    }

    const hostEntry = this.hostEnvironment.get(identifier.name);
    if (typeof hostEntry !== 'undefined') {
      return hostEntry as RuntimeValue;
    }

    return this.context.getVariable(identifier.name);
  }

  private async invokeCallable(
    callee: RuntimeValue,
    args: RuntimeValue[],
    token: Token,
    savedScope?: Map<string, RuntimeValue>
  ): Promise<RuntimeValue> {
    if (isHostFunction(callee)) {
      try {
        return await callee.invoke(args, this.makeHostFunctionContext(token));
      } catch (error) {
        throw this.wrapHostError(error, token);
      }
    }

    // Check for bound functions (UFCS)
    if (typeof callee === 'object' && callee !== null && 'kind' in callee && callee.kind === 'bound-function') {
      const bound = callee as BoundFunctionValue;
      // Insert the bound object as the first argument
      // Note: bound.boundThis is already evaluated, so we just add it
      const fullArgs = [bound.boundThis, ...args];
      // Use the savedScope if provided, otherwise save the current scope
      const scope = savedScope ?? this.context.saveScope();
      return this.executeUserFunction(bound.func, fullArgs, token, scope);
    }

    // Check for bound host functions (UFCS)
    if (typeof callee === 'object' && callee !== null && 'kind' in callee && callee.kind === 'bound-host-function') {
      const bound = callee as any; // We'll use 'any' since we defined the interface
      // Insert the bound object as the first argument
      const fullArgs = [bound.boundThis, ...args];
      try {
        return await bound.func.invoke(fullArgs, this.makeHostFunctionContext(token));
      } catch (error) {
        throw this.wrapHostError(error, token);
      }
    }

    // Check for user-defined functions
    if (typeof callee === 'object' && callee !== null && 'kind' in callee && callee.kind === 'user-function') {
      const func = callee as UserFunctionValue;
      // Use the savedScope if provided, otherwise save the current scope
      const scope = savedScope ?? this.context.saveScope();
      return this.executeUserFunction(func, args, token, scope);
    }

    throw new RuntimeError('Value is not callable', token);
  }

  private async executeUserFunction(
    func: UserFunctionValue,
    args: RuntimeValue[],
    token: Token,
    callerScope: Map<string, RuntimeValue>
  ): Promise<RuntimeValue> {
    // The callerScope was already saved, now we just need to use it
    // Also save the DEFER scope to isolate function-level defers
    const callerDeferScope = this.context.saveDeferScope();
    this.context.deferStack = []; // Start fresh defer stack for this function

    try {
      // Bind parameters to arguments
      for (let i = 0; i < func.parameters.length; i++) {
        const param = func.parameters[i];
        if (!param) continue;

        if (param.isVarArgs) {
          // Collect remaining args into array
          this.context.setVariable(param.name.name, args.slice(i), token);
          break;
        }

        let value = args[i];
        if (value === undefined && param.defaultValue) {
          value = await this.evaluateExpression(param.defaultValue);
        } else if (value === undefined) {
          value = null;
        }

        if (param.isRef) {
          // For REF parameters, store the RefValue directly
          // The RefValue will handle getting and setting the actual value
          this.context.setVariable(param.name.name, value, token);
        } else {
          // Use type-aware setting if parameter has type annotation
          if (param.typeAnnotation) {
            this.context.setVariableWithType(param.name.name, value, param.typeAnnotation.name, token);
          } else {
            this.context.setVariable(param.name.name, value, token);
          }
        }
      }

      // Execute function body
      // We use a special marker position for function execution
      for (let i = 0; i < func.body.length; i++) {
        const stmt = func.body[i];
        if (!stmt) continue;

        // Use a negative lineIndex to indicate we're in a function context
        // This allows us to handle FOR/NEXT differently
        const signal = await this.executeStatement(stmt, { lineIndex: -1, statementIndex: i });
        if (signal?.type === 'return') {
          return signal.value;
        }
        if (signal?.type === 'halt') {
          return null;
        }
        if (signal?.type === 'jump') {
          // Handle jumps within function (for FOR/NEXT loops)
          // The targetStatementIndex is relative to the function body
          if (signal.targetStatementIndex !== undefined) {
            i = signal.targetStatementIndex - 1; // -1 because the loop will increment
            continue;
          }
        }
        if (signal?.type === 'break' || signal?.type === 'continue') {
          // These should be handled by the enclosing FOR loop
          // For now, we'll let them propagate up
          // TODO: Implement proper FOR loop handling in function context
          continue;
        }
      }

      // If no explicit return, return null
      return func.isSub ? null : null;
    } finally {
      // Execute deferred operations in LIFO order BEFORE restoring scope
      // This ensures the deferred operations have access to the function's variables
      await this.executeDeferStack();

      // Only AFTER executing defers, restore the previous scope and defer scope
      this.context.restoreScope(callerScope);
      this.context.restoreDeferScope(callerDeferScope);
    }
  }

  private makeHostFunctionContext(token: Token): HostFunctionContext {
    return {
      getVariable: (name) => this.context.getVariable(name),
      setVariable: (name, value) => this.context.setVariable(name, value, token)
    };
  }

  private wrapHostError(error: unknown, token: Token): RuntimeError {
    if (error instanceof RuntimeError) {
      return error;
    }
    const message = error instanceof Error ? error.message : String(error);
    return new RuntimeError(`Host function error: ${message}`, token);
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
      default: {
        const exhaustiveCheck: never = expression;
        throw exhaustiveCheck;
      }
    }
  }
}

interface StatementSignalJump {
  readonly type: 'jump';
  readonly targetLineIndex: number;
  readonly targetStatementIndex?: number;
}

interface StatementSignalHalt {
  readonly type: 'halt';
  readonly reason: 'END' | 'STOP';
}

interface StatementSignalReturn {
  readonly type: 'return';
  readonly value: RuntimeValue;
}

interface StatementSignalBreak {
  readonly type: 'break';
}

interface StatementSignalContinue {
  readonly type: 'continue';
}

type StatementSignal = StatementSignalJump | StatementSignalHalt | StatementSignalReturn | StatementSignalBreak | StatementSignalContinue | undefined;

interface StatementPointer {
  readonly lineIndex: number;
  readonly statementIndex: number;
}

interface ForBinding {
  readonly nextPointer: StatementPointer;
  readonly afterNextPointer: StatementPointer;
  readonly nextToken: Token;
}

interface StatementPosition extends StatementPointer {}

interface ForFrame {
  readonly iteratorName: string;
  readonly iteratorKey: string;
  readonly end: number;
  readonly step: number;
  readonly bodyPointer?: StatementPointer;
  readonly nextPointer: StatementPointer;
  readonly token: Token;
}

interface RuntimeTypeField {
  readonly name: string;
  readonly annotation: TypeAnnotationNode;
}

interface RuntimeTypeDefinition {
  readonly name: string;
  readonly fieldOrder: readonly string[];
  readonly fields: Map<string, RuntimeTypeField>;
  readonly spreadFields?: readonly string[];
}

export function normalizeIdentifier(name: string): string {
  // Keep case sensitivity for modern BASIC
  return name;
}

export function defaultValueForIdentifier(name: string): RuntimeValue {
  if (name.endsWith('$')) {
    return '';
  }
  return 0;
}

export function coerceValueForIdentifier(name: string, value: RuntimeValue, token: Token): RuntimeValue {
  if (name.endsWith('$')) {
    return toStringValue(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return booleanToRuntime(value);
  }
  if (typeof value === 'string') {
    return toNumber(value, token);
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (isRecordValue(value)) {
    return value;
  }
  return value;
}

function runtimeValueToString(value: RuntimeValue): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (value === null) {
    return 'NULL';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => runtimeValueToString(item)).join(',')}]`;
  }
  if (isRecordValue(value)) {
    const inner = value
      .entries()
      .map(([fieldName, fieldValue]) => `${fieldName}: ${runtimeValueToString(fieldValue)}`)
      .join(', ');
    return `${value.typeName} { ${inner} }`;
  }
  return hostValueToString(value);
}

function truthy(value: RuntimeValue): boolean {
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    return value.length > 0;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (isRecordValue(value)) {
    return true;
  }
  return true;
}

function booleanToRuntime(value: boolean): number {
  return value ? -1 : 0;
}

function toStringValue(value: RuntimeValue): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (value === null) {
    return 'NULL';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => toStringValue(item)).join(',')}]`;
  }
  if (isRecordValue(value)) {
    return runtimeValueToString(value);
  }
  return hostValueToString(value);
}

function toNumber(value: RuntimeValue, token: Token): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return booleanToRuntime(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new RuntimeError(`Cannot convert '${value}' to number`, token);
    }
    return parsed;
  }
  if (Array.isArray(value)) {
    throw new RuntimeError('Cannot convert array to number', token);
  }
  if (value === null) {
    throw new RuntimeError('Cannot convert NULL to number', token);
  }
  if (isRecordValue(value)) {
    throw new RuntimeError('Cannot convert record to number', token);
  }
  throw new RuntimeError('Cannot convert host value to number', token);
}

function equals(left: RuntimeValue, right: RuntimeValue): boolean {
  if (typeof left === 'number' && typeof right === 'number') {
    return left === right;
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return left === right;
  }
  if (left === null || right === null) {
    return left === right;
  }
  if (isRecordValue(left) && isRecordValue(right)) {
    return recordEquals(left, right);
  }
  return toStringValue(left).toUpperCase() === toStringValue(right).toUpperCase();
}

function compare(left: RuntimeValue, right: RuntimeValue): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }
  if (left === null || right === null) {
    if (left === right) {
      return 0;
    }
    return left === null ? -1 : 1;
  }
  if (isRecordValue(left) && isRecordValue(right)) {
    if (left === right) {
      return 0;
    }
    const typeOrder = left.typeName.localeCompare(right.typeName, undefined, {
      sensitivity: 'base'
    });
    if (typeOrder !== 0) {
      return typeOrder;
    }
    const entriesLeft = left.entries();
    const entriesRight = right.entries();
    const lengthOrder = entriesLeft.length - entriesRight.length;
    if (lengthOrder !== 0) {
      return lengthOrder;
    }
    for (let i = 0; i < entriesLeft.length; i += 1) {
      const [fieldLeft, valueLeft] = entriesLeft[i]!;
      const [fieldRight, valueRight] = entriesRight[i]!;
      const nameOrder = fieldLeft.localeCompare(fieldRight, undefined, { sensitivity: 'base' });
      if (nameOrder !== 0) {
        return nameOrder;
      }
      const valueOrder = compare(valueLeft, valueRight);
      if (valueOrder !== 0) {
        return valueOrder;
      }
    }
    return 0;
  }
  const leftStr = toStringValue(left).toUpperCase();
  const rightStr = toStringValue(right).toUpperCase();
  if (leftStr === rightStr) {
    return 0;
  }
  return leftStr < rightStr ? -1 : 1;
}

function recordEquals(left: RuntimeRecordValue, right: RuntimeRecordValue): boolean {
  if (left.typeName !== right.typeName) {
    return false;
  }

  const leftEntries = left.entries();
  const rightEntries = right.entries();

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  for (let i = 0; i < leftEntries.length; i += 1) {
    const [leftName, leftValue] = leftEntries[i]!;
    const [rightName, rightValue] = rightEntries[i]!;
    if (leftName !== rightName) {
      return false;
    }
    if (!equals(leftValue, rightValue)) {
      return false;
    }
  }

  return true;
}

function modulo(a: number, b: number): number {
  if (b === 0) {
    return NaN;
  }
  return ((a % b) + b) % b;
}


function makePointerKey(pointer: StatementPointer): string {
  return `${pointer.lineIndex}:${pointer.statementIndex}`;
}

function findLastIndex<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (predicate(items[i]!)) {
      return i;
    }
  }
  return -1;
}

function pointerEquals(a: StatementPointer, b: StatementPointer): boolean {
  return a.lineIndex === b.lineIndex && a.statementIndex === b.statementIndex;
}

function endPointer(program: ProgramNode): StatementPointer {
  return { lineIndex: program.lines.length, statementIndex: 0 };
}

function hostValueToString(value: RuntimeValue): string {
  if (isHostNamespace(value)) {
    return `[Namespace ${value.name}]`;
  }
  if (isHostFunction(value)) {
    return `[Function ${value.name}]`;
  }
  return String(value);
}
