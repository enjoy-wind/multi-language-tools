/*
 * Asynchronous configuration, the entry of the running project will be initialized, and the task will start after the callback is completed
 * */
import glob from "glob";
import path from "path";
import { FILE_TYPE } from "../stream/enum/index.js";
import fs from "file-system";

let runPath = path.resolve("");
const projectName = "multi-language-tools";
let transitionPath = "";
if (!runPath.includes(projectName)) {
  for (let i = 0; i < 4; i++) {
    const files = fs.readdirSync(runPath);
    if (!files.includes("node_modules")) {
      break;
    }
    const pathList = runPath.split("/");
    pathList.pop();
    runPath = pathList.join("/");
  }
  transitionPath = "/node_modules/";
}
const configPath =
  runPath.split(projectName)[0] +
  transitionPath +
  projectName +
  "/src/config/*.js";

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
