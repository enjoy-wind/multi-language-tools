/*
 * Asynchronous configuration, the entry of the running project will be initialized, and the task will start after the callback is completed
 * */
import glob from "glob";
import path from "path";
import { FILE_TYPE } from "../stream/enum/index.js";

const runPath = path.resolve("");
const projectName = "multi-language";
const configPath =
  runPath.split(projectName)[0] + projectName + "/src/config/*.js";

let combineConfig = {};
const load = (moduleName) => {
  moduleName = path.resolve(moduleName);
  /*Unfortunately, synchronized dynamic import is not supported, such as::import.meta.glob*/
  return import(moduleName);
};
let moduleList = [];
glob.sync(configPath).forEach((filePath) => {
  const fileExtension = filePath.split(".").pop().toLowerCase();
  let fileName = filePath.split("/").pop();
  if (FILE_TYPE.JS === fileExtension) {
    const currentFileName = "index.js";
    if (currentFileName != fileName) {
      const _load = load(filePath);
      moduleList.push(_load);
    }
  }
});
Promise.all(moduleList).then((res) => {
  res.forEach((item) => {
    if (!Object.keys(combineConfig).length) {
      combineConfig = item.default;
    } else {
      Object.keys(item.default).forEach((attr) => {
        if (combineConfig.hasOwnProperty(attr)) {
          console.error(`Duplicate module name, please modify ${attr}.`);
          return;
        } else {
          combineConfig[attr] = item[attr];
        }
      });
    }
  });
});
export { combineConfig };
