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
  if (escape(str).indexOf("%u") < 0) {
    return false;
  } else {
    return true;
  }
};
export { createEnum, checkChinese };
