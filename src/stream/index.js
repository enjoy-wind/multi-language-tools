import fs from "file-system";
import path from "path";

const EncodingFormat = "utf-8";
/*
 * 同步获取子文件路径
 * @params parentPath
 * @fileTypes 小写
 * */
const getChildFilesPath = (parentPath, fileTypes = ["js"]) => {
  let fileList = [];
  parentPath = path.resolve(parentPath);
  const files = fs.readdirSync(parentPath);
  files &&
    files.forEach((fileName) => {
      const fileDir = path.join(parentPath, fileName);
      const stats = fs.statSync(fileDir);
      const isFile = stats.isFile();
      const isDir = stats.isDirectory();
      if (isFile) {
        const fileExtension = fileName.split(".").pop().toLowerCase();
        if (fileTypes.includes(fileExtension)) {
          fileList.push(fileDir);
        }
      } else if (isDir) {
        fileList = fileList.concat(getChildFilesPath(fileDir, fileTypes));
      }
    });
  return fileList;
};
/*
 * 同步读取文件
 * @param filePath
 * */
const readFileSync = (filePath) => {
  const content = fs.readFileSync(filePath, EncodingFormat);
  return content;
};

export { getChildFilesPath, readFileSync };
