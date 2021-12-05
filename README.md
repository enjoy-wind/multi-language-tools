# multi-language

Function, performance, experience one-stop multi-language script.

# ✨ Features

![](multi-language-usage.gif)

# 🔨 Usage

```mjs
import { start } from "multi-language-tools/src/index.js";
/*翻译配置*/
const config = {
  projectPath: "", //项目路径根路径
  entryPaths: [], //入口文件目录，相对路径
  commonKeyPath: "src/static/i18n/zh_CN/common.json",
  moduleKeyPath: "src/static/i18n/zh_CN/index2.json",
  excludedPaths: [],
};
start(config, transHook); //transHook可以参考本项目hooks/index.js文件projectIntegrationHooks函数
```

# Notice

## Currently, nested template strings are not supported.

For example:
Error : `中国${arg1+`嵌套美国`}`

Right: const arg2=`${arg1}嵌套美国`; `中国${arg2}`;
