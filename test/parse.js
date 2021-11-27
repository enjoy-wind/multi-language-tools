import { parse } from "../src/parser/index.js";
import { readFileSync } from "../src/stream/index.js";
let testPath =
  "/Users/ylhong/Desktop/project/study/multi-language-tools/test/generator/test.js";
const fileContent = readFileSync(testPath);

console.log(parse(fileContent, "code-test.js"));
