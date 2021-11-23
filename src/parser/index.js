//https://github.com/jquery/esprima
import JSXParser from "./jsx-parser/index.js";

const parse = (code, fileName) => {
  const parser = new JSXParser(code, { fileName });
  const transTokens = parser.getTransTokens();
  return transTokens;
};

export { parse };
