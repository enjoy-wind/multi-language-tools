const TokenType = {
  BooleanLiteral: 1,
  EOF: 2,
  Identifier: 3,
  Keyword: 4,
  NullLiteral: 5,
  NumericLiteral: 6,
  Punctuator: 7,
  StringLiteral: 8,
  RegularExpression: 9,
  Template: 10,
};
const TokenName = {
  1: "Boolean",
  2: "<end>",
  3: "Identifier",
  4: "Keyword",
  5: "Null",
  6: "Numeric",
  7: "Punctuator",
  8: "String",
  9: "RegularExpression",
  10: "Template",
};
export { TokenName, TokenType };
