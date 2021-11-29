import { combineConfig } from "../config/index.js";
import { readFileSyncToLines } from "../stream/index.js";
import { moveLeftAndRightChar } from "../utils/index.js";
import { nanoid } from "nanoid";
import JSXSyntax from "../parser/jsx-parser/enum/jsx-syntax.js";
import { batchTranslate } from "../translation/index.js";

const generator = (transTokens) => {
  getSameRepeatKey(transTokens);
  generatorKey(transTokens);
  assemblyTransTokens(transTokens);
  const { googleTranslation } = combineConfig;
  if (googleTranslation) {
    return translateKey(transTokens);
  }
  return Promise.resolve(transTokens);
};

const getSameRepeatKey = (transTokens) => {
  const sameGroupTransValue = [];
  transTokens.forEach((item) => {
    const { transValue } = item;
    const sameIndex = sameGroupTransValue.indexOf(transValue);
    if (~sameIndex) {
      item.sameIndex = sameIndex;
    }
    sameGroupTransValue.push(transValue);
  });
};
/*生成Key*/
const generatorKey = (transTokens) => {
  transTokens.forEach((transToken, index) => {
    const { transValue, sameIndex } = transToken;
    if (sameIndex != undefined) {
      const sameObj = transTokens[sameIndex];
      transToken.key = sameObj.key;
      getKeyFileReplace(transToken);
    } else {
      transToken.key = findProjectKeys(transValue);
      if (!transToken.key) {
        transToken.isNewAddKey = true;
        transToken.key = autoGeneratorKey(transToken);
      }
    }
  });
};
/*翻译Key*/
const translateKey = (transTokens) => {
  let transList = [];
  /*防止重复*/
  let transIndexes = [];
  transTokens.forEach((item, index) => {
    const { isNewAddKey, transValue } = item;
    if (isNewAddKey) {
      transList.push(removeIdentifiers(transValue));
      transIndexes.push(index);
    }
  });
  const { supportLanguages } = combineConfig;
  return batchTranslate(transList, "zh", supportLanguages).then((res) => {
    transIndexes.forEach((transIndex, index) => {
      const item = transTokens[transIndex];
      item.transInfo = res[index];
      const { transValue, transInfo } = item;
      supportLanguages.forEach((language, index) => {
        item[`${language}FileAppend`] = item.keyFileAppend.replace(
          removeIdentifiers(transValue),
          transInfo[language]
        );
      });
    });

    return transTokens;
  });
};
/*
 * 组装翻译Token,需要的资源全部生成号
 * */
const assemblyTransTokens = (transTokens) => {
  transTokens.forEach((item) => {
    const { key, isNewAddKey, transValue, placeHolderVars, type } = item;
    if (isNewAddKey) {
      item.keyFileAppend = `  ${key}: "${removeIdentifiers(transValue)}"`;
    }
    getKeyFileReplace(item);
  });
};
/*
 * 获取替换的文件
 * */
const getKeyFileReplace = (item) => {
  const { transFnStr } = combineConfig;
  const keyPlaceholder = "$KeyPlaceholder";
  const argPlaceholder = "$ArgPlaceholder";
  const notePlaceholder = "$NotePlaceholder";
  const { key, placeHolderVars, transValue, type } = item;
  const getArgs = (placeHolderVars) => {
    let args = "";
    placeHolderVars &&
      placeHolderVars.forEach((item, index) => {
        const argTemplate = `arg${index + 1}:${item},`;
        args += argTemplate;
      });
    if (args) {
      args = args.substring(0, args.length - 1);
      args = `,{${args}}`;
    }
    return args;
  };
  item.keyFileReplace = transFnStr
    .replace(keyPlaceholder, key)
    .replace(argPlaceholder, getArgs(placeHolderVars))
    .replace(notePlaceholder, removeIdentifiers(transValue));
  if (type === JSXSyntax.JSXText) {
    item.keyFileReplace = `{${item.keyFileReplace}}`;
  }
};

/*
 * 获取项目里面的Key
 * */
const getProjectKeyLines = () => {
  let pathObj = {};
  return function (path) {
    const { projectPath } = combineConfig;
    if (path === "" || path == projectPath) {
      return [];
    }
    const pathName = path.split("/").pop();
    if (!pathObj.hasOwnProperty(pathName)) {
      pathObj[pathName] = readFileSyncToLines(path);
    }
    return pathObj[pathName];
  };
};

/*发现历史Key*/
const findProjectKeys = (transValue) => {
  const { projectPath, commonKeyPath, moduleKeyPath } = combineConfig;
  const cachePathFn = getProjectKeyLines();
  const commonLines = cachePathFn(projectPath + commonKeyPath);
  const moduleLines = cachePathFn(projectPath + moduleKeyPath);
  const findKeyFn = (lines) => {
    let findKey = "";
    for (const index in lines) {
      const line = lines[index];
      const { key, label } = transLineObj(line);
      if (removeIdentifiers(transValue) === removeIdentifiers(label)) {
        findKey = key;
        break;
      }
    }
    return findKey;
  };
  let findKey = findKeyFn(commonLines) || findKeyFn(moduleLines);
  return findKey;
};

/*获取翻译值*/
const transLineObj = (line) => {
  let lineObj = {};
  const keyReg = /\".*?\"/;
  lineObj.key = (line.match(keyReg) || [{ 0: "" }])[0];
  const labelWeeds = line.split('": ');
  /*防止空指针*/
  labelWeeds.push("");
  lineObj.label = labelWeeds[1];
  return lineObj;
};
/*移除标识符前缀*/
const removeIdentifiers = (label) => {
  const identifiers = ['"', "'", "`"];
  identifiers.forEach((item) => {
    label = moveLeftAndRightChar(label, item);
  });
  return label;
};

/*自动生成Key*/
const autoGeneratorKey = (item) => {
  const { fileName, index } = item;
  const moduleName = getModuleName(fileName);
  let key = `"${moduleName}.key-${nanoid(6)}${index}"`;
  //todo 重复校验,基于种子条件
  return key;
};

/*获取模块名称*/
const getModuleName = (pathName) => {
  let moduleName = pathName.split("/").pop().replace(".js", "");
  const rootPath = "src/";
  if (pathName.includes("/")) {
    const rootPaths = pathName.split(rootPath)[1].split("/");
    const rootPathsLen = rootPaths.length;
    moduleName = rootPaths[[1, 2, 3].includes(rootPathsLen) ? 0 : 1];
  }
  return moduleName;
};

export { generator };
