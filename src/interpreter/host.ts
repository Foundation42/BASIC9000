import type { RuntimeValue } from './runtime-values.js';

export type HostEntry = RuntimeValue | HostNamespaceValue | HostFunctionValue;

export interface HostNamespaceValue {
  readonly kind: 'host-namespace';
  readonly name: string;
  getMember(name: string): HostEntry | undefined;
}

export interface HostFunctionContext {
  readonly getVariable: (name: string) => RuntimeValue;
  readonly setVariable: (name: string, value: RuntimeValue) => void;
}

export type HostFunctionHandler = (
  args: RuntimeValue[],
  context: HostFunctionContext
) => RuntimeValue;

export interface HostFunctionValue {
  readonly kind: 'host-function';
  readonly name: string;
  readonly arity?: number;
  invoke(args: RuntimeValue[], context: HostFunctionContext): RuntimeValue;
}

export class HostEnvironment {
  private readonly root = new Map<string, HostEntry>();

  constructor(entries?: Record<string, HostEntry>) {
    if (entries) {
      Object.entries(entries).forEach(([name, entry]) => {
        this.register(name, entry);
      });
    }
  }

  public register(name: string, entry: HostEntry): void {
    this.root.set(normalize(name), entry);
  }

  public get(name: string): HostEntry | undefined {
    return this.root.get(normalize(name));
  }
}

export function createNamespace(
  name: string,
  members: Record<string, HostEntry>
): HostNamespaceValue {
  const table = new Map<string, HostEntry>();
  Object.entries(members).forEach(([memberName, entry]) => {
    table.set(normalize(memberName), entry);
  });
  return new SimpleHostNamespace(name, table);
}

export function createFunction(
  name: string,
  handler: HostFunctionHandler,
  arity?: number
): HostFunctionValue {
  return new SimpleHostFunction(name, handler, arity);
}

export function isHostNamespace(value: unknown): value is HostNamespaceValue {
  return Boolean(value && typeof value === 'object' && (value as HostNamespaceValue).kind === 'host-namespace');
}

export function isHostFunction(value: unknown): value is HostFunctionValue {
  return Boolean(value && typeof value === 'object' && (value as HostFunctionValue).kind === 'host-function');
}

class SimpleHostNamespace implements HostNamespaceValue {
  public readonly kind = 'host-namespace' as const;

  constructor(public readonly name: string, private readonly members: Map<string, HostEntry>) {}

  public getMember(name: string): HostEntry | undefined {
    return this.members.get(normalize(name));
  }
}

class SimpleHostFunction implements HostFunctionValue {
  public readonly kind = 'host-function' as const;

  constructor(
    public readonly name: string,
    private readonly handler: HostFunctionHandler,
    public readonly arity?: number
  ) {}

  public invoke(args: RuntimeValue[], context: HostFunctionContext): RuntimeValue {
    if (typeof this.arity === 'number' && args.length !== this.arity) {
      throw new Error(`Function ${this.name} expects ${this.arity} argument(s)`);
    }
    return this.handler(args, context);
  }
}

function normalize(name: string): string {
  return name.toUpperCase();
}
