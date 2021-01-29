import { run, importObject } from "./runner";
import { Type, FuncType } from "./ast";
import { watBuilder, compile } from "./compiler";
import { buildTypedAST, builtin } from "./type";
import { parseProgram } from "./parser";

export class REPL {
  intermediateOutput: watBuilder;
  env: typeof importObject;
  varScope: Map<string, Type>;
  funcScope: Map<string, FuncType>;

  constructor() {
    this.intermediateOutput = new watBuilder([], true);
    this.env = importObject;
    this.varScope = new Map;
    this.funcScope = builtin;
  }

  async run(source: string): Promise<[Promise<number>, string]> {
    const astPart = parseProgram(source);
    const typedASTPart = buildTypedAST(astPart, this.varScope,
                                       this.funcScope, "none", true);
    for (const stmt of typedASTPart) {
      if (stmt.tag == "assign") {
        if (!this.varScope.has(stmt.name)) {
          this.varScope.set(stmt.name, stmt.type_);
          this.intermediateOutput.addDecl([`(local $${stmt.name} i32)`]);
        }
      } else if (stmt.tag == "define") {
        if (!this.funcScope.has(stmt.name)) {
          const params = stmt.parameters.map(s => s.type_);
          this.funcScope.set(stmt.name, { parameterTypes: params,
                                          outputType: stmt.outputType});
          this.intermediateOutput.addDef(stmt);
        }
      }
    }

    const wb = new watBuilder([], true);
    wb.replGlobalVarMap = this.intermediateOutput.replGlobalVarMap;
    wb.topLevel = true;
    wb.nextPtr = this.intermediateOutput.nextPtr;
    wb.addStmts(typedASTPart);
    this.intermediateOutput.nextPtr = wb.nextPtr;
    // grow memory when necessary
    if (wb.nextPtr >= this.env.env.size * 64000) {
      this.env.env.heap.grow(this.env.env.size);
      this.env.env.size *= 2;
    }
    wb.defs = this.intermediateOutput.defs;
    wb.decl = this.intermediateOutput.decl;
    const wat = wb.toWat();
    return [run(wat, this.env), wat];
  }
}
