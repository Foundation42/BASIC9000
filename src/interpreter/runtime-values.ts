import type { HostFunctionValue, HostNamespaceValue } from './host.js';

export type RuntimeScalar = number | string | boolean | null;

export type RuntimeArray = RuntimeValue[];

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

export type RuntimeValue =
  | RuntimeScalar
  | HostNamespaceValue
  | HostFunctionValue
  | RuntimeArray
  | RuntimeRecordValue;

export function isRecordValue(value: RuntimeValue): value is RuntimeRecordValue {
  return value instanceof RuntimeRecordValue;
}
