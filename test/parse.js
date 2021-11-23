import { parse } from "../src/parser/index.js";

let codeTest =
  'function perform(){const d="中国"; return  <div className="btn-wrap">林{`我是${d}我是`+`我是`}<Button type="primary" onClick={this.reload}> {/*重新下载*/}{messages("components.key463"/*重新下载*/)}</Button> <Button type="primary"onClick={this.handleClose}>{/*关闭*/}{messages("components.key461"/*关闭*/)} </Button> </div>}';
console.log(parse(codeTest, "code-test.js"));
