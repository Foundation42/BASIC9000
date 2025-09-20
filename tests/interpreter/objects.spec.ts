import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseSource } from '../../src/interpreter/parser.js';
import { executeProgram, RuntimeError } from '../../src/interpreter/evaluator.js';

const run = async (source: string) => {
  const parsed = parseSource(source);
  return executeProgram(parsed);
};

describe('Objects.md Language Features', () => {
  const testDir = join(process.cwd(), 'tests', 'basic-programs');

  // Helper to run a .bas file and check for PASS/FAIL
  const runBasicTest = async (filePath: string) => {
    const source = readFileSync(filePath, 'utf-8');
    const fileName = filePath.split('/').pop();

    // Check if this test expects a RuntimeError
    const expectsRuntimeError = source.includes('REM EXPECT: RuntimeError');

    try {
      const result = await run(source);

      if (expectsRuntimeError) {
        throw new Error(`Expected RuntimeError in ${fileName}, but test completed successfully`);
      }

      // Check for PASS/FAIL in outputs
      const passes = result.outputs.filter(o => o.includes('PASS:')).length;
      const fails = result.outputs.filter(o => o.includes('FAIL:')).length;

      if (fails > 0) {
        throw new Error(`Test failures in ${fileName}: ${fails} failures, ${passes} passes`);
      }

      return { passes, fails, outputs: result.outputs };
    } catch (error) {
      if (error instanceof RuntimeError) {
        if (expectsRuntimeError) {
          // This is expected - return a successful result
          return { passes: 1, fails: 0, outputs: [`Expected RuntimeError: ${error.message}`] };
        }
        throw new Error(`Runtime error in ${fileName}: ${error.message}`);
      }
      throw error;
    }
  };

  describe('Type System', () => {
    it('should define and use basic types', async () => {
      const result = await runBasicTest(join(testDir, 'types', '01-type-definition.bas'));
      expect(result.outputs).toContain('PASS: TYPE definitions compiled');
    });

    it('should create records with literal syntax', async () => {
      const result = await runBasicTest(join(testDir, 'types', '02-record-literals.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });

    it('should allow field modification', async () => {
      const result = await runBasicTest(join(testDir, 'types', '03-field-modification.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });

    it('should support nested types', async () => {
      const result = await runBasicTest(join(testDir, 'types', '04-nested-types.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });

    it('should support type annotations', async () => {
      const result = await runBasicTest(join(testDir, 'types', '05-type-annotations.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });
  });

  describe('Functions', () => {
    it('should support typed function parameters', async () => {
      const result = await runBasicTest(join(testDir, 'functions', '01-typed-functions.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });

    it('should support REF parameters', async () => {
      const result = await runBasicTest(join(testDir, 'functions', '02-ref-parameters.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });

    it('should support UFCS method calls', async () => {
      const result = await runBasicTest(join(testDir, 'functions', '03-ufcs.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });

    it('should support default parameters', async () => {
      const result = await runBasicTest(join(testDir, 'functions', '04-default-parameters.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });
  });

  describe('Properties', () => {
    it('should support GET properties', async () => {
      const result = await runBasicTest(join(testDir, 'properties', '01-get-properties.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });
  });

  describe('Control Flow', () => {
    it('should support WITH statement', async () => {
      const result = await runBasicTest(join(testDir, 'control-flow', '01-with-statement.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });

    it('should support SELECT CASE', async () => {
      const result = await runBasicTest(join(testDir, 'control-flow', '02-select-case.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should support TRY/CATCH/FINALLY', async () => {
      const result = await runBasicTest(join(testDir, 'errors', '01-try-catch.bas'));
      expect(result.fails).toBe(0);
      expect(result.passes).toBeGreaterThan(0);
    });
  });

  // Dynamic test discovery - find all .bas files and run them
  describe('All Basic Programs', () => {
    const findBasFiles = (dir: string): string[] => {
      const files: string[] = [];
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...findBasFiles(fullPath));
        } else if (entry.name.endsWith('.bas')) {
          files.push(fullPath);
        }
      }

      return files;
    };

    const basFiles = findBasFiles(testDir);

    for (const file of basFiles) {
      const relativePath = file.replace(testDir, '').substring(1);

      it(`should run ${relativePath}`, async () => {
        const result = await runBasicTest(file);
        expect(result.fails).toBe(0);
      });
    }
  });
});