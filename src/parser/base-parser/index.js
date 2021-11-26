import Node from "../node/index.js";
import Scanner from "../scanner/index.js";
import Syntax from "./enum/syntax.js";
import { TokenName, TokenType } from "../enum/token.js";
import JSXSyntax from "../jsx-parser/enum/jsx-syntax.js";
import { checkChinese } from "../../utils/index.js";

let ArrowParameterPlaceHolder = "ArrowParameterPlaceHolder";
/* eslint-disable @typescript-eslint/unbound-method */
const Parser = /** @class */ (function () {
  function Parser(code, options, delegate) {
    if (options === void 0) {
      options = {};
    }
    this.config = {
      range: typeof options.range === "boolean" && options.range,
      loc: typeof options.loc === "boolean" && options.loc,
      source: null,
      tokens: typeof options.tokens === "boolean" && options.tokens,
      comment: typeof options.comment === "boolean" && options.comment,
      tolerant: typeof options.tolerant === "boolean" && options.tolerant,
      fileName: options.fileName || "",
    };
    if (this.config.loc && options.source && options.source !== null) {
      this.config.source = String(options.source);
    }
    this.delegate = delegate;
    this.scanner = new Scanner(code);
    this.scanner.trackComment = this.config.comment;
    this.operatorPrecedence = {
      ")": 0,
      ";": 0,
      ",": 0,
      "=": 0,
      "]": 0,
      "??": 5,
      "||": 6,
      "&&": 7,
      "|": 8,
      "^": 9,
      "&": 10,
      "==": 11,
      "!=": 11,
      "===": 11,
      "!==": 11,
      "<": 12,
      ">": 12,
      "<=": 12,
      ">=": 12,
      "<<": 13,
      ">>": 13,
      ">>>": 13,
      "+": 14,
      "-": 14,
      "*": 15,
      "/": 15,
      "%": 15,
    };
    this.lookahead = {
      type: 2 /* EOF */,
      value: "",
      lineNumber: this.scanner.lineNumber,
      lineStart: 0,
      start: 0,
      end: 0,
    };
    this.hasLineTerminator = false;
    this.context = {
      isModule: false,
      isAsync: false,
      allowIn: true,
      allowStrictDirective: true,
      allowYield: true,
      firstCoverInitializedNameError: null,
      isAssignmentTarget: false,
      isBindingElement: false,
      inFunctionBody: false,
      inIteration: false,
      inSwitch: false,
      inClassConstructor: false,
      labelSet: {},
      strict: false,
    };
    this.tokens = [];
    this.transTokens = [];
    this.runTemplateCollectionTokens = [];
    this.templateRuning = false;
    this.startMarker = {
      index: 0,
      line: this.scanner.lineNumber,
      column: 0,
    };
    this.lastMarker = {
      index: 0,
      line: this.scanner.lineNumber,
      column: 0,
    };
    this.nextToken();
    this.lastMarker = {
      index: this.scanner.index,
      line: this.scanner.lineNumber,
      column: this.scanner.index - this.scanner.lineStart,
    };
  }

  Parser.prototype.collectComments = function () {
    if (!this.config.comment) {
      this.scanner.scanComments();
    } else {
      let comments = this.scanner.scanComments();
      if (comments.length > 0 && this.delegate) {
        for (let i = 0; i < comments.length; ++i) {
          let e = comments[i];
          let node = {
            type: e.multiLine ? "BlockComment" : "LineComment",
            value: this.scanner.source.slice(e.slice[0], e.slice[1]),
          };
          if (this.config.range) {
            node.range = e.range;
          }
          if (this.config.loc) {
            node.loc = e.loc;
          }
          let metadata = {
            start: {
              line: e.loc.start.line,
              column: e.loc.start.column,
              offset: e.range[0],
            },
            end: {
              line: e.loc.end.line,
              column: e.loc.end.column,
              offset: e.range[1],
            },
          };
          this.delegate(node, metadata);
        }
      }
    }
  };
  // From internal representation to an external structure
  Parser.prototype.getTokenRaw = function (token) {
    return this.scanner.source.slice(token.start, token.end);
  };
  Parser.prototype.convertToken = function (token) {
    let t = {
      type: TokenName[token.type],
      value: this.getTokenRaw(token),
    };
    if (this.config.range) {
      t.range = [token.start, token.end];
    }
    if (this.config.loc) {
      t.loc = {
        start: {
          line: this.startMarker.line,
          column: this.startMarker.column,
        },
        end: {
          line: this.scanner.lineNumber,
          column: this.scanner.index - this.scanner.lineStart,
        },
      };
    }
    if (token.type === 9 /* RegularExpression */) {
      let pattern = token.pattern;
      let flags = token.flags;
      t.regex = { pattern: pattern, flags: flags };
    }
    return t;
  };
  Parser.prototype.nextToken = function () {
    if (this.validateError()) {
      return;
    }
    let token = this.lookahead;
    this.lastMarker.index = this.scanner.index;
    this.lastMarker.line = this.scanner.lineNumber;
    this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
    this.collectComments();
    if (this.scanner.index !== this.startMarker.index) {
      this.startMarker.index = this.scanner.index;
      this.startMarker.line = this.scanner.lineNumber;
      this.startMarker.column = this.scanner.index - this.scanner.lineStart;
    }
    let next = this.scanner.lex();
    this.hasLineTerminator = token.lineNumber !== next.lineNumber;
    if (next && this.context.strict && next.type === 3 /* Identifier */) {
      if (this.scanner.isStrictModeReservedWord(next.value)) {
        next.type = 4 /* Keyword */;
      }
    }
    this.lookahead = next;
    if (this.config.tokens && next.type !== 2 /* EOF */) {
      const token = this.convertToken(next);
      this.getTranslationTokens(token);
      this.tokens.push(token);
    }
    //console.log(token);
    return token;
  };
  Parser.prototype.getTranslationTokens = function (token) {
    const { JSXText } = JSXSyntax;
    const chineseTypes = [
      JSXText,
      TokenName[TokenType.Template],
      TokenName[TokenType.StringLiteral],
    ];
    const { type, value } = token || {};
    /*模版字符串有变量*/
    if (chineseTypes.includes(type) || this.templateRuning) {
      if (value) {
        if (TokenName[TokenType.Template] === type || this.templateRuning) {
          const compositionToken = this.templateTokenComposition(token);
          if (compositionToken) {
            this.transTokens.push(compositionToken);
          }
        } else {
          if (checkChinese(value)) {
            this.transTokens.push(token);
          }
        }
      }
    }
  };
  Parser.prototype.validateError = function () {
    if (this.errorInfo && Object.keys(this.errorInfo).length) {
      this.tokens = [];
      this.transTokens = [];
      return true;
    } else {
      return false;
    }
  };

  Parser.prototype.templateTokenComposition = function (token) {
    const { type, value } = token || {};
    const valueLen = value.length;
    const starTemplate = value.charAt(0) === "`";
    const endTemplate = value.charAt(valueLen - 1) === "`";
    const completeTemplate = starTemplate && endTemplate;
    if (this.templateRuning && completeTemplate) {
      this.errorInfo = {
        error: "Nested template",
        key: value,
      };
      return;
    }
    if (completeTemplate) {
      if (checkChinese(value)) {
        return token;
      }
      this.runTemplateCollectionTokens = [];
      return null;
    }
    /*template是闭合开关*/
    if (
      TokenName[TokenType.Template] === type &&
      (starTemplate || endTemplate)
    ) {
      this.templateRuning = !this.templateRuning;
    }
    if (this.templateRuning) {
      this.runTemplateCollectionTokens.push(token);
    } else {
      this.runTemplateCollectionTokens.push(token);
      let hasChinese = false;
      for (const index in this.runTemplateCollectionTokens) {
        if (checkChinese(this.runTemplateCollectionTokens[index].value)) {
          hasChinese = true;
          break;
        }
      }
      if (hasChinese) {
        let templateToken = {
          type: TokenName[TokenType.Template],
          value: "",
          range: [],
          loc: {
            start: {},
            end: {},
          },
        };
        const runTemplateCollectionTokensLen =
          this.runTemplateCollectionTokens.length;
        this.runTemplateCollectionTokens.forEach((item, index) => {
          const { value, range, loc } = item;
          templateToken.value += value;
          if (index == 0) {
            templateToken.range.push(range[0]);
            templateToken.loc.start = loc.start;
          }
          if (runTemplateCollectionTokensLen === index + 1) {
            templateToken.range.push(range[1]);
            templateToken.loc.end = loc.end;
          }
        });
        this.runTemplateCollectionTokens = [];
        return templateToken;
      }
      this.runTemplateCollectionTokens = [];
      return null;
    }
  };

  Parser.prototype.nextRegexToken = function () {
    this.collectComments();
    let token = this.scanner.scanRegExp();
    if (this.config.tokens) {
      // Pop the previous token, '/' or '/='
      // This is added from the lookahead token.
      this.tokens.pop();
      this.tokens.push(this.convertToken(token));
    }
    // Prime the next lookahead.
    this.lookahead = token;
    this.nextToken();
    return token;
  };
  Parser.prototype.createNode = function () {
    return {
      index: this.startMarker.index,
      line: this.startMarker.line,
      column: this.startMarker.column,
    };
  };
  Parser.prototype.startNode = function (token, lastLineStart) {
    if (lastLineStart === void 0) {
      lastLineStart = 0;
    }
    let column = token.start - token.lineStart;
    let line = token.lineNumber;
    if (column < 0) {
      column += lastLineStart;
      line--;
    }
    return {
      index: token.start,
      line: line,
      column: column,
    };
  };
  Parser.prototype.finalize = function (marker, node) {
    if (this.config.range) {
      node.range = [marker.index, this.lastMarker.index];
    }
    if (this.config.loc) {
      node.loc = {
        start: {
          line: marker.line,
          column: marker.column,
        },
        end: {
          line: this.lastMarker.line,
          column: this.lastMarker.column,
        },
      };
      if (this.config.source) {
        node.loc.source = this.config.source;
      }
    }
    if (this.delegate) {
      let metadata = {
        start: {
          line: marker.line,
          column: marker.column,
          offset: marker.index,
        },
        end: {
          line: this.lastMarker.line,
          column: this.lastMarker.column,
          offset: this.lastMarker.index,
        },
      };
      this.delegate(node, metadata);
    }
    return node;
  };
  // Expect the next token to match the specified punctuator.
  // If not, an exception will be thrown.
  Parser.prototype.expect = function (value) {
    let token = this.nextToken();
  };
  // Quietly expect a comma when in tolerant mode, otherwise delegates to expect().
  Parser.prototype.expectCommaSeparator = function () {
    if (this.config.tolerant) {
      let token = this.lookahead;
      if (token.type === 7 /* Punctuator */ && token.value === ",") {
        this.nextToken();
      } else if (token.type === 7 /* Punctuator */ && token.value === ";") {
        this.nextToken();
      } else {
      }
    } else {
      this.expect(",");
    }
  };
  // Expect the next token to match the specified keyword.
  // If not, an exception will be thrown.
  Parser.prototype.expectKeyword = function (keyword) {
    let token = this.nextToken();
  };
  // Return true if the next token matches the specified punctuator.
  Parser.prototype.match = function (value) {
    return (
      this.lookahead.type === 7 /* Punctuator */ &&
      this.lookahead.value === value
    );
  };
  // Return true if the next token matches the specified keyword
  Parser.prototype.matchKeyword = function (keyword) {
    return (
      this.lookahead.type === 4 /* Keyword */ &&
      this.lookahead.value === keyword
    );
  };
  // Return true if the next token matches the specified contextual keyword
  // (where an identifier is sometimes a keyword depending on the context)
  Parser.prototype.matchContextualKeyword = function (keyword) {
    return (
      this.lookahead.type === 3 /* Identifier */ &&
      this.lookahead.value === keyword
    );
  };
  // Return true if the next token is an assignment operator
  Parser.prototype.matchAssign = function () {
    if (this.lookahead.type !== 7 /* Punctuator */) {
      return false;
    }
    let op = this.lookahead.value;
    return (
      op === "=" ||
      op === "*=" ||
      op === "**=" ||
      op === "/=" ||
      op === "%=" ||
      op === "+=" ||
      op === "-=" ||
      op === "<<=" ||
      op === ">>=" ||
      op === ">>>=" ||
      op === "&=" ||
      op === "^=" ||
      op === "|="
    );
  };
  // Cover grammar support.
  //
  // When an assignment expression position starts with an left parenthesis, the determination of the type
  // of the syntax is to be deferred arbitrarily long until the end of the parentheses pair (plus a lookahead)
  // or the first comma. This situation also defers the determination of all the expressions nested in the pair.
  //
  // There are three productions that can be parsed in a parentheses pair that needs to be determined
  // after the outermost pair is closed. They are:
  //
  //   1. AssignmentExpression
  //   2. BindingElements
  //   3. AssignmentTargets
  //
  // In order to avoid exponential backtracking, we use two flags to denote if the production can be
  // binding element or assignment target.
  //
  // The three productions have the relationship:
  //
  //   BindingElements ⊆ AssignmentTargets ⊆ AssignmentExpression
  //
  // with a single exception that CoverInitializedName when used directly in an Expression, generates
  // an early error. Therefore, we need the third state, firstCoverInitializedNameError, to track the
  // first usage of CoverInitializedName and report it when we reached the end of the parentheses pair.
  //
  // isolateCoverGrammar function runs the given parser function with a new cover grammar context, and it does not
  // effect the current flags. This means the production the parser parses is only used as an expression. Therefore
  // the CoverInitializedName check is conducted.
  //
  // inheritCoverGrammar function runs the given parse function with a new cover grammar context, and it propagates
  // the flags outside of the parser. This means the production the parser parses is used as a part of a potential
  // pattern. The CoverInitializedName check is deferred.
  Parser.prototype.isolateCoverGrammar = function (parseFunction) {
    let previousIsBindingElement = this.context.isBindingElement;
    let previousIsAssignmentTarget = this.context.isAssignmentTarget;
    let previousFirstCoverInitializedNameError =
      this.context.firstCoverInitializedNameError;
    this.context.isBindingElement = true;
    this.context.isAssignmentTarget = true;
    this.context.firstCoverInitializedNameError = null;
    if (this.lookahead && this.lookahead.value === "=>") {
      this.nextToken();
    }
    let result = parseFunction.call(this);
    this.context.isBindingElement = previousIsBindingElement;
    this.context.isAssignmentTarget = previousIsAssignmentTarget;
    this.context.firstCoverInitializedNameError =
      previousFirstCoverInitializedNameError;
    return result;
  };
  Parser.prototype.inheritCoverGrammar = function (parseFunction) {
    let previousIsBindingElement = this.context.isBindingElement;
    let previousIsAssignmentTarget = this.context.isAssignmentTarget;
    let previousFirstCoverInitializedNameError =
      this.context.firstCoverInitializedNameError;
    this.context.isBindingElement = true;
    this.context.isAssignmentTarget = true;
    this.context.firstCoverInitializedNameError = null;
    let result = parseFunction.call(this);
    this.context.isBindingElement =
      this.context.isBindingElement && previousIsBindingElement;
    this.context.isAssignmentTarget =
      this.context.isAssignmentTarget && previousIsAssignmentTarget;
    this.context.firstCoverInitializedNameError =
      previousFirstCoverInitializedNameError ||
      this.context.firstCoverInitializedNameError;
    return result;
  };
  Parser.prototype.consumeSemicolon = function () {
    if (this.match(";")) {
      this.nextToken();
    } else if (!this.hasLineTerminator) {
      this.lastMarker.index = this.startMarker.index;
      this.lastMarker.line = this.startMarker.line;
      this.lastMarker.column = this.startMarker.column;
    }
  };
  // https://tc39.github.io/ecma262/#sec-primary-expression
  Parser.prototype.parsePrimaryExpression = function () {
    let node = this.createNode();
    let expr;
    let token, raw;
    switch (this.lookahead.type) {
      case 3 /* Identifier */:
        if (
          (this.context.isModule || this.context.isAsync) &&
          this.lookahead.value === "await"
        ) {
        }
        expr = this.matchAsyncFunction()
          ? this.parseFunctionExpression()
          : this.finalize(node, new Node.Identifier(this.nextToken().value));
        break;
      case 6 /* NumericLiteral */:
      case 8 /* StringLiteral */:
        if (this.context.strict && this.lookahead.octal) {
        }
        this.context.isAssignmentTarget = false;
        this.context.isBindingElement = false;
        token = this.nextToken();
        raw = this.getTokenRaw(token);
        expr = this.finalize(node, new Node.Literal(token.value, raw));
        break;
      case 1 /* BooleanLiteral */:
        this.context.isAssignmentTarget = false;
        this.context.isBindingElement = false;
        token = this.nextToken();
        raw = this.getTokenRaw(token);
        expr = this.finalize(
          node,
          new Node.Literal(token.value === "true", raw)
        );
        break;
      case 5 /* NullLiteral */:
        this.context.isAssignmentTarget = false;
        this.context.isBindingElement = false;
        token = this.nextToken();
        raw = this.getTokenRaw(token);
        expr = this.finalize(node, new Node.Literal(null, raw));
        break;
      case 10 /* Template */:
        expr = this.parseTemplateLiteral({ isTagged: false });
        break;
      case 7 /* Punctuator */:
        switch (this.lookahead.value) {
          case "(":
            this.context.isBindingElement = false;
            expr = this.inheritCoverGrammar(this.parseGroupExpression);
            break;
          case "[":
            expr = this.inheritCoverGrammar(this.parseArrayInitializer);
            break;
          case "{":
            expr = this.inheritCoverGrammar(this.parseObjectInitializer);
            break;
          case "/":
          case "/=":
            this.context.isAssignmentTarget = false;
            this.context.isBindingElement = false;
            this.scanner.index = this.startMarker.index;
            token = this.nextRegexToken();
            raw = this.getTokenRaw(token);
            expr = this.finalize(
              node,
              new Node.RegexLiteral(
                token.regex,
                raw,
                token.pattern,
                token.flags
              )
            );
            break;
          default:
        }
        break;
      case 4 /* Keyword */:
        if (
          !this.context.strict &&
          this.context.allowYield &&
          this.matchKeyword("yield")
        ) {
          expr = this.parseIdentifierName();
        } else if (!this.context.strict && this.matchKeyword("let")) {
          expr = this.finalize(
            node,
            new Node.Identifier(this.nextToken().value)
          );
        } else {
          this.context.isAssignmentTarget = false;
          this.context.isBindingElement = false;
          if (this.matchKeyword("function")) {
            expr = this.parseFunctionExpression();
          } else if (this.matchKeyword("this")) {
            this.nextToken();
            expr = this.finalize(node, new Node.ThisExpression());
          } else if (this.matchKeyword("class")) {
            expr = this.parseClassExpression();
          } else if (this.matchImportCall()) {
            expr = this.parseImportCall();
          } else if (this.matchImportMeta()) {
            if (!this.context.isModule) {
            }
            expr = this.parseImportMeta();
          } else {
          }
        }
        break;
      default:
    }
    return expr;
  };
  // https://tc39.github.io/ecma262/#sec-array-initializer
  Parser.prototype.parseSpreadElement = function () {
    let node = this.createNode();
    this.expect("...");
    let arg = this.inheritCoverGrammar(this.parseAssignmentExpression);
    return this.finalize(node, new Node.SpreadElement(arg));
  };
  Parser.prototype.parseArrayInitializer = function () {
    let node = this.createNode();
    let elements = [];
    this.expect("[");
    while (!this.match("]")) {
      if (this.match(",")) {
        this.nextToken();
        elements.push(null);
      } else if (this.match("...")) {
        let element = this.parseSpreadElement();
        if (!this.match("]")) {
          this.context.isAssignmentTarget = false;
          this.context.isBindingElement = false;
          this.expect(",");
        }
        elements.push(element);
      } else {
        elements.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
        if (!this.match("]")) {
          this.expect(",");
        }
      }
    }
    this.expect("]");
    return this.finalize(node, new Node.ArrayExpression(elements));
  };
  // https://tc39.github.io/ecma262/#sec-object-initializer
  Parser.prototype.parsePropertyMethod = function (params) {
    this.context.isAssignmentTarget = false;
    this.context.isBindingElement = false;
    let previousStrict = this.context.strict;
    let previousAllowStrictDirective = this.context.allowStrictDirective;
    this.context.allowStrictDirective = params.simple;
    let body = this.isolateCoverGrammar(this.parseFunctionSourceElements);
    this.context.strict = previousStrict;
    this.context.allowStrictDirective = previousAllowStrictDirective;
    return body;
  };
  Parser.prototype.parsePropertyMethodFunction = function (isGenerator) {
    let node = this.createNode();
    let previousAllowYield = this.context.allowYield;
    this.context.allowYield = true;
    let params = this.parseFormalParameters();
    let method = this.parsePropertyMethod(params);
    this.context.allowYield = previousAllowYield;
    return this.finalize(
      node,
      new Node.FunctionExpression(null, params.params, method, isGenerator)
    );
  };
  Parser.prototype.parsePropertyMethodAsyncFunction = function (isGenerator) {
    let node = this.createNode();
    let previousAllowYield = this.context.allowYield;
    let previousIsAsync = this.context.isAsync;
    this.context.allowYield = false;
    this.context.isAsync = true;
    let params = this.parseFormalParameters();
    let method = this.parsePropertyMethod(params);
    this.context.allowYield = previousAllowYield;
    this.context.isAsync = previousIsAsync;
    return this.finalize(
      node,
      new Node.AsyncFunctionExpression(null, params.params, method, isGenerator)
    );
  };
  Parser.prototype.parseObjectPropertyKey = function () {
    let node = this.createNode();
    let token = this.nextToken();
    let key;
    switch (token.type) {
      case 8 /* StringLiteral */:
      case 6 /* NumericLiteral */:
        if (this.context.strict && token.octal) {
        }
        let raw = this.getTokenRaw(token);
        key = this.finalize(node, new Node.Literal(token.value, raw));
        break;
      case 3 /* Identifier */:
      case 1 /* BooleanLiteral */:
      case 5 /* NullLiteral */:
      case 4 /* Keyword */:
        key = this.finalize(node, new Node.Identifier(token.value));
        break;
      case 7 /* Punctuator */:
        if (token.value === "[") {
          key = this.isolateCoverGrammar(this.parseAssignmentExpression);
          this.expect("]");
        } else {
        }
        break;
      default:
    }
    return key;
  };
  Parser.prototype.isPropertyKey = function (key, value) {
    return (
      (key.type === Syntax.Identifier && key.name === value) ||
      (key.type === Syntax.Literal && key.value === value)
    );
  };
  Parser.prototype.parseObjectProperty = function (hasProto) {
    let node = this.createNode();
    let token = this.lookahead;
    let kind;
    let key = null;
    let value = null;
    let computed = false;
    let method = false;
    let shorthand = false;
    let isAsync = false;
    let isGenerator = false;
    if (token.type === 3 /* Identifier */) {
      let id = token.value;
      this.nextToken();
      computed = this.match("[");
      isAsync =
        !this.hasLineTerminator &&
        id === "async" &&
        !this.match(":") &&
        !this.match("(") &&
        !this.match(",");
      isGenerator = this.match("*");
      if (isGenerator) {
        this.nextToken();
      }
      key = isAsync
        ? this.parseObjectPropertyKey()
        : this.finalize(node, new Node.Identifier(id));
    } else if (this.match("*")) {
      this.nextToken();
    } else {
      computed = this.match("[");
      key = this.parseObjectPropertyKey();
    }
    let lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
    if (
      token.type === 3 /* Identifier */ &&
      !isAsync &&
      token.value === "get" &&
      lookaheadPropertyKey
    ) {
      kind = "get";
      computed = this.match("[");
      key = this.parseObjectPropertyKey();
      this.context.allowYield = false;
      value = this.parseGetterMethod();
    } else if (
      token.type === 3 /* Identifier */ &&
      !isAsync &&
      token.value === "set" &&
      lookaheadPropertyKey
    ) {
      kind = "set";
      computed = this.match("[");
      key = this.parseObjectPropertyKey();
      value = this.parseSetterMethod();
    } else if (
      token.type === 7 /* Punctuator */ &&
      token.value === "*" &&
      lookaheadPropertyKey
    ) {
      kind = "init";
      computed = this.match("[");
      key = this.parseObjectPropertyKey();
      value = this.parseGeneratorMethod();
      method = true;
    } else {
      if (!key) {
      }
      kind = "init";
      if (this.match(":") && !isAsync) {
        if (!computed && this.isPropertyKey(key, "__proto__")) {
          if (hasProto.value) {
          }
          hasProto.value = true;
        }
        this.nextToken();
        value = this.inheritCoverGrammar(this.parseAssignmentExpression);
      } else if (this.match("(")) {
        if (this.match("=")) {
          this.nextToken();
        }
        value = isAsync
          ? this.parsePropertyMethodAsyncFunction(isGenerator)
          : this.parsePropertyMethodFunction(isGenerator);
        method = true;
      } else if (token.type === 3 /* Identifier */) {
        let id = this.finalize(node, new Node.Identifier(token.value));
        if (this.match("=")) {
          this.context.firstCoverInitializedNameError = this.lookahead;
          this.nextToken();
          shorthand = true;
          let init = this.isolateCoverGrammar(this.parseAssignmentExpression);
          value = this.finalize(node, new Node.AssignmentPattern(id, init));
        } else {
          shorthand = true;
          value = id;
        }
      } else {
      }
    }
    return this.finalize(
      node,
      new Node.Property(kind, key, computed, value, method, shorthand)
    );
  };
  Parser.prototype.parseObjectInitializer = function () {
    let node = this.createNode();
    this.expect("{");
    let properties = [];
    let hasProto = { value: false };
    while (!this.match("}")) {
      properties.push(
        this.match("...")
          ? this.parseSpreadElement()
          : this.parseObjectProperty(hasProto)
      );
      if (!this.match("}")) {
        this.expectCommaSeparator();
      }
    }
    this.expect("}");
    return this.finalize(node, new Node.ObjectExpression(properties));
  };
  // https://tc39.github.io/ecma262/#sec-template-literals
  Parser.prototype.parseTemplateHead = function (options) {
    let node = this.createNode();
    let token = this.nextToken();
    if (!token) {
      token = this.nextToken();
    }
    if (!options.isTagged && token.notEscapeSequenceHead !== null) {
      //this.throwTemplateLiteralEarlyErrors(token);
    }
    let raw = token.value;
    let cooked = token.cooked;
    return this.finalize(
      node,
      new Node.TemplateElement({ raw: raw, cooked: cooked }, token.tail)
    );
  };
  Parser.prototype.parseTemplateElement = function (options) {
    if (this.lookahead.type !== 10 /* Template */) {
    }
    let node = this.createNode();
    let token = this.nextToken();
    if (!options.isTagged && token.notEscapeSequenceHead !== null) {
      //this.throwTemplateLiteralEarlyErrors(token);
    }
    let raw = token.value;
    let cooked = token.cooked;
    return this.finalize(
      node,
      new Node.TemplateElement({ raw: raw, cooked: cooked }, token.tail)
    );
  };
  Parser.prototype.parseTemplateLiteral = function (options) {
    let node = this.createNode();
    let expressions = [];
    let quasis = [];
    let quasi = this.parseTemplateHead(options);
    quasis.push(quasi);
    while (!quasi.tail) {
      expressions.push(this.parseExpression());
      quasi = this.parseTemplateElement(options);
      quasis.push(quasi);
    }
    return this.finalize(node, new Node.TemplateLiteral(quasis, expressions));
  };
  // https://tc39.github.io/ecma262/#sec-grouping-operator
  Parser.prototype.reinterpretExpressionAsPattern = function (expr) {
    switch (expr.type) {
      case Syntax.Identifier:
      case Syntax.MemberExpression:
      case Syntax.RestElement:
      case Syntax.AssignmentPattern:
        break;
      case Syntax.SpreadElement:
        expr.type = Syntax.RestElement;
        this.reinterpretExpressionAsPattern(expr.argument);
        break;
      case Syntax.ArrayExpression:
        expr.type = Syntax.ArrayPattern;
        for (let i = 0; i < expr.elements.length; i++) {
          if (expr.elements[i] !== null) {
            this.reinterpretExpressionAsPattern(expr.elements[i]);
          }
        }
        break;
      case Syntax.ObjectExpression:
        expr.type = Syntax.ObjectPattern;
        for (let i = 0; i < expr.properties.length; i++) {
          let property = expr.properties[i];
          this.reinterpretExpressionAsPattern(
            property.type === Syntax.SpreadElement ? property : property.value
          );
        }
        break;
      case Syntax.AssignmentExpression:
        expr.type = Syntax.AssignmentPattern;
        delete expr.operator;
        this.reinterpretExpressionAsPattern(expr.left);
        break;
      default:
        // Allow other node type for tolerant parsing.
        break;
    }
  };
  Parser.prototype.parseGroupExpression = function () {
    let expr;
    this.expect("(");
    if (this.match(")")) {
      this.nextToken();
      if (!this.match("=>")) {
        this.expect("=>");
      }
      expr = {
        type: ArrowParameterPlaceHolder,
        params: [],
        async: false,
      };
    } else {
      let startToken = this.lookahead;
      let params = [];
      if (this.match("...")) {
        expr = this.parseRestElement(params);
        this.expect(")");
        if (!this.match("=>")) {
          this.expect("=>");
        }
        expr = {
          type: ArrowParameterPlaceHolder,
          params: [expr],
          async: false,
        };
      } else {
        let arrow = false;
        this.context.isBindingElement = true;
        expr = this.inheritCoverGrammar(this.parseAssignmentExpression);
        if (this.match(",")) {
          let expressions = [];
          this.context.isAssignmentTarget = false;
          expressions.push(expr);
          while (this.lookahead.type !== 2 /* EOF */) {
            if (!this.match(",")) {
              break;
            }
            this.nextToken();
            if (this.match(")")) {
              this.nextToken();
              for (let i = 0; i < expressions.length; i++) {
                this.reinterpretExpressionAsPattern(expressions[i]);
              }
              arrow = true;
              expr = {
                type: ArrowParameterPlaceHolder,
                params: expressions,
                async: false,
              };
            } else if (this.match("...")) {
              if (!this.context.isBindingElement) {
              }
              expressions.push(this.parseRestElement(params));
              this.expect(")");
              if (!this.match("=>")) {
                this.expect("=>");
              }
              this.context.isBindingElement = false;
              for (let i = 0; i < expressions.length; i++) {
                this.reinterpretExpressionAsPattern(expressions[i]);
              }
              arrow = true;
              expr = {
                type: ArrowParameterPlaceHolder,
                params: expressions,
                async: false,
              };
            } else {
              expressions.push(
                this.inheritCoverGrammar(this.parseAssignmentExpression)
              );
            }
            if (arrow) {
              break;
            }
          }
          if (!arrow) {
            expr = this.finalize(
              this.startNode(startToken),
              new Node.SequenceExpression(expressions)
            );
          }
        }
        if (!arrow) {
          this.expect(")");
          if (this.match("=>")) {
            if (expr.type === Syntax.Identifier && expr.name === "yield") {
              arrow = true;
              expr = {
                type: ArrowParameterPlaceHolder,
                params: [expr],
                async: false,
              };
            }
            if (!arrow) {
              if (!this.context.isBindingElement) {
              }
              if (expr.type === Syntax.SequenceExpression) {
                for (let i = 0; i < expr.expressions.length; i++) {
                  this.reinterpretExpressionAsPattern(expr.expressions[i]);
                }
              } else {
                this.reinterpretExpressionAsPattern(expr);
              }
              let parameters =
                expr.type === Syntax.SequenceExpression
                  ? expr.expressions
                  : [expr];
              expr = {
                type: ArrowParameterPlaceHolder,
                params: parameters,
                async: false,
              };
            }
          }
          this.context.isBindingElement = false;
        }
      }
    }
    return expr;
  };
  // https://tc39.github.io/ecma262/#sec-left-hand-side-expressions
  Parser.prototype.parseArguments = function () {
    this.expect("(");
    let args = [];
    if (!this.match(")")) {
      while (true) {
        let expr = this.match("...")
          ? this.parseSpreadElement()
          : this.isolateCoverGrammar(this.parseAssignmentExpression);
        args.push(expr);
        if (this.match(")")) {
          break;
        }
        this.expectCommaSeparator();
        if (this.match(")")) {
          break;
        }
      }
    }
    this.expect(")");
    return args;
  };
  Parser.prototype.isIdentifierName = function (token) {
    return (
      token.type === 3 /* Identifier */ ||
      token.type === 4 /* Keyword */ ||
      token.type === 1 /* BooleanLiteral */ ||
      token.type === 5 /* NullLiteral */
    );
  };
  Parser.prototype.parseIdentifierName = function () {
    let node = this.createNode();
    let token = this.nextToken();
    if (!this.isIdentifierName(token)) {
    }
    return this.finalize(node, new Node.Identifier(token.value));
  };
  Parser.prototype.parseNewExpression = function () {
    let node = this.createNode();
    let id = this.parseIdentifierName();
    let expr;
    if (this.match(".")) {
      this.nextToken();
      if (
        this.lookahead.type === 3 /* Identifier */ &&
        this.context.inFunctionBody &&
        this.lookahead.value === "target"
      ) {
        let property = this.parseIdentifierName();
        expr = new Node.MetaProperty(id, property);
      } else {
      }
    } else if (this.matchKeyword("import")) {
    } else {
      let callee = this.isolateCoverGrammar(this.parseLeftHandSideExpression);
      let args = this.match("(") ? this.parseArguments() : [];
      expr = new Node.NewExpression(callee, args);
      this.context.isAssignmentTarget = false;
      this.context.isBindingElement = false;
    }
    return this.finalize(node, expr);
  };
  Parser.prototype.parseAsyncArgument = function () {
    let arg = this.parseAssignmentExpression();
    this.context.firstCoverInitializedNameError = null;
    return arg;
  };
  Parser.prototype.parseAsyncArguments = function () {
    this.expect("(");
    let args = [];
    if (!this.match(")")) {
      while (true) {
        let expr = this.match("...")
          ? this.parseSpreadElement()
          : this.isolateCoverGrammar(this.parseAsyncArgument);
        args.push(expr);
        if (this.match(")")) {
          break;
        }
        this.expectCommaSeparator();
        if (this.match(")")) {
          break;
        }
      }
    }
    this.expect(")");
    return args;
  };
  Parser.prototype.matchImportCall = function () {
    let match = this.matchKeyword("import");
    if (match) {
      let state = this.scanner.saveState();
      this.scanner.scanComments();
      let next = this.scanner.lex();
      this.scanner.restoreState(state);
      match = next.type === 7 /* Punctuator */ && next.value === "(";
    }
    return match;
  };
  Parser.prototype.parseImportCall = function () {
    let node = this.createNode();
    this.expectKeyword("import");
    return this.finalize(node, new Node.Import());
  };
  Parser.prototype.matchImportMeta = function () {
    let match = this.matchKeyword("import");
    if (match) {
      let state = this.scanner.saveState();
      this.scanner.scanComments();
      let dot = this.scanner.lex();
      if (dot.type === 7 /* Punctuator */ && dot.value === ".") {
        this.scanner.scanComments();
        let meta = this.scanner.lex();
        match = meta.type === 3 /* Identifier */ && meta.value === "meta";
        if (match) {
          if (meta.end - meta.start !== "meta".length) {
          }
        }
      } else {
        match = false;
      }
      this.scanner.restoreState(state);
    }
    return match;
  };
  Parser.prototype.parseImportMeta = function () {
    let node = this.createNode();
    let id = this.parseIdentifierName(); // 'import', already ensured by matchImportMeta
    this.expect(".");
    let property = this.parseIdentifierName(); // 'meta', already ensured by matchImportMeta
    this.context.isAssignmentTarget = false;
    return this.finalize(node, new Node.MetaProperty(id, property));
  };
  Parser.prototype.parseLeftHandSideExpressionAllowCall = function () {
    let startToken = this.lookahead;
    let maybeAsync = this.matchContextualKeyword("async");
    let previousAllowIn = this.context.allowIn;
    this.context.allowIn = true;
    let expr;
    let isSuper = this.matchKeyword("super");
    if (isSuper && this.context.inFunctionBody) {
      expr = this.createNode();
      this.nextToken();
      expr = this.finalize(expr, new Node.Super());
      if (!this.match("(") && !this.match(".") && !this.match("[")) {
      }
    } else {
      expr = this.inheritCoverGrammar(
        this.matchKeyword("new")
          ? this.parseNewExpression
          : this.parsePrimaryExpression
      );
    }
    if (isSuper && this.match("(") && !this.context.inClassConstructor) {
    }
    let hasOptional = false;
    while (true) {
      let optional = false;
      if (this.match("?.")) {
        optional = true;
        hasOptional = true;
        this.expect("?.");
      }
      if (this.match("(")) {
        let asyncArrow =
          maybeAsync && startToken.lineNumber === this.lookahead.lineNumber;
        this.context.isBindingElement = false;
        this.context.isAssignmentTarget = false;
        let args = asyncArrow
          ? this.parseAsyncArguments()
          : this.parseArguments();
        if (expr.type === Syntax.Import && args.length !== 1) {
        }
        expr = this.finalize(
          this.startNode(startToken),
          new Node.CallExpression(expr, args, optional)
        );
        if (asyncArrow && this.match("=>")) {
          for (let i = 0; i < args.length; ++i) {
            this.reinterpretExpressionAsPattern(args[i]);
          }
          expr = {
            type: ArrowParameterPlaceHolder,
            params: args,
            async: true,
          };
        }
      } else if (this.match("[")) {
        this.context.isBindingElement = false;
        this.context.isAssignmentTarget = !optional;
        this.expect("[");
        let property = this.isolateCoverGrammar(this.parseExpression);
        this.expect("]");
        expr = this.finalize(
          this.startNode(startToken),
          new Node.ComputedMemberExpression(expr, property, optional)
        );
      } else if (
        this.lookahead.type === 10 /* Template */ &&
        this.lookahead.head
      ) {
        // Optional template literal is not included in the spec.
        // https://github.com/tc39/proposal-optional-chaining/issues/54
        if (optional) {
        }
        if (hasOptional) {
        }
        let quasi = this.parseTemplateLiteral({ isTagged: true });
        expr = this.finalize(
          this.startNode(startToken),
          new Node.TaggedTemplateExpression(expr, quasi)
        );
      } else if (this.match(".") || optional) {
        this.context.isBindingElement = false;
        this.context.isAssignmentTarget = !optional;
        if (!optional) {
          this.expect(".");
        }
        let property = this.parseIdentifierName();
        expr = this.finalize(
          this.startNode(startToken),
          new Node.StaticMemberExpression(expr, property, optional)
        );
      } else {
        break;
      }
    }
    this.context.allowIn = previousAllowIn;
    if (hasOptional) {
      return new Node.ChainExpression(expr);
    }
    return expr;
  };
  Parser.prototype.parseSuper = function () {
    let node = this.createNode();
    this.expectKeyword("super");
    if (!this.match("[") && !this.match(".")) {
    }
    return this.finalize(node, new Node.Super());
  };
  Parser.prototype.parseLeftHandSideExpression = function () {
    let node = this.startNode(this.lookahead);
    let expr =
      this.matchKeyword("super") && this.context.inFunctionBody
        ? this.parseSuper()
        : this.inheritCoverGrammar(
            this.matchKeyword("new")
              ? this.parseNewExpression
              : this.parsePrimaryExpression
          );
    let hasOptional = false;
    while (true) {
      let optional = false;
      if (this.match("?.")) {
        optional = true;
        hasOptional = true;
        this.expect("?.");
      }
      if (this.match("[")) {
        this.context.isBindingElement = false;
        this.context.isAssignmentTarget = !optional;
        this.expect("[");
        let property = this.isolateCoverGrammar(this.parseExpression);
        this.expect("]");
        expr = this.finalize(
          node,
          new Node.ComputedMemberExpression(expr, property, optional)
        );
      } else if (
        this.lookahead.type === 10 /* Template */ &&
        this.lookahead.head
      ) {
        // Optional template literal is not included in the spec.
        // https://github.com/tc39/proposal-optional-chaining/issues/54
        if (optional) {
        }
        if (hasOptional) {
        }
        let quasi = this.parseTemplateLiteral({ isTagged: true });
        expr = this.finalize(
          node,
          new Node.TaggedTemplateExpression(expr, quasi)
        );
      } else if (this.match(".") || optional) {
        this.context.isBindingElement = false;
        this.context.isAssignmentTarget = !optional;
        if (!optional) {
          this.expect(".");
        }
        let property = this.parseIdentifierName();
        expr = this.finalize(
          node,
          new Node.StaticMemberExpression(expr, property, optional)
        );
      } else {
        break;
      }
    }
    if (hasOptional) {
      return new Node.ChainExpression(expr);
    }
    return expr;
  };
  // https://tc39.github.io/ecma262/#sec-update-expressions
  Parser.prototype.parseUpdateExpression = function () {
    let expr;
    let startToken = this.lookahead;
    if (this.match("++") || this.match("--")) {
      let node = this.startNode(startToken);
      let token = this.nextToken();
      expr = this.inheritCoverGrammar(this.parseUnaryExpression);
      if (
        this.context.strict &&
        expr.type === Syntax.Identifier &&
        this.scanner.isRestrictedWord(expr.name)
      ) {
      }
      if (!this.context.isAssignmentTarget) {
      }
      let prefix = true;
      expr = this.finalize(
        node,
        new Node.UpdateExpression(token.value, expr, prefix)
      );
      this.context.isAssignmentTarget = false;
      this.context.isBindingElement = false;
    } else {
      expr = this.inheritCoverGrammar(
        this.parseLeftHandSideExpressionAllowCall
      );
      if (
        !this.hasLineTerminator &&
        this.lookahead.type === 7 /* Punctuator */
      ) {
        if (this.match("++") || this.match("--")) {
          if (
            this.context.strict &&
            expr.type === Syntax.Identifier &&
            this.scanner.isRestrictedWord(expr.name)
          ) {
          }
          if (!this.context.isAssignmentTarget) {
          }
          this.context.isAssignmentTarget = false;
          this.context.isBindingElement = false;
          let operator = this.nextToken().value;
          let prefix = false;
          expr = this.finalize(
            this.startNode(startToken),
            new Node.UpdateExpression(operator, expr, prefix)
          );
        }
      }
    }
    return expr;
  };
  // https://tc39.github.io/ecma262/#sec-unary-operators
  Parser.prototype.parseAwaitExpression = function () {
    let node = this.createNode();
    this.nextToken();
    let argument = this.parseUnaryExpression();
    return this.finalize(node, new Node.AwaitExpression(argument));
  };
  Parser.prototype.parseUnaryExpression = function () {
    let expr;
    if (
      this.match("+") ||
      this.match("-") ||
      this.match("~") ||
      this.match("!") ||
      this.matchKeyword("delete") ||
      this.matchKeyword("void") ||
      this.matchKeyword("typeof")
    ) {
      let node = this.startNode(this.lookahead);
      let token = this.nextToken();
      expr = this.inheritCoverGrammar(this.parseUnaryExpression);
      expr = this.finalize(node, new Node.UnaryExpression(token.value, expr));
      if (
        this.context.strict &&
        expr.operator === "delete" &&
        expr.argument.type === Syntax.Identifier
      ) {
      }
      this.context.isAssignmentTarget = false;
      this.context.isBindingElement = false;
    } else if (this.context.isAsync && this.matchContextualKeyword("await")) {
      expr = this.parseAwaitExpression();
    } else {
      expr = this.parseUpdateExpression();
    }
    return expr;
  };
  Parser.prototype.parseExponentiationExpression = function () {
    let startToken = this.lookahead;
    let expr = this.inheritCoverGrammar(this.parseUnaryExpression);
    if (!expr) {
      console.log(expr);
    }
    if (expr.type !== Syntax.UnaryExpression && this.match("**")) {
      this.nextToken();
      this.context.isAssignmentTarget = false;
      this.context.isBindingElement = false;
      let left = expr;
      let right = this.isolateCoverGrammar(this.parseExponentiationExpression);
      expr = this.finalize(
        this.startNode(startToken),
        new Node.BinaryExpression("**", left, right)
      );
    }
    return expr;
  };
  // https://tc39.github.io/ecma262/#sec-exp-operator
  // https://tc39.github.io/ecma262/#sec-multiplicative-operators
  // https://tc39.github.io/ecma262/#sec-additive-operators
  // https://tc39.github.io/ecma262/#sec-bitwise-shift-operators
  // https://tc39.github.io/ecma262/#sec-relational-operators
  // https://tc39.github.io/ecma262/#sec-equality-operators
  // https://tc39.github.io/ecma262/#sec-binary-bitwise-operators
  // https://tc39.github.io/ecma262/#sec-binary-logical-operators
  Parser.prototype.binaryPrecedence = function (token) {
    let op = token.value;
    let precedence;
    if (token.type === 7 /* Punctuator */) {
      precedence = this.operatorPrecedence[op] || 0;
    } else if (token.type === 4 /* Keyword */) {
      precedence =
        op === "instanceof" || (this.context.allowIn && op === "in") ? 12 : 0;
    } else {
      precedence = 0;
    }
    return precedence;
  };
  Parser.prototype.parseBinaryExpression = function () {
    let startToken = this.lookahead;
    let expr = this.inheritCoverGrammar(this.parseExponentiationExpression);
    let allowAndOr = true;
    let allowNullishCoalescing = true;
    let updateNullishCoalescingRestrictions = function (token) {
      if (token.value === "&&" || token.value === "||") {
        allowNullishCoalescing = false;
      }
      if (token.value === "??") {
        allowAndOr = false;
      }
    };
    let token = this.lookahead;
    let prec = this.binaryPrecedence(token);
    if (prec > 0) {
      updateNullishCoalescingRestrictions(token);
      this.nextToken();
      this.context.isAssignmentTarget = false;
      this.context.isBindingElement = false;
      let markers = [startToken, this.lookahead];
      let left = expr;
      let right = this.isolateCoverGrammar(this.parseExponentiationExpression);
      let stack = [left, token.value, right];
      let precedences = [prec];
      while (true) {
        prec = this.binaryPrecedence(this.lookahead);
        if (prec <= 0) {
          break;
        }
        if (
          (!allowAndOr &&
            (this.lookahead.value === "&&" || this.lookahead.value === "||")) ||
          (!allowNullishCoalescing && this.lookahead.value === "??")
        ) {
        }
        updateNullishCoalescingRestrictions(this.lookahead);
        // Reduce: make a binary expression from the three topmost entries.
        while (
          stack.length > 2 &&
          prec <= precedences[precedences.length - 1]
        ) {
          right = stack.pop();
          let operator = stack.pop();
          precedences.pop();
          left = stack.pop();
          markers.pop();
          let marker = markers[markers.length - 1];
          let node = this.startNode(marker, marker.lineStart);
          stack.push(
            this.finalize(
              node,
              new Node.BinaryExpression(operator, left, right)
            )
          );
        }
        // Shift.
        stack.push(this.nextToken().value);
        precedences.push(prec);
        markers.push(this.lookahead);
        stack.push(
          this.isolateCoverGrammar(this.parseExponentiationExpression)
        );
      }
      // Final reduce to clean-up the stack.
      let i = stack.length - 1;
      expr = stack[i];
      let lastMarker = markers.pop();
      while (i > 1) {
        let marker = markers.pop();
        let lastLineStart = lastMarker && lastMarker.lineStart;
        let node = this.startNode(marker, lastLineStart);
        let operator = stack[i - 1];
        expr = this.finalize(
          node,
          new Node.BinaryExpression(operator, stack[i - 2], expr)
        );
        i -= 2;
        lastMarker = marker;
      }
    }
    return expr;
  };
  // https://tc39.github.io/ecma262/#sec-conditional-operator
  Parser.prototype.parseConditionalExpression = function () {
    let startToken = this.lookahead;
    let expr = this.inheritCoverGrammar(this.parseBinaryExpression);
    if (this.match("?")) {
      this.nextToken();
      let previousAllowIn = this.context.allowIn;
      this.context.allowIn = true;
      let consequent = this.isolateCoverGrammar(this.parseAssignmentExpression);
      this.context.allowIn = previousAllowIn;
      this.expect(":");
      let alternate = this.isolateCoverGrammar(this.parseAssignmentExpression);
      expr = this.finalize(
        this.startNode(startToken),
        new Node.ConditionalExpression(expr, consequent, alternate)
      );
      this.context.isAssignmentTarget = false;
      this.context.isBindingElement = false;
    }
    return expr;
  };
  // https://tc39.github.io/ecma262/#sec-assignment-operators
  Parser.prototype.checkPatternParam = function (options, param) {
    switch (param.type) {
      case Syntax.Identifier:
        this.validateParam(options, param, param.name);
        break;
      case Syntax.RestElement:
        this.checkPatternParam(options, param.argument);
        break;
      case Syntax.AssignmentPattern:
        this.checkPatternParam(options, param.left);
        break;
      case Syntax.ArrayPattern:
        for (let i = 0; i < param.elements.length; i++) {
          if (param.elements[i] !== null) {
            this.checkPatternParam(options, param.elements[i]);
          }
        }
        break;
      case Syntax.ObjectPattern:
        for (let i = 0; i < param.properties.length; i++) {
          let property = param.properties[i];
          this.checkPatternParam(
            options,
            property.type === Syntax.RestElement ? property : property.value
          );
        }
        break;
      default:
        break;
    }
    options.simple = options.simple && param instanceof Node.Identifier;
  };
  Parser.prototype.reinterpretAsCoverFormalsList = function (expr) {
    let params = [expr];
    let options = {
      simple: true,
      paramSet: {},
    };
    let asyncArrow = false;
    switch (expr.type) {
      case Syntax.Identifier:
        break;
      case ArrowParameterPlaceHolder:
        params = expr.params;
        asyncArrow = expr.async;
        break;
      default:
        return null;
    }
    for (let i = 0; i < params.length; ++i) {
      let param = params[i];
      if (param.type === Syntax.AssignmentPattern) {
        if (param.right.type === Syntax.YieldExpression) {
          if (param.right.argument) {
          }
          param.right.type = Syntax.Identifier;
          param.right.name = "yield";
          delete param.right.argument;
          delete param.right.delegate;
        }
      } else if (
        asyncArrow &&
        param.type === Syntax.Identifier &&
        param.name === "await"
      ) {
      }
      this.checkPatternParam(options, param);
      params[i] = param;
    }
    if (this.context.strict || !this.context.allowYield) {
      for (let i = 0; i < params.length; ++i) {
        let param = params[i];
        if (param.type === Syntax.YieldExpression) {
        }
      }
    }
    if (options.hasDuplicateParameterNames) {
      let token = this.context.strict
        ? options.stricted
        : options.firstRestricted;
    }
    return {
      simple: options.simple,
      params: params,
      stricted: options.stricted,
      firstRestricted: options.firstRestricted,
      message: options.message,
    };
  };
  Parser.prototype.parseAssignmentExpression = function () {
    let expr;
    if (!this.context.allowYield && this.matchKeyword("yield")) {
      expr = this.parseYieldExpression();
    } else {
      let startToken = this.lookahead;
      let token = startToken;
      expr = this.parseConditionalExpression();
      if (
        token.type === 3 /* Identifier */ &&
        token.lineNumber === this.lookahead.lineNumber &&
        token.value === "async"
      ) {
        if (
          this.lookahead.type === 3 /* Identifier */ ||
          this.matchKeyword("yield")
        ) {
          let arg = this.parsePrimaryExpression();
          this.reinterpretExpressionAsPattern(arg);
          expr = {
            type: ArrowParameterPlaceHolder,
            params: [arg],
            async: true,
          };
        }
      }
      if (expr.type === ArrowParameterPlaceHolder || this.match("=>")) {
        // https://tc39.github.io/ecma262/#sec-arrow-function-definitions
        this.context.isAssignmentTarget = false;
        this.context.isBindingElement = false;
        let isAsync = expr.async;
        let list = this.reinterpretAsCoverFormalsList(expr);
        if (list) {
          this.context.firstCoverInitializedNameError = null;
          let previousStrict = this.context.strict;
          let previousAllowStrictDirective = this.context.allowStrictDirective;
          this.context.allowStrictDirective = list.simple;
          let previousAllowYield = this.context.allowYield;
          let previousIsAsync = this.context.isAsync;
          this.context.allowYield = true;
          this.context.isAsync = isAsync;
          let node = this.startNode(startToken);
          this.expect("=>");
          let body = void 0;
          if (this.match("{")) {
            let previousAllowIn = this.context.allowIn;
            this.context.allowIn = true;
            body = this.parseFunctionSourceElements();
            this.context.allowIn = previousAllowIn;
          } else {
            body = this.isolateCoverGrammar(this.parseAssignmentExpression);
          }
          let expression = body.type !== Syntax.BlockStatement;
          expr = isAsync
            ? this.finalize(
                node,
                new Node.AsyncArrowFunctionExpression(
                  list.params,
                  body,
                  expression
                )
              )
            : this.finalize(
                node,
                new Node.ArrowFunctionExpression(list.params, body, expression)
              );
          this.context.strict = previousStrict;
          this.context.allowStrictDirective = previousAllowStrictDirective;
          this.context.allowYield = previousAllowYield;
          this.context.isAsync = previousIsAsync;
        }
      } else {
        if (this.matchAssign()) {
          if (!this.context.isAssignmentTarget) {
          }
          if (this.context.strict && expr.type === Syntax.Identifier) {
            let id = expr;
            if (this.scanner.isRestrictedWord(id.name)) {
            }
            if (this.scanner.isStrictModeReservedWord(id.name)) {
            }
          }
          if (!this.match("=")) {
            this.context.isAssignmentTarget = false;
            this.context.isBindingElement = false;
          } else {
            this.reinterpretExpressionAsPattern(expr);
          }
          token = this.nextToken();
          let operator = token.value;
          let right = this.isolateCoverGrammar(this.parseAssignmentExpression);
          expr = this.finalize(
            this.startNode(startToken),
            new Node.AssignmentExpression(operator, expr, right)
          );
          this.context.firstCoverInitializedNameError = null;
        }
      }
    }
    return expr;
  };
  // https://tc39.github.io/ecma262/#sec-comma-operator
  Parser.prototype.parseExpression = function () {
    let startToken = this.lookahead;
    let expr = this.isolateCoverGrammar(this.parseAssignmentExpression);
    if (this.match(",")) {
      let expressions = [];
      expressions.push(expr);
      while (this.lookahead.type !== 2 /* EOF */) {
        if (!this.match(",")) {
          break;
        }
        this.nextToken();
        expressions.push(
          this.isolateCoverGrammar(this.parseAssignmentExpression)
        );
      }
      expr = this.finalize(
        this.startNode(startToken),
        new Node.SequenceExpression(expressions)
      );
    }
    return expr;
  };
  // https://tc39.github.io/ecma262/#sec-block
  Parser.prototype.parseStatementListItem = function () {
    let statement;
    this.context.isAssignmentTarget = true;
    this.context.isBindingElement = true;
    if (this.lookahead.type === 4 /* Keyword */) {
      switch (this.lookahead.value) {
        case "export":
          if (!this.context.isModule) {
          }
          statement = this.parseExportDeclaration();
          break;
        case "import":
          if (this.matchImportCall()) {
            statement = this.parseExpressionStatement();
          } else if (this.matchImportMeta()) {
            statement = this.parseStatement();
          } else {
            if (!this.context.isModule) {
            }
            statement = this.parseImportDeclaration();
          }
          break;
        case "const":
          statement = this.parseLexicalDeclaration({ inFor: false });
          break;
        case "function":
          statement = this.parseFunctionDeclaration();
          break;
        case "class":
          statement = this.parseClassDeclaration();
          break;
        case "let":
          statement = this.isLexicalDeclaration()
            ? this.parseLexicalDeclaration({ inFor: false })
            : this.parseStatement();
          break;
        default:
          statement = this.parseStatement();
          break;
      }
    } else {
      statement = this.parseStatement();
    }
    return statement;
  };
  Parser.prototype.parseBlock = function () {
    let node = this.createNode();
    this.expect("{");
    let block = [];
    while (true) {
      if (this.match("}")) {
        break;
      }
      block.push(this.parseStatementListItem());
    }
    this.expect("}");
    return this.finalize(node, new Node.BlockStatement(block));
  };
  // https://tc39.github.io/ecma262/#sec-let-and-const-declarations
  Parser.prototype.parseLexicalBinding = function (kind, options) {
    let node = this.createNode();
    let params = [];
    let id = this.parsePattern(params, kind);
    if (this.context.strict && id.type === Syntax.Identifier) {
      if (this.scanner.isRestrictedWord(id.name)) {
      }
    }
    let init = null;
    if (kind === "const") {
      if (!this.matchKeyword("in") && !this.matchContextualKeyword("of")) {
        if (this.match("=")) {
          this.nextToken();
          init = this.isolateCoverGrammar(this.parseAssignmentExpression);
        } else {
        }
      }
    } else if (
      (!options.inFor && id.type !== Syntax.Identifier) ||
      this.match("=")
    ) {
      this.expect("=");
      init = this.isolateCoverGrammar(this.parseAssignmentExpression);
    }
    return this.finalize(node, new Node.VariableDeclarator(id, init));
  };
  Parser.prototype.parseBindingList = function (kind, options) {
    let list = [this.parseLexicalBinding(kind, options)];
    while (this.match(",")) {
      this.nextToken();
      list.push(this.parseLexicalBinding(kind, options));
    }
    return list;
  };
  Parser.prototype.isLexicalDeclaration = function () {
    let state = this.scanner.saveState();
    this.scanner.scanComments();
    let next = this.scanner.lex();
    this.scanner.restoreState(state);
    return (
      next.type === 3 /* Identifier */ ||
      (next.type === 7 /* Punctuator */ && next.value === "[") ||
      (next.type === 7 /* Punctuator */ && next.value === "{") ||
      (next.type === 4 /* Keyword */ && next.value === "let") ||
      (next.type === 4 /* Keyword */ && next.value === "yield")
    );
  };
  Parser.prototype.parseLexicalDeclaration = function (options) {
    let node = this.createNode();
    let kind = this.nextToken().value;
    let declarations = this.parseBindingList(kind, options);
    this.consumeSemicolon();
    return this.finalize(
      node,
      new Node.VariableDeclaration(declarations, kind)
    );
  };
  // https://tc39.github.io/ecma262/#sec-destructuring-binding-patterns
  Parser.prototype.parseBindingRestElement = function (params, kind) {
    let node = this.createNode();
    this.expect("...");
    let arg = this.parsePattern(params, kind);
    return this.finalize(node, new Node.RestElement(arg));
  };
  Parser.prototype.parseArrayPattern = function (params, kind) {
    let node = this.createNode();
    this.expect("[");
    let elements = [];
    while (!this.match("]")) {
      if (this.match(",")) {
        this.nextToken();
        elements.push(null);
      } else {
        if (this.match("...")) {
          elements.push(this.parseBindingRestElement(params, kind));
          break;
        } else {
          elements.push(this.parsePatternWithDefault(params, kind));
        }
        if (!this.match("]")) {
          this.expect(",");
        }
      }
    }
    this.expect("]");
    return this.finalize(node, new Node.ArrayPattern(elements));
  };
  Parser.prototype.parsePropertyPattern = function (params, kind) {
    let node = this.createNode();
    let computed = false;
    let shorthand = false;
    let method = false;
    let key;
    let value;
    if (this.lookahead.type === 3 /* Identifier */) {
      let keyToken = this.lookahead;
      key = this.parseVariableIdentifier();
      let init = this.finalize(node, new Node.Identifier(keyToken.value));
      if (this.match("=")) {
        params.push(keyToken);
        shorthand = true;
        this.nextToken();
        let expr = this.parseAssignmentExpression();
        value = this.finalize(
          this.startNode(keyToken),
          new Node.AssignmentPattern(init, expr)
        );
      } else if (!this.match(":")) {
        params.push(keyToken);
        shorthand = true;
        value = init;
      } else {
        this.expect(":");
        value = this.parsePatternWithDefault(params, kind);
      }
    } else {
      computed = this.match("[");
      key = this.parseObjectPropertyKey();
      this.expect(":");
      value = this.parsePatternWithDefault(params, kind);
    }
    return this.finalize(
      node,
      new Node.Property("init", key, computed, value, method, shorthand)
    );
  };
  Parser.prototype.parseRestProperty = function (params) {
    let node = this.createNode();
    this.expect("...");
    let arg = this.parsePattern(params);
    if (this.match("=")) {
    }
    if (!this.match("}")) {
    }
    return this.finalize(node, new Node.RestElement(arg));
  };
  Parser.prototype.parseObjectPattern = function (params, kind) {
    let node = this.createNode();
    let properties = [];
    this.expect("{");
    while (!this.match("}")) {
      properties.push(
        this.match("...")
          ? this.parseRestProperty(params)
          : this.parsePropertyPattern(params, kind)
      );
      if (!this.match("}")) {
        this.expect(",");
      }
    }
    this.expect("}");
    return this.finalize(node, new Node.ObjectPattern(properties));
  };
  Parser.prototype.parsePattern = function (params, kind) {
    let pattern;
    if (this.match("[")) {
      pattern = this.parseArrayPattern(params, kind);
    } else if (this.match("{")) {
      pattern = this.parseObjectPattern(params, kind);
    } else {
      if (this.matchKeyword("let") && (kind === "const" || kind === "let")) {
      }
      params.push(this.lookahead);
      pattern = this.parseVariableIdentifier(kind);
    }
    return pattern;
  };
  Parser.prototype.parsePatternWithDefault = function (params, kind) {
    let startToken = this.lookahead;
    let pattern = this.parsePattern(params, kind);
    if (this.match("=")) {
      this.nextToken();
      let previousAllowYield = this.context.allowYield;
      this.context.allowYield = true;
      let right = this.isolateCoverGrammar(this.parseAssignmentExpression);
      this.context.allowYield = previousAllowYield;
      pattern = this.finalize(
        this.startNode(startToken),
        new Node.AssignmentPattern(pattern, right)
      );
    }
    return pattern;
  };
  // https://tc39.github.io/ecma262/#sec-variable-statement
  Parser.prototype.parseVariableIdentifier = function (kind) {
    let node = this.createNode();
    let token = this.nextToken();
    if (token.type === 4 /* Keyword */ && token.value === "yield") {
      if (this.context.strict) {
      } else if (!this.context.allowYield) {
      }
    } else if (token.type !== 3 /* Identifier */) {
      if (
        this.context.strict &&
        token.type === 4 /* Keyword */ &&
        this.scanner.isStrictModeReservedWord(token.value)
      ) {
      } else {
        if (this.context.strict || token.value !== "let" || kind !== "var") {
        }
      }
    }
    return this.finalize(node, new Node.Identifier(token.value));
  };
  Parser.prototype.parseVariableDeclaration = function (options) {
    let node = this.createNode();
    let params = [];
    let id = this.parsePattern(params, "var");
    if (this.context.strict && id.type === Syntax.Identifier) {
      if (this.scanner.isRestrictedWord(id.name)) {
      }
    }
    let init = null;
    if (this.match("=")) {
      this.nextToken();
      init = this.isolateCoverGrammar(this.parseAssignmentExpression);
    } else if (id.type !== Syntax.Identifier && !options.inFor) {
      this.expect("=");
    }
    return this.finalize(node, new Node.VariableDeclarator(id, init));
  };
  Parser.prototype.parseVariableDeclarationList = function (options) {
    let opt = { inFor: options.inFor };
    let list = [];
    list.push(this.parseVariableDeclaration(opt));
    while (this.match(",")) {
      this.nextToken();
      list.push(this.parseVariableDeclaration(opt));
    }
    return list;
  };
  Parser.prototype.parseVariableStatement = function () {
    let node = this.createNode();
    this.expectKeyword("var");
    let declarations = this.parseVariableDeclarationList({ inFor: false });
    this.consumeSemicolon();
    return this.finalize(
      node,
      new Node.VariableDeclaration(declarations, "var")
    );
  };
  // https://tc39.github.io/ecma262/#sec-empty-statement
  Parser.prototype.parseEmptyStatement = function () {
    let node = this.createNode();
    this.expect(";");
    return this.finalize(node, new Node.EmptyStatement());
  };
  // https://tc39.github.io/ecma262/#sec-expression-statement
  Parser.prototype.parseExpressionStatement = function () {
    let node = this.createNode();
    let expr = this.parseExpression();
    this.consumeSemicolon();
    return this.finalize(node, new Node.ExpressionStatement(expr));
  };
  // https://tc39.github.io/ecma262/#sec-if-statement
  Parser.prototype.parseIfClause = function () {
    if (this.context.strict && this.matchKeyword("function")) {
    }
    return this.parseStatement();
  };
  Parser.prototype.parseIfStatement = function () {
    let node = this.createNode();
    let consequent;
    let alternate = null;
    this.expectKeyword("if");
    this.expect("(");
    let test = this.parseExpression();
    if (!this.match(")") && this.config.tolerant) {
      consequent = this.finalize(this.createNode(), new Node.EmptyStatement());
    } else {
      this.expect(")");
      consequent = this.parseIfClause();
      if (this.matchKeyword("else")) {
        this.nextToken();
        alternate = this.parseIfClause();
      }
    }
    return this.finalize(
      node,
      new Node.IfStatement(test, consequent, alternate)
    );
  };
  // https://tc39.github.io/ecma262/#sec-do-while-statement
  Parser.prototype.parseDoWhileStatement = function () {
    let node = this.createNode();
    this.expectKeyword("do");
    let previousInIteration = this.context.inIteration;
    this.context.inIteration = true;
    let body = this.parseStatement();
    this.context.inIteration = previousInIteration;
    this.expectKeyword("while");
    this.expect("(");
    let test = this.parseExpression();
    if (!this.match(")") && this.config.tolerant) {
    } else {
      this.expect(")");
      if (this.match(";")) {
        this.nextToken();
      }
    }
    return this.finalize(node, new Node.DoWhileStatement(body, test));
  };
  // https://tc39.github.io/ecma262/#sec-while-statement
  Parser.prototype.parseWhileStatement = function () {
    let node = this.createNode();
    let body;
    this.expectKeyword("while");
    this.expect("(");
    let test = this.parseExpression();
    if (!this.match(")") && this.config.tolerant) {
      body = this.finalize(this.createNode(), new Node.EmptyStatement());
    } else {
      this.expect(")");
      let previousInIteration = this.context.inIteration;
      this.context.inIteration = true;
      body = this.parseStatement();
      this.context.inIteration = previousInIteration;
    }
    return this.finalize(node, new Node.WhileStatement(test, body));
  };
  // https://tc39.github.io/ecma262/#sec-for-statement
  // https://tc39.github.io/ecma262/#sec-for-in-and-for-of-statements
  Parser.prototype.parseForStatement = function () {
    let init = null;
    let test = null;
    let update = null;
    let forIn = true;
    let left, right;
    let _await = false;
    let node = this.createNode();
    this.expectKeyword("for");
    if (this.matchContextualKeyword("await")) {
      if (!this.context.isAsync) {
      }
      _await = true;
      this.nextToken();
    }
    this.expect("(");
    if (this.match(";")) {
      this.nextToken();
    } else {
      if (this.matchKeyword("var")) {
        init = this.createNode();
        this.nextToken();
        let previousAllowIn = this.context.allowIn;
        this.context.allowIn = false;
        let declarations = this.parseVariableDeclarationList({ inFor: true });
        this.context.allowIn = previousAllowIn;
        if (!_await && declarations.length === 1 && this.matchKeyword("in")) {
          let decl = declarations[0];
          if (
            decl.init &&
            (decl.id.type === Syntax.ArrayPattern ||
              decl.id.type === Syntax.ObjectPattern ||
              this.context.strict)
          ) {
          }
          init = this.finalize(
            init,
            new Node.VariableDeclaration(declarations, "var")
          );
          this.nextToken();
          left = init;
          right = this.parseExpression();
          init = null;
        } else if (
          declarations.length === 1 &&
          declarations[0].init === null &&
          this.matchContextualKeyword("of")
        ) {
          init = this.finalize(
            init,
            new Node.VariableDeclaration(declarations, "var")
          );
          this.nextToken();
          left = init;
          right = this.parseAssignmentExpression();
          init = null;
          forIn = false;
        } else {
          init = this.finalize(
            init,
            new Node.VariableDeclaration(declarations, "var")
          );
          this.expect(";");
        }
      } else if (this.matchKeyword("const") || this.matchKeyword("let")) {
        init = this.createNode();
        let kind = this.nextToken().value;
        if (!this.context.strict && this.lookahead.value === "in") {
          init = this.finalize(init, new Node.Identifier(kind));
          this.nextToken();
          left = init;
          right = this.parseExpression();
          init = null;
        } else {
          let previousAllowIn = this.context.allowIn;
          this.context.allowIn = false;
          let declarations = this.parseBindingList(kind, { inFor: true });
          this.context.allowIn = previousAllowIn;
          if (
            declarations.length === 1 &&
            declarations[0].init === null &&
            this.matchKeyword("in")
          ) {
            init = this.finalize(
              init,
              new Node.VariableDeclaration(declarations, kind)
            );
            this.nextToken();
            left = init;
            right = this.parseExpression();
            init = null;
          } else if (
            declarations.length === 1 &&
            declarations[0].init === null &&
            this.matchContextualKeyword("of")
          ) {
            init = this.finalize(
              init,
              new Node.VariableDeclaration(declarations, kind)
            );
            this.nextToken();
            left = init;
            right = this.parseAssignmentExpression();
            init = null;
            forIn = false;
          } else {
            this.consumeSemicolon();
            init = this.finalize(
              init,
              new Node.VariableDeclaration(declarations, kind)
            );
          }
        }
      } else {
        let initStartToken = this.lookahead;
        let previousIsBindingElement = this.context.isBindingElement;
        let previousIsAssignmentTarget = this.context.isAssignmentTarget;
        let previousFirstCoverInitializedNameError =
          this.context.firstCoverInitializedNameError;
        let previousAllowIn = this.context.allowIn;
        this.context.allowIn = false;
        init = this.inheritCoverGrammar(this.parseAssignmentExpression);
        this.context.allowIn = previousAllowIn;
        if (this.matchKeyword("in")) {
          if (
            !this.context.isAssignmentTarget ||
            init.type === Syntax.AssignmentExpression
          ) {
          }
          this.nextToken();
          this.reinterpretExpressionAsPattern(init);
          left = init;
          right = this.parseExpression();
          init = null;
        } else if (this.matchContextualKeyword("of")) {
          if (
            !this.context.isAssignmentTarget ||
            init.type === Syntax.AssignmentExpression
          ) {
          }
          this.nextToken();
          this.reinterpretExpressionAsPattern(init);
          left = init;
          right = this.parseAssignmentExpression();
          init = null;
          forIn = false;
        } else {
          // The `init` node was not parsed isolated, but we would have wanted it to.
          this.context.isBindingElement = previousIsBindingElement;
          this.context.isAssignmentTarget = previousIsAssignmentTarget;
          this.context.firstCoverInitializedNameError =
            previousFirstCoverInitializedNameError;
          if (this.match(",")) {
            let initSeq = [init];
            while (this.match(",")) {
              this.nextToken();
              initSeq.push(
                this.isolateCoverGrammar(this.parseAssignmentExpression)
              );
            }
            init = this.finalize(
              this.startNode(initStartToken),
              new Node.SequenceExpression(initSeq)
            );
          }
          this.expect(";");
        }
      }
    }
    if (typeof left === "undefined") {
      if (!this.match(";")) {
        test = this.isolateCoverGrammar(this.parseExpression);
      }
      this.expect(";");
      if (!this.match(")")) {
        update = this.isolateCoverGrammar(this.parseExpression);
      }
    }
    let body;
    if (!this.match(")") && this.config.tolerant) {
      body = this.finalize(this.createNode(), new Node.EmptyStatement());
    } else {
      this.expect(")");
      let previousInIteration = this.context.inIteration;
      this.context.inIteration = true;
      body = this.isolateCoverGrammar(this.parseStatement);
      this.context.inIteration = previousInIteration;
    }
    return typeof left === "undefined"
      ? this.finalize(node, new Node.ForStatement(init, test, update, body))
      : forIn
      ? this.finalize(node, new Node.ForInStatement(left, right, body))
      : this.finalize(node, new Node.ForOfStatement(left, right, body, _await));
  };
  // https://tc39.github.io/ecma262/#sec-continue-statement
  Parser.prototype.parseContinueStatement = function () {
    let node = this.createNode();
    this.expectKeyword("continue");
    let label = null;
    if (this.lookahead.type === 3 /* Identifier */ && !this.hasLineTerminator) {
      let id = this.parseVariableIdentifier();
      label = id;
      let key = "$" + id.name;
      if (!Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) {
      }
    }
    this.consumeSemicolon();
    if (label === null && !this.context.inIteration) {
    }
    return this.finalize(node, new Node.ContinueStatement(label));
  };
  // https://tc39.github.io/ecma262/#sec-break-statement
  Parser.prototype.parseBreakStatement = function () {
    let node = this.createNode();
    this.expectKeyword("break");
    let label = null;
    if (this.lookahead.type === 3 /* Identifier */ && !this.hasLineTerminator) {
      let id = this.parseVariableIdentifier();
      let key = "$" + id.name;
      if (!Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) {
      }
      label = id;
    }
    this.consumeSemicolon();
    if (label === null && !this.context.inIteration && !this.context.inSwitch) {
    }
    return this.finalize(node, new Node.BreakStatement(label));
  };
  // https://tc39.github.io/ecma262/#sec-return-statement
  Parser.prototype.parseReturnStatement = function () {
    if (!this.context.inFunctionBody) {
    }
    let node = this.createNode();
    this.expectKeyword("return");
    let hasArgument =
      (!this.match(";") &&
        !this.match("}") &&
        !this.hasLineTerminator &&
        this.lookahead.type !== 2) /* EOF */ ||
      this.lookahead.type === 8 /* StringLiteral */ ||
      this.lookahead.type === 10; /* Template */
    let argument = hasArgument ? this.parseExpression() : null;
    this.consumeSemicolon();
    return this.finalize(node, new Node.ReturnStatement(argument));
  };
  // https://tc39.github.io/ecma262/#sec-with-statement
  Parser.prototype.parseWithStatement = function () {
    if (this.context.strict) {
    }
    let node = this.createNode();
    let body;
    this.expectKeyword("with");
    this.expect("(");
    let object = this.parseExpression();
    if (!this.match(")") && this.config.tolerant) {
      body = this.finalize(this.createNode(), new Node.EmptyStatement());
    } else {
      this.expect(")");
      body = this.parseStatement();
    }
    return this.finalize(node, new Node.WithStatement(object, body));
  };
  // https://tc39.github.io/ecma262/#sec-switch-statement
  Parser.prototype.parseSwitchCase = function () {
    let node = this.createNode();
    let test;
    if (this.matchKeyword("default")) {
      this.nextToken();
      test = null;
    } else {
      this.expectKeyword("case");
      test = this.parseExpression();
    }
    this.expect(":");
    let consequent = [];
    while (true) {
      if (
        this.match("}") ||
        this.matchKeyword("default") ||
        this.matchKeyword("case")
      ) {
        break;
      }
      consequent.push(this.parseStatementListItem());
    }
    return this.finalize(node, new Node.SwitchCase(test, consequent));
  };
  Parser.prototype.parseSwitchStatement = function () {
    let node = this.createNode();
    this.expectKeyword("switch");
    this.expect("(");
    let discriminant = this.parseExpression();
    this.expect(")");
    let previousInSwitch = this.context.inSwitch;
    this.context.inSwitch = true;
    let cases = [];
    let defaultFound = false;
    this.expect("{");
    while (true) {
      if (this.match("}")) {
        break;
      }
      let clause = this.parseSwitchCase();
      if (clause.test === null) {
        if (defaultFound) {
        }
        defaultFound = true;
      }
      cases.push(clause);
    }
    this.expect("}");
    this.context.inSwitch = previousInSwitch;
    return this.finalize(node, new Node.SwitchStatement(discriminant, cases));
  };
  // https://tc39.github.io/ecma262/#sec-labelled-statements
  Parser.prototype.parseLabelledStatement = function () {
    let node = this.createNode();
    let expr = this.parseExpression();
    let statement;
    if (expr.type === Syntax.Identifier && this.match(":")) {
      this.nextToken();
      let id = expr;
      let key = "$" + id.name;
      if (Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) {
      }
      this.context.labelSet[key] = true;
      let body = void 0;
      if (this.matchKeyword("class")) {
        body = this.parseClassDeclaration();
      } else if (this.matchKeyword("function")) {
        let token = this.lookahead;
        let declaration = this.parseFunctionDeclaration();
        if (this.context.strict) {
        } else if (declaration.generator) {
        }
        body = declaration;
      } else {
        body = this.parseStatement();
      }
      delete this.context.labelSet[key];
      statement = new Node.LabeledStatement(id, body);
    } else {
      this.consumeSemicolon();
      statement = new Node.ExpressionStatement(expr);
    }
    return this.finalize(node, statement);
  };
  // https://tc39.github.io/ecma262/#sec-throw-statement
  Parser.prototype.parseThrowStatement = function () {
    let node = this.createNode();
    this.expectKeyword("throw");
    if (this.hasLineTerminator) {
    }
    let argument = this.parseExpression();
    this.consumeSemicolon();
    return this.finalize(node, new Node.ThrowStatement(argument));
  };
  // https://tc39.github.io/ecma262/#sec-try-statement
  Parser.prototype.parseCatchClause = function () {
    let node = this.createNode();
    this.expectKeyword("catch");
    let param = null;
    if (this.match("(")) {
      this.expect("(");
      if (this.match(")")) {
      }
      let params = [];
      param = this.parsePattern(params);
      let paramMap = {};
      for (let i = 0; i < params.length; i++) {
        let key = "$" + params[i].value;
        if (Object.prototype.hasOwnProperty.call(paramMap, key)) {
        }
        paramMap[key] = true;
      }
      if (this.context.strict && param.type === Syntax.Identifier) {
        if (this.scanner.isRestrictedWord(param.name)) {
        }
      }
      this.expect(")");
    }
    let body = this.parseBlock();
    return this.finalize(node, new Node.CatchClause(param, body));
  };
  Parser.prototype.parseFinallyClause = function () {
    this.expectKeyword("finally");
    return this.parseBlock();
  };
  Parser.prototype.parseTryStatement = function () {
    let node = this.createNode();
    this.expectKeyword("try");
    let block = this.parseBlock();
    let handler = this.matchKeyword("catch") ? this.parseCatchClause() : null;
    let finalizer = this.matchKeyword("finally")
      ? this.parseFinallyClause()
      : null;
    if (!handler && !finalizer) {
    }
    return this.finalize(
      node,
      new Node.TryStatement(block, handler, finalizer)
    );
  };
  // https://tc39.github.io/ecma262/#sec-debugger-statement
  Parser.prototype.parseDebuggerStatement = function () {
    let node = this.createNode();
    this.expectKeyword("debugger");
    this.consumeSemicolon();
    return this.finalize(node, new Node.DebuggerStatement());
  };
  // https://tc39.github.io/ecma262/#sec-ecmascript-language-statements-and-declarations
  Parser.prototype.parseStatement = function () {
    let statement;
    switch (this.lookahead.type) {
      case 1 /* BooleanLiteral */:
      case 5 /* NullLiteral */:
      case 6 /* NumericLiteral */:
      case 8 /* StringLiteral */:
      case 10 /* Template */:
      case 9 /* RegularExpression */:
        statement = this.parseExpressionStatement();
        break;
      case 7 /* Punctuator */:
        let value = this.lookahead.value;
        if (value === "{") {
          statement = this.parseBlock();
        } else if (value === "(") {
          statement = this.parseExpressionStatement();
        } else if (value === ";") {
          statement = this.parseEmptyStatement();
        } else {
          statement = this.parseExpressionStatement();
        }
        break;
      case 3 /* Identifier */:
        statement = this.matchAsyncFunction()
          ? this.parseFunctionDeclaration()
          : this.parseLabelledStatement();
        break;
      case 4 /* Keyword */:
        switch (this.lookahead.value) {
          case "break":
            statement = this.parseBreakStatement();
            break;
          case "continue":
            statement = this.parseContinueStatement();
            break;
          case "debugger":
            statement = this.parseDebuggerStatement();
            break;
          case "do":
            statement = this.parseDoWhileStatement();
            break;
          case "for":
            statement = this.parseForStatement();
            break;
          case "function":
            statement = this.parseFunctionDeclaration();
            break;
          case "if":
            statement = this.parseIfStatement();
            break;
          case "return":
            statement = this.parseReturnStatement();
            break;
          case "switch":
            statement = this.parseSwitchStatement();
            break;
          case "throw":
            statement = this.parseThrowStatement();
            break;
          case "try":
            statement = this.parseTryStatement();
            break;
          case "var":
            statement = this.parseVariableStatement();
            break;
          case "while":
            statement = this.parseWhileStatement();
            break;
          case "with":
            statement = this.parseWithStatement();
            break;
          default:
            statement = this.parseExpressionStatement();
            break;
        }
        break;
      default:
    }
    return statement;
  };
  // https://tc39.github.io/ecma262/#sec-function-definitions
  Parser.prototype.parseFunctionSourceElements = function () {
    let node = this.createNode();
    const startNextValue = this.informalNextTokens(1)[0].value;
    if (startNextValue === "(") {
      this.expect("(");
    } else {
      this.expect("{");
    }
    let body = this.parseDirectivePrologues();
    let previousLabelSet = this.context.labelSet;
    let previousInIteration = this.context.inIteration;
    let previousInSwitch = this.context.inSwitch;
    let previousInFunctionBody = this.context.inFunctionBody;
    this.context.labelSet = {};
    this.context.inIteration = false;
    this.context.inSwitch = false;
    this.context.inFunctionBody = true;
    while (this.lookahead.type !== 2 /* EOF */) {
      if (this.match("}") || this.match(")")) {
        break;
      }
      body.push(this.parseStatementListItem());
    }
    const endNextValue = this.informalNextTokens(1)[0].value;
    if (endNextValue === ")") {
      this.expect(")");
    } else {
      this.expect("}");
    }
    this.context.labelSet = previousLabelSet;
    this.context.inIteration = previousInIteration;
    this.context.inSwitch = previousInSwitch;
    this.context.inFunctionBody = previousInFunctionBody;
    return this.finalize(node, new Node.BlockStatement(body));
  };
  Parser.prototype.validateParam = function (options, param, name) {
    let key = "$" + name;
    if (this.context.strict) {
      if (this.scanner.isRestrictedWord(name)) {
        options.stricted = param;
      }
      if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
        options.stricted = param;
        options.hasDuplicateParameterNames = true;
      }
    } else if (!options.firstRestricted) {
      if (this.scanner.isRestrictedWord(name)) {
        options.firstRestricted = param;
      } else if (this.scanner.isStrictModeReservedWord(name)) {
        options.firstRestricted = param;
      } else if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
        options.stricted = param;
        options.hasDuplicateParameterNames = true;
      }
    }
    /* istanbul ignore next */
    if (typeof Object.defineProperty === "function") {
      Object.defineProperty(options.paramSet, key, {
        value: true,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    } else {
      options.paramSet[key] = true;
    }
  };
  Parser.prototype.parseRestElement = function (params) {
    let node = this.createNode();
    this.expect("...");
    let arg = this.parsePattern(params);
    if (this.match("=")) {
    }
    if (!this.match(")")) {
    }
    return this.finalize(node, new Node.RestElement(arg));
  };
  Parser.prototype.parseFormalParameter = function (options) {
    let params = [];
    let param = this.match("...")
      ? this.parseRestElement(params)
      : this.parsePatternWithDefault(params);
    for (let i = 0; i < params.length; i++) {
      this.validateParam(options, params[i], params[i].value);
    }
    options.simple = options.simple && param instanceof Node.Identifier;
    options.params.push(param);
  };
  Parser.prototype.parseFormalParameters = function (firstRestricted) {
    let options = {
      simple: true,
      hasDuplicateParameterNames: false,
      params: [],
      firstRestricted: firstRestricted,
    };
    if (!["(", ")"].includes(this.lookahead.value)) {
      options.paramSet = {};
      this.parseFormalParameter(options);
    } else {
      this.expect("(");
      if (!this.match(")")) {
        options.paramSet = {};
        while (this.lookahead.type !== 2 /* EOF */) {
          this.parseFormalParameter(options);
          if (this.match(")")) {
            break;
          }
          this.expect(",");
          if (this.match(")")) {
            break;
          }
        }
      }
      this.expect(")");
    }
    if (options.hasDuplicateParameterNames) {
      if (this.context.strict || this.context.isAsync || !options.simple) {
      }
    }
    return {
      simple: options.simple,
      params: options.params,
      stricted: options.stricted,
      firstRestricted: options.firstRestricted,
      message: options.message,
    };
  };
  Parser.prototype.matchAsyncFunction = function () {
    let match = this.matchContextualKeyword("async");
    if (match) {
      let state = this.scanner.saveState();
      this.scanner.scanComments();
      let next = this.scanner.lex();
      this.scanner.restoreState(state);
      match =
        state.lineNumber === next.lineNumber &&
        next.type === 4 /* Keyword */ &&
        next.value === "function";
    }
    return match;
  };
  Parser.prototype.parseFunctionDeclaration = function (identifierIsOptional) {
    let node = this.createNode();
    let isAsync = this.matchContextualKeyword("async");
    if (isAsync) {
      if (this.context.inIteration) {
      }
      this.nextToken();
    }
    this.expectKeyword("function");
    let isGenerator = this.match("*");
    if (isGenerator) {
      this.nextToken();
    }
    let message;
    let id = null;
    let firstRestricted = null;
    if (!identifierIsOptional || !this.match("(")) {
      let token = this.lookahead;
      id = this.parseVariableIdentifier();
      if (this.context.strict) {
        if (this.scanner.isRestrictedWord(token.value)) {
        }
      } else {
        if (this.scanner.isRestrictedWord(token.value)) {
          firstRestricted = token;
        } else if (this.scanner.isStrictModeReservedWord(token.value)) {
          firstRestricted = token;
        }
      }
    }
    let previousIsAsync = this.context.isAsync;
    let previousAllowYield = this.context.allowYield;
    this.context.isAsync = isAsync;
    this.context.allowYield = !isGenerator;
    let formalParameters = this.parseFormalParameters(firstRestricted);
    let params = formalParameters.params;
    let stricted = formalParameters.stricted;
    firstRestricted = formalParameters.firstRestricted;
    if (formalParameters.message) {
      message = formalParameters.message;
    }
    let previousStrict = this.context.strict;
    let previousAllowStrictDirective = this.context.allowStrictDirective;
    this.context.allowStrictDirective = formalParameters.simple;
    let body = this.parseFunctionSourceElements();
    this.context.strict = previousStrict;
    this.context.allowStrictDirective = previousAllowStrictDirective;
    this.context.isAsync = previousIsAsync;
    this.context.allowYield = previousAllowYield;
    return isAsync
      ? this.finalize(
          node,
          new Node.AsyncFunctionDeclaration(id, params, body, isGenerator)
        )
      : this.finalize(
          node,
          new Node.FunctionDeclaration(id, params, body, isGenerator)
        );
  };
  Parser.prototype.parseFunctionExpression = function () {
    let node = this.createNode();
    let isAsync = this.matchContextualKeyword("async");
    if (isAsync) {
      this.nextToken();
    }
    this.expectKeyword("function");
    let isGenerator = this.match("*");
    if (isGenerator) {
      this.nextToken();
    }
    let message;
    let id = null;
    let firstRestricted;
    let previousIsAsync = this.context.isAsync;
    let previousAllowYield = this.context.allowYield;
    this.context.isAsync = isAsync;
    this.context.allowYield = !isGenerator;
    if (!this.match("(")) {
      let token = this.lookahead;
      id =
        !this.context.strict && !isGenerator && this.matchKeyword("yield")
          ? this.parseIdentifierName()
          : this.parseVariableIdentifier();
      if (this.context.strict) {
        if (this.scanner.isRestrictedWord(token.value)) {
        }
      } else {
        if (this.scanner.isRestrictedWord(token.value)) {
          firstRestricted = token;
        } else if (this.scanner.isStrictModeReservedWord(token.value)) {
          firstRestricted = token;
        }
      }
    }
    let formalParameters = this.parseFormalParameters(firstRestricted);
    let params = formalParameters.params;
    let stricted = formalParameters.stricted;
    firstRestricted = formalParameters.firstRestricted;
    if (formalParameters.message) {
      message = formalParameters.message;
    }
    let previousStrict = this.context.strict;
    let previousAllowStrictDirective = this.context.allowStrictDirective;
    this.context.allowStrictDirective = formalParameters.simple;
    let body = this.parseFunctionSourceElements();
    this.context.strict = previousStrict;
    this.context.allowStrictDirective = previousAllowStrictDirective;
    this.context.isAsync = previousIsAsync;
    this.context.allowYield = previousAllowYield;
    return isAsync
      ? this.finalize(
          node,
          new Node.AsyncFunctionExpression(id, params, body, isGenerator)
        )
      : this.finalize(
          node,
          new Node.FunctionExpression(id, params, body, isGenerator)
        );
  };
  // https://tc39.github.io/ecma262/#sec-directive-prologues-and-the-use-strict-directive
  Parser.prototype.parseDirective = function () {
    let token = this.lookahead;
    let node = this.createNode();
    let expr = this.parseExpression();
    let directive =
      expr.type === Syntax.Literal
        ? this.getTokenRaw(token).slice(1, -1)
        : null;
    this.consumeSemicolon();
    return this.finalize(
      node,
      directive
        ? new Node.Directive(expr, directive)
        : new Node.ExpressionStatement(expr)
    );
  };
  Parser.prototype.parseDirectivePrologues = function () {
    let firstRestricted = null;
    let body = [];
    while (true) {
      let token = this.lookahead;
      if (token.type !== 8 /* StringLiteral */) {
        break;
      }
      let statement = this.parseDirective();
      body.push(statement);
      let directive = statement.directive;
      if (typeof directive !== "string") {
        break;
      }
      if (directive === "use strict") {
        this.context.strict = true;
        if (firstRestricted) {
        }
        if (!this.context.allowStrictDirective) {
        }
      } else {
        if (!firstRestricted && token.octal) {
          firstRestricted = token;
        }
      }
    }
    return body;
  };
  // https://tc39.github.io/ecma262/#sec-method-definitions
  Parser.prototype.qualifiedPropertyName = function (token) {
    switch (token.type) {
      case 3 /* Identifier */:
      case 8 /* StringLiteral */:
      case 1 /* BooleanLiteral */:
      case 5 /* NullLiteral */:
      case 6 /* NumericLiteral */:
      case 4 /* Keyword */:
        return true;
      case 7 /* Punctuator */:
        return token.value === "[";
      default:
        break;
    }
    return false;
  };
  Parser.prototype.parseGetterMethod = function () {
    let node = this.createNode();
    let isGenerator = false;
    let previousAllowYield = this.context.allowYield;
    this.context.allowYield = !isGenerator;
    let formalParameters = this.parseFormalParameters();
    if (formalParameters.params.length > 0) {
    }
    let method = this.parsePropertyMethod(formalParameters);
    this.context.allowYield = previousAllowYield;
    return this.finalize(
      node,
      new Node.FunctionExpression(
        null,
        formalParameters.params,
        method,
        isGenerator
      )
    );
  };
  Parser.prototype.parseSetterMethod = function () {
    let node = this.createNode();
    let isGenerator = false;
    let previousAllowYield = this.context.allowYield;
    this.context.allowYield = !isGenerator;
    let formalParameters = this.parseFormalParameters();
    if (formalParameters.params.length !== 1) {
    } else if (formalParameters.params[0] instanceof Node.RestElement) {
    }
    let method = this.parsePropertyMethod(formalParameters);
    this.context.allowYield = previousAllowYield;
    return this.finalize(
      node,
      new Node.FunctionExpression(
        null,
        formalParameters.params,
        method,
        isGenerator
      )
    );
  };
  Parser.prototype.parseGeneratorMethod = function () {
    let node = this.createNode();
    let isGenerator = true;
    let previousAllowYield = this.context.allowYield;
    this.context.allowYield = true;
    let params = this.parseFormalParameters();
    this.context.allowYield = false;
    let method = this.parsePropertyMethod(params);
    this.context.allowYield = previousAllowYield;
    return this.finalize(
      node,
      new Node.FunctionExpression(null, params.params, method, isGenerator)
    );
  };
  // https://tc39.github.io/ecma262/#sec-generator-function-definitions
  Parser.prototype.isStartOfExpression = function () {
    let start = true;
    let value = this.lookahead.value;
    switch (this.lookahead.type) {
      case 7 /* Punctuator */:
        start =
          value === "[" ||
          value === "(" ||
          value === "{" ||
          value === "+" ||
          value === "-" ||
          value === "!" ||
          value === "~" ||
          value === "++" ||
          value === "--" ||
          value === "/" ||
          value === "/="; // regular expression literal
        break;
      case 4 /* Keyword */:
        start =
          value === "class" ||
          value === "delete" ||
          value === "function" ||
          value === "let" ||
          value === "new" ||
          value === "super" ||
          value === "this" ||
          value === "typeof" ||
          value === "void" ||
          value === "yield";
        break;
      default:
        break;
    }
    return start;
  };
  Parser.prototype.parseYieldExpression = function () {
    let node = this.createNode();
    this.expectKeyword("yield");
    let argument = null;
    let delegate = false;
    if (!this.hasLineTerminator) {
      let previousAllowYield = this.context.allowYield;
      this.context.allowYield = false;
      delegate = this.match("*");
      if (delegate) {
        this.nextToken();
        argument = this.parseAssignmentExpression();
      } else if (this.isStartOfExpression()) {
        argument = this.parseAssignmentExpression();
      }
      this.context.allowYield = previousAllowYield;
    }
    return this.finalize(node, new Node.YieldExpression(argument, delegate));
  };
  Parser.prototype.processScannerStaticInfo = function () {
    const { index, lineNumber, lineStart, curlyStack } = this.scanner;
    return {
      index,
      lineNumber,
      lineStart,
      curlyStack: JSON.parse(JSON.stringify(curlyStack)),
    };
  };
  /*用于判断前置变量的方法.
   * */
  Parser.prototype.informalNextTokens = function (number) {
    const startMarker = JSON.parse(JSON.stringify(this.startMarker));
    const lastMarker = JSON.parse(JSON.stringify(this.lastMarker));
    const lookahead = JSON.parse(JSON.stringify(this.lookahead));
    const currentInfo = this.processScannerStaticInfo();
    let nextTokens = [];
    for (let i = 0; i < number; i++) {
      nextTokens.push(this.nextToken());
    }
    Object.assign(this.lookahead, lookahead);
    Object.assign(this.startMarker, startMarker);
    Object.assign(this.lastMarker, lastMarker);
    Object.assign(this.scanner, currentInfo);
    return nextTokens;
  };
  // https://tc39.github.io/ecma262/#sec-class-definitions
  Parser.prototype.parseClassElement = function (hasConstructor) {
    let token = this.lookahead;
    let node = this.createNode();
    let kind = "";
    let key = null;
    let value = null;
    let computed = false;
    let method = false;
    let isStatic = false;
    let isAsync = false;
    let isGenerator = false;
    if (this.match("*")) {
      this.nextToken();
    } else {
      computed = this.match("[");
      key = this.parseObjectPropertyKey();
      let id = key;
      if (!id) {
        console.log(id);
      }
      if (
        id.name === "static" &&
        (this.qualifiedPropertyName(this.lookahead) || this.match("*"))
      ) {
        token = this.lookahead;
        isStatic = true;
        computed = this.match("[");
        if (this.match("*")) {
          this.nextToken();
        } else {
          key = this.parseObjectPropertyKey();
        }
      }
      if (
        token.type === 3 /* Identifier */ &&
        !this.hasLineTerminator &&
        token.value === "async"
      ) {
        let punctuator = this.lookahead.value;
        if (punctuator !== ":" && punctuator !== "(") {
          isAsync = true;
          isGenerator = this.match("*");
          if (isGenerator) {
            this.nextToken();
          }
          token = this.lookahead;
          computed = this.match("[");
          key = this.parseObjectPropertyKey();
          if (
            token.type === 3 /* Identifier */ &&
            token.value === "constructor"
          ) {
          }
        }
      }
    }
    let lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
    if (token.type === 3 /* Identifier */) {
      if (token.value === "get" && lookaheadPropertyKey) {
        kind = "get";
        computed = this.match("[");
        key = this.parseObjectPropertyKey();
        this.context.allowYield = false;
        value = this.parseGetterMethod();
      } else if (token.value === "set" && lookaheadPropertyKey) {
        kind = "set";
        computed = this.match("[");
        key = this.parseObjectPropertyKey();
        value = this.parseSetterMethod();
      }
    } else if (
      token.type === 7 /* Punctuator */ &&
      token.value === "*" &&
      lookaheadPropertyKey
    ) {
      kind = "init";
      computed = this.match("[");
      key = this.parseObjectPropertyKey();
      value = this.parseGeneratorMethod();
      method = true;
    }
    if ((!kind && key && this.match("(")) || this.match("=")) {
      if (this.match("=")) {
        const nextTokenTmp = this.informalNextTokens(2);
        const objStart =
          TokenType.Punctuator == nextTokenTmp[1].type &&
          ["{", "["].includes(nextTokenTmp[1].value);
        if (
          nextTokenTmp[0].value == "=" &&
          (TokenType.Punctuator != nextTokenTmp[1].type || objStart)
        ) {
          kind = "var";
        } else {
          this.nextToken();
        }
      }
      if (kind != "set") {
        let previousInClassConstructor = this.context.inClassConstructor;
        this.context.inClassConstructor = token.value === "constructor";
        kind = "init";
        value = isAsync
          ? this.parsePropertyMethodAsyncFunction(isGenerator)
          : this.parsePropertyMethodFunction(isGenerator);
        this.context.inClassConstructor = previousInClassConstructor;
        method = true;
      }
    }
    if (kind === "init") {
      kind = "method";
    }
    if (!computed) {
      if (isStatic && this.isPropertyKey(key, "prototype")) {
      }
      if (!isStatic && this.isPropertyKey(key, "constructor")) {
        if (kind !== "method" || !method || (value && value.generator)) {
        }
        if (hasConstructor.value) {
        } else {
          hasConstructor.value = true;
        }
        kind = "constructor";
      }
    }
    if (kind == "var") {
      return this.parseStatement();
    }
    return this.finalize(
      node,
      new Node.MethodDefinition(key, computed, value, kind, isStatic)
    );
  };
  Parser.prototype.parseClassElementList = function () {
    let body = [];
    let hasConstructor = { value: false };
    this.expect("{");
    while (!this.match("}")) {
      if (this.match(";")) {
        this.nextToken();
      } else {
        body.push(this.parseClassElement(hasConstructor));
      }
    }
    this.expect("}");
    return body;
  };
  Parser.prototype.parseClassBody = function () {
    let node = this.createNode();
    let elementList = this.parseClassElementList();
    return this.finalize(node, new Node.ClassBody(elementList));
  };
  Parser.prototype.parseClassDeclaration = function (identifierIsOptional) {
    let node = this.createNode();
    let previousStrict = this.context.strict;
    this.context.strict = true;
    this.expectKeyword("class");
    let id =
      identifierIsOptional && this.lookahead.type !== 3 /* Identifier */
        ? null
        : this.parseVariableIdentifier();
    let superClass = null;
    if (this.matchKeyword("extends")) {
      this.nextToken();
      superClass = this.isolateCoverGrammar(
        this.parseLeftHandSideExpressionAllowCall
      );
    }
    let classBody = this.parseClassBody();
    this.context.strict = previousStrict;
    return this.finalize(
      node,
      new Node.ClassDeclaration(id, superClass, classBody)
    );
  };
  Parser.prototype.parseClassExpression = function () {
    let node = this.createNode();
    let previousStrict = this.context.strict;
    this.context.strict = true;
    this.expectKeyword("class");
    let id =
      this.lookahead.type === 3 /* Identifier */
        ? this.parseVariableIdentifier()
        : null;
    let superClass = null;
    if (this.matchKeyword("extends")) {
      this.nextToken();
      superClass = this.isolateCoverGrammar(
        this.parseLeftHandSideExpressionAllowCall
      );
    }
    let classBody = this.parseClassBody();
    this.context.strict = previousStrict;
    return this.finalize(
      node,
      new Node.ClassExpression(id, superClass, classBody)
    );
  };
  // https://tc39.github.io/ecma262/#sec-scripts
  // https://tc39.github.io/ecma262/#sec-modules
  Parser.prototype.parseModule = function () {
    this.context.strict = true;
    this.context.isModule = true;
    this.scanner.isModule = true;
    let node = this.createNode();
    let body = this.parseDirectivePrologues();
    while (this.lookahead.type !== 2 /* EOF */) {
      body.push(this.parseStatementListItem());
    }
    return this.finalize(node, new Node.Module(body));
  };
  Parser.prototype.parseScript = function () {
    let node = this.createNode();
    let body = this.parseDirectivePrologues();
    while (this.lookahead.type !== 2 /* EOF */) {
      body.push(this.parseStatementListItem());
    }
    this.validateError();
    const { fileName } = this.config;
    this.transTokens.forEach((item, index) => {
      const { type, value, loc } = item;
      item.fileName = fileName;
      item.line = loc.start.line;
      if (type === TokenName[TokenType.Template]) {
        const placeHolders = [...value.matchAll(/\${.*?}/g)];
        let transValue = value;
        let placeHolderVars = [];
        placeHolders.forEach((placeHolder, index) => {
          const placeHolderVar = placeHolder[0];
          placeHolderVars.push(
            placeHolderVar.replace("${", "").replace("}", "")
          );
          transValue = transValue.replace(placeHolderVar, `{arg${index + 1}}`);
        });
        item.transValue = transValue;
        item.placeHolderVars = placeHolderVars;
      } else {
        item.transValue = item.value;
      }
      item.index = index;
      delete item.loc;
    });
    return this.finalize(node, new Node.Script(body));
  };
  Parser.prototype.getTransTokens = function () {
    this.parseScript();
    return this.transTokens;
  };
  // https://tc39.github.io/ecma262/#sec-imports
  Parser.prototype.parseModuleSpecifier = function () {
    let node = this.createNode();
    if (this.lookahead.type !== 8 /* StringLiteral */) {
    }
    let token = this.nextToken();
    let raw = this.getTokenRaw(token);
    return this.finalize(node, new Node.Literal(token.value, raw));
  };
  // import {<foo as bar>} ...;
  Parser.prototype.parseImportSpecifier = function () {
    let node = this.createNode();
    let imported;
    let local;
    if (this.lookahead.type === 3 /* Identifier */) {
      imported = this.parseVariableIdentifier();
      local = imported;
      if (this.matchContextualKeyword("as")) {
        this.nextToken();
        local = this.parseVariableIdentifier();
      }
    } else {
      imported = this.parseIdentifierName();
      local = imported;
      if (this.matchContextualKeyword("as")) {
        this.nextToken();
        local = this.parseVariableIdentifier();
      }
    }
    return this.finalize(node, new Node.ImportSpecifier(local, imported));
  };
  // {foo, bar as bas}
  Parser.prototype.parseNamedImports = function () {
    this.expect("{");
    let specifiers = [];
    while (!this.match("}")) {
      specifiers.push(this.parseImportSpecifier());
      if (!this.match("}")) {
        this.expect(",");
      }
    }
    this.expect("}");
    return specifiers;
  };
  // import <foo> ...;
  Parser.prototype.parseImportDefaultSpecifier = function () {
    let node = this.createNode();
    let local = this.parseIdentifierName();
    return this.finalize(node, new Node.ImportDefaultSpecifier(local));
  };
  // import <* as foo> ...;
  Parser.prototype.parseImportNamespaceSpecifier = function () {
    let node = this.createNode();
    this.expect("*");
    if (!this.matchContextualKeyword("as")) {
    }
    this.nextToken();
    let local = this.parseIdentifierName();
    return this.finalize(node, new Node.ImportNamespaceSpecifier(local));
  };
  Parser.prototype.parseImportDeclaration = function () {
    if (this.context.inFunctionBody) {
    }
    let node = this.createNode();
    this.expectKeyword("import");
    let src;
    let specifiers = [];
    if (this.lookahead.type === 8 /* StringLiteral */) {
      // import 'foo';
      src = this.parseModuleSpecifier();
    } else {
      if (this.match("{")) {
        // import {bar}
        specifiers = specifiers.concat(this.parseNamedImports());
      } else if (this.match("*")) {
        // import * as foo
        specifiers.push(this.parseImportNamespaceSpecifier());
      } else if (
        this.isIdentifierName(this.lookahead) &&
        !this.matchKeyword("default")
      ) {
        // import foo
        specifiers.push(this.parseImportDefaultSpecifier());
        if (this.match(",")) {
          this.nextToken();
          if (this.match("*")) {
            // import foo, * as foo
            specifiers.push(this.parseImportNamespaceSpecifier());
          } else if (this.match("{")) {
            // import foo, {bar}
            specifiers = specifiers.concat(this.parseNamedImports());
          }
        }
      }
      if (!this.matchContextualKeyword("from")) {
      }
      this.nextToken();
      src = this.parseModuleSpecifier();
    }
    this.consumeSemicolon();
    return this.finalize(node, new Node.ImportDeclaration(specifiers, src));
  };
  // https://tc39.github.io/ecma262/#sec-exports
  Parser.prototype.parseExportSpecifier = function () {
    let node = this.createNode();
    let local = this.parseIdentifierName();
    let exported = local;
    if (this.matchContextualKeyword("as")) {
      this.nextToken();
      exported = this.parseIdentifierName();
    }
    return this.finalize(node, new Node.ExportSpecifier(local, exported));
  };
  Parser.prototype.parseExportDeclaration = function () {
    if (this.context.inFunctionBody) {
    }
    let node = this.createNode();
    this.expectKeyword("export");
    let exportDeclaration;
    if (this.matchKeyword("default")) {
      // export default ...
      this.nextToken();
      if (this.matchKeyword("function")) {
        // export default function foo () {}
        // export default function () {}
        let declaration = this.parseFunctionDeclaration(true);
        exportDeclaration = this.finalize(
          node,
          new Node.ExportDefaultDeclaration(declaration)
        );
      } else if (this.matchKeyword("class")) {
        // export default class foo {}
        let declaration = this.parseClassDeclaration(true);
        exportDeclaration = this.finalize(
          node,
          new Node.ExportDefaultDeclaration(declaration)
        );
      } else if (this.matchContextualKeyword("async")) {
        // export default async function f () {}
        // export default async function () {}
        // export default async x => x
        let declaration = this.matchAsyncFunction()
          ? this.parseFunctionDeclaration(true)
          : this.parseAssignmentExpression();
        exportDeclaration = this.finalize(
          node,
          new Node.ExportDefaultDeclaration(declaration)
        );
      } else {
        if (this.matchContextualKeyword("from")) {
        }
        // export default {};
        // export default [];
        // export default (1 + 2);
        let declaration = this.match("{")
          ? this.parseObjectInitializer()
          : this.match("[")
          ? this.parseArrayInitializer()
          : this.parseAssignmentExpression();
        this.consumeSemicolon();
        exportDeclaration = this.finalize(
          node,
          new Node.ExportDefaultDeclaration(declaration)
        );
      }
    } else if (this.match("*")) {
      // export * from 'foo';
      this.nextToken();
      this.nextToken();
      let src = this.parseModuleSpecifier();
      this.consumeSemicolon();
      exportDeclaration = this.finalize(
        node,
        new Node.ExportAllDeclaration(src)
      );
    } else if (this.lookahead.type === 4 /* Keyword */) {
      // export let f = 1;
      let declaration = void 0;
      switch (this.lookahead.value) {
        case "let":
        case "const":
          declaration = this.parseLexicalDeclaration({ inFor: false });
          break;
        case "var":
        case "class":
        case "function":
          declaration = this.parseStatementListItem();
          break;
        default:
      }
      exportDeclaration = this.finalize(
        node,
        new Node.ExportNamedDeclaration(declaration, [], null)
      );
    } else if (this.matchAsyncFunction()) {
      let declaration = this.parseFunctionDeclaration();
      exportDeclaration = this.finalize(
        node,
        new Node.ExportNamedDeclaration(declaration, [], null)
      );
    } else {
      let specifiers = [];
      let source = null;
      let isExportFromIdentifier = false;
      this.expect("{");
      while (!this.match("}")) {
        isExportFromIdentifier =
          isExportFromIdentifier || this.matchKeyword("default");
        specifiers.push(this.parseExportSpecifier());
        if (!this.match("}")) {
          this.expect(",");
        }
      }
      this.expect("}");
      if (this.matchContextualKeyword("from")) {
        // export {default} from 'foo';
        // export {foo} from 'foo';
        this.nextToken();
        source = this.parseModuleSpecifier();
        this.consumeSemicolon();
      } else {
        // export {foo};
        this.consumeSemicolon();
      }
      exportDeclaration = this.finalize(
        node,
        new Node.ExportNamedDeclaration(null, specifiers, source)
      );
    }
    return exportDeclaration;
  };
  return Parser;
})();
export default Parser;
