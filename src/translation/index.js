import { GoogleTranslator } from "@translate-tools/core/translators/GoogleTranslator/index.js";

const translator = new GoogleTranslator();

async function translateBatch(textList, from, to) {
  const result = await translator.translateBatch(textList, from, to);
  return result;
}

export { translateBatch };
