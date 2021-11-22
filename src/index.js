"use strict";
/*
  Copyright Enjoy Wind and other contributors, https://github.com/enjoy-wind
 */
import { combineConfig } from "./config/index.js";

const start = () => {
  init().then((res) => {});
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
