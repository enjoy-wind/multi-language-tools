import { parse } from "../../src/parser/index.js";
import { generator } from "../../src/generator/index.js";

let codeTest =
  'import {message} from "./message.js";function perform(){const d={a:"中国"}; return  <div className="btn-wrap">林林{`我是${d.a}我是`+`我是`}<Button type="primary" onClick={this.reload}> {/*重新下载*/}{messages("components.key463"/*重新下载*/)}</Button> <Button type="primary"onClick={this.handleClose}>{/*关闭*/}{messages("components.key461"/*关闭*/)} </Button> </div>}';
/*console.log(parse(codeTest, "code-test.js"));*/
setTimeout(() => {
  console.log(generator(parse(codeTest, "code-test.js")));
}, 10);
