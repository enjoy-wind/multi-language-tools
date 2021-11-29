/*这是一个测试类*/
class test {
  constructor() {
    const variable1 = "china";
    const variable2 = "加油";
    const tmp = 11;
    let template = `哈哈 ${variable1}${variable2}`;
    let chineseSymbols = "。";
    let templateRepeat = `哈哈 ${tmp}${variable2}`;
  }

  fnZh = () => "阳";
  fnEn = () => "yang";

  render() {
    return <div>JSX测试</div>;
  }
}
//注释测试
console.warn("洪");
