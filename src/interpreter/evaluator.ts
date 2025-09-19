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
  StopStatementNode,
  StatementNode,
  StringLiteralNode,
  UnaryExpressionNode
} from './ast.js';
import type { Token } from './tokenizer.js';

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
  private readonly forBindings = new Map<string, ForBinding>();
  private readonly forStack: ForFrame[] = [];
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
    this.buildLoopBindings();
  }

  public run(): void {
    const { lines } = this.program;
    let lineIndex = 0;
    let statementIndex = 0;

    while (lineIndex < lines.length && !this.haltReason) {
      const line = lines[lineIndex]!;
      const signal = this.executeLine(line, lineIndex, statementIndex);

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

  private executeLine(
    line: LineNode,
    lineIndex: number,
    startStatementIndex: number
  ): StatementSignal | undefined {
    for (let i = startStatementIndex; i < line.statements.length; i += 1) {
      const statement = line.statements[i]!;
      this.ensureWithinStepBudget(statement.token);
      const signal = this.executeStatement(statement, { lineIndex, statementIndex: i });
      if (signal) {
        return signal;
      }
    }
    return undefined;
  }

  private executeStatement(
    statement: StatementNode,
    position: StatementPosition
  ): StatementSignal | undefined {
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
        return this.unsupportedStatement('GOSUB is not implemented yet', statement.token);
      case 'ReturnStatement':
        return this.unsupportedStatement('RETURN is not implemented yet', statement.token);
      case 'StopStatement':
        return { type: 'halt', reason: 'STOP' };
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

  private executeIf(
    statement: IfStatementNode,
    position: StatementPosition
  ): StatementSignal | undefined {
    const condition = this.evaluateExpression(statement.condition);
    const branch = truthy(condition) ? statement.thenBranch : statement.elseBranch ?? [];
    for (const nested of branch) {
      const signal = this.executeStatement(nested, position);
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
    return { type: 'jump', targetLineIndex: index, targetStatementIndex: 0 };
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
          const afterNextPointer = this.findNextStatementPointer(lineIndex, statementIndex);
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

  private executeFor(
    statement: ForStatementNode,
    position: StatementPosition
  ): StatementSignal | undefined {
    const iteratorName = statement.iterator.name;
    const startValue = toNumber(this.evaluateExpression(statement.start), statement.token);
    const endValue = toNumber(this.evaluateExpression(statement.end), statement.token);
    const stepValue = statement.step
      ? toNumber(this.evaluateExpression(statement.step), statement.token)
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
      const targetPointer =
        binding.afterNextPointer ?? advancePointer(binding.nextPointer) ?? binding.nextPointer;
      return {
        type: 'jump',
        targetLineIndex: targetPointer.lineIndex,
        targetStatementIndex: targetPointer.statementIndex
      };
    }

    const bodyPointer =
      this.findNextStatementPointer(position.lineIndex, position.statementIndex) ??
      advancePointer(position) ??
      binding.nextPointer;

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

  private executeNext(
    statement: NextStatementNode,
    position: StatementPosition
  ): StatementSignal | undefined {
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
  readonly afterNextPointer?: StatementPointer;
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

function advancePointer(pointer: StatementPointer): StatementPointer | undefined {
  return {
    lineIndex: pointer.lineIndex,
    statementIndex: pointer.statementIndex + 1
  };
}
