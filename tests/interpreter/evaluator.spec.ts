import { describe, expect, it, beforeEach } from 'vitest';
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

const run = (source: string, options?: ExecutionOptions) => {
  const maxSteps = options?.maxSteps ?? 10000; // Add default max steps
  return executeProgram(parseSource(source), { ...options, maxSteps });
};

describe('evaluator', () => {
  it('executes sequential statements with variables and print', async () => {
    const result = await run('LET X = 2\nPRINT X');
    expect(result.outputs).toEqual(['2']);
    expect(result.variables).toMatchObject({ X: 2 });
  });

  it('supports implicit assignment and expression statements', async () => {
    const result = await run('value = 5 * 3\nPRINT value + 2');
    expect(result.outputs).toEqual(['17']);
    expect(result.variables).toMatchObject({ value: 15 });
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


  it('performs numeric comparisons and boolean math', async () => {
    const result = await run('IF 5 > 3 THEN PRINT 1 ELSE PRINT 0');
    expect(result.outputs).toEqual(['1']);
  });

  it('creates record values from TYPE declarations', async () => {
    const program = `
TYPE Vector
  x AS NUMBER
  y AS NUMBER
END TYPE
LET v = Vector { x: 3, y: 4 }
PRINT v.x
PRINT v.y
`;
    const result = await run(program.trim());
    expect(result.outputs).toEqual(['3', '4']);
  });

  it('raises when record literal omits required fields', async () => {
    const program = `
TYPE Vector
  x AS NUMBER
  y AS NUMBER
END TYPE
LET v = Vector { x: 1 }
`;
    await expect(run(program.trim())).rejects.toThrow(RuntimeError);
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

  it('constructs AIAssistant records with sensible defaults', async () => {
    const program = `
LET assistant = NEW AIAssistant("fake", "deterministic")
PRINT assistant.Provider
PRINT assistant.Model
PRINT assistant.Temperature
PRINT assistant.MaxTokens
PRINT assistant.CachePolicy
PRINT assistant.RetryCount
PRINT assistant.Timeout
PRINT assistant.CostBudget
`;
    const result = await run(program.trim());
    expect(result.outputs).toEqual([
      'fake',
      'deterministic',
      '0.7',
      '1000',
      'none',
      '3',
      '30000',
      '0'
    ]);
  });

  it('produces non-mutating overrides with assistant.WITH', async () => {
    const program = `
LET assistant = NEW AIAssistant("fake", "deterministic")
LET fast = assistant.WITH({ Temperature:0.2, CachePolicy:"ttl:60" })
PRINT assistant.Temperature
PRINT fast.Temperature
PRINT fast.CachePolicy
PRINT assistant.CachePolicy
`;
    const result = await run(program.trim());
    expect(result.outputs).toEqual(['0.7', '0.2', 'ttl:60', 'none']);
  });

  it('keeps record fields in sync when using AI.SYSTEM', async () => {
    const program = `
LET assistant = NEW AIAssistant("fake", "deterministic")
AI.SYSTEM(assistant, "You are helpful")
PRINT assistant.SystemPrompt
`;
    const result = await run(program.trim());
    expect(result.outputs).toEqual(['You are helpful']);
  });

  it('produces deterministic responses with FakeAI provider', async () => {
    const program = `
LET assistant = NEW AIAssistant("fake", "deterministic")
LET first$ = AI.GENERATE(assistant, "Give a concise title for this text")
LET second$ = AI.GENERATE(assistant, "Give a concise title for this text")
IF first$ <> second$ THEN PRINT "FAIL: nondeterministic"
PRINT first$
`;
    const result = await run(program.trim());
    expect(result.outputs.at(-1)).toMatch(/^TITLE:\d{1,4}$/);
    expect(result.outputs).not.toContain('FAIL: nondeterministic');
  });

  it('returns structured JSON when prompted via FakeAI', async () => {
    const program = `
LET assistant = NEW AIAssistant("fake", "deterministic")
LET raw$ = AI.GENERATE(assistant, "Return JSON: { summary, bullets } with at most 5 bullets.")
LET handle = JSON.PARSE(raw$)
LET summary$ = JSON.GET(handle, "summary")
LET bullets = JSON.GET(handle, "bullets")
IF summary$ <> "OK" THEN PRINT "FAIL: bad summary"
IF LEN(bullets) = 0 THEN PRINT "FAIL: empty bullets"
PRINT summary$
`;
    const result = await run(program.trim());
    expect(result.outputs).toContain('OK');
    expect(result.outputs).not.toContain('FAIL: bad summary');
  });

  it('executes AIFUNC declarations against FakeAI', async () => {
    const program = `
AIFUNC assistant.MakeTitle(text AS STRING) AS STRING
  PROMPT "Give a concise title for \${text}"
  EXPECT LENGTH 5..20
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
PRINT assistant.MakeTitle("BASIC9000 Release Notes")
`;
    const result = await run(program.trim());
    expect(result.outputs[0]).toMatch(/^TITLE:\d{1,4}$/);
  });

  it('enforces AIFUNC RANGE expectations', async () => {
    const program = `
AIFUNC assistant.Positive(text AS STRING) AS NUMBER
  PROMPT "Return a number between -1 and 1 for \${text}"
  EXPECT RANGE [1, 2]
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
PRINT assistant.Positive("demo")
`;

    await expect(run(program.trim())).rejects.toThrow(/AIParseError/);
  });

  it('enforces AIFUNC LENGTH expectations', async () => {
    const program = `
AIFUNC assistant.Short(text AS STRING) AS STRING
  PROMPT "Give a concise title for \${text}"
  EXPECT LENGTH 1..4
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
PRINT assistant.Short("BASIC9000")
`;

    await expect(run(program.trim())).rejects.toThrow(/AIParseError/);
  });

  it('coerces AIFUNC record return types', async () => {
    const program = `
TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.Summarize(text AS STRING) AS Summary
  PROMPT "Return JSON: { summary, bullets } with at most 5 bullets.\\n\${text}"
  EXPECT { summary: LENGTH 2..2, bullets: LENGTH 2..5 }
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET result = assistant.Summarize("Release notes")
PRINT result.summary
PRINT LEN(result.bullets)
`;

    const result = await run(program.trim());
    expect(result.outputs[0]).toBe('OK');
    const count = Number(result.outputs[1]);
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(5);
  });

  it('enforces EXPECT constraints on record array fields', async () => {
    const program = `
TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.StrictSummary(text AS STRING) AS Summary
  PROMPT "Return JSON: { summary, bullets } with at most 5 bullets.\\n\${text}"
  EXPECT { bullets: LENGTH 1..1 }
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET result = assistant.StrictSummary("Release notes")
PRINT result.summary
`;

    await expect(run(program.trim())).rejects.toThrow(/AIParseError/);
  });

  it('enforces EXPECT constraints on record string fields', async () => {
    const program = `
TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.StrictSummary(text AS STRING) AS Summary
  PROMPT "Return JSON: { summary, bullets } with at most 5 bullets.\\n\${text}"
  EXPECT { summary: LENGTH 3..5 }
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET result = assistant.StrictSummary("Release notes")
PRINT result.summary
`;

    await expect(run(program.trim())).rejects.toThrow(/AIParseError/);
  });

  it('rejects unexpected record fields without ALLOW_EXTRA', async () => {
    const program = `
TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.StrictSummary(text AS STRING) AS Summary
  PROMPT "Return JSON: { summary, bullets } with at most 5 bullets. EXTRA_FIELD\\n\${text}"
  EXPECT { bullets: LENGTH 1..5 }
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET result = assistant.StrictSummary("Release notes")
PRINT result.summary
`;

    await expect(run(program.trim())).rejects.toThrow(/Unexpected field/);
  });

  it('allows additional record fields when EXPECT { ALLOW_EXTRA } is present', async () => {
    const program = `
TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.LooseSummary(text AS STRING) AS Summary
  PROMPT "Return JSON: { summary, bullets } with at most 5 bullets. EXTRA_FIELD\\n\${text}"
  EXPECT { ALLOW_EXTRA, bullets: LENGTH 1..5 }
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET result = assistant.LooseSummary("Release notes")
PRINT result.summary
PRINT LEN(result.bullets)
`;

    const result = await run(program.trim());
    expect(result.outputs[0]).toBe('OK');
    const bulletCount = Number(result.outputs[1]);
    expect(bulletCount).toBeGreaterThan(0);
  });

  it('enforces array element length constraints via OF', async () => {
    const program = `
TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.SummaryWithShortBullets(text AS STRING) AS Summary
  PROMPT "Return JSON: { summary, bullets } with at most 5 bullets.\\n\${text}"
  EXPECT { bullets: LENGTH 2..5 OF LENGTH 1..1 }
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET result = assistant.SummaryWithShortBullets("Release notes")
PRINT LEN(result.bullets)
`;

    const result = await run(program.trim());
    const bulletCount = Number(result.outputs[0]);
    expect(bulletCount).toBeGreaterThanOrEqual(2);
    expect(bulletCount).toBeLessThanOrEqual(5);
  });

  it('rejects arrays whose elements violate OF length constraints', async () => {
    const program = `
TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.StrictBulletLengths(text AS STRING) AS Summary
  PROMPT "Return JSON: { summary, bullets } with at most 5 bullets.\\n\${text}"
  EXPECT { bullets: LENGTH 2..5 OF LENGTH 2..5 }
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET result = assistant.StrictBulletLengths("Release notes")
PRINT LEN(result.bullets)
`;

    await expect(run(program.trim())).rejects.toThrow(/Array element length/);
  });

  if (process.env.OLLAMA_TEST === '1') {
    it('integrates with local Ollama provider', async () => {
      const program = `
LET assistant = NEW AIAssistant("ollama", "gemma3n:latest")
LET response$ = AI.GENERATE(assistant, "Reply with a two-word greeting.")
PRINT LEN(response$)
`;
      const result = await run(program.trim());
      const length = Number(result.outputs.at(-1));
      expect(length).toBeGreaterThan(0);
    });
  }

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




  it('throws when RETURN appears without matching GOSUB', async () => {
    await expect(run('RETURN')).rejects.toThrow(RuntimeError);
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
    const connections = new Set<WebSocket>();

    wss.on('connection', (socket) => {
      connections.add(socket);
      socket.on('message', (message) => {
        socket.send(`echo:${message}`);
      });
      socket.on('close', () => {
        connections.delete(socket);
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
      // Force close all connections
      connections.forEach(socket => socket.terminate());

      // Close server with timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          wss.close();
          resolve();
        }, 1000);

        wss.close((err) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }, 10000); // Give this test 10 seconds max
});
