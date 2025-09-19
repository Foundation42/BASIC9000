import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { HostEnvironment, createFunction, createNamespace } from './host.js';
import type { RuntimeValue } from './runtime-values.js';

export function createDefaultHostEnvironment(): HostEnvironment {
  const env = new HostEnvironment();
  env.register('SYS', createSystemNamespace());
  env.register('MATH', createMathNamespace());
  env.register('RANDOM', createRandomNamespace());
  env.register('STR', createStringNamespace());
  env.register('FS', createFileSystemNamespace());
  return env;
}

function createSystemNamespace() {
  return createNamespace('SYS', {
    VERSION: createFunction('SYS.VERSION', () => 'BASIC9000 0.1.0'),
    PLATFORM: createFunction('SYS.PLATFORM', () => process.platform),
    TICKS: createFunction('SYS.TICKS', () => Date.now()),
    TIME$: createFunction('SYS.TIME$', () => new Date().toISOString()),
    ENV: createFunction('SYS.ENV', (args) => {
      const key = requireStringArg('SYS.ENV', args, 0);
      return process.env[key] ?? '';
    }),
    JOINPATH: createFunction('SYS.JOINPATH', (args) => {
      const segments = args.map((segment, index) => requireStringValue('SYS.JOINPATH', segment, index));
      return path.join(...segments);
    })
  });
}

function createMathNamespace() {
  return createNamespace('MATH', {
    ABS: createFunction('MATH.ABS', (args) => Math.abs(requireNumberArg('MATH.ABS', args, 0))),
    SIN: createFunction('MATH.SIN', (args) => Math.sin(requireNumberArg('MATH.SIN', args, 0))),
    COS: createFunction('MATH.COS', (args) => Math.cos(requireNumberArg('MATH.COS', args, 0))),
    TAN: createFunction('MATH.TAN', (args) => Math.tan(requireNumberArg('MATH.TAN', args, 0))),
    SQRT: createFunction('MATH.SQRT', (args) => Math.sqrt(requireNumberArg('MATH.SQRT', args, 0))),
    POW: createFunction('MATH.POW', (args) =>
      Math.pow(requireNumberArg('MATH.POW', args, 0), requireNumberArg('MATH.POW', args, 1))
    ),
    FLOOR: createFunction('MATH.FLOOR', (args) => Math.floor(requireNumberArg('MATH.FLOOR', args, 0))),
    CEIL: createFunction('MATH.CEIL', (args) => Math.ceil(requireNumberArg('MATH.CEIL', args, 0))),
    ROUND: createFunction('MATH.ROUND', (args) => Math.round(requireNumberArg('MATH.ROUND', args, 0)))
  });
}

function createRandomNamespace() {
  return createNamespace('RANDOM', {
    NEXT: createFunction('RANDOM.NEXT', () => Math.random()),
    RANGE: createFunction('RANDOM.RANGE', (args) => {
      const min = requireNumberArg('RANDOM.RANGE', args, 0);
      const max = requireNumberArg('RANDOM.RANGE', args, 1);
      if (max < min) {
        throw new Error('RANDOM.RANGE expects max >= min');
      }
      return min + Math.random() * (max - min);
    })
  });
}

function createStringNamespace() {
  return createNamespace('STR', {
    UPPER: createFunction('STR.UPPER', (args) => requireStringArg('STR.UPPER', args, 0).toUpperCase()),
    LOWER: createFunction('STR.LOWER', (args) => requireStringArg('STR.LOWER', args, 0).toLowerCase()),
    TRIM: createFunction('STR.TRIM', (args) => requireStringArg('STR.TRIM', args, 0).trim()),
    LEN: createFunction('STR.LEN', (args) => requireStringArg('STR.LEN', args, 0).length),
    CONCAT: createFunction('STR.CONCAT', (args) => args.map((value, index) => requireStringValue('STR.CONCAT', value, index)).join(''))
  });
}

function createFileSystemNamespace() {
  return createNamespace('FS', {
    READ: createFunction('FS.READ', (args) => {
      const filePath = requireStringArg('FS.READ', args, 0);
      return fs.readFileSync(filePath, 'utf8');
    }),
    WRITE: createFunction('FS.WRITE', (args) => {
      const filePath = requireStringArg('FS.WRITE', args, 0);
      const data = requireStringArg('FS.WRITE', args, 1);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, data, 'utf8');
      return data.length;
    }),
    EXISTS: createFunction('FS.EXISTS', (args) => (fs.existsSync(requireStringArg('FS.EXISTS', args, 0)) ? -1 : 0)),
    TMPDIR: createFunction('FS.TMPDIR', () => os.tmpdir()),
    STAT: createFunction('FS.STAT', (args) => {
      const filePath = requireStringArg('FS.STAT', args, 0);
      const stats = fs.statSync(filePath);
      return createNamespace('FS.STAT.RESULT', {
        SIZE: createFunction('FS.STAT.SIZE', () => stats.size),
        ISFILE: createFunction('FS.STAT.ISFILE', () => (stats.isFile() ? -1 : 0)),
        ISDIR: createFunction('FS.STAT.ISDIR', () => (stats.isDirectory() ? -1 : 0))
      });
    })
  });
}

function requireNumberArg(functionName: string, args: RuntimeValue[], index: number): number {
  if (index >= args.length) {
    throw new Error(`${functionName} expects argument #${index + 1}`);
  }
  return requireNumberValue(functionName, args[index]!, index);
}

function requireNumberValue(functionName: string, value: RuntimeValue, index: number): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  throw new Error(`${functionName} argument #${index + 1} must be numeric`);
}

function requireStringArg(functionName: string, args: RuntimeValue[], index: number): string {
  if (index >= args.length) {
    throw new Error(`${functionName} expects argument #${index + 1}`);
  }
  return requireStringValue(functionName, args[index]!, index);
}

function requireStringValue(functionName: string, value: RuntimeValue, index: number): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  throw new Error(`${functionName} argument #${index + 1} must be string`);
}
