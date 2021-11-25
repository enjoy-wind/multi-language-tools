import { GoogleTranslator } from "@translate-tools/core/translators/GoogleTranslator/index.js";
import { getToken } from "@translate-tools/core/translators/GoogleTranslator/token.js";
import queryString from "query-string";
import unescape from "lodash.unescape";
import axios from "axios";
/*
 * 重写GoogleTranslator源码，版本有bug
 * */
GoogleTranslator.prototype.translateBatch = function (textList, from, to) {
  const encodeForBatch = (textList) => {
    return textList.map(function (text, i) {
      return '<pre><a i="' + i + '">' + text + "</a></pre>";
    });
  };
  const preparedText = encodeForBatch(textList);
  return getToken(preparedText.join("")).then((res) => {
    let tk = res.value;
    let apiPath = "https://translate.googleapis.com/translate_a/t";
    let data = {
      anno: 3,
      client: "te",
      v: "1.0",
      ie: "UTF-8",
      oe: "UTF-8",
      format: "html",
      sl: this.fixLang(from),
      tl: this.fixLang(to),
      tk: tk,
    };
    let url = apiPath + "?" + queryString.stringify(data);
    let body = preparedText
      .map(function (text) {
        return "&q=" + encodeURIComponent(text);
      })
      .join("");
    const interopRequireDefault = (obj) => {
      return obj && obj.__esModule ? obj : { default: obj };
    };

    return interopRequireDefault(axios)
      .default({
        url: this.wrapUrlToCorsProxy(url),
        method: "POST",
        withCredentials: false,
        headers: Object.assign(
          {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          this.options.headers
        ),
        data: body,
      })
      .then(function (rsp) {
        return rsp.data;
      })
      .then(function (rawResp) {
        let resp = rawResp;

        if (textList.length == 1) {
          // (string | string[])[]
          resp = [rawResp];
        }

        if (!Array.isArray(resp)) {
          throw new Error("Unexpected response");
        }

        let result = [];
        resp.forEach(function (chunk) {
          let translatedText = "";

          if (from === "auto") {
            // Structure: [translate: string, detectedLanguage: string]
            if (!Array.isArray(chunk) || typeof chunk[0] !== "string") {
              throw new Error("Unexpected response");
            }

            translatedText = chunk[0];
          } else {
            // Structure: translate: string
            if (typeof chunk !== "string") {
              throw new Error("Unexpected response");
            }

            translatedText = chunk;
          }

          let simpleMatch = translatedText.match(
            /^<pre><a i="\d+">([\w\W]+)<\/a><\/pre>$/
          );

          if (simpleMatch !== null) {
            result.push(unescape(simpleMatch[1]));
            return;
          } // TODO: Rewrite it with no use `DOMParser` and `querySelectorAll` for use not only in browser environment

          let doc = this.parser.parseFromString(translatedText, "text/html");

          let translationResult = "";
          Array.from(doc.querySelectorAll("a")).forEach(function (tag) {
            // Skip original text nodes
            if (
              tag.parentElement === null ||
              tag.parentElement.localName === "i"
            )
              return; // Fill accumulator

            translationResult += tag.innerHTML;
          });

          if (translationResult.length === 0) {
            // I don't sure why it here. I think it for keep right length of result array
            result.push(null);
          } else {
            result.push(translationResult);
          }
        });

        if (result.length !== textList.length) {
          throw new Error(
            "Mismatching a lengths of original and translated arrays"
          );
        }

        return result;
      });
  });
};

const translator = new GoogleTranslator();

async function translate(textList, from, to) {
  const result = await translator.translateBatch(textList, from, to);
  return result;
}

function batchTranslate(textList, from, toList) {
  let apiList = [];
  toList.forEach((item) => {
    apiList.push(translate(textList, from, item));
  });
  const result = Promise.all(apiList);
  return result.then((res) => {
    const languages = [];
    textList.forEach((text, textIndex) => {
      let obj = {
        [from]: text,
      };
      toList.forEach((item, index) => {
        obj[item] = res[index][textIndex];
      }),
        languages.push(obj);
    });
    return languages;
  });
}

export { translate, batchTranslate };
