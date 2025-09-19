import type {
  AssignmentStatementNode,
  BinaryExpressionNode,
  EndStatementNode,
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
  NumberLiteralNode,
  ArrayLiteralNode,
  PrintStatementNode,
  ProgramNode,
  ReturnStatementNode,
  StopStatementNode,
  StatementNode,
  StringLiteralNode,
  UnaryExpressionNode
} from './ast.js';
import {
  HostEnvironment,
  type HostFunctionContext,
  isHostFunction,
  isHostNamespace
} from './host.js';
import { createDefaultHostEnvironment } from './host-defaults.js';
import type { RuntimeValue } from './runtime-values.js';
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

  public getVariable(name: string): RuntimeValue {
    const key = normalizeIdentifier(name);
    if (this.variables.has(key)) {
      return this.variables.get(key)!;
    }
    return defaultValueForIdentifier(name);
  }

  public setVariable(name: string, value: RuntimeValue, token: Token): void {
    const key = normalizeIdentifier(name);
    const coerced = coerceValueForIdentifier(name, value, token);
    this.variables.set(key, coerced);
  }

  public hasVariable(name: string): boolean {
    const key = normalizeIdentifier(name);
    return this.variables.has(key);
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
  ): StatementSignal | undefined {
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
      case 'ExpressionStatement':
        await this.evaluateExpression(statement.expression);
        return undefined;
      default: {
        const exhaustiveCheck: never = statement;
        throw exhaustiveCheck;
      }
    }
  }

  private async executeLet(statement: LetStatementNode): Promise<StatementSignal | undefined> {
    const target = this.evaluateAssignmentTarget(statement.target);
    const value = await this.evaluateExpression(statement.value);
    this.context.setVariable(target.name, value, statement.token);
    return undefined;
  }

  private async executeAssignment(
    statement: AssignmentStatementNode
  ): Promise<StatementSignal | undefined> {
    const target = this.evaluateAssignmentTarget(statement.target);
    const value = await this.evaluateExpression(statement.value);
    this.context.setVariable(target.name, value, statement.token);
    return undefined;
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

  private evaluateAssignmentTarget(target: IdentifierNode | MemberExpressionNode): IdentifierNode {
    if (target.type === 'Identifier') {
      return target;
    }
    throw new RuntimeError('Member assignment is not supported yet', target.property.token);
  }

  private async evaluateExpression(expression: ExpressionNode): Promise<RuntimeValue> {
    switch (expression.type) {
      case 'NumberLiteral':
        return expression.value;
      case 'StringLiteral':
        return expression.value;
      case 'Identifier':
        return this.resolveIdentifier(expression);
      case 'ArrayLiteral':
        return this.evaluateArrayLiteral(expression);
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
      default: {
        const exhaustiveCheck: never = expression;
        throw exhaustiveCheck;
      }
    }
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

    throw new RuntimeError('Property access is not supported for this value', expression.property.token);
  }

  private async evaluateCallExpression(expression: CallExpressionNode): Promise<RuntimeValue> {
    const callee = await this.evaluateExpression(expression.callee);
    const args = await Promise.all(expression.args.map((arg) => this.evaluateExpression(arg)));
    return this.invokeCallable(callee, args, expression.closingParen);
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

  private unsupportedStatement(message: string, token: Token): StatementSignal {
    throw new RuntimeError(message, token);
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

  private executeReturn(statement: ReturnStatementNode): StatementSignal {
    if (this.gosubStack.length === 0) {
      throw new RuntimeError('RETURN without GOSUB', statement.token);
    }

    const pointer = this.gosubStack.pop()!;
    return {
      type: 'jump',
      targetLineIndex: pointer.lineIndex,
      targetStatementIndex: pointer.statementIndex
    };
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
    token: Token
  ): Promise<RuntimeValue> {
    if (isHostFunction(callee)) {
      try {
        return await callee.invoke(args, this.makeHostFunctionContext(token));
      } catch (error) {
        throw this.wrapHostError(error, token);
      }
    }

    throw new RuntimeError('Value is not callable', token);
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

type StatementSignal = StatementSignalJump | StatementSignalHalt | undefined;

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

function normalizeIdentifier(name: string): string {
  return name.toUpperCase();
}

function defaultValueForIdentifier(name: string): RuntimeValue {
  if (name.endsWith('$')) {
    return '';
  }
  return 0;
}

function coerceValueForIdentifier(name: string, value: RuntimeValue, token: Token): RuntimeValue {
  if (name.endsWith('$')) {
    return toStringValue(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return toNumber(value, token);
  }
  if (Array.isArray(value)) {
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
  if (Array.isArray(value)) {
    return `[${value.map((item) => runtimeValueToString(item)).join(',')}]`;
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
  if (Array.isArray(value)) {
    return value.length > 0;
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
  if (Array.isArray(value)) {
    return `[${value.map((item) => toStringValue(item)).join(',')}]`;
  }
  return hostValueToString(value);
}

function toNumber(value: RuntimeValue, token: Token): number {
  if (typeof value === 'number') {
    return value;
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
  throw new RuntimeError('Cannot convert host value to number', token);
}

function equals(left: RuntimeValue, right: RuntimeValue): boolean {
  if (typeof left === 'number' && typeof right === 'number') {
    return left === right;
  }
  return toStringValue(left).toUpperCase() === toStringValue(right).toUpperCase();
}

function compare(left: RuntimeValue, right: RuntimeValue): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  const leftStr = toStringValue(left).toUpperCase();
  const rightStr = toStringValue(right).toUpperCase();
  if (leftStr === rightStr) {
    return 0;
  }
  return leftStr < rightStr ? -1 : 1;
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
