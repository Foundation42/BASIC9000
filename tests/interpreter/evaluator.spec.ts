import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { WebSocketServer } from 'ws';

import { parseSource } from '../../src/interpreter/parser.js';
import {
  executeProgram,
  RuntimeError,
  type ExecutionOptions
} from '../../src/interpreter/evaluator.js';
import {
  HostEnvironment,
  createFunction,
  createNamespace
} from '../../src/interpreter/host.js';

const run = (source: string, options?: ExecutionOptions) =>
  executeProgram(parseSource(source), options);

describe('evaluator', () => {
  it('executes sequential statements with variables and print', async () => {
    const result = await run('LET X = 2\nPRINT X');
    expect(result.outputs).toEqual(['2']);
    expect(result.variables).toMatchObject({ X: 2 });
  });

  it('supports implicit assignment and expression statements', async () => {
    const result = await run('value = 5 * 3\nPRINT value + 2');
    expect(result.outputs).toEqual(['17']);
    expect(result.variables).toMatchObject({ VALUE: 15 });
  });

  it('defaults string variables to empty and numeric to zero', async () => {
    const result = await run('PRINT name$\nPRINT counter');
    expect(result.outputs).toEqual(['', '0']);
  });

  it('concatenates strings and respects semicolon trailing behaviour', async () => {
    const result = await run('PRINT "HELLO"; : PRINT "WORLD"');
    expect(result.outputs).toEqual(['HELLOWORLD']);
  });

  it('evaluates inline IF/ELSE branches', async () => {
    const result = await run('IF 1 THEN PRINT "YES" ELSE PRINT "NO"');
    expect(result.outputs).toEqual(['YES']);
  });

  it('short-circuits IF when condition is false', async () => {
    const result = await run('LET A = 0\nIF A THEN PRINT "SHOULD NOT" ELSE PRINT "OK"');
    expect(result.outputs).toEqual(['OK']);
  });

  it('handles goto with numeric targets', async () => {
    const result = await run('10 PRINT "A"\n20 GOTO 40\n30 PRINT "B"\n40 PRINT "C"');
    expect(result.outputs).toEqual(['A', 'C']);
  });

  it('performs numeric comparisons and boolean math', async () => {
    const result = await run('IF 5 > 3 THEN PRINT 1 ELSE PRINT 0');
    expect(result.outputs).toEqual(['1']);
  });

  it('raises runtime error for unsupported constructs', async () => {
    await expect(run('GOSUB 10')).rejects.toThrow(RuntimeError);
  });

  it('halts on STOP with state preserved', async () => {
    const program = 'LET X = 10\nSTOP\nPRINT X * 2';
    const result = await run(program);
    expect(result.halted).toBe('STOP');
    expect(result.outputs).toEqual([]);
    expect(result.variables).toMatchObject({ X: 10 });
  });

  it('invokes host namespace functions via member calls', async () => {
    const hostEnv = new HostEnvironment({
      HTTP: createNamespace('HTTP', {
        GET: createFunction('HTTP.GET', (args) => `GET:${args[0]}`)
      })
    });
    const result = await run('PRINT HTTP.GET("https://example.com")', {
      hostEnvironment: hostEnv
    });
    expect(result.outputs).toEqual(['GET:https://example.com']);
  });

  it('passes execution context to host functions', async () => {
    const hostEnv = new HostEnvironment({
      SYS: createNamespace('SYS', {
        STORE: createFunction('SYS.STORE', (args, ctx) => {
          ctx.setVariable('stored$', String(args[0] ?? ''));
          return args[0] ?? '';
        })
      })
    });
    const result = await run('SYS.STORE("DATA")\nPRINT stored$', { hostEnvironment: hostEnv });
    expect(result.outputs).toEqual(['DATA']);
  });

  it('supports nested host namespaces', async () => {
    const hostEnv = new HostEnvironment({
      AI: createNamespace('AI', {
        ANALYZE: createNamespace('ANALYZE', {
          TEXT: createFunction('AI.ANALYZE.TEXT', (args) => `ANALYSIS:${args[0]}`)
        })
      })
    });
    const result = await run('PRINT AI.ANALYZE.TEXT("hello")', { hostEnvironment: hostEnv });
    expect(result.outputs).toEqual(['ANALYSIS:hello']);
  });

  it('throws when accessing unknown host members', async () => {
    const hostEnv = new HostEnvironment({
      HTTP: createNamespace('HTTP', {})
    });
    await expect(run('PRINT HTTP.POST("/path")', { hostEnvironment: hostEnv })).rejects.toThrow(
      RuntimeError
    );
  });

  it('executes GOSUB/RETURN and resumes at the correct statement', async () => {
    const program = `
10 PRINT "START"
20 GOSUB 100
30 PRINT "END"
40 STOP
100 PRINT "SUB"
110 RETURN
`;
    const result = await run(program.trim());
    expect(result.outputs).toEqual(['START', 'SUB', 'END']);
    expect(result.halted).toBe('STOP');
  });

  it('supports inline GOSUB with statements following on same line', async () => {
    const program = 'PRINT "A": GOSUB 100: PRINT "B"\nSTOP\n100 PRINT "SUB"\nRETURN';
    const result = await run(program);
    expect(result.outputs).toEqual(['A', 'SUB', 'B']);
  });

  it('handles nested GOSUB invocations with stacked returns', async () => {
    const program = `
10 GOSUB 100
20 PRINT "DONE"
30 STOP
100 PRINT "L1"
110 GOSUB 200
120 PRINT "L1-POST"
130 RETURN
200 PRINT "L2"
210 RETURN
`;
    const result = await run(program.trim());
    expect(result.outputs).toEqual(['L1', 'L2', 'L1-POST', 'DONE']);
  });

  it('throws when RETURN appears without matching GOSUB', async () => {
    await expect(run('RETURN')).rejects.toThrow(RuntimeError);
  });

  it('enforces maximum call depth when provided', async () => {
    const recursive = '10 GOSUB 10';
    await expect(run(recursive, { maxCallDepth: 8 })).rejects.toThrow(RuntimeError);
  });

  it('executes FOR/NEXT loops with implicit body on next line', async () => {
    const program = `
FOR I = 1 TO 3
PRINT I
NEXT I
PRINT "DONE"`;
    const result = await run(program.trim());
    expect(result.outputs).toEqual(['1', '2', '3', 'DONE']);
    expect(result.variables).toMatchObject({ I: 4 });
  });

  it('supports FOR loops with STEP and body on same line', async () => {
    const result = await run('FOR X = 2 TO 6 STEP 2: PRINT X: NEXT X');
    expect(result.outputs).toEqual(['2', '4', '6']);
    expect(result.variables).toMatchObject({ X: 8 });
  });

  it('skips loop body when start violates limit', async () => {
    const program = `
FOR J = 5 TO 1 STEP -1
PRINT J
NEXT J
PRINT "END"`;
    const result = await run(program.trim());
    expect(result.outputs).toEqual(['5', '4', '3', '2', '1', 'END']);

    const skipResult = await run('FOR K = 1 TO 0\nPRINT "MISS"\nNEXT K\nPRINT "AFTER"');
    expect(skipResult.outputs).toEqual(['AFTER']);
    expect(skipResult.variables).toMatchObject({ K: 1 });
  });

  it('throws when NEXT variable mismatches active loop', async () => {
    await expect(run('FOR A = 1 TO 2\nNEXT B')).rejects.toThrow(RuntimeError);
  });

  it('throws when FOR uses zero step', async () => {
    await expect(run('FOR Z = 1 TO 5 STEP 0\nNEXT Z')).rejects.toThrow(RuntimeError);
  });

  it('exposes math functions via default environment', async () => {
    const result = await run('PRINT MATH.SIN(0)\nPRINT MATH.ABS(-5)');
    expect(result.outputs).toEqual(['0', '5']);
  });

  it('supports string helpers and environment info', async () => {
    const result = await run('PRINT STR.LOWER("HELLO")\nPRINT SYS.PLATFORM() <> ""');
    expect(result.outputs[0]).toBe('hello');
    expect(result.outputs[1]).toBe('-1');
  });

  it('supports extended math utilities', async () => {
    const result = await run(
      'PRINT MATH.PI()\nPRINT MATH.CLAMP(12, 0, 5)\nPRINT MATH.RAD2DEG(MATH.DEG2RAD(90))'
    );
    expect(Number(result.outputs[0])).toBeCloseTo(Math.PI);
    expect(result.outputs[1]).toBe('5');
    expect(Number(result.outputs[2])).toBeCloseTo(90);
  });

  it('supports extended string utilities', async () => {
    const result = await run(
      'PRINT STR.LEFT("RETRO", 3)\nPRINT STR.MID("RETRO", 2, 2)\nPRINT STR.RIGHT("RETRO", 2)\nPRINT STR.REVERSE("ABCD")\nPRINT STR.CONTAINS("RETRO", "TR")\nPRINT STR.FIND("programming", "gram")'
    );
    expect(result.outputs).toEqual(['RET', 'ET', 'RO', 'DCBA', '-1', '3']);
  });

  it('supports SYS.SLEEP and RANDOM.INT', async () => {
    const result = await run('SYS.SLEEP(10)\nFOR I = 1 TO 3\nPRINT RANDOM.INT(5,10)\nNEXT I');
    expect(result.variables).toHaveProperty('I');
    result.outputs.slice(0).forEach((value) => {
      const num = Number(value);
      expect(num).toBeGreaterThanOrEqual(5);
      expect(num).toBeLessThanOrEqual(10);
    });
  });

  it('sorts arrays and joins elements', async () => {
    const result = await run('PRINT ARRAY.SORT([5,2,8,1])\nPRINT ARRAY.JOIN(ARRAY.REVERSE(["A","B","C"]), "-")');
    expect(result.outputs[0]).toBe('[1,2,5,8]');
    expect(result.outputs[1]).toBe('C-B-A');
  });

  it('formats time values', async () => {
    const result = await run(
      'LET T$ = TIME.FORMAT("2020-01-02T03:04:05Z", "YYYY-MM-DD HH:mm:ss")\nPRINT T$'
    );
    expect(result.outputs[0]).toBe('2020-01-02 03:04:05');
  });

  it('reads and writes files through FS namespace', async () => {
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `basic9000-spec-${Date.now()}.txt`);
    const escapedPath = filePath.replace(/"/g, '""');
    const program = `
LET P$ = "${escapedPath}"
FS.WRITE(P$, "DATA")
PRINT FS.EXISTS(P$)
PRINT FS.READ(P$)
`;
    try {
      const result = await run(program.trim());
      expect(result.outputs).toEqual(['-1', 'DATA']);
      expect(fs.readFileSync(filePath, 'utf8')).toBe('DATA');
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  it('supports deleting and listing files', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basic9000-list-'));
    const fileA = path.join(baseDir, 'a.txt');
    const fileB = path.join(baseDir, 'b.txt');
    fs.writeFileSync(fileA, 'A');
    fs.writeFileSync(fileB, 'B');
    const escapedDir = baseDir.replace(/"/g, '""');
    const escapedA = fileA.replace(/"/g, '""');
    const program = `
PRINT FS.LIST("${escapedDir}")
FS.DELETE("${escapedA}")
PRINT FS.LIST("${escapedDir}")
`;
    try {
      const result = await run(program.trim());
      expect(result.outputs[0]?.split('\n').sort()).toEqual(['a.txt', 'b.txt']);
      expect(result.outputs[1]?.split('\n').sort()).toEqual(['b.txt']);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });

  it('performs HTTP GET via default environment', async () => {
    const server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/hello') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('hi there');
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    try {
      const program = `PRINT HTTP.GET("http://127.0.0.1:${port}/hello")`;
      const result = await run(program);
      expect(result.outputs).toEqual(['hi there']);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('parses JSON documents and extracts values', async () => {
    const program = `
LET J = JSON.PARSE("{""temp"":{""value"":42,""status"":""ok""}}")
PRINT JSON.GET(J, "temp.value")
PRINT JSON.TYPE(J, "temp")
PRINT JSON.STRINGIFY(J, "temp")
`;
    const result = await run(program.trim());
    expect(result.outputs[0]).toBe('42');
    expect(result.outputs[1]).toBe('object');
    expect(result.outputs[2]).toBe(JSON.stringify({ value: 42, status: 'ok' }));
  });

  it('establishes websocket connection and exchanges messages', async () => {
    const wss = new WebSocketServer({ port: 0 });
    wss.on('connection', (socket) => {
      socket.on('message', (message) => {
        socket.send(`echo:${message}`);
      });
    });
    await new Promise<void>((resolve) => wss.once('listening', resolve));
    const { port } = wss.address() as { port: number };
    try {
      const program = `
LET C = WS.CONNECT("ws://127.0.0.1:${port}")
WS.SEND(C, "ping")
PRINT WS.RECEIVE(C, 1000)
WS.CLOSE(C)
`;
      const result = await run(program.trim());
      expect(result.outputs).toEqual(['echo:ping']);
    } finally {
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    }
  });
});
