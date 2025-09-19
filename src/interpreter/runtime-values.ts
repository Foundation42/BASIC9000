import type { HostFunctionValue, HostNamespaceValue } from './host.js';

export type RuntimeScalar = number | string;

export type RuntimeArray = RuntimeValue[];

export type RuntimeValue = RuntimeScalar | HostNamespaceValue | HostFunctionValue | RuntimeArray;
