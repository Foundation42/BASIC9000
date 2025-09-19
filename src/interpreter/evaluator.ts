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
  PrintStatementNode,
  ProgramNode,
  ReturnStatementNode,
  StatementNode,
  StringLiteralNode,
  UnaryExpressionNode
} from './ast.js';
import { TokenType, type Token } from './tokenizer.js';

export type RuntimeValue = number | string;

export interface ExecutionOptions {
  readonly maxSteps?: number;
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

export function executeProgram(program: ProgramNode, options: ExecutionOptions = {}): ExecutionResult {
  const context = new ExecutionContext();
  const evaluator = new Evaluator(program, context, options);
  evaluator.run();
  return context.finalize(evaluator.haltReason);
}

export function executeSource(source: string, options: ExecutionOptions = {}): ExecutionResult {
  throw new Error('executeSource requires parsed program; use parseSource first.');
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
    return {
      outputs: this.outputs.slice(),
      variables: Object.fromEntries(this.variables.entries()),
      halted: haltReason
    };
  }
}

class Evaluator {
  private readonly lineIndexByNumber = new Map<number, number>();
  private stepCount = 0;
  public haltReason: 'END' | 'STOP' | undefined;

  constructor(
    private readonly program: ProgramNode,
    private readonly context: ExecutionContext,
    private readonly options: ExecutionOptions
  ) {
    program.lines.forEach((line, index) => {
      if (typeof line.lineNumber === 'number') {
        this.lineIndexByNumber.set(line.lineNumber, index);
      }
    });
  }

  public run(): void {
    const { lines } = this.program;
    let lineIndex = 0;

    while (lineIndex < lines.length && !this.haltReason) {
      const line = lines[lineIndex]!;
      const signal = this.executeLine(line, lineIndex);
      if (signal?.type === 'jump') {
        lineIndex = signal.targetLineIndex;
        continue;
      }
      if (signal?.type === 'halt') {
        this.haltReason = signal.reason;
        break;
      }
      lineIndex += 1;
    }
  }

  private executeLine(line: LineNode, lineIndex: number): StatementSignal | undefined {
    for (let i = 0; i < line.statements.length; i += 1) {
      this.ensureWithinStepBudget(line.statements[i]!.token);
      const signal = this.executeStatement(line.statements[i]!);
      if (!signal) {
        continue;
      }
      if (signal.type === 'continue') {
        continue;
      }
      return signal;
    }
    return undefined;
  }

  private executeStatement(statement: StatementNode): StatementSignal | undefined {
    switch (statement.type) {
      case 'LetStatement':
        return this.executeLet(statement);
      case 'AssignmentStatement':
        return this.executeAssignment(statement);
      case 'PrintStatement':
        return this.executePrint(statement);
      case 'IfStatement':
        return this.executeIf(statement);
      case 'ForStatement':
        return this.unsupportedStatement('FOR loops are not implemented yet', statement.token);
      case 'NextStatement':
        return this.unsupportedStatement('NEXT is not implemented yet', statement.token);
      case 'GotoStatement':
        return this.executeGoto(statement);
      case 'GosubStatement':
        return this.unsupportedStatement('GOSUB is not implemented yet', statement.token);
      case 'ReturnStatement':
        return this.unsupportedStatement('RETURN is not implemented yet', statement.token);
      case 'EndStatement':
        return { type: 'halt', reason: 'END' };
      case 'ExpressionStatement':
        this.evaluateExpression(statement.expression);
        return undefined;
      default: {
        const exhaustiveCheck: never = statement;
        throw exhaustiveCheck;
      }
    }
  }

  private executeLet(statement: LetStatementNode): StatementSignal | undefined {
    const target = this.evaluateAssignmentTarget(statement.target);
    const value = this.evaluateExpression(statement.value);
    this.context.setVariable(target.name, value, statement.token);
    return undefined;
  }

  private executeAssignment(statement: AssignmentStatementNode): StatementSignal | undefined {
    const target = this.evaluateAssignmentTarget(statement.target);
    const value = this.evaluateExpression(statement.value);
    this.context.setVariable(target.name, value, statement.token);
    return undefined;
  }

  private executePrint(statement: PrintStatementNode): StatementSignal | undefined {
    if (statement.arguments.length === 0) {
      this.context.writePrint([''], statement.trailing ?? 'newline');
      return undefined;
    }

    const segments: string[] = [];
    statement.arguments.forEach((arg, index) => {
      const value = this.evaluateExpression(arg.expression);
      segments.push(runtimeValueToString(value));
      if (arg.separator === 'comma') {
        segments.push('\t');
      } else if (arg.separator === 'semicolon') {
        // no extra characters
      } else if (index < statement.arguments.length - 1) {
        segments.push(' ');
      }
    });

    this.context.writePrint(segments, statement.trailing ?? 'newline');
    return undefined;
  }

  private executeIf(statement: IfStatementNode): StatementSignal | undefined {
    const condition = this.evaluateExpression(statement.condition);
    const branch = truthy(condition) ? statement.thenBranch : statement.elseBranch ?? [];
    for (const nested of branch) {
      const signal = this.executeStatement(nested);
      if (signal) {
        return signal;
      }
    }
    return undefined;
  }

  private executeGoto(statement: GotoStatementNode): StatementSignal {
    const target = this.evaluateExpression(statement.target);
    const lineNumber = toLineNumber(target, statement.token);
    const index = this.lineIndexByNumber.get(lineNumber);
    if (index === undefined) {
      throw new RuntimeError(`Unknown line number ${lineNumber}`, statement.token);
    }
    return { type: 'jump', targetLineIndex: index };
  }

  private evaluateAssignmentTarget(target: IdentifierNode | MemberExpressionNode): IdentifierNode {
    if (target.type === 'Identifier') {
      return target;
    }
    throw new RuntimeError('Member assignment is not supported yet', target.property.token);
  }

  private evaluateExpression(expression: ExpressionNode): RuntimeValue {
    switch (expression.type) {
      case 'NumberLiteral':
        return expression.value;
      case 'StringLiteral':
        return expression.value;
      case 'Identifier':
        return this.context.getVariable(expression.name);
      case 'UnaryExpression':
        return this.evaluateUnary(expression);
      case 'BinaryExpression':
        return this.evaluateBinary(expression);
      case 'CallExpression':
        throw new RuntimeError('Function calls are not implemented yet', expression.closingParen);
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

  private evaluateMemberExpression(expression: MemberExpressionNode): RuntimeValue {
    throw new RuntimeError('Property access is not implemented yet', expression.property.token);
  }

  private evaluateUnary(expression: UnaryExpressionNode): RuntimeValue {
    const value = this.evaluateExpression(expression.operand);
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

  private evaluateBinary(expression: BinaryExpressionNode): RuntimeValue {
    const left = this.evaluateExpression(expression.left);
    const right = this.evaluateExpression(expression.right);
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
}

interface StatementSignalJump {
  readonly type: 'jump';
  readonly targetLineIndex: number;
}

interface StatementSignalHalt {
  readonly type: 'halt';
  readonly reason: 'END' | 'STOP';
}

interface StatementSignalContinue {
  readonly type: 'continue';
}

type StatementSignal = StatementSignalJump | StatementSignalHalt | StatementSignalContinue | undefined;

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
  return toNumber(value, token);
}

function runtimeValueToString(value: RuntimeValue): string {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value.toString();
    }
    const text = value.toString();
    return text;
  }
  return value;
}

function truthy(value: RuntimeValue): boolean {
  if (typeof value === 'number') {
    return value !== 0;
  }
  return value.length > 0;
}

function booleanToRuntime(value: boolean): number {
  return value ? -1 : 0;
}

function toStringValue(value: RuntimeValue): string {
  return typeof value === 'string' ? value : value.toString();
}

function toNumber(value: RuntimeValue, token: Token): number {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new RuntimeError(`Cannot convert '${value}' to number`, token);
  }
  return parsed;
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
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed)) {
    throw new RuntimeError('GOTO requires an integer line number', token);
  }
  return parsed;
}
