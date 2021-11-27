/**
 * 枚举定义工具
 * 示例：
 * const FILE = createEnum({
 *     ENCODING_FORMAT: ['utf-8', '编码格式'],
 * })
 * 获取枚举值：FILE.ENCODING_FORMAT
 * 获取枚举描述：FILE.getDesc('ENCODING_FORMAT')
 * 通过枚举值获取描述：FILE.getDescFromValue(FILE.ENCODING_FORMAT)
 *
 */
const createEnum = (definition) => {
  const strToValueMap = {};
  const numToDescMap = {};
  for (const enumName of Object.keys(definition)) {
    const [value, desc] = definition[enumName];
    strToValueMap[enumName] = value;
    numToDescMap[value] = desc;
  }
  return {
    ...strToValueMap,
    getDesc(enumName) {
      return (definition[enumName] && definition[enumName][1]) || "";
    },
    getDescFromValue(value) {
      return numToDescMap[value] || "";
    },
  };
};
/*
 * 检查中文
 * @params str
 * @return true 中文 || false 不包含中文
 * */
const checkChinese = (str) => {
  /*过滤中文字符*/
  str = str
    .split("")
    .filter((char) => /\p{Script=Han}/u.test(char))
    .join("");
  const chineseReg = /[\u4e00-\u9fa5]/g;
  if (chineseReg.test(str)) {
    return true;
  } else {
    return false;
  }
};
/*
 * 移除首位相同字符
 * */
const moveLeftAndRightChar = (str, removeChar) => {
  if (str) {
    const strLen = str.length;
    if (str.charAt(0) === removeChar && str.charAt(strLen - 1) === removeChar) {
      return str.substr(1, strLen - 2);
    }
  }
  return str;
};
export { createEnum, checkChinese, moveLeftAndRightChar };
