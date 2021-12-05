import { exec } from "child_process";
import fs from "file-system";

/*
 * 项目集成翻译钩子
 * */
const projectIntegrationHooks = (transKeys) => {
  console.log("触发钩子");
  if (transKeys.length == 0) {
    return;
  }
  let appendContentList = [];
  let replaceObj = {};
  transKeys.forEach((item) => {
    const { isNewAddKey, keyFileAppend, fileName } = item;
    if (isNewAddKey) {
      appendContentList.push(keyFileAppend + ",");
    }
    if (replaceObj.hasOwnProperty(fileName)) {
      replaceObj[fileName].push(item);
    } else {
      replaceObj[fileName] = [item];
    }
  });
  if (appendContentList.length) {
    const acLen = appendContentList.length;
    let lastContent = appendContentList[acLen - 1];
    lastContent = lastContent.substring(0, lastContent.length - 1);
    appendContentList[acLen - 1] = lastContent;
    appendModuleKeys(appendContentList);
  }
  Object.keys(replaceObj).forEach((attr) => {
    replaceModuleKey(attr, replaceObj[attr]);
  });
  submitTrans(transKeys);
};
/*
 * 模块Key统一追加
 * */
const appendModuleKeys = (appendContentList) => {
  const { projectPath, moduleKeyPath } = config;
  const moduleFullPath = projectPath + moduleKeyPath;
  let lines = readFileSyncToLines(moduleFullPath);
  const linesLen = lines.length;
  let initNum = 2;
  if (!lines[linesLen - 1]) {
    initNum++;
  }
  lines[linesLen - initNum] = lines[linesLen - initNum] + ",";
  lines.splice(linesLen - initNum + 1, 0, ...appendContentList);
  writeFileSync(moduleFullPath, lines);
};
/*
 * 替换模块里面的Key
 * */
const replaceModuleKey = (modulePath, keys) => {
  let lines = readFileSyncToLines(modulePath);
  let lastLine = "";
  let offSetIndex = 0;
  let globalKeys = [];
  keys.forEach((item) => {
    const { line, transValue, keyFileReplace, range } = item;
    if (lastLine != line) {
      offSetIndex = 0;
    }
    const lineContent = lines[line - 1];
    const lineContentList = lineContent.split("");
    const originValueLen = transValue.length;
    const keyFileReplaceList = keyFileReplace.split("");
    const [startIndex, endIndex] = range;
    const replaceOriginValue = lineContent.substring(
      startIndex + offSetIndex,
      endIndex - startIndex + offSetIndex
    );
    if (replaceOriginValue === item.value) {
      lineContentList.splice(
        startIndex + offSetIndex,
        endIndex - startIndex + offSetIndex,
        ...keyFileReplaceList
      );
      lines[line - 1] = lineContentList.join("");
      offSetIndex = keyFileReplaceList.length - originValueLen + offSetIndex;
    } else {
      globalKeys.push(item);
    }
    lastLine = line;
  });
  let linesStr = lines.join("\n");
  globalKeys.forEach((item) => {
    const { originValue, value, keyFileReplace } = item;
    linesStr = linesStr.replace(originValue || value, keyFileReplace);
  });
  writeFileSync(modulePath, linesStr);
};
/*提交翻译*/
const submitTrans = (transKeys) => {
  if (transKeys.length === 0) {
    return;
  }
  const { projectPath } = config;
  let fileList = transKeys.map((item) => {
    return item.fileName.replace(projectPath, "");
  });
  fileList = [...new Set(fileList)];
  const addCommand = `git add ${fileList.join(" ")}`;
  const commitCommand = `git commit -m 'trans'`;
  console.log(addCommand);
  console.log(commitCommand);
  runCommand(addCommand).then((res) => {
    runCommand(commitCommand);
  });
};

const runCommand = (command) => {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      console.log("command run success");
      resolve(true);
    });
  });
};

/*
 * 同步读取文件
 * @param filePath
 * */
const readFileSync = (filePath) => {
  const EncodingFormat = "utf-8";
  const content = fs.readFileSync(filePath, EncodingFormat);
  return content;
};
/*
 * 同步读取文件行数
 * */
const readFileSyncToLines = (filePath) => {
  const content = readFileSync(filePath);
  const lines = content.split(/\r?\n/);
  return lines;
};

/*
 * 同步写入文件 Array || string
 * */
const writeFileSync = (filePath, contents) => {
  if (Array.isArray(contents)) {
    contents = contents.join("\n");
  }
  try {
    fs.writeFileSync(filePath, contents, { flag: "w+" });
    console.log("模块Key替换成功.");
    //文件写入成功。
  } catch (err) {
    return false;
    console.error("模块Key替换失败:", err);
  }
  return true;
};

export { projectIntegrationHooks };
