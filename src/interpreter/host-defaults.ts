import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import WebSocket from 'ws';
import { createAINamespace } from './ai-namespace.js';
import { createCanvasNamespace } from './canvas-namespace.js';
import { createConfigNamespace } from './config-namespace.js';

import {
  HostEnvironment,
  createFunction,
  createNamespace,
  isHostNamespace,
  type HostNamespaceValue
} from './host.js';
import type { RuntimeValue } from './runtime-values.js';

export function createDefaultHostEnvironment(): HostEnvironment {
  const env = new HostEnvironment();

  // Register core BASIC functions (global, not namespaced)
  env.register('STR$', createFunction('STR$', (args) => {
    const value = args[0];
    if (value === undefined) return '';
    return String(value);
  }));

  env.register('CHR$', createFunction('CHR$', (args) => {
    const code = requireNumberArg('CHR$', args, 0);
    return String.fromCharCode(code);
  }));

  env.register('ASC', createFunction('ASC', (args) => {
    const str = requireStringArg('ASC', args, 0);
    return str.length > 0 ? str.charCodeAt(0) : 0;
  }));

  env.register('VAL', createFunction('VAL', (args) => {
    const str = requireStringArg('VAL', args, 0);
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }));

  env.register('LEN', createFunction('LEN', (args) => {
    if (args.length !== 1) {
      throw new Error(`LEN requires exactly 1 argument, got ${args.length}`);
    }
    const arg = args[0];
    if (typeof arg === 'string') {
      return arg.length;
    }
    if (Array.isArray(arg)) {
      return arg.length;
    }
    throw new Error(`LEN argument #1 must be string or array, got ${typeof arg}`);
  }));

  // Classic BASIC math functions (global)
  env.register('SIN', createFunction('SIN', (args) => Math.sin(requireNumberArg('SIN', args, 0))));
  env.register('COS', createFunction('COS', (args) => Math.cos(requireNumberArg('COS', args, 0))));
  env.register('TAN', createFunction('TAN', (args) => Math.tan(requireNumberArg('TAN', args, 0))));
  env.register('ATN', createFunction('ATN', (args) => Math.atan(requireNumberArg('ATN', args, 0))));
  env.register('SQR', createFunction('SQR', (args) => Math.sqrt(requireNumberArg('SQR', args, 0))));
  env.register('ABS', createFunction('ABS', (args) => Math.abs(requireNumberArg('ABS', args, 0))));
  env.register('INT', createFunction('INT', (args) => Math.floor(requireNumberArg('INT', args, 0))));
  env.register('RND', createFunction('RND', (args) => {
    // Classic BASIC RND function
    const arg = args.length > 0 ? requireNumberArg('RND', args, 0) : 1;
    if (arg < 0) {
      // Seed (not implemented, just return random)
      return Math.random();
    } else if (arg === 0) {
      // Return last random (not implemented, just return random)
      return Math.random();
    } else {
      // Return random 0 to 1
      return Math.random();
    }
  }));
  env.register('SGN', createFunction('SGN', (args) => {
    const num = requireNumberArg('SGN', args, 0);
    return num > 0 ? 1 : num < 0 ? -1 : 0;
  }));
  env.register('EXP', createFunction('EXP', (args) => Math.exp(requireNumberArg('EXP', args, 0))));
  env.register('LOG', createFunction('LOG', (args) => Math.log(requireNumberArg('LOG', args, 0))));

  // Classic BASIC string manipulation functions
  env.register('MID$', createFunction('MID$', (args) => {
    const str = requireStringArg('MID$', args, 0);
    const start = Math.max(1, Math.floor(requireNumberArg('MID$', args, 1))); // BASIC uses 1-based indexing
    const length = args.length >= 3 ? Math.max(0, Math.floor(requireNumberArg('MID$', args, 2))) : str.length;
    return str.substring(start - 1, start - 1 + length);
  }));

  env.register('LEFT$', createFunction('LEFT$', (args) => {
    const str = requireStringArg('LEFT$', args, 0);
    const count = Math.max(0, Math.floor(requireNumberArg('LEFT$', args, 1)));
    return str.substring(0, count);
  }));

  env.register('RIGHT$', createFunction('RIGHT$', (args) => {
    const str = requireStringArg('RIGHT$', args, 0);
    const count = Math.max(0, Math.floor(requireNumberArg('RIGHT$', args, 1)));
    return count === 0 ? '' : str.substring(str.length - count);
  }));

  env.register('INSTR', createFunction('INSTR', (args) => {
    const str = requireStringArg('INSTR', args, 0);
    const search = requireStringArg('INSTR', args, 1);
    const start = args.length >= 3 ? Math.max(1, Math.floor(requireNumberArg('INSTR', args, 2))) : 1;
    const result = str.indexOf(search, start - 1);
    return result === -1 ? 0 : result + 1; // BASIC uses 1-based indexing, 0 = not found
  }));

  env.register('SPACE$', createFunction('SPACE$', (args) => {
    const count = Math.max(0, Math.floor(requireNumberArg('SPACE$', args, 0)));
    return ' '.repeat(count);
  }));

  env.register('STRING$', createFunction('STRING$', (args) => {
    const count = Math.max(0, Math.floor(requireNumberArg('STRING$', args, 0)));
    const char = requireStringArg('STRING$', args, 1);
    if (char.length === 0) return '';
    return char[0].repeat(count);
  }));

  // Register namespaces
  env.register('SYS', createSystemNamespace());
  env.register('MATH', createMathNamespace());
  env.register('RANDOM', createRandomNamespace());
  env.register('STR', createStringNamespace());
  env.register('FS', createFileSystemNamespace());
  env.register('ARRAY', createArrayNamespace());
  env.register('TIME', createTimeNamespace());
  env.register('HTTP', createHttpNamespace());
  env.register('WS', createWebSocketNamespace());
  env.register('JSON', createJsonNamespace());
  env.register('AI', createAINamespace());
  env.register('CANVAS', createCanvasNamespace());
  env.register('CONFIG', createConfigNamespace());
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
    SETENV: createFunction('SYS.SETENV', (args) => {
      const key = requireStringArg('SYS.SETENV', args, 0);
      const value = requireStringArg('SYS.SETENV', args, 1);
      process.env[key] = value;
      return 0;
    }),
    JOINPATH: createFunction('SYS.JOINPATH', (args) => {
      const segments = args.map((segment, index) => requireStringValue('SYS.JOINPATH', segment, index));
      return path.join(...segments);
    }),
    CWD: createFunction('SYS.CWD', () => process.cwd()),
    HOME: createFunction('SYS.HOME', () => os.homedir()),
    CPUCOUNT: createFunction('SYS.CPUCOUNT', () => os.cpus()?.length ?? 0),
    SLEEP: createFunction('SYS.SLEEP', async (args) => {
      const duration = Math.max(0, requireNumberArg('SYS.SLEEP', args, 0));
      await new Promise((resolve) => setTimeout(resolve, duration));
      return duration;
    })
  });
}

function createMathNamespace() {
  return createNamespace('MATH', {
    PI: createFunction('MATH.PI', () => Math.PI),
    E: createFunction('MATH.E', () => Math.E),
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
    ROUND: createFunction('MATH.ROUND', (args) => Math.round(requireNumberArg('MATH.ROUND', args, 0))),
    LOG: createFunction('MATH.LOG', (args) => Math.log(requireNumberArg('MATH.LOG', args, 0))),
    LOG10: createFunction('MATH.LOG10', (args) => Math.log10(requireNumberArg('MATH.LOG10', args, 0))),
    EXP: createFunction('MATH.EXP', (args) => Math.exp(requireNumberArg('MATH.EXP', args, 0))),
    MIN: createFunction('MATH.MIN', (args) =>
      Math.min(requireNumberArg('MATH.MIN', args, 0), requireNumberArg('MATH.MIN', args, 1))
    ),
    MAX: createFunction('MATH.MAX', (args) =>
      Math.max(requireNumberArg('MATH.MAX', args, 0), requireNumberArg('MATH.MAX', args, 1))
    ),
    CLAMP: createFunction('MATH.CLAMP', (args) => {
      const value = requireNumberArg('MATH.CLAMP', args, 0);
      const min = requireNumberArg('MATH.CLAMP', args, 1);
      const max = requireNumberArg('MATH.CLAMP', args, 2);
      if (max < min) {
        throw new Error('MATH.CLAMP expects max >= min');
      }
      return Math.min(Math.max(value, min), max);
    }),
    DEG2RAD: createFunction('MATH.DEG2RAD', (args) => requireNumberArg('MATH.DEG2RAD', args, 0) * (Math.PI / 180)),
    RAD2DEG: createFunction('MATH.RAD2DEG', (args) => requireNumberArg('MATH.RAD2DEG', args, 0) * (180 / Math.PI)),
    DISTANCE: createFunction('MATH.DISTANCE', (args) => {
      const x1 = requireNumberArg('MATH.DISTANCE', args, 0);
      const y1 = requireNumberArg('MATH.DISTANCE', args, 1);
      const x2 = requireNumberArg('MATH.DISTANCE', args, 2);
      const y2 = requireNumberArg('MATH.DISTANCE', args, 3);
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    })
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
    }),
    INT: createFunction('RANDOM.INT', (args) => {
      const min = Math.floor(requireNumberArg('RANDOM.INT', args, 0));
      const max = Math.floor(requireNumberArg('RANDOM.INT', args, 1));
      if (max < min) {
        throw new Error('RANDOM.INT expects max >= min');
      }
      return Math.floor(Math.random() * (max - min + 1)) + min;
    })
  });
}

function createStringNamespace() {
  return createNamespace('STR', {
    UPPER: createFunction('STR.UPPER', (args) => requireStringArg('STR.UPPER', args, 0).toUpperCase()),
    LOWER: createFunction('STR.LOWER', (args) => requireStringArg('STR.LOWER', args, 0).toLowerCase()),
    TRIM: createFunction('STR.TRIM', (args) => requireStringArg('STR.TRIM', args, 0).trim()),
    LEN: createFunction('STR.LEN', (args) => requireStringArg('STR.LEN', args, 0).length),
    CONCAT: createFunction('STR.CONCAT', (args) => args.map((value, index) => requireStringValue('STR.CONCAT', value, index)).join('')),
    FIND: createFunction('STR.FIND', (args) => {
      const text = requireStringArg('STR.FIND', args, 0);
      const search = requireStringArg('STR.FIND', args, 1);
      const start = args.length >= 3 ? Math.max(0, Math.floor(requireNumberArg('STR.FIND', args, 2))) : 0;
      return text.indexOf(search, start);
    }),
    LEFT: createFunction('STR.LEFT', (args) => {
      const text = requireStringArg('STR.LEFT', args, 0);
      const count = Math.max(0, Math.floor(requireNumberArg('STR.LEFT', args, 1)));
      return text.substring(0, count);
    }),
    RIGHT: createFunction('STR.RIGHT', (args) => {
      const text = requireStringArg('STR.RIGHT', args, 0);
      const count = Math.max(0, Math.floor(requireNumberArg('STR.RIGHT', args, 1)));
      if (count === 0) {
        return '';
      }
      return text.substring(Math.max(0, text.length - count));
    }),
    MID: createFunction('STR.MID', (args) => {
      const text = requireStringArg('STR.MID', args, 0);
      const start = Math.max(1, Math.floor(requireNumberArg('STR.MID', args, 1)));
      const length = args.length >= 3 ? Math.max(0, Math.floor(requireNumberArg('STR.MID', args, 2))) : text.length;
      return text.substring(start - 1, start - 1 + length);
    }),
    REPLACE: createFunction('STR.REPLACE', (args) => {
      const text = requireStringArg('STR.REPLACE', args, 0);
      const search = requireStringArg('STR.REPLACE', args, 1);
      const replacement = requireStringArg('STR.REPLACE', args, 2);
      if (search === '') {
        return text;
      }
      return text.split(search).join(replacement);
    }),
    STARTSWITH: createFunction('STR.STARTSWITH', (args) =>
      toBooleanNumeric(requireStringArg('STR.STARTSWITH', args, 0).startsWith(requireStringArg('STR.STARTSWITH', args, 1)))
    ),
    ENDSWITH: createFunction('STR.ENDSWITH', (args) =>
      toBooleanNumeric(requireStringArg('STR.ENDSWITH', args, 0).endsWith(requireStringArg('STR.ENDSWITH', args, 1)))
    ),
    CONTAINS: createFunction('STR.CONTAINS', (args) =>
      toBooleanNumeric(requireStringArg('STR.CONTAINS', args, 0).includes(requireStringArg('STR.CONTAINS', args, 1)))
    ),
    REVERSE: createFunction('STR.REVERSE', (args) => requireStringArg('STR.REVERSE', args, 0).split('').reverse().join(''))
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
    }),
    DELETE: createFunction('FS.DELETE', (args) => {
      const filePath = requireStringArg('FS.DELETE', args, 0);
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true, recursive: false });
      }
      return 0;
    }),
    APPEND: createFunction('FS.APPEND', (args) => {
      const filePath = requireStringArg('FS.APPEND', args, 0);
      const data = requireStringArg('FS.APPEND', args, 1);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.appendFileSync(filePath, data, 'utf8');
      return data.length;
    }),
    LIST: createFunction('FS.LIST', (args) => {
      const dirPath = requireStringArg('FS.LIST', args, 0);
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      return entries
        .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
        .join('\n');
    }),
    COPY: createFunction('FS.COPY', (args) => {
      const from = requireStringArg('FS.COPY', args, 0);
      const to = requireStringArg('FS.COPY', args, 1);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      return 0;
    })
  });
}

function createHttpNamespace() {
  const ensureProtocol = (url: string): string => {
    // If no protocol specified, default to https://
    if (!/^https?:\/\//i.test(url)) {
      return `https://${url}`;
    }
    return url;
  };

  return createNamespace('HTTP', {
    GET: createFunction('HTTP.GET', async (args) => {
      const rawUrl = requireStringArg('HTTP.GET', args, 0);
      const url = ensureProtocol(rawUrl);
      const response = await fetch(url);
      return await response.text();
    }),
    POST: createFunction('HTTP.POST', async (args) => {
      const rawUrl = requireStringArg('HTTP.POST', args, 0);
      const url = ensureProtocol(rawUrl);
      const body = requireStringArg('HTTP.POST', args, 1);
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers: { 'content-type': 'text/plain' }
      });
      return await response.text();
    }),
    STATUS: createFunction('HTTP.STATUS', async (args) => {
      const rawUrl = requireStringArg('HTTP.STATUS', args, 0);
      const url = ensureProtocol(rawUrl);
      const response = await fetch(url, { method: 'HEAD' });
      return response.status;
    })
  });
}

function createArrayNamespace() {
  return createNamespace('ARRAY', {
    SORT: createFunction('ARRAY.SORT', (args) => {
      const array = [...requireArrayArg('ARRAY.SORT', args, 0)];
      const order = args.length >= 2 ? requireStringArg('ARRAY.SORT', args, 1).toUpperCase() : 'ASC';
      const comparator = buildArrayComparator(array);
      array.sort(comparator);
      if (order === 'DESC') {
        array.reverse();
      }
      return array;
    }),
    REVERSE: createFunction('ARRAY.REVERSE', (args) => [...requireArrayArg('ARRAY.REVERSE', args, 0)].reverse()),
    PUSH: createFunction('ARRAY.PUSH', (args) => {
      const array = requireArrayArg('ARRAY.PUSH', args, 0);
      return [...array, args[1] ?? ''];
    }),
    JOIN: createFunction('ARRAY.JOIN', (args) => {
      const array = requireArrayArg('ARRAY.JOIN', args, 0);
      const delimiter = args.length >= 2 ? requireStringArg('ARRAY.JOIN', args, 1) : ',';
      return array.map(arrayValueToString).join(delimiter);
    }),
    LENGTH: createFunction('ARRAY.LENGTH', (args) => requireArrayArg('ARRAY.LENGTH', args, 0).length)
  });
}

function createTimeNamespace() {
  return createNamespace('TIME', {
    NOW: createFunction('TIME.NOW', () => new Date().toISOString()),
    FROM: createFunction('TIME.FROM', (args) => {
      const value = args[0];
      const date = parseTimeValue('TIME.FROM', value);
      return date.toISOString();
    }),
    FORMAT: createFunction('TIME.FORMAT', (args) => {
      const value = args[0];
      const pattern = requireStringArg('TIME.FORMAT', args, 1);
      const date = parseTimeValue('TIME.FORMAT', value);
      return formatDate(date, pattern);
    })
  });
}

function createWebSocketNamespace() {
  return createNamespace('WS', {
    CONNECT: createFunction('WS.CONNECT', async (args) => {
      const url = requireStringArg('WS.CONNECT', args, 0);
      const handle = await WebSocketClientHandle.connect(url);
      websocketConnections.set(handle.value, handle);
      return handle.value;
    }),
    SEND: createFunction('WS.SEND', async (args) => {
      const handle = requireConnection('WS.SEND', args, 0);
      const payload = requireStringArg('WS.SEND', args, 1);
      await handle.send(payload);
      return payload.length;
    }),
    RECEIVE: createFunction('WS.RECEIVE', async (args) => {
      const handle = requireConnection('WS.RECEIVE', args, 0);
      const timeout = args.length >= 2 ? Math.max(0, requireNumberValue('WS.RECEIVE', args[1]!, 1)) : 0;
      const message = await handle.receive(timeout);
      return message ?? '';
    }),
    CLOSE: createFunction('WS.CLOSE', async (args) => {
      const handle = requireConnection('WS.CLOSE', args, 0);
      await handle.close();
      return 0;
    })
  });
}

function createJsonNamespace() {
  return createNamespace('JSON', {
    PARSE: createFunction('JSON.PARSE', (args) => {
      const text = requireStringArg('JSON.PARSE', args, 0);
      const handle = JsonHandle.parse(text);
      jsonHandles.set(handle.value, handle);
      return handle.value;
    }),
    GET: createFunction('JSON.GET', (args) => {
      const handle = requireJsonHandle('JSON.GET', args, 0);
      const path = args.length >= 2 ? requireStringArg('JSON.GET', args, 1) : '';
      return handle.get(path);
    }),
    STRINGIFY: createFunction('JSON.STRINGIFY', (args) => {
      const handle = requireJsonHandle('JSON.STRINGIFY', args, 0);
      const path = args.length >= 2 ? requireStringArg('JSON.STRINGIFY', args, 1) : '';
      return handle.stringify(path);
    }),
    TYPE: createFunction('JSON.TYPE', (args) => {
      const handle = requireJsonHandle('JSON.TYPE', args, 0);
      const path = args.length >= 2 ? requireStringArg('JSON.TYPE', args, 1) : '';
      return handle.type(path);
    })
  });
}

class JsonHandle {
  public static parse(text: string): JsonHandle {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (error) {
      throw new Error(`JSON.PARSE failed: ${(error as Error).message}`);
    }
    return new JsonHandle(value);
  }

  public static fromValue(value: unknown): JsonHandle {
    return new JsonHandle(value);
  }

  public readonly value: HostNamespaceValue;

  private constructor(private readonly root: unknown) {
    const self = this;
    this.value = createNamespace('JSON.VALUE', {
      GET: createFunction('JSON.VALUE.GET', (args) => {
        const path = args.length >= 1 ? requireStringArg('JSON.VALUE.GET', args, 0) : '';
        return self.get(path);
      }),
      STRINGIFY: createFunction('JSON.VALUE.STRINGIFY', (args) => {
        const path = args.length >= 1 ? requireStringArg('JSON.VALUE.STRINGIFY', args, 0) : '';
        return self.stringify(path);
      }),
      TYPE: createFunction('JSON.VALUE.TYPE', (args) => {
        const path = args.length >= 1 ? requireStringArg('JSON.VALUE.TYPE', args, 0) : '';
        return self.type(path);
      })
    });
  }

  public get(path: string): RuntimeValue {
    const node = this.resolve(path);
    return jsonValueToRuntime(node);
  }

  public stringify(path: string): string {
    const node = this.resolve(path);
    if (node === undefined) {
      return '';
    }
    if (typeof node === 'string') {
      return JSON.stringify(node);
    }
    return JSON.stringify(node);
  }

  public type(path: string): string {
    const node = this.resolve(path);
    if (node === null) {
      return 'null';
    }
    if (Array.isArray(node)) {
      return 'array';
    }
    return typeof node;
  }

  private resolve(path: string): unknown {
    if (!path) {
      return this.root;
    }
    const tokens = parseJsonPath(path);
    let current: unknown = this.root;
    for (const token of tokens) {
      if (typeof token === 'number') {
        if (!Array.isArray(current)) {
          return undefined;
        }
        current = current[token];
      } else {
        if (current && typeof current === 'object' && token in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[token];
        } else {
          return undefined;
        }
      }
    }
    return current;
  }
}

class WebSocketClientHandle {
  public static async connect(url: string): Promise<WebSocketClientHandle> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        socket.off('error', onError);
        socket.off('open', onOpen);
      };
      socket.once('error', onError);
      socket.once('open', onOpen);
    });
    return new WebSocketClientHandle(socket);
  }

  public readonly value: HostNamespaceValue;
  private readonly messages: string[] = [];
  private closed = false;
  private pendingResolver: ((value: string | null) => void) | null = null;
  private pendingTimeout: NodeJS.Timeout | null = null;

  private constructor(private readonly socket: WebSocket) {
    this.value = createNamespace('WS.CONNECTION', {
      SEND: createFunction('WS.CONNECTION.SEND', async (args) => {
        const payload = requireStringArg('WS.CONNECTION.SEND', args, 0);
        await this.send(payload);
        return payload.length;
      }),
      RECEIVE: createFunction('WS.CONNECTION.RECEIVE', async (args) => {
        const timeout = args.length >= 1
          ? Math.max(0, requireNumberValue('WS.CONNECTION.RECEIVE', args[0]!, 0))
          : 0;
        const message = await this.receive(timeout);
        return message ?? '';
      }),
      CLOSE: createFunction('WS.CONNECTION.CLOSE', async () => {
        await this.close();
        return 0;
      })
    });

    this.socket.on('message', (data) => {
      const text = typeof data === 'string' ? data : data.toString('utf8');
      if (this.pendingResolver) {
        this.drainPending(text);
      } else {
        this.messages.push(text);
      }
    });

    const finalize = () => {
      this.closed = true;
      this.drainPending(null);
    };

    this.socket.on('close', finalize);
    this.socket.on('error', () => finalize());
  }

  public async send(payload: string): Promise<void> {
    if (this.closed) {
      throw new Error('WebSocket connection already closed');
    }
    await new Promise<void>((resolve, reject) => {
      this.socket.send(payload, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async receive(timeoutMs: number): Promise<string | null> {
    if (this.messages.length > 0) {
      return this.messages.shift() ?? null;
    }
    if (this.closed) {
      return null;
    }

    return new Promise<string | null>((resolve) => {
      const onTimeout = () => {
        this.pendingResolver = null;
        this.pendingTimeout = null;
        resolve(null);
      };

      this.pendingResolver = (value) => {
        if (this.pendingTimeout) {
          clearTimeout(this.pendingTimeout);
          this.pendingTimeout = null;
        }
        this.pendingResolver = null;
        resolve(value);
      };

      // Always set a timeout - use a default of 30 seconds if not specified
      const effectiveTimeout = timeoutMs > 0 ? timeoutMs : 30000;
      this.pendingTimeout = setTimeout(onTimeout, effectiveTimeout);
    });
  }

  public async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    await new Promise<void>((resolve) => {
      const onClose = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        this.socket.off('close', onClose);
        this.socket.off('error', onError);
      };

      this.socket.once('close', onClose);
      this.socket.once('error', onError);
      this.socket.close();
    });
  }

  private drainPending(value: string | null): void {
    if (this.pendingResolver) {
      const resolver = this.pendingResolver;
      this.pendingResolver = null;
      if (this.pendingTimeout) {
        clearTimeout(this.pendingTimeout);
        this.pendingTimeout = null;
      }
      if (value !== null) {
        resolver(value);
      } else {
        resolver(this.messages.shift() ?? null);
      }
    }
  }
}

function requireConnection(functionName: string, args: RuntimeValue[], index: number): WebSocketClientHandle {
  if (index >= args.length) {
    throw new Error(`${functionName} expects argument #${index + 1}`);
  }
  const value = args[index]!;
  if (isHostNamespace(value)) {
    const handle = websocketConnections.get(value);
    if (handle) {
      return handle;
    }
  }
  throw new Error(`${functionName} argument #${index + 1} must be a WebSocket connection handle`);
}

const websocketConnections = new WeakMap<HostNamespaceValue, WebSocketClientHandle>();
const jsonHandles = new WeakMap<HostNamespaceValue, JsonHandle>();

function requireJsonHandle(functionName: string, args: RuntimeValue[], index: number): JsonHandle {
  if (index >= args.length) {
    throw new Error(`${functionName} expects argument #${index + 1}`);
  }
  const value = args[index]!;
  if (isHostNamespace(value)) {
    const handle = jsonHandles.get(value);
    if (handle) {
      return handle;
    }
  }
  if (typeof value === 'string') {
    const handle = JsonHandle.parse(value);
    jsonHandles.set(handle.value, handle);
    return handle;
  }
  throw new Error(`${functionName} argument #${index + 1} must be a JSON handle or JSON string`);
}

export function requireNumberArg(functionName: string, args: RuntimeValue[], index: number): number {
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

export function requireStringArg(functionName: string, args: RuntimeValue[], index: number): string {
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

function toBooleanNumeric(input: boolean): number {
  return input ? -1 : 0;
}

function requireArrayArg(functionName: string, args: RuntimeValue[], index: number): RuntimeValue[] {
  if (index >= args.length) {
    throw new Error(`${functionName} expects argument #${index + 1}`);
  }
  const value = args[index]!;
  if (Array.isArray(value)) {
    return value;
  }
  throw new Error(`${functionName} argument #${index + 1} must be an array`);
}

function buildArrayComparator(sample: RuntimeValue[]): (a: RuntimeValue, b: RuntimeValue) => number {
  const numeric = sample.every((item) => typeof item === 'number');
  if (numeric) {
    return (a, b) => (Number(a) as number) - (Number(b) as number);
  }
  return (a, b) => arrayValueToString(a).localeCompare(arrayValueToString(b));
}

function arrayValueToString(value: RuntimeValue): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => arrayValueToString(item)).join(',')}]`;
  }
  if (isHostNamespace(value)) {
    return `[Namespace ${value.name}]`;
  }
  return String(value);
}

function jsonValueToRuntime(value: unknown): RuntimeValue {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? -1 : 0;
  }
  if (Array.isArray(value)) {
    return value.map((item) => jsonValueToRuntime(item));
  }
  const handle = JsonHandle.fromValue(value);
  jsonHandles.set(handle.value, handle);
  return handle.value;
}

function parseJsonPath(path: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  if (!path) {
    return tokens;
  }
  const regex = /([^\.\[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(path)) !== null) {
    if (match[1]) {
      tokens.push(match[1]);
    } else if (match[2]) {
      tokens.push(Number(match[2]));
    }
  }
  return tokens;
}

function parseTimeValue(functionName: string, value: RuntimeValue): Date {
  if (typeof value === 'number') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${functionName} received invalid timestamp`);
    }
    return date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${functionName} received invalid time string`);
    }
    return date;
  }
  if (Array.isArray(value)) {
    throw new Error(`${functionName} does not accept arrays`);
  }
  throw new Error(`${functionName} received unsupported time value`);
}

function formatDate(date: Date, pattern: string): string {
  const replacements: Record<string, string> = {
    YYYY: date.getUTCFullYear().toString().padStart(4, '0'),
    MM: (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    DD: date.getUTCDate().toString().padStart(2, '0'),
    HH: date.getUTCHours().toString().padStart(2, '0'),
    mm: date.getUTCMinutes().toString().padStart(2, '0'),
    ss: date.getUTCSeconds().toString().padStart(2, '0')
  };
  return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => replacements[match] ?? match);
}
