//https://github.com/jquery/esprima
import JSXParser from "./jsx-parser/index.js";

const option = {
  loc: true,
  range: true,
  sourceType: "module",
  strictMode: false,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  startLine: 1,
  tokens: true,
  plugins: [
    "asyncGenerators",
    "bigInt",
    "classPrivateMethods",
    "classPrivateProperties",
    "classProperties",
    "decorators-legacy",
    "doExpressions",
    "dynamicImport",
    "exportDefaultFrom",
    "exportExtensions",
    "exportNamespaceFrom",
    "functionBind",
    "functionSent",
    "importMeta",
    "nullishCoalescingOperator",
    "numericSeparator",
    "objectRestSpread",
    "optionalCatchBinding",
    "optionalChaining",
    ["pipelineOperator", { proposal: "minimal" }],
    "throwExpressions",
    "jsx",
    "flow",
  ],
};

const parse = (code) => {
  const parser = new JSXParser(code, option);
  parser.parseScript();
  const tokens = parser.tokens;
  return tokens;
};
