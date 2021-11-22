const __extends =
  (this && this.__extends) ||
  (function () {
    let extendStatics = function (d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (d, b) {
            d.__proto__ = b;
          }) ||
        function (d, b) {
          for (let p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };
      return extendStatics(d, b);
    };
    return function (d, b) {
      extendStatics(d, b);

      function __() {
        this.constructor = d;
      }

      d.prototype =
        b === null
          ? Object.create(b)
          : ((__.prototype = b.prototype), new __());
    };
  })();
import Character from "../character/index.js";
import JSXNode from "../node/jsx-nodes.js";
import JSXSyntax from "./enum/jsx-syntax.js";
import Node from "../node/index.js";
import Parser from "../base-parser/index.js";
import { TokenName } from "../enum/token.js";
import XHTMLEntities from "./enum/xhtml-entities.js";

TokenName[100] = "JSXIdentifier";
TokenName[101] = "JSXText";

// Fully qualified element name, e.g. <svg:path> returns "svg:path"
function getQualifiedElementName(elementName) {
  let qualifiedName;
  switch (elementName.type) {
    case JSXSyntax.JSXIdentifier:
      let id = elementName;
      qualifiedName = id.name;
      break;
    case JSXSyntax.JSXNamespacedName:
      let ns = elementName;
      qualifiedName =
        getQualifiedElementName(ns.namespace) +
        ":" +
        getQualifiedElementName(ns.name);
      break;
    case JSXSyntax.JSXMemberExpression:
      let expr = elementName;
      qualifiedName =
        getQualifiedElementName(expr.object) +
        "." +
        getQualifiedElementName(expr.property);
      break;
    /* istanbul ignore next */
    default:
      break;
  }
  return qualifiedName;
}

const JSXParser = /** @class */ (function (_super) {
  __extends(JSXParser, _super);

  function JSXParser(code, options, delegate) {
    return _super.call(this, code, options, delegate) || this;
  }

  JSXParser.prototype.parsePrimaryExpression = function () {
    return this.match("<")
      ? this.parseJSXRoot()
      : _super.prototype.parsePrimaryExpression.call(this);
  };
  JSXParser.prototype.startJSX = function () {
    // Unwind the scanner before the lookahead token.
    this.scanner.index = this.startMarker.index;
    this.scanner.lineNumber = this.startMarker.line;
    this.scanner.lineStart = this.startMarker.index - this.startMarker.column;
  };
  JSXParser.prototype.finishJSX = function () {
    // Prime the next lookahead.
    this.nextToken();
  };
  JSXParser.prototype.reenterJSX = function () {
    this.startJSX();
    this.expectJSX("}");
    // Pop the closing '}' added from the lookahead.
    if (this.config.tokens) {
      this.tokens.pop();
    }
  };
  JSXParser.prototype.createJSXNode = function () {
    this.collectComments();
    return {
      index: this.scanner.index,
      line: this.scanner.lineNumber,
      column: this.scanner.index - this.scanner.lineStart,
    };
  };
  JSXParser.prototype.createJSXChildNode = function () {
    return {
      index: this.scanner.index,
      line: this.scanner.lineNumber,
      column: this.scanner.index - this.scanner.lineStart,
    };
  };
  JSXParser.prototype.scanXHTMLEntity = function (quote) {
    let result = "&";
    let valid = true;
    let terminated = false;
    let numeric = false;
    let hex = false;
    while (!this.scanner.eof() && valid && !terminated) {
      let ch = this.scanner.source[this.scanner.index];
      if (ch === quote) {
        break;
      }
      terminated = ch === ";";
      result += ch;
      ++this.scanner.index;
      if (!terminated) {
        switch (result.length) {
          case 2:
            // e.g. '&#123;'
            numeric = ch === "#";
            break;
          case 3:
            if (numeric) {
              // e.g. '&#x41;'
              hex = ch === "x";
              valid = hex || Character.isDecimalDigit(ch.charCodeAt(0));
              numeric = numeric && !hex;
            }
            break;
          default:
            valid =
              valid &&
              !(numeric && !Character.isDecimalDigit(ch.charCodeAt(0)));
            valid = valid && !(hex && !Character.isHexDigit(ch.charCodeAt(0)));
            break;
        }
      }
    }
    if (valid && terminated && result.length > 2) {
      // e.g. '&#x41;' becomes just '#x41'
      let str = result.substr(1, result.length - 2);
      if (numeric && str.length > 1) {
        result = String.fromCharCode(parseInt(str.substr(1), 10));
      } else if (hex && str.length > 2) {
        result = String.fromCharCode(parseInt("0" + str.substr(1), 16));
      } else if (!numeric && !hex && XHTMLEntities.XHTMLEntities[str]) {
        result = XHTMLEntities.XHTMLEntities[str];
      }
    }
    return result;
  };
  // Scan the next JSX token. This replaces Scanner#lex when in JSX mode.
  JSXParser.prototype.lexJSX = function () {
    let cp = this.scanner.source.charCodeAt(this.scanner.index);
    // < > / : = { }
    if (
      cp === 60 ||
      cp === 62 ||
      cp === 47 ||
      cp === 58 ||
      cp === 61 ||
      cp === 123 ||
      cp === 125
    ) {
      let value = this.scanner.source[this.scanner.index++];
      return {
        type: 7 /* Punctuator */,
        value: value,
        lineNumber: this.scanner.lineNumber,
        lineStart: this.scanner.lineStart,
        start: this.scanner.index - 1,
        end: this.scanner.index,
      };
    }
    // " '
    if (cp === 34 || cp === 39) {
      let start = this.scanner.index;
      let quote = this.scanner.source[this.scanner.index++];
      let str = "";
      while (!this.scanner.eof()) {
        let ch = this.scanner.source[this.scanner.index++];
        if (ch === quote) {
          break;
        } else if (ch === "&") {
          str += this.scanXHTMLEntity(quote);
        } else {
          str += ch;
        }
      }
      return {
        type: 8 /* StringLiteral */,
        value: str,
        lineNumber: this.scanner.lineNumber,
        lineStart: this.scanner.lineStart,
        start: start,
        end: this.scanner.index,
      };
    }
    // ... or .
    if (cp === 46) {
      let n1 = this.scanner.source.charCodeAt(this.scanner.index + 1);
      let n2 = this.scanner.source.charCodeAt(this.scanner.index + 2);
      let value = n1 === 46 && n2 === 46 ? "..." : ".";
      let start = this.scanner.index;
      this.scanner.index += value.length;
      return {
        type: 7 /* Punctuator */,
        value: value,
        lineNumber: this.scanner.lineNumber,
        lineStart: this.scanner.lineStart,
        start: start,
        end: this.scanner.index,
      };
    }
    // `
    if (cp === 96) {
      // Only placeholder, since it will be rescanned as a real assignment expression.
      return {
        type: 10 /* Template */,
        value: "",
        lineNumber: this.scanner.lineNumber,
        lineStart: this.scanner.lineStart,
        start: this.scanner.index,
        end: this.scanner.index,
      };
    }
    // Identifer can not contain backslash (char code 92).
    if (Character.isIdentifierStart(cp) && cp !== 92) {
      let start = this.scanner.index;
      ++this.scanner.index;
      while (!this.scanner.eof()) {
        let ch = this.scanner.source.charCodeAt(this.scanner.index);
        if (Character.isIdentifierPart(ch) && ch !== 92) {
          ++this.scanner.index;
        } else if (ch === 45) {
          // Hyphen (char code 45) can be part of an identifier.
          ++this.scanner.index;
        } else {
          break;
        }
      }
      let id = this.scanner.source.slice(start, this.scanner.index);
      return {
        type: 100 /* Identifier */,
        value: id,
        lineNumber: this.scanner.lineNumber,
        lineStart: this.scanner.lineStart,
        start: start,
        end: this.scanner.index,
      };
    }
    return this.scanner.lex();
  };
  JSXParser.prototype.nextJSXToken = function () {
    this.collectComments();
    this.startMarker.index = this.scanner.index;
    this.startMarker.line = this.scanner.lineNumber;
    this.startMarker.column = this.scanner.index - this.scanner.lineStart;
    let token = this.lexJSX();
    this.lastMarker.index = this.scanner.index;
    this.lastMarker.line = this.scanner.lineNumber;
    this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
    if (this.config.tokens) {
      this.tokens.push(this.convertToken(token));
    }
    return token;
  };
  JSXParser.prototype.nextJSXText = function () {
    this.startMarker.index = this.scanner.index;
    this.startMarker.line = this.scanner.lineNumber;
    this.startMarker.column = this.scanner.index - this.scanner.lineStart;
    let start = this.scanner.index;
    let text = "";
    while (!this.scanner.eof()) {
      let ch = this.scanner.source[this.scanner.index];
      if (ch === "{" || ch === "<") {
        break;
      }
      ++this.scanner.index;
      text += ch;
      if (Character.isLineTerminator(ch.charCodeAt(0))) {
        ++this.scanner.lineNumber;
        if (ch === "\r" && this.scanner.source[this.scanner.index] === "\n") {
          ++this.scanner.index;
        }
        this.scanner.lineStart = this.scanner.index;
      }
    }
    this.lastMarker.index = this.scanner.index;
    this.lastMarker.line = this.scanner.lineNumber;
    this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
    let token = {
      type: 101 /* Text */,
      value: text,
      lineNumber: this.scanner.lineNumber,
      lineStart: this.scanner.lineStart,
      start: start,
      end: this.scanner.index,
    };
    if (text.length > 0 && this.config.tokens) {
      this.tokens.push(this.convertToken(token));
    }
    return token;
  };
  JSXParser.prototype.peekJSXToken = function () {
    let state = this.scanner.saveState();
    this.scanner.scanComments();
    let next = this.lexJSX();
    this.scanner.restoreState(state);
    return next;
  };
  // Expect the next JSX token to match the specified punctuator.
  // If not, an exception will be thrown.
  JSXParser.prototype.expectJSX = function (value) {
    let token = this.nextJSXToken();
    if (token.type !== 7 /* Punctuator */ || token.value !== value) {
      this.throwUnexpectedToken(token);
    }
  };
  // Return true if the next JSX token matches the specified punctuator.
  JSXParser.prototype.matchJSX = function (value) {
    let next = this.peekJSXToken();
    return next.type === 7 /* Punctuator */ && next.value === value;
  };
  JSXParser.prototype.parseJSXIdentifier = function () {
    let node = this.createJSXNode();
    let token = this.nextJSXToken();
    if (token.type !== 100 /* Identifier */) {
      this.throwUnexpectedToken(token);
    }
    return this.finalize(node, new JSXNode.JSXIdentifier(token.value));
  };
  JSXParser.prototype.parseJSXElementName = function () {
    let node = this.createJSXNode();
    let elementName = this.parseJSXIdentifier();
    if (this.matchJSX(":")) {
      let namespace = elementName;
      this.expectJSX(":");
      let name_1 = this.parseJSXIdentifier();
      elementName = this.finalize(
        node,
        new JSXNode.JSXNamespacedName(namespace, name_1)
      );
    } else if (this.matchJSX(".")) {
      while (this.matchJSX(".")) {
        let object = elementName;
        this.expectJSX(".");
        let property = this.parseJSXIdentifier();
        elementName = this.finalize(
          node,
          new JSXNode.JSXMemberExpression(object, property)
        );
      }
    }
    return elementName;
  };
  JSXParser.prototype.parseJSXAttributeName = function () {
    let node = this.createJSXNode();
    let attributeName;
    let identifier = this.parseJSXIdentifier();
    if (this.matchJSX(":")) {
      let namespace = identifier;
      this.expectJSX(":");
      let name_2 = this.parseJSXIdentifier();
      attributeName = this.finalize(
        node,
        new JSXNode.JSXNamespacedName(namespace, name_2)
      );
    } else {
      attributeName = identifier;
    }
    return attributeName;
  };
  JSXParser.prototype.parseJSXStringLiteralAttribute = function () {
    let node = this.createJSXNode();
    let token = this.nextJSXToken();
    if (token.type !== 8 /* StringLiteral */) {
      this.throwUnexpectedToken(token);
    }
    let raw = this.getTokenRaw(token);
    return this.finalize(node, new Node.Literal(token.value, raw));
  };
  JSXParser.prototype.parseJSXExpressionAttribute = function () {
    let node = this.createJSXNode();
    this.expectJSX("{");
    this.finishJSX();
    if (this.match("}")) {
      this.tolerateError(
        "JSX attributes must only be assigned a non-empty expression"
      );
    }
    let expression = this.parseAssignmentExpression();
    this.reenterJSX();
    return this.finalize(node, new JSXNode.JSXExpressionContainer(expression));
  };
  JSXParser.prototype.parseJSXAttributeValue = function () {
    return this.matchJSX("{")
      ? this.parseJSXExpressionAttribute()
      : this.matchJSX("<")
      ? this.parseJSXElement()
      : this.parseJSXStringLiteralAttribute();
  };
  JSXParser.prototype.parseJSXNameValueAttribute = function () {
    let node = this.createJSXNode();
    let name = this.parseJSXAttributeName();
    let value = null;
    if (this.matchJSX("=")) {
      this.expectJSX("=");
      value = this.parseJSXAttributeValue();
    }
    return this.finalize(node, new JSXNode.JSXAttribute(name, value));
  };
  JSXParser.prototype.parseJSXSpreadAttribute = function () {
    let node = this.createJSXNode();
    this.expectJSX("{");
    this.expectJSX("...");
    this.finishJSX();
    let argument = this.parseAssignmentExpression();
    this.reenterJSX();
    return this.finalize(node, new JSXNode.JSXSpreadAttribute(argument));
  };
  JSXParser.prototype.parseJSXAttributes = function () {
    let attributes = [];
    while (!this.matchJSX("/") && !this.matchJSX(">")) {
      let attribute = this.matchJSX("{")
        ? this.parseJSXSpreadAttribute()
        : this.parseJSXNameValueAttribute();
      attributes.push(attribute);
    }
    return attributes;
  };
  JSXParser.prototype.parseJSXOpeningElement = function () {
    let node = this.createJSXNode();
    this.expectJSX("<");
    if (this.matchJSX(">")) {
      this.expectJSX(">");
      return this.finalize(node, new JSXNode.JSXOpeningFragment(false));
    }
    let name = this.parseJSXElementName();
    let attributes = this.parseJSXAttributes();
    let selfClosing = this.matchJSX("/");
    if (selfClosing) {
      this.expectJSX("/");
    }
    this.expectJSX(">");
    return this.finalize(
      node,
      new JSXNode.JSXOpeningElement(name, selfClosing, attributes)
    );
  };
  JSXParser.prototype.parseJSXBoundaryElement = function () {
    let node = this.createJSXNode();
    this.expectJSX("<");
    if (this.matchJSX("/")) {
      this.expectJSX("/");
      if (this.matchJSX(">")) {
        this.expectJSX(">");
        return this.finalize(node, new JSXNode.JSXClosingFragment());
      }
      let elementName = this.parseJSXElementName();
      this.expectJSX(">");
      return this.finalize(node, new JSXNode.JSXClosingElement(elementName));
    }
    let name = this.parseJSXElementName();
    let attributes = this.parseJSXAttributes();
    let selfClosing = this.matchJSX("/");
    if (selfClosing) {
      this.expectJSX("/");
    }
    this.expectJSX(">");
    return this.finalize(
      node,
      new JSXNode.JSXOpeningElement(name, selfClosing, attributes)
    );
  };
  JSXParser.prototype.parseJSXEmptyExpression = function () {
    let node = this.createJSXChildNode();
    this.collectComments();
    this.lastMarker.index = this.scanner.index;
    this.lastMarker.line = this.scanner.lineNumber;
    this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
    return this.finalize(node, new JSXNode.JSXEmptyExpression());
  };
  JSXParser.prototype.parseJSXExpressionContainer = function () {
    let node = this.createJSXNode();
    this.expectJSX("{");
    let expression;
    if (this.matchJSX("}")) {
      expression = this.parseJSXEmptyExpression();
      this.expectJSX("}");
    } else {
      this.finishJSX();
      expression = this.parseAssignmentExpression();
      this.reenterJSX();
    }
    return this.finalize(node, new JSXNode.JSXExpressionContainer(expression));
  };
  JSXParser.prototype.parseJSXChildren = function () {
    let children = [];
    while (!this.scanner.eof()) {
      let node = this.createJSXChildNode();
      let token = this.nextJSXText();
      if (token.start < token.end) {
        let raw = this.getTokenRaw(token);
        let child = this.finalize(node, new JSXNode.JSXText(token.value, raw));
        children.push(child);
      }
      if (this.scanner.source[this.scanner.index] === "{") {
        let container = this.parseJSXExpressionContainer();
        children.push(container);
      } else {
        break;
      }
    }
    return children;
  };
  JSXParser.prototype.parseComplexJSXElement = function (el) {
    let stack = [];
    while (!this.scanner.eof()) {
      el.children = el.children.concat(this.parseJSXChildren());
      let node = this.createJSXChildNode();
      let element = this.parseJSXBoundaryElement();
      if (element.type === JSXSyntax.JSXOpeningElement) {
        let opening = element;
        if (opening.selfClosing) {
          let child = this.finalize(
            node,
            new JSXNode.JSXElement(opening, [], null)
          );
          el.children.push(child);
        } else {
          stack.push(el);
          el = { node: node, opening: opening, closing: null, children: [] };
        }
      }
      if (element.type === JSXSyntax.JSXClosingElement) {
        el.closing = element;
        let open_1 = getQualifiedElementName(el.opening.name);
        let close_1 = getQualifiedElementName(el.closing.name);
        if (open_1 !== close_1) {
          this.tolerateError(
            "Expected corresponding JSX closing tag for %0",
            open_1
          );
        }
        if (stack.length > 0) {
          let child = this.finalize(
            el.node,
            new JSXNode.JSXElement(el.opening, el.children, el.closing)
          );
          el = stack[stack.length - 1];
          el.children.push(child);
          stack.pop();
        } else {
          break;
        }
      }
      if (element.type === JSXSyntax.JSXClosingFragment) {
        el.closing = element;
        if (el.opening.type !== JSXSyntax.JSXOpeningFragment) {
          this.tolerateError(
            "Expected corresponding JSX closing tag for jsx fragment"
          );
        } else {
          break;
        }
      }
    }
    return el;
  };
  JSXParser.prototype.parseJSXElement = function () {
    let node = this.createJSXNode();
    let opening = this.parseJSXOpeningElement();
    let children = [];
    let closing = null;
    if (!opening.selfClosing) {
      let el = this.parseComplexJSXElement({
        node: node,
        opening: opening,
        closing: closing,
        children: children,
      });
      children = el.children;
      closing = el.closing;
    }
    return this.finalize(
      node,
      new JSXNode.JSXElement(opening, children, closing)
    );
  };
  JSXParser.prototype.parseJSXRoot = function () {
    // Pop the opening '<' added from the lookahead.
    if (this.config.tokens) {
      this.tokens.pop();
    }
    this.startJSX();
    let element = this.parseJSXElement();
    this.finishJSX();
    return element;
  };
  JSXParser.prototype.isStartOfExpression = function () {
    return _super.prototype.isStartOfExpression.call(this) || this.match("<");
  };
  return JSXParser;
})(Parser);

export default JSXParser;
