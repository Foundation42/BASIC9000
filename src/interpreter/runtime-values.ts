import type { HostFunctionValue, HostNamespaceValue } from './host.js';

export type RuntimeScalar = number | string;

export type RuntimeValue = RuntimeScalar | HostNamespaceValue | HostFunctionValue;
