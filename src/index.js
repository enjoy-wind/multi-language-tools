"use strict";
/*
  Copyright Enjoy Wind and other contributors, https://github.com/enjoy-wind
 */
import { combineConfig } from "./config/index.js";
import { parse } from "./parser/index.js";
import { generator } from "./generator/index.js";
import { projectIntegrationHooks } from "./hooks/index.js";
import { getChildFilesPath } from "./stream/index.js";
import { readFileSync } from "./stream/index.js";

const start = (config = {}, callBackHooks) => {
  init().then((res) => {
    Object.assign(combineConfig, config);
    const { projectPath, entryPath, excludedPaths } = combineConfig;
    excludedPaths.forEach((item, index) => {
      excludedPaths[index] = projectPath + item;
    });
    const fileList = getChildFilesPath(projectPath + entryPath, excludedPaths);
    let tokens = [];
    fileList.forEach((item, index) => {
      const code = readFileSync(item);
      tokens = tokens.concat(parse(code, item));
    });
    generator(tokens).then((fullTokens) => {
      console.log(fullTokens);
      projectIntegrationHooks(fullTokens);
      if (callBackHooks) {
        callBackHooks(fullTokens);
      }
    });
  });
};

const init = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const { version } = combineConfig;
      console.log(`init load finish version:${version}.`);
      setTimeout(() => {
        resolve(true);
      }, 100);
    }, 10);
  });
};
start();

export { start };
