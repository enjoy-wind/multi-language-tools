import { parse } from "../../src/parser/index.js";
import { generator } from "../../src/generator/index.js";
import { readFileSync } from "../../src/stream/index.js";

let testPath =
  "/Users/ylhong/Desktop/project/study/multi-language-tools/test/generator/test.js";
const fileContent = readFileSync(testPath);
setTimeout(() => {
  generator(parse(fileContent, "code-test.js")).then((res) => {
    console.log(res);
  });
}, 10);
