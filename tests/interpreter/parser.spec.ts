import { describe, expect, it } from 'vitest';
import { parseSource, ParseError } from '../../src/interpreter/parser.js';
import type {
  AssignmentStatementNode,
  ForStatementNode,
  IfStatementNode,
  LineNode,
  PrintStatementNode
} from '../../src/interpreter/ast.js';

describe('parser', () => {
  const firstLine = (program: ReturnType<typeof parseSource>): LineNode => program.lines[0]!;

  it('parses a print statement', () => {
    const program = parseSource('PRINT "HELLO"');
    expect(program.lines).toHaveLength(1);
    const line = firstLine(program);
    expect(line.statements).toHaveLength(1);
    const statement = line.statements[0] as PrintStatementNode;
    expect(statement.type).toBe('PrintStatement');
    expect(statement.arguments[0]?.expression.type).toBe('StringLiteral');
    expect(statement.arguments[0]?.expression).toMatchObject({ value: 'HELLO' });
  });

  it('captures explicit line numbers and let assignments', () => {
    const program = parseSource('10 LET X = 5');
    const line = firstLine(program);
    expect(line.lineNumber).toBe(10);
    const statement = line.statements[0];
    expect(statement.type).toBe('LetStatement');
    if (statement.type === 'LetStatement') {
      expect(statement.target.name).toBe('X');
      expect(statement.value.type).toBe('NumberLiteral');
    }
  });

  it('parses implicit assignments without LET', () => {
    const program = parseSource('result$ = "done"');
    const statement = firstLine(program).statements[0] as AssignmentStatementNode;
    expect(statement.type).toBe('AssignmentStatement');
    expect(statement.target.type).toBe('Identifier');
    expect(statement.value.type).toBe('StringLiteral');
  });

  it('parses inline if/else statements', () => {
    const program = parseSource('IF A > 10 THEN PRINT "hi" ELSE PRINT "lo"');
    const statement = firstLine(program).statements[0] as IfStatementNode;
    expect(statement.type).toBe('IfStatement');
    expect(statement.thenBranch).toHaveLength(1);
    expect(statement.elseBranch).toHaveLength(1);
    expect((statement.thenBranch[0] as PrintStatementNode).arguments[0]?.expression).toMatchObject({
      type: 'StringLiteral',
      value: 'hi'
    });
  });

  it('parses FOR headers with optional step', () => {
    const program = parseSource('FOR I = 1 TO 5 STEP 2');
    const statement = firstLine(program).statements[0] as ForStatementNode;
    expect(statement.iterator.name).toBe('I');
    expect(statement.start.type).toBe('NumberLiteral');
    expect(statement.end.type).toBe('NumberLiteral');
    expect(statement.step?.type).toBe('NumberLiteral');
  });

  it('handles multiple statements per line via colon', () => {
    const program = parseSource('PRINT "A":PRINT "B"');
    const line = firstLine(program);
    expect(line.statements).toHaveLength(2);
    line.statements.forEach((stmt) => expect(stmt.type).toBe('PrintStatement'));
  });

  it('tracks member access and calls inside expressions', () => {
    const program = parseSource('PRINT GPU.DRAW(1, 2)');
    const statement = firstLine(program).statements[0] as PrintStatementNode;
    const expression = statement.arguments[0]?.expression;
    expect(expression?.type).toBe('CallExpression');
    if (expression?.type === 'CallExpression') {
      expect(expression.callee.type).toBe('MemberExpression');
      if (expression.callee.type === 'MemberExpression') {
        expect(expression.callee.property.name).toBe('DRAW');
      }
      expect(expression.args).toHaveLength(2);
    }
  });

  it('understands trailing semicolons in print', () => {
    const program = parseSource('PRINT "A";\nPRINT "B"');
    const [first, second] = program.lines;
    const firstPrint = first!.statements[0] as PrintStatementNode;
    expect(firstPrint.trailing).toBe('none');
    const secondPrint = second!.statements[0] as PrintStatementNode;
    expect(secondPrint.trailing).toBe('newline');
  });

  it('raises on invalid assignments', () => {
    expect(() => parseSource('LET = 5')).toThrow(ParseError);
  });
});
