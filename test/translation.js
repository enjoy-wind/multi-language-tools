import { batchTranslate } from "../src/translation/index.js";

const result = batchTranslate(["中国", "东京"], "zh", ["ja", "en"]);

result.then((res) => {
  console.log(res);
});
