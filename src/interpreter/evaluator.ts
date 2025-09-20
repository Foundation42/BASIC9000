import type {
  ArrayLiteralNode,
  AssignmentStatementNode,
  BinaryExpressionNode,
  CallExpressionNode,
  ExpressionNode,
  ExitStatementNode,
  ForStatementNode,
  FunctionStatementNode,
  GosubStatementNode,
  GotoStatementNode,
  IdentifierNode,
  IfStatementNode,
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
  SelectCaseStatementNode
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
  const context = new ExecutionContext();
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
  private readonly context = new ExecutionContext();
  private haltReason: 'END' | 'STOP' | undefined;

  constructor(private readonly options: ExecutionOptions = {}) {}

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

class ExecutionContext {
  private readonly variables = new Map<string, RuntimeValue>();
  private readonly outputs: string[] = [];
  private currentPrintBuffer = '';
  private hasPendingBuffer = false;
  private readonly routines = new Set<string>();
  private readonly types = new Map<string, RuntimeTypeDefinition>();

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

  public saveScope(): Map<string, RuntimeValue> {
    return new Map(this.variables);
  }

  public restoreScope(saved: Map<string, RuntimeValue>): void {
    this.variables.clear();
    for (const [key, value] of saved) {
      this.variables.set(key, value);
    }
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

    this.types.set(typeName, { name: typeName, fieldOrder, fields: fieldMap });
  }

  public getTypeDefinition(name: string): RuntimeTypeDefinition | undefined {
    return this.types.get(name);
  }
}

class Evaluator {
  private readonly lineIndexByNumber = new Map<number, number>();
  private readonly forBindings = new Map<string, ForBinding>();
  private readonly forStack: ForFrame[] = [];
  private readonly gosubStack: StatementPointer[] = [];
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
      case 'IfStatement':
        return this.executeIf(statement, position);
      case 'ForStatement':
        return this.executeFor(statement, position);
      case 'NextStatement':
        return this.executeNext(statement, position);
      case 'GotoStatement':
        return this.executeGoto(statement);
      case 'GosubStatement':
        return this.executeGosub(statement, position);
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
      case 'ExitStatement':
        return this.executeExit(statement);
      case 'WithStatement':
        return this.executeWith(statement, position);
      case 'SelectCaseStatement':
        return this.executeSelectCase(statement, position);
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

  private async executeGoto(statement: GotoStatementNode): Promise<StatementSignal> {
    const target = await this.evaluateExpression(statement.target);
    const lineNumber = toLineNumber(target, statement.token);
    const index = this.lineIndexByNumber.get(lineNumber);
    if (index === undefined) {
      throw new RuntimeError(`Unknown line number ${lineNumber}`, statement.token);
    }
    return { type: 'jump', targetLineIndex: index, targetStatementIndex: 0 };
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
      case 'AwaitExpression':
        throw new RuntimeError('AWAIT is not supported in this context', expression.keyword);
      case 'WithField':
        return this.evaluateWithField(expression);
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
      const value = withObject.get(fieldName);
      if (value === undefined) {
        throw new RuntimeError(
          `Type '${withObject.typeName}' has no field '${fieldName}'`,
          expression.field.token
        );
      }
      return value;
    }

    throw new RuntimeError('WITH field access on non-record value', expression.token);
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

      // If not a field, check for UFCS - look for a function with this name
      const funcValue = this.context.getVariable(fieldName);
      if (funcValue && typeof funcValue === 'object' && funcValue !== null &&
          'kind' in funcValue && funcValue.kind === 'user-function') {
        // Return a bound function that will insert the object as the first argument
        return {
          kind: 'bound-function' as const,
          func: funcValue as UserFunctionValue,
          boundThis: objectValue
        };
      }

      throw new RuntimeError(
        `Type '${objectValue.typeName}' has no field '${fieldName}'`,
        expression.property.token
      );
    }

    throw new RuntimeError('Property access is not supported for this value', expression.property.token);
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
    } else {
      // For host functions or unknown callables, evaluate normally
      args = await Promise.all(expression.args.map((arg) => this.evaluateExpression(arg)));
    }

    return this.invokeCallable(callee, args, expression.closingParen, savedScope);
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
        args.push(await this.evaluateExpression(argExpr));
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

    const binding = this.forBindings.get(makePointerKey(position));
    if (!binding) {
      throw new RuntimeError('FOR without matching NEXT', statement.token);
    }

    this.context.setVariable(iteratorName, startValue, statement.token);

    const continueCondition = stepValue > 0 ? startValue <= endValue : startValue >= endValue;
    if (!continueCondition) {
      const targetPointer = binding.afterNextPointer ?? endPointer(this.program);
      return {
        type: 'jump',
        targetLineIndex: targetPointer.lineIndex,
        targetStatementIndex: targetPointer.statementIndex
      };
    }

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

  private async executeGosub(
    statement: GosubStatementNode,
    position: StatementPosition
  ): Promise<StatementSignal> {
    this.ensureCallDepthWithinBudget(statement.token);
    const target = await this.evaluateExpression(statement.target);
    const lineNumber = toLineNumber(target, statement.token);
    const lineIndex = this.lineIndexByNumber.get(lineNumber);
    if (lineIndex === undefined) {
      throw new RuntimeError(`Unknown subroutine line ${lineNumber}`, statement.token);
    }

    const resumePointer =
      this.findNextStatementPointer(position.lineIndex, position.statementIndex) ??
      endPointer(this.program);
    this.gosubStack.push(resumePointer);

    return { type: 'jump', targetLineIndex: lineIndex, targetStatementIndex: 0 };
  }

  private async executeFunction(statement: FunctionStatementNode): Promise<undefined> {
    // Store function definition in context
    const functionValue: UserFunctionValue = {
      kind: 'user-function',
      name: statement.name.name,
      parameters: statement.parameters,
      returnType: statement.returnType,
      body: statement.body,
      isAsync: false
    };
    this.context.setVariable(statement.name.name, functionValue, statement.name.token);
    return undefined;
  }

  private async executeSub(statement: SubStatementNode): Promise<undefined> {
    // Store sub definition in context
    const subValue: UserFunctionValue = {
      kind: 'user-function',
      name: statement.name.name,
      parameters: statement.parameters,
      returnType: undefined, // SUBs don't return values
      body: statement.body,
      isAsync: false,
      isSub: true
    };
    this.context.setVariable(statement.name.name, subValue, statement.name.token);
    return undefined;
  }

  private async executeExit(statement: ExitStatementNode): Promise<StatementSignal> {
    // EXIT SUB or EXIT FUNCTION acts like RETURN
    return { type: 'return', value: null };
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
    // Check if this is a function/sub return or a GOSUB return
    // For now, we'll handle GOSUB returns here
    if (statement.value === undefined && this.gosubStack.length > 0) {
      // GOSUB style return
      const pointer = this.gosubStack.pop()!;
      return {
        type: 'jump',
        targetLineIndex: pointer.lineIndex,
        targetStatementIndex: pointer.statementIndex
      };
    }

    // Function/Sub return
    let value: RuntimeValue = null;
    if (statement.value) {
      value = await this.evaluateExpression(statement.value);
    }
    return { type: 'return', value };
  }

  private ensureCallDepthWithinBudget(token: Token): void {
    const { maxCallDepth } = this.options;
    if (typeof maxCallDepth === 'number' && this.gosubStack.length >= maxCallDepth) {
      throw new RuntimeError('Exceeded maximum call depth', token);
    }
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
      for (const stmt of func.body) {
        const signal = await this.executeStatement(stmt, { lineIndex: 0, statementIndex: 0 });
        if (signal?.type === 'return') {
          return signal.value;
        }
        if (signal?.type === 'halt') {
          return null;
        }
      }

      // If no explicit return, return null
      return func.isSub ? null : null;
    } finally {
      // Restore previous scope
      this.context.restoreScope(callerScope);
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

type StatementSignal = StatementSignalJump | StatementSignalHalt | StatementSignalReturn | undefined;

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

function toLineNumber(value: RuntimeValue, token: Token): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new RuntimeError('GOTO requires an integer line number', token);
    }
    return value;
  }
  if (typeof value !== 'string') {
    throw new RuntimeError('GOTO requires an integer line number', token);
  }
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed)) {
    throw new RuntimeError('GOTO requires an integer line number', token);
  }
  return parsed;
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
