import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import WebSocket from 'ws';

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
  env.register('SYS', createSystemNamespace());
  env.register('MATH', createMathNamespace());
  env.register('RANDOM', createRandomNamespace());
  env.register('STR', createStringNamespace());
  env.register('FS', createFileSystemNamespace());
  env.register('HTTP', createHttpNamespace());
  env.register('WS', createWebSocketNamespace());
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

function createHttpNamespace() {
  return createNamespace('HTTP', {
    GET: createFunction('HTTP.GET', async (args) => {
      const url = requireStringArg('HTTP.GET', args, 0);
      const response = await fetch(url);
      return await response.text();
    }),
    POST: createFunction('HTTP.POST', async (args) => {
      const url = requireStringArg('HTTP.POST', args, 0);
      const body = requireStringArg('HTTP.POST', args, 1);
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers: { 'content-type': 'text/plain' }
      });
      return await response.text();
    }),
    STATUS: createFunction('HTTP.STATUS', async (args) => {
      const url = requireStringArg('HTTP.STATUS', args, 0);
      const response = await fetch(url, { method: 'HEAD' });
      return response.status;
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

      if (timeoutMs > 0) {
        this.pendingTimeout = setTimeout(onTimeout, timeoutMs);
      }
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
