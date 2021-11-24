import { translateBatch } from "../src/translation/index.js";

const result = translateBatch(["中国", "东京"], "zh", "ja");

result.then((res) => {
  console.log(res);
});
