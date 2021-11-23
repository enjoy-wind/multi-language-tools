import Syntax from "../base-parser/enum/syntax.js";

let Node = {};
Node.ArrayExpression = /** @class */ (function () {
  function ArrayExpression(elements) {
    this.type = Syntax.ArrayExpression;
    this.elements = elements;
  }

  return ArrayExpression;
})();

Node.ArrayPattern = /** @class */ (function () {
  function ArrayPattern(elements) {
    this.type = Syntax.ArrayPattern;
    this.elements = elements;
  }

  return ArrayPattern;
})();

Node.ArrowFunctionExpression = /** @class */ (function () {
  function ArrowFunctionExpression(params, body, expression) {
    this.type = Syntax.ArrowFunctionExpression;
    this.id = null;
    this.params = params;
    this.body = body;
    this.generator = false;
    this.expression = expression;
    this.async = false;
  }

  return ArrowFunctionExpression;
})();

Node.AssignmentExpression = /** @class */ (function () {
  function AssignmentExpression(operator, left, right) {
    this.type = Syntax.AssignmentExpression;
    this.operator = operator;
    this.left = left;
    this.right = right;
  }

  return AssignmentExpression;
})();

Node.AssignmentPattern = /** @class */ (function () {
  function AssignmentPattern(left, right) {
    this.type = Syntax.AssignmentPattern;
    this.left = left;
    this.right = right;
  }

  return AssignmentPattern;
})();

Node.AsyncArrowFunctionExpression = /** @class */ (function () {
  function AsyncArrowFunctionExpression(params, body, expression) {
    this.type = Syntax.ArrowFunctionExpression;
    this.id = null;
    this.params = params;
    this.body = body;
    this.generator = false;
    this.expression = expression;
    this.async = true;
  }

  return AsyncArrowFunctionExpression;
})();

Node.AsyncFunctionDeclaration = /** @class */ (function () {
  function AsyncFunctionDeclaration(id, params, body, generator) {
    this.type = Syntax.FunctionDeclaration;
    this.id = id;
    this.params = params;
    this.body = body;
    this.generator = generator;
    this.expression = false;
    this.async = true;
  }

  return AsyncFunctionDeclaration;
})();

Node.AsyncFunctionExpression = /** @class */ (function () {
  function AsyncFunctionExpression(id, params, body, generator) {
    this.type = Syntax.FunctionExpression;
    this.id = id;
    this.params = params;
    this.body = body;
    this.generator = generator;
    this.expression = false;
    this.async = true;
  }

  return AsyncFunctionExpression;
})();

Node.AwaitExpression = /** @class */ (function () {
  function AwaitExpression(argument) {
    this.type = Syntax.AwaitExpression;
    this.argument = argument;
  }

  return AwaitExpression;
})();

Node.BinaryExpression = /** @class */ (function () {
  function BinaryExpression(operator, left, right) {
    const logical = operator === "||" || operator === "&&" || operator === "??";
    this.type = logical ? Syntax.LogicalExpression : Syntax.BinaryExpression;
    this.operator = operator;
    this.left = left;
    this.right = right;
  }

  return BinaryExpression;
})();

Node.BlockStatement = /** @class */ (function () {
  function BlockStatement(body) {
    this.type = Syntax.BlockStatement;
    this.body = body;
  }

  return BlockStatement;
})();

Node.BreakStatement = /** @class */ (function () {
  function BreakStatement(label) {
    this.type = Syntax.BreakStatement;
    this.label = label;
  }

  return BreakStatement;
})();

Node.CallExpression = /** @class */ (function () {
  function CallExpression(callee, args, optional) {
    this.type = Syntax.CallExpression;
    this.callee = callee;
    this.arguments = args;
    this.optional = optional;
  }

  return CallExpression;
})();

Node.CatchClause = /** @class */ (function () {
  function CatchClause(param, body) {
    this.type = Syntax.CatchClause;
    this.param = param;
    this.body = body;
  }

  return CatchClause;
})();

Node.ChainExpression = /** @class */ (function () {
  function ChainExpression(expression) {
    this.type = Syntax.ChainExpression;
    this.expression = expression;
  }

  return ChainExpression;
})();

Node.ClassBody = /** @class */ (function () {
  function ClassBody(body) {
    this.type = Syntax.ClassBody;
    this.body = body;
  }

  return ClassBody;
})();

Node.ClassDeclaration = /** @class */ (function () {
  function ClassDeclaration(id, superClass, body) {
    this.type = Syntax.ClassDeclaration;
    this.id = id;
    this.superClass = superClass;
    this.body = body;
  }

  return ClassDeclaration;
})();

Node.ClassExpression = /** @class */ (function () {
  function ClassExpression(id, superClass, body) {
    this.type = Syntax.ClassExpression;
    this.id = id;
    this.superClass = superClass;
    this.body = body;
  }

  return ClassExpression;
})();

Node.ComputedMemberExpression = /** @class */ (function () {
  function ComputedMemberExpression(object, property, optional) {
    this.type = Syntax.MemberExpression;
    this.computed = true;
    this.object = object;
    this.property = property;
    this.optional = optional;
  }

  return ComputedMemberExpression;
})();

Node.ConditionalExpression = /** @class */ (function () {
  function ConditionalExpression(test, consequent, alternate) {
    this.type = Syntax.ConditionalExpression;
    this.test = test;
    this.consequent = consequent;
    this.alternate = alternate;
  }

  return ConditionalExpression;
})();

Node.ContinueStatement = /** @class */ (function () {
  function ContinueStatement(label) {
    this.type = Syntax.ContinueStatement;
    this.label = label;
  }

  return ContinueStatement;
})();

Node.DebuggerStatement = /** @class */ (function () {
  function DebuggerStatement() {
    this.type = Syntax.DebuggerStatement;
  }

  return DebuggerStatement;
})();

Node.Directive = /** @class */ (function () {
  function Directive(expression, directive) {
    this.type = Syntax.ExpressionStatement;
    this.expression = expression;
    this.directive = directive;
  }

  return Directive;
})();

Node.DoWhileStatement = /** @class */ (function () {
  function DoWhileStatement(body, test) {
    this.type = Syntax.DoWhileStatement;
    this.body = body;
    this.test = test;
  }

  return DoWhileStatement;
})();

Node.EmptyStatement = /** @class */ (function () {
  function EmptyStatement() {
    this.type = Syntax.EmptyStatement;
  }

  return EmptyStatement;
})();

Node.ExportAllDeclaration = /** @class */ (function () {
  function ExportAllDeclaration(source) {
    this.type = Syntax.ExportAllDeclaration;
    this.source = source;
  }

  return ExportAllDeclaration;
})();

Node.ExportDefaultDeclaration = /** @class */ (function () {
  function ExportDefaultDeclaration(declaration) {
    this.type = Syntax.ExportDefaultDeclaration;
    this.declaration = declaration;
  }

  return ExportDefaultDeclaration;
})();

Node.ExportNamedDeclaration = /** @class */ (function () {
  function ExportNamedDeclaration(declaration, specifiers, source) {
    this.type = Syntax.ExportNamedDeclaration;
    this.declaration = declaration;
    this.specifiers = specifiers;
    this.source = source;
  }

  return ExportNamedDeclaration;
})();

Node.ExportSpecifier = /** @class */ (function () {
  function ExportSpecifier(local, exported) {
    this.type = Syntax.ExportSpecifier;
    this.exported = exported;
    this.local = local;
  }

  return ExportSpecifier;
})();

Node.ExpressionStatement = /** @class */ (function () {
  function ExpressionStatement(expression) {
    this.type = Syntax.ExpressionStatement;
    this.expression = expression;
  }

  return ExpressionStatement;
})();

Node.ForInStatement = /** @class */ (function () {
  function ForInStatement(left, right, body) {
    this.type = Syntax.ForInStatement;
    this.left = left;
    this.right = right;
    this.body = body;
    this.each = false;
  }

  return ForInStatement;
})();

Node.ForOfStatement = /** @class */ (function () {
  function ForOfStatement(left, right, body, _await) {
    this.type = Syntax.ForOfStatement;
    this.await = _await;
    this.left = left;
    this.right = right;
    this.body = body;
  }

  return ForOfStatement;
})();

Node.ForStatement = /** @class */ (function () {
  function ForStatement(init, test, update, body) {
    this.type = Syntax.ForStatement;
    this.init = init;
    this.test = test;
    this.update = update;
    this.body = body;
  }

  return ForStatement;
})();

Node.FunctionDeclaration = /** @class */ (function () {
  function FunctionDeclaration(id, params, body, generator) {
    this.type = Syntax.FunctionDeclaration;
    this.id = id;
    this.params = params;
    this.body = body;
    this.generator = generator;
    this.expression = false;
    this.async = false;
  }

  return FunctionDeclaration;
})();

Node.FunctionExpression = /** @class */ (function () {
  function FunctionExpression(id, params, body, generator) {
    this.type = Syntax.FunctionExpression;
    this.id = id;
    this.params = params;
    this.body = body;
    this.generator = generator;
    this.expression = false;
    this.async = false;
  }

  return FunctionExpression;
})();

Node.Identifier = /** @class */ (function () {
  function Identifier(name) {
    this.type = Syntax.Identifier;
    this.name = name;
  }

  return Identifier;
})();

Node.IfStatement = /** @class */ (function () {
  function IfStatement(test, consequent, alternate) {
    this.type = Syntax.IfStatement;
    this.test = test;
    this.consequent = consequent;
    this.alternate = alternate;
  }

  return IfStatement;
})();

Node.Import = /** @class */ (function () {
  function Import() {
    this.type = Syntax.Import;
  }

  return Import;
})();

Node.ImportDeclaration = /** @class */ (function () {
  function ImportDeclaration(specifiers, source) {
    this.type = Syntax.ImportDeclaration;
    this.specifiers = specifiers;
    this.source = source;
  }

  return ImportDeclaration;
})();

Node.ImportDefaultSpecifier = /** @class */ (function () {
  function ImportDefaultSpecifier(local) {
    this.type = Syntax.ImportDefaultSpecifier;
    this.local = local;
  }

  return ImportDefaultSpecifier;
})();

Node.ImportNamespaceSpecifier = /** @class */ (function () {
  function ImportNamespaceSpecifier(local) {
    this.type = Syntax.ImportNamespaceSpecifier;
    this.local = local;
  }

  return ImportNamespaceSpecifier;
})();

Node.ImportSpecifier = /** @class */ (function () {
  function ImportSpecifier(local, imported) {
    this.type = Syntax.ImportSpecifier;
    this.local = local;
    this.imported = imported;
  }

  return ImportSpecifier;
})();

Node.LabeledStatement = /** @class */ (function () {
  function LabeledStatement(label, body) {
    this.type = Syntax.LabeledStatement;
    this.label = label;
    this.body = body;
  }

  return LabeledStatement;
})();

Node.Literal = /** @class */ (function () {
  function Literal(value, raw) {
    this.type = Syntax.Literal;
    this.value = value;
    this.raw = raw;
  }

  return Literal;
})();

Node.MetaProperty = /** @class */ (function () {
  function MetaProperty(meta, property) {
    this.type = Syntax.MetaProperty;
    this.meta = meta;
    this.property = property;
  }

  return MetaProperty;
})();

Node.MethodDefinition = /** @class */ (function () {
  function MethodDefinition(key, computed, value, kind, isStatic) {
    this.type = Syntax.MethodDefinition;
    this.key = key;
    this.computed = computed;
    this.value = value;
    this.kind = kind;
    this.static = isStatic;
  }

  return MethodDefinition;
})();

Node.Module = /** @class */ (function () {
  function Module(body) {
    this.type = Syntax.Program;
    this.body = body;
    this.sourceType = "module";
  }

  return Module;
})();

Node.NewExpression = /** @class */ (function () {
  function NewExpression(callee, args) {
    this.type = Syntax.NewExpression;
    this.callee = callee;
    this.arguments = args;
  }

  return NewExpression;
})();

Node.ObjectExpression = /** @class */ (function () {
  function ObjectExpression(properties) {
    this.type = Syntax.ObjectExpression;
    this.properties = properties;
  }

  return ObjectExpression;
})();

Node.ObjectPattern = /** @class */ (function () {
  function ObjectPattern(properties) {
    this.type = Syntax.ObjectPattern;
    this.properties = properties;
  }

  return ObjectPattern;
})();

Node.Property = /** @class */ (function () {
  function Property(kind, key, computed, value, method, shorthand) {
    this.type = Syntax.Property;
    this.key = key;
    this.computed = computed;
    this.value = value;
    this.kind = kind;
    this.method = method;
    this.shorthand = shorthand;
  }

  return Property;
})();

Node.RegexLiteral = /** @class */ (function () {
  function RegexLiteral(value, raw, pattern, flags) {
    this.type = Syntax.Literal;
    this.value = value;
    this.raw = raw;
    this.regex = { pattern: pattern, flags: flags };
  }

  return RegexLiteral;
})();

Node.RestElement = /** @class */ (function () {
  function RestElement(argument) {
    this.type = Syntax.RestElement;
    this.argument = argument;
  }

  return RestElement;
})();

Node.ReturnStatement = /** @class */ (function () {
  function ReturnStatement(argument) {
    this.type = Syntax.ReturnStatement;
    this.argument = argument;
  }

  return ReturnStatement;
})();

Node.Script = /** @class */ (function () {
  function Script(body) {
    this.type = Syntax.Program;
    this.body = body;
    this.sourceType = "script";
  }

  return Script;
})();

Node.SequenceExpression = /** @class */ (function () {
  function SequenceExpression(expressions) {
    this.type = Syntax.SequenceExpression;
    this.expressions = expressions;
  }

  return SequenceExpression;
})();

Node.SpreadElement = /** @class */ (function () {
  function SpreadElement(argument) {
    this.type = Syntax.SpreadElement;
    this.argument = argument;
  }

  return SpreadElement;
})();

Node.StaticMemberExpression = /** @class */ (function () {
  function StaticMemberExpression(object, property, optional) {
    this.type = Syntax.MemberExpression;
    this.computed = false;
    this.object = object;
    this.property = property;
    this.optional = optional;
  }

  return StaticMemberExpression;
})();

Node.Super = /** @class */ (function () {
  function Super() {
    this.type = Syntax.Super;
  }

  return Super;
})();

Node.SwitchCase = /** @class */ (function () {
  function SwitchCase(test, consequent) {
    this.type = Syntax.SwitchCase;
    this.test = test;
    this.consequent = consequent;
  }

  return SwitchCase;
})();

Node.SwitchStatement = /** @class */ (function () {
  function SwitchStatement(discriminant, cases) {
    this.type = Syntax.SwitchStatement;
    this.discriminant = discriminant;
    this.cases = cases;
  }

  return SwitchStatement;
})();

Node.TaggedTemplateExpression = /** @class */ (function () {
  function TaggedTemplateExpression(tag, quasi) {
    this.type = Syntax.TaggedTemplateExpression;
    this.tag = tag;
    this.quasi = quasi;
  }

  return TaggedTemplateExpression;
})();

Node.TemplateElement = /** @class */ (function () {
  function TemplateElement(value, tail) {
    this.type = Syntax.TemplateElement;
    this.value = value;
    this.tail = tail;
  }

  return TemplateElement;
})();

Node.TemplateLiteral = /** @class */ (function () {
  function TemplateLiteral(quasis, expressions) {
    this.type = Syntax.TemplateLiteral;
    this.quasis = quasis;
    this.expressions = expressions;
  }

  return TemplateLiteral;
})();

Node.ThisExpression = /** @class */ (function () {
  function ThisExpression() {
    this.type = Syntax.ThisExpression;
  }

  return ThisExpression;
})();

Node.ThrowStatement = /** @class */ (function () {
  function ThrowStatement(argument) {
    this.type = Syntax.ThrowStatement;
    this.argument = argument;
  }

  return ThrowStatement;
})();

Node.TryStatement = /** @class */ (function () {
  function TryStatement(block, handler, finalizer) {
    this.type = Syntax.TryStatement;
    this.block = block;
    this.handler = handler;
    this.finalizer = finalizer;
  }

  return TryStatement;
})();

Node.UnaryExpression = /** @class */ (function () {
  function UnaryExpression(operator, argument) {
    this.type = Syntax.UnaryExpression;
    this.operator = operator;
    this.argument = argument;
    this.prefix = true;
  }

  return UnaryExpression;
})();

Node.UpdateExpression = /** @class */ (function () {
  function UpdateExpression(operator, argument, prefix) {
    this.type = Syntax.UpdateExpression;
    this.operator = operator;
    this.argument = argument;
    this.prefix = prefix;
  }

  return UpdateExpression;
})();

Node.VariableDeclaration = /** @class */ (function () {
  function VariableDeclaration(declarations, kind) {
    this.type = Syntax.VariableDeclaration;
    this.declarations = declarations;
    this.kind = kind;
  }

  return VariableDeclaration;
})();

Node.VariableDeclarator = /** @class */ (function () {
  function VariableDeclarator(id, init) {
    this.type = Syntax.VariableDeclarator;
    this.id = id;
    this.init = init;
  }

  return VariableDeclarator;
})();

Node.WhileStatement = /** @class */ (function () {
  function WhileStatement(test, body) {
    this.type = Syntax.WhileStatement;
    this.test = test;
    this.body = body;
  }

  return WhileStatement;
})();

Node.WithStatement = /** @class */ (function () {
  function WithStatement(object, body) {
    this.type = Syntax.WithStatement;
    this.object = object;
    this.body = body;
  }

  return WithStatement;
})();

Node.YieldExpression = /** @class */ (function () {
  function YieldExpression(argument, delegate) {
    this.type = Syntax.YieldExpression;
    this.argument = argument;
    this.delegate = delegate;
  }

  return YieldExpression;
})();

export default Node;
