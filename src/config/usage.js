export default {
  version: "1.0.1",
  projectPath: "/Users/ylhong/Desktop/project/study/multi-language-tools",
  entryPaths: ["/test/generator", "/src/index.js"],
  frameType: "react", //小写
  importModuleCodeStr: "",
  commonKeyPath: "/test/generator/common.json",
  moduleKeyPath: "/test/generator/module.json",
  transFnStr:
    "this.messages($KeyPlaceholder$ArgPlaceholder)/*$NotePlaceholder*/",
  googleTranslation: true,
  excludedPaths: [],
  supportLanguages: ["en", "ja"] /*支持的语言*/,
};
