import type { Token } from './tokenizer.js';

export interface ProgramNode {
  readonly type: 'Program';
  readonly lines: LineNode[];
}

export interface LineNode {
  readonly lineNumber?: number;
  readonly statements: StatementNode[];
}

export type StatementNode =
  | PrintStatementNode
  | LetStatementNode
  | AssignmentStatementNode
  | IfStatementNode
  | ForStatementNode
  | NextStatementNode
  | GotoStatementNode
  | GosubStatementNode
  | ReturnStatementNode
  | StopStatementNode
  | EndStatementNode
  | ExpressionStatementNode;

export interface BaseStatementNode {
  readonly type: StatementNode['type'];
  readonly token: Token;
}

export interface PrintStatementNode extends BaseStatementNode {
  readonly type: 'PrintStatement';
  readonly arguments: PrintArgument[];
  readonly trailing?: 'newline' | 'space' | 'none';
}

export interface PrintArgument {
  readonly expression: ExpressionNode;
  readonly separator?: 'comma' | 'semicolon';
}

export interface LetStatementNode extends BaseStatementNode {
  readonly type: 'LetStatement';
  readonly target: IdentifierNode | MemberExpressionNode;
  readonly value: ExpressionNode;
}

export interface AssignmentStatementNode extends BaseStatementNode {
  readonly type: 'AssignmentStatement';
  readonly target: IdentifierNode | MemberExpressionNode;
  readonly value: ExpressionNode;
}

export interface IfStatementNode extends BaseStatementNode {
  readonly type: 'IfStatement';
  readonly condition: ExpressionNode;
  readonly thenBranch: StatementNode[];
  readonly elseBranch?: StatementNode[];
}

export interface ForStatementNode extends BaseStatementNode {
  readonly type: 'ForStatement';
  readonly iterator: IdentifierNode;
  readonly start: ExpressionNode;
  readonly end: ExpressionNode;
  readonly step?: ExpressionNode;
  readonly body?: StatementNode[];
}

export interface NextStatementNode extends BaseStatementNode {
  readonly type: 'NextStatement';
  readonly iterator?: IdentifierNode;
}

export interface GotoStatementNode extends BaseStatementNode {
  readonly type: 'GotoStatement';
  readonly target: ExpressionNode;
}

export interface GosubStatementNode extends BaseStatementNode {
  readonly type: 'GosubStatement';
  readonly target: ExpressionNode;
}

export interface ReturnStatementNode extends BaseStatementNode {
  readonly type: 'ReturnStatement';
}

export interface StopStatementNode extends BaseStatementNode {
  readonly type: 'StopStatement';
}

export interface EndStatementNode extends BaseStatementNode {
  readonly type: 'EndStatement';
}

export interface ExpressionStatementNode extends BaseStatementNode {
  readonly type: 'ExpressionStatement';
  readonly expression: ExpressionNode;
}

export type ExpressionNode =
  | NumberLiteralNode
  | StringLiteralNode
  | IdentifierNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | CallExpressionNode
  | MemberExpressionNode
  | AwaitExpressionNode;

export interface NumberLiteralNode {
  readonly type: 'NumberLiteral';
  readonly value: number;
  readonly token: Token;
}

export interface StringLiteralNode {
  readonly type: 'StringLiteral';
  readonly value: string;
  readonly token: Token;
}

export interface IdentifierNode {
  readonly type: 'Identifier';
  readonly name: string;
  readonly token: Token;
}

export interface UnaryExpressionNode {
  readonly type: 'UnaryExpression';
  readonly operator: Token;
  readonly operand: ExpressionNode;
}

export interface BinaryExpressionNode {
  readonly type: 'BinaryExpression';
  readonly operator: Token;
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
}

export interface CallExpressionNode {
  readonly type: 'CallExpression';
  readonly callee: ExpressionNode;
  readonly args: ExpressionNode[];
  readonly closingParen: Token;
}

export interface MemberExpressionNode {
  readonly type: 'MemberExpression';
  readonly object: ExpressionNode;
  readonly property: IdentifierNode;
}

export interface AwaitExpressionNode {
  readonly type: 'AwaitExpression';
  readonly keyword: Token;
  readonly expression: ExpressionNode;
}

export type AnyNode = ProgramNode | LineNode | StatementNode | ExpressionNode;
