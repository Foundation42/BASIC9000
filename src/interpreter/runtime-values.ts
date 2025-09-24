import type { HostFunctionValue, HostNamespaceValue } from './host.js';
import type { ParameterNode, StatementNode, TypeAnnotationNode, PromptTemplateNode, ExpressionNode, AIFuncExpectNode } from './ast.js';

export type RuntimeScalar = number | string | boolean | null;

export class RuntimeRecordValue {
  public readonly kind = 'record' as const;
  private readonly data: Map<string, RuntimeValue>;

  constructor(public readonly typeName: string, entries: Iterable<[string, RuntimeValue]>) {
    this.data = new Map(entries);
  }

  public get(field: string): RuntimeValue | undefined {
    return this.data.get(field);
  }

  public has(field: string): boolean {
    return this.data.has(field);
  }

  public set(field: string, value: RuntimeValue): void {
    this.data.set(field, value);
  }

  public entries(): [string, RuntimeValue][] {
    return Array.from(this.data.entries());
  }

  public toPlainObject(): Record<string, RuntimeValue> {
    const result: Record<string, RuntimeValue> = {};
    for (const [key, value] of this.data.entries()) {
      result[key] = value;
    }
    return result;
  }
}

export interface UserFunctionValue {
  readonly kind: 'user-function';
  readonly name: string;
  readonly parameters: readonly ParameterNode[];
  readonly returnType: TypeAnnotationNode | undefined;
  readonly body: readonly StatementNode[];
  readonly isAsync: boolean;
  readonly isSub?: boolean;
  readonly aiMeta?: AIFunctionMetadata;
}

export interface AIFunctionMetadata {
  readonly selfParameterName: string;
  readonly prompt: PromptTemplateNode;
  readonly systemPrompt?: string;
  readonly usingExpression?: ExpressionNode;
  readonly returnType: TypeAnnotationNode | undefined;
  readonly expect?: AIFuncExpectNode;
}

export interface BoundFunctionValue {
  readonly kind: 'bound-function';
  readonly func: UserFunctionValue;
  readonly boundThis: RuntimeValue;
}

export interface BoundHostFunctionValue {
  readonly kind: 'bound-host-function';
  readonly func: HostFunctionValue;
  readonly boundThis: RuntimeValue;
}

export class RefValue {
  constructor(
    public readonly varName: string,
    private readonly getterFunc: () => RuntimeValue,
    private readonly setterFunc: (value: RuntimeValue) => void
  ) {}

  public get(): RuntimeValue {
    return this.getterFunc();
  }

  public set(newValue: RuntimeValue): void {
    this.setterFunc(newValue);
  }
}

export class TaskValue {
  public readonly kind = 'task' as const;
  public readonly mailbox: RuntimeValue[] = [];
  public status: 'running' | 'waiting' | 'completed' | 'error' = 'running';
  public result: RuntimeValue | undefined;
  public error: string | undefined;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly fiber: () => Promise<RuntimeValue>
  ) {}

  public send(message: RuntimeValue): void {
    this.mailbox.push(message);
  }

  public receive(timeout?: number): Promise<RuntimeValue | null> {
    if (this.mailbox.length > 0) {
      return Promise.resolve(this.mailbox.shift() || null);
    }

    if (timeout === 0) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const checkMessages = () => {
        if (this.mailbox.length > 0) {
          resolve(this.mailbox.shift() || null);
          return;
        }
        setTimeout(checkMessages, 10);
      };

      if (timeout && timeout > 0) {
        setTimeout(() => resolve(null), timeout);
      }

      checkMessages();
    });
  }
}

export type RuntimeValue =
  | RuntimeScalar
  | HostNamespaceValue
  | HostFunctionValue
  | UserFunctionValue
  | BoundFunctionValue
  | BoundHostFunctionValue
  | RuntimeValue[]
  | RuntimeRecordValue
  | TaskValue;

export function isRecordValue(value: RuntimeValue): value is RuntimeRecordValue {
  return value instanceof RuntimeRecordValue;
}

export function isTaskValue(value: RuntimeValue): value is TaskValue {
  return value instanceof TaskValue;
}
