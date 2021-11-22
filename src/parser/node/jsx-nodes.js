import JSXSyntax from "../jsx-parser/enum/jsx-syntax.js";

let JSXNode = {};
JSXNode.JSXClosingElement = /** @class */ (function () {
  function JSXClosingElement(name) {
    this.type = JSXSyntax.JSXClosingElement;
    this.name = name;
  }

  return JSXClosingElement;
})();

JSXNode.JSXClosingFragment = /** @class */ (function () {
  function JSXClosingFragment() {
    this.type = JSXSyntax.JSXClosingFragment;
  }

  return JSXClosingFragment;
})();

JSXNode.JSXElement = /** @class */ (function () {
  function JSXElement(openingElement, children, closingElement) {
    this.type = JSXSyntax.JSXElement;
    this.openingElement = openingElement;
    this.children = children;
    this.closingElement = closingElement;
  }

  return JSXElement;
})();

JSXNode.JSXEmptyExpression = /** @class */ (function () {
  function JSXEmptyExpression() {
    this.type = JSXSyntax.JSXEmptyExpression;
  }

  return JSXEmptyExpression;
})();

JSXNode.JSXExpressionContainer = /** @class */ (function () {
  function JSXExpressionContainer(expression) {
    this.type = JSXSyntax.JSXExpressionContainer;
    this.expression = expression;
  }

  return JSXExpressionContainer;
})();

JSXNode.JSXIdentifier = /** @class */ (function () {
  function JSXIdentifier(name) {
    this.type = JSXSyntax.JSXIdentifier;
    this.name = name;
  }

  return JSXIdentifier;
})();

JSXNode.JSXMemberExpression = /** @class */ (function () {
  function JSXMemberExpression(object, property) {
    this.type = JSXSyntax.JSXMemberExpression;
    this.object = object;
    this.property = property;
  }

  return JSXMemberExpression;
})();

JSXNode.JSXAttribute = /** @class */ (function () {
  function JSXAttribute(name, value) {
    this.type = JSXSyntax.JSXAttribute;
    this.name = name;
    this.value = value;
  }

  return JSXAttribute;
})();

JSXNode.JSXNamespacedName = /** @class */ (function () {
  function JSXNamespacedName(namespace, name) {
    this.type = JSXSyntax.JSXNamespacedName;
    this.namespace = namespace;
    this.name = name;
  }

  return JSXNamespacedName;
})();

JSXNode.JSXOpeningElement = /** @class */ (function () {
  function JSXOpeningElement(name, selfClosing, attributes) {
    this.type = JSXSyntax.JSXOpeningElement;
    this.name = name;
    this.selfClosing = selfClosing;
    this.attributes = attributes;
  }

  return JSXOpeningElement;
})();

JSXNode.JSXOpeningFragment = /** @class */ (function () {
  function JSXOpeningFragment(selfClosing) {
    this.type = JSXSyntax.JSXOpeningFragment;
    this.selfClosing = selfClosing;
  }

  return JSXOpeningFragment;
})();

JSXNode.JSXSpreadAttribute = /** @class */ (function () {
  function JSXSpreadAttribute(argument) {
    this.type = JSXSyntax.JSXSpreadAttribute;
    this.argument = argument;
  }

  return JSXSpreadAttribute;
})();

JSXNode.JSXText = /** @class */ (function () {
  function JSXText(value, raw) {
    this.type = JSXSyntax.JSXText;
    this.value = value;
    this.raw = raw;
  }

  return JSXText;
})();
export default JSXNode;
