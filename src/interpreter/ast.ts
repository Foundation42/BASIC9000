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
  | TypeDeclarationNode
  | IfStatementNode
  | ForStatementNode
  | WhileStatementNode
  | DoWhileStatementNode
  | NextStatementNode
  | ReturnStatementNode
  | StopStatementNode
  | EndStatementNode
  | ExpressionStatementNode
  | TryCatchStatementNode
  | ErrorStatementNode
  | FunctionStatementNode
  | SubStatementNode
  | ExitStatementNode
  | ContinueStatementNode
  | PropertyStatementNode
  | WithStatementNode
  | SelectCaseStatementNode
  | InputStatementNode
  | DeferStatementNode
  | DeferBlockStatementNode
  | SendStatementNode;

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
  readonly target: IdentifierNode | MemberExpressionNode | WithFieldNode;
  readonly typeAnnotation?: TypeAnnotationNode;
  readonly value: ExpressionNode;
}

export interface AssignmentStatementNode extends BaseStatementNode {
  readonly type: 'AssignmentStatement';
  readonly target: IdentifierNode | MemberExpressionNode | WithFieldNode;
  readonly value: ExpressionNode;
}

export interface TypeDeclarationNode extends BaseStatementNode {
  readonly type: 'TypeDeclaration';
  readonly name: IdentifierNode;
  readonly fields: readonly TypeFieldNode[];
  readonly spreadFields?: readonly string[]; // Field names for spread operator in order
}

export interface TypeFieldNode {
  readonly name: IdentifierNode;
  readonly annotation: TypeAnnotationNode;
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

export interface WhileStatementNode extends BaseStatementNode {
  readonly type: 'WhileStatement';
  readonly condition: ExpressionNode;
  readonly body: StatementNode[];
}

export interface DoWhileStatementNode extends BaseStatementNode {
  readonly type: 'DoWhileStatement';
  readonly condition: ExpressionNode;
  readonly body: StatementNode[];
}

export interface NextStatementNode extends BaseStatementNode {
  readonly type: 'NextStatement';
  readonly iterator?: IdentifierNode;
}


export interface ReturnStatementNode extends BaseStatementNode {
  readonly type: 'ReturnStatement';
  readonly value?: ExpressionNode;
}

export interface StopStatementNode extends BaseStatementNode {
  readonly type: 'StopStatement';
}

export interface EndStatementNode extends BaseStatementNode {
  readonly type: 'EndStatement';
}

export interface SpawnExpressionNode {
  readonly type: 'SpawnExpression';
  readonly token: Token;
  readonly routine: ExpressionNode;
}

export interface InputStatementNode extends BaseStatementNode {
  readonly type: 'InputStatement';
  readonly prompt?: ExpressionNode;
  readonly variable: IdentifierNode;
}

export interface ExpressionStatementNode extends BaseStatementNode {
  readonly type: 'ExpressionStatement';
  readonly expression: ExpressionNode;
}

export interface TryCatchStatementNode extends BaseStatementNode {
  readonly type: 'TryCatchStatement';
  readonly tryBlock: StatementNode[];
  readonly catchClause?: {
    readonly variable: IdentifierNode;
    readonly block: StatementNode[];
  };
  readonly finallyBlock?: StatementNode[];
}

export interface ErrorStatementNode extends BaseStatementNode {
  readonly type: 'ErrorStatement';
  readonly message: ExpressionNode;
}

export interface FunctionStatementNode extends BaseStatementNode {
  readonly type: 'FunctionStatement';
  readonly name: IdentifierNode;
  readonly parameters: ParameterNode[];
  readonly returnType?: TypeAnnotationNode;
  readonly body: StatementNode[];
}

export interface SubStatementNode extends BaseStatementNode {
  readonly type: 'SubStatement';
  readonly name: IdentifierNode;
  readonly parameters: ParameterNode[];
  readonly body: StatementNode[];
}

export interface ParameterNode {
  readonly name: IdentifierNode;
  readonly typeAnnotation?: TypeAnnotationNode;
  readonly defaultValue?: ExpressionNode;
  readonly isRef?: boolean;
  readonly isVarArgs?: boolean;
}

export interface ExitStatementNode extends BaseStatementNode {
  readonly type: 'ExitStatement';
  readonly exitType: 'SUB' | 'FUNCTION' | 'FOR';
}

export interface ContinueStatementNode extends BaseStatementNode {
  readonly type: 'ContinueStatement';
}

export interface PropertyStatementNode extends BaseStatementNode {
  readonly type: 'PropertyStatement';
  readonly typeName: IdentifierNode;
  readonly name: IdentifierNode;
  readonly selfParam: ParameterNode;
  readonly returnType: TypeAnnotationNode;
  readonly accessorType: 'GET' | 'SET';
  readonly body: readonly StatementNode[];
}

export interface WithStatementNode extends BaseStatementNode {
  readonly type: 'WithStatement';
  readonly object: ExpressionNode;
  readonly body: StatementNode[];
}

export interface SelectCaseStatementNode extends BaseStatementNode {
  readonly type: 'SelectCaseStatement';
  readonly expression: ExpressionNode;
  readonly cases: CaseClause[];
  readonly elseCase?: StatementNode[];
}

export interface CaseClause {
  readonly values: ExpressionNode[];
  readonly statements: StatementNode[];
}

export type ExpressionNode =
  | NumberLiteralNode
  | StringLiteralNode
  | BooleanLiteralNode
  | NullLiteralNode
  | IdentifierNode
  | ArrayLiteralNode
  | ObjectLiteralNode
  | RecordLiteralNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | ConditionalExpressionNode
  | CallExpressionNode
  | MemberExpressionNode
  | IndexExpressionNode
  | AwaitExpressionNode
  | RecvExpressionNode
  | SpawnExpressionNode
  | WithFieldNode
  | SpreadExpressionNode
  | NewExpressionNode;

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

export interface TypeAnnotationNode {
  readonly type: 'TypeAnnotation';
  readonly name: string;
  readonly token: Token;
  readonly typeArguments?: readonly TypeAnnotationNode[];
}

export interface ArrayLiteralNode {
  readonly type: 'ArrayLiteral';
  readonly elements: ExpressionNode[];
  readonly token: Token;
}

export interface ObjectLiteralNode {
  readonly type: 'ObjectLiteral';
  readonly fields: readonly ObjectLiteralField[];
  readonly token: Token;
}

export interface ObjectLiteralField {
  readonly name: string;
  readonly value: ExpressionNode;
}

export interface RecordLiteralNode {
  readonly type: 'RecordLiteral';
  readonly typeName: IdentifierNode;
  readonly fields: readonly RecordLiteralField[];
  readonly token: Token;
}

export interface RecordLiteralField {
  readonly name: IdentifierNode;
  readonly value: ExpressionNode;
}

export interface UnaryExpressionNode {
  readonly type: 'UnaryExpression';
  readonly operator: Token;
  readonly operand: ExpressionNode;
}

export interface BooleanLiteralNode {
  readonly type: 'BooleanLiteral';
  readonly value: boolean;
  readonly token: Token;
}

export interface NullLiteralNode {
  readonly type: 'NullLiteral';
  readonly token: Token;
}

export interface BinaryExpressionNode {
  readonly type: 'BinaryExpression';
  readonly operator: Token;
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
}

export interface ConditionalExpressionNode {
  readonly type: 'ConditionalExpression';
  readonly condition: ExpressionNode;
  readonly whenTrue: ExpressionNode;
  readonly whenFalse: ExpressionNode;
  readonly questionToken: Token;
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

export interface IndexExpressionNode {
  readonly type: 'IndexExpression';
  readonly object: ExpressionNode;
  readonly index: ExpressionNode;
}

export interface AwaitExpressionNode {
  readonly type: 'AwaitExpression';
  readonly keyword: Token;
  readonly expression: ExpressionNode;
}

export interface WithFieldNode {
  readonly type: 'WithField';
  readonly field: IdentifierNode;
  readonly token: Token;
}

export interface SpreadExpressionNode {
  readonly type: 'SpreadExpression';
  readonly target: ExpressionNode;
  readonly token: Token;
}

export interface NewExpressionNode {
  readonly type: 'NewExpression';
  readonly typeName: IdentifierNode;
  readonly args: ExpressionNode[];
  readonly token: Token;
}

export interface DeferStatementNode extends BaseStatementNode {
  readonly type: 'DeferStatement';
  readonly statement: StatementNode;
}

export interface DeferBlockStatementNode extends BaseStatementNode {
  readonly type: 'DeferBlockStatement';
  readonly block: StatementNode[];
}

export interface SendStatementNode extends BaseStatementNode {
  readonly type: 'SendStatement';
  readonly target: ExpressionNode; // Task to send to
  readonly message: ExpressionNode; // Message to send
}

export interface RecvExpressionNode {
  readonly type: 'RecvExpression';
  readonly token: Token;
  readonly timeout?: ExpressionNode; // Optional timeout in milliseconds
}

export type AnyNode = ProgramNode | LineNode | StatementNode | ExpressionNode;
