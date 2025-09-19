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
    expect(() => run('FOR I = 1 TO 5')).toThrow(RuntimeError);
  });
});
