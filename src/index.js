"use strict";
/*
  Copyright Enjoy Wind and other contributors, https://github.com/enjoy-wind
 */
import { combineConfig } from "./config/index.js";
import { parse } from "./parser/index.js";
import { generator } from "./generator/index";
import { projectIntegrationHooks } from "./hooks/index.js";

const start = (config = {}, callBackHooks) => {
  init().then((res) => {
    Object.assign(combineConfig, config);
    const { entryPath } = combineConfig;
    const tokens = parse(entryPath);
    generator(tokens).then((fullTokens) => {
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
      resolve(true);
    }, 10);
  });
};
start();

export { start };
