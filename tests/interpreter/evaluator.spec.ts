import { describe, expect, it } from 'vitest';
import { parseSource } from '../../src/interpreter/parser.js';
import { executeProgram, RuntimeError } from '../../src/interpreter/evaluator.js';

const run = (source: string) => executeProgram(parseSource(source));

describe('evaluator', () => {
  it('executes sequential statements with variables and print', () => {
    const result = run('LET X = 2\nPRINT X');
    expect(result.outputs).toEqual(['2']);
    expect(result.variables).toMatchObject({ X: 2 });
  });

  it('supports implicit assignment and expression statements', () => {
    const result = run('value = 5 * 3\nPRINT value + 2');
    expect(result.outputs).toEqual(['17']);
    expect(result.variables).toMatchObject({ VALUE: 15 });
  });

  it('defaults string variables to empty and numeric to zero', () => {
    const result = run('PRINT name$\nPRINT counter');
    expect(result.outputs).toEqual(['', '0']);
  });

  it('concatenates strings and respects semicolon trailing behaviour', () => {
    const result = run('PRINT "HELLO"; : PRINT "WORLD"');
    expect(result.outputs).toEqual(['HELLOWORLD']);
  });

  it('evaluates inline IF/ELSE branches', () => {
    const result = run('IF 1 THEN PRINT "YES" ELSE PRINT "NO"');
    expect(result.outputs).toEqual(['YES']);
  });

  it('short-circuits IF when condition is false', () => {
    const result = run('LET A = 0\nIF A THEN PRINT "SHOULD NOT" ELSE PRINT "OK"');
    expect(result.outputs).toEqual(['OK']);
  });

  it('handles goto with numeric targets', () => {
    const result = run('10 PRINT "A"\n20 GOTO 40\n30 PRINT "B"\n40 PRINT "C"');
    expect(result.outputs).toEqual(['A', 'C']);
  });

  it('performs numeric comparisons and boolean math', () => {
    const result = run('IF 5 > 3 THEN PRINT 1 ELSE PRINT 0');
    expect(result.outputs).toEqual(['1']);
  });

  it('raises runtime error for unsupported constructs', () => {
    expect(() => run('GOSUB 10')).toThrow(RuntimeError);
  });

  it('halts on STOP with state preserved', () => {
    const program = 'LET X = 10\nSTOP\nPRINT X * 2';
    const result = run(program);
    expect(result.halted).toBe('STOP');
    expect(result.outputs).toEqual([]);
    expect(result.variables).toMatchObject({ X: 10 });
  });

  it('executes FOR/NEXT loops with implicit body on next line', () => {
    const program = `
FOR I = 1 TO 3
PRINT I
NEXT I
PRINT "DONE"`;
    const result = run(program.trim());
    expect(result.outputs).toEqual(['1', '2', '3', 'DONE']);
    expect(result.variables).toMatchObject({ I: 4 });
  });

  it('supports FOR loops with STEP and body on same line', () => {
    const result = run('FOR X = 2 TO 6 STEP 2: PRINT X: NEXT X');
    expect(result.outputs).toEqual(['2', '4', '6']);
    expect(result.variables).toMatchObject({ X: 8 });
  });

  it('skips loop body when start violates limit', () => {
    const program = `
FOR J = 5 TO 1 STEP -1
PRINT J
NEXT J
PRINT "END"`;
    const result = run(program.trim());
    expect(result.outputs).toEqual(['5', '4', '3', '2', '1', 'END']);

    const skipResult = run('FOR K = 1 TO 0\nPRINT "MISS"\nNEXT K\nPRINT "AFTER"');
    expect(skipResult.outputs).toEqual(['AFTER']);
    expect(skipResult.variables).toMatchObject({ K: 1 });
  });

  it('throws when NEXT variable mismatches active loop', () => {
    expect(() => run('FOR A = 1 TO 2\nNEXT B')).toThrow(RuntimeError);
  });

  it('throws when FOR uses zero step', () => {
    expect(() => run('FOR Z = 1 TO 5 STEP 0\nNEXT Z')).toThrow(RuntimeError);
  });
});
