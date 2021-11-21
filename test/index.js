import { getChildFilesPath, readFileSync } from "../src/stream/index.js";

const filesPath = getChildFilesPath("../src");
const fileContent = readFileSync(filesPath[2]);
console.log(filesPath, fileContent);
