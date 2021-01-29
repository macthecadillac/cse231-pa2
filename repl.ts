import { run } from "./runner";
import { Type, FuncType } from "./ast";
import { watBuilder, compile } from "./compiler";
import { buildTypedAST, builtin } from "./type";
import { parseProgram } from "./parser";

export class REPL {
  intermediateOutput: watBuilder;
  memory: WebAssembly.Memory;
  varMap: Map<string, number>;
  varScope: Map<string, Type>;
  funcScope: Map<string, FuncType>;

  constructor() {
    this.intermediateOutput = new watBuilder;
    this.memory = new WebAssembly.Memory({ initial: 10 });
    this.varMap = new Map;
    this.varScope = new Map;
    this.funcScope = builtin;
  }

  async run(source: string): Promise<any> {
    const astPart = parseProgram(source);
    const typedASTPart = buildTypedAST(astPart, this.varScope, this.funcScope);
  }
}
