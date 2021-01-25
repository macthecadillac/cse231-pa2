import { statSync } from 'fs';
import wabt from 'wabt';
import { Stmt, Expr, countDefDeclStmts } from './ast';
import { parseProgram, traverseExpr } from './parser';
import { typeCheckProgram } from './typechecker';
import { CompilerError } from './errors';

export async function runPython(pythonSrouce: string): Promise<number> {
  const wat = compile(pythonSrouce);
  return run(wat)
}

export async function run(watSource: string): Promise<number> {
  const wabtApi = await wabt();
  const importObject = {
    imports: {
      // we typically define print to mean logging to the console. To make testing
      // the compiler easier, we define print so it logs to a string object.
      //  We can then examine output to see what would have been printed in the
      //  console.
      print: (arg : any) => {
        importObject.output += arg;
        importObject.output += "\n";
        return arg;
      },
      pow: (x: number, y: number) => {
        return Math.pow(x, y)
      },
    },

    output: ""
  };

  // Next three lines are wat2wasm
  const parsed = wabtApi.parseWat("example", watSource);
  const binary = parsed.toBinary({});
  const wasmModule = await WebAssembly.instantiate(binary.buffer, importObject as any);

  // This next line is wasm-interp
  return (wasmModule.instance.exports as any)._start();
}

// (window as any)["runWat"] = run;

function declTmpVar(n: number, m: number): string[] {
  if (m > n) {
    return [`(local $___TMP${n} i32)`].concat(declTmpVar(n + 1, m))
  } else {
    return []
  }
}

export function nestedRets(stmt: Stmt): boolean {
  switch (stmt.tag) {
    case "if":
      return !stmt.body1.every(s => !nestedRets(s))
          || !stmt.body2.every(s => !nestedRets(s))
          || !stmt.body1.every(s => s.tag != "return")
          || !stmt.body2.every(s => s.tag != "return");
    case "while":
      return !stmt.body.every(s => !nestedRets(s))
          || !stmt.body.every(s => s.tag != "return")
    default:
      return false
  }
}

class watBuilder {
  defs: string[];
  decl: string[];
  body: string[];
  stackSize: number;
  printLast: boolean;

  constructor() {
    this.defs = [];
    this.decl = [];
    this.body = [];
    this.stackSize = 0;
    this.printLast = false;
  }

  addInstr(instr: string[]): watBuilder {
    this.body = this.body.concat(instr);
    return this
  }

  addDecl(decl: string[]): watBuilder {
    this.decl = this.decl.concat(decl);
    return this
  }

  setStackSize(size: number): watBuilder {
    this.stackSize = size;
    return this
  }

  toCode(): string[] {
      return this.decl.concat(this.body);
  }

  addExpr(expr: Expr): watBuilder {
    switch(expr.tag) {
      case "id":
        return this.addInstr([`(local.get $${expr.name})`]);
      case "literal": {
        const literal = expr.value;
        switch (literal.tag) {
          case "bool":
            const s = (literal.value) ? [`(i32.const 1)`] : [`(i32.const 0)`];
            return this.addInstr(s);
          case "number":
            return this.addInstr([`(i32.const ${literal.value})`]);
          default:
            throw new Error("None not implemented yet");
        }
      }
      case "call": 
        return this.addCall(expr);
      case "uniop": {
        const instr = (() => {
          switch (expr.uniop) {
            case "not":
              return ["(i32.const 1)", "(i32.xor)"]
            case "neg":
              return ["(i32.const -1)", "(i32.mul)"]
          }
        })();
        return this.addExpr(expr.arg).addInstr(instr);
      }
      case "binop": {
        const binop = (() => {
          switch (expr.binop) {
            case "+": return "add";
            case "-": return "sub";
            case "*": return "mul";
            case "//": return "div_s";
            case "%": return "rem_s";
            case "==": return "eq";
            case "!=": return "neq";
            case "<=": return "le_s";
            case ">=": return "ge_s";
            case "<": return "lt_s";
            case ">": return "gt_s";
            case "is": throw new Error("Not implemented");
          }
        })();
        return this.addExpr(expr.arg1)
                   .addExpr(expr.arg2)
                   .addInstr([`(i32.${binop})`]);
      }
      case "parens": 
        return this.addExpr(expr.expr);
    }
  }

  addMaxInline(arg1: Expr, arg2: Expr): watBuilder {
    console.log(this);
    console.log(arg1);
    console.log(this.addExpr(arg1));
    console.log(this.addInstr(["(local.set $___TMP0)"]));
    const tmp = this.addExpr(arg1)
                    .addInstr(["(local.set $___TMP0)"])
                    .addExpr(arg2)
                    .addInstr([
                       "(local.set $___TMP1)",
                       "(local.get $___TMP0)",
                       "(local.get $___TMP1)",
                       "(local.get $___TMP0)",
                       "(local.get $___TMP1)",
                       "(i32.gt_s)",
                       "(select)"
                     ]);
    return tmp.addDecl(declTmpVar(tmp.stackSize, 2))
              .setStackSize(Math.max(2, tmp.stackSize));
  }

  addMinInline(arg1: Expr, arg2: Expr): watBuilder {
    const tmp = this.addExpr(arg1)
                    .addInstr(["(local.set $___TMP0)"])
                    .addExpr(arg2)
                    .addInstr([
                       "(local.set $___TMP1)",
                       "(local.get $___TMP0)",
                       "(local.get $___TMP1)",
                       "(local.get $___TMP0)",
                       "(local.get $___TMP1)",
                       "(i32.lt_s)",
                       "(select)"
                     ]);
    return tmp.addDecl(declTmpVar(tmp.stackSize, 2))
              .setStackSize(Math.max(2, tmp.stackSize));
  }

  addAbsInline(arg: Expr): watBuilder {
    const tmp = this.addExpr(arg)
                    .addInstr(["(local.set $___TMP0)",
                               "(local.get $___TMP0)",
                               "(local.get $___TMP0)",
                               "(i32.const -1)",
                               "(i32.mul)",
                               "(local.get $___TMP0)",
                               "(i32.const 0)",
                               "(i32.gt_s)",
                               "(select)"]);
    return tmp.addDecl(declTmpVar(tmp.stackSize, 1))
              .setStackSize(Math.max(1, tmp.stackSize));
  }

  addCall(expr: Expr): watBuilder {
    if (expr.tag != "call") {
      throw new Error(`${expr.tag} is not a function call`);
    }
  
    switch (expr.name) {
      case "max": return this.addMaxInline(expr.arguments[0], expr.arguments[1]);
      case "min": return this.addMinInline(expr.arguments[0], expr.arguments[1]);
      case "abs": return this.addAbsInline(expr.arguments[0]);
      default: 
        return expr.arguments.reduce((acc, e) => acc.addExpr(e), this)
                             .addInstr([`(call $${expr.name})`]);
    }
  }

  // FIXME: add support for nested functions
  addFunc(stmt: Stmt): watBuilder {
    if (stmt.tag != "define") {
      throw new Error("Compiler error. Check code.");
    }

    // number of define statements
    const n = countDefDeclStmts(stmt.body);
    const defStmts = stmt.body.slice(0, n);
    const rest = stmt.body.slice(n);

    const iout = defStmts
      .filter(s => s.tag == "assign")
      .reduce((acc, s) => {
        if (s.tag != "assign") { throw new Error("Compiler error. Check code.") }
        return acc.addStmt(s)
                  .addDecl([`(local $${s.name} i32)`]);
      }, new watBuilder);

    // distances between early return statements
    const ds = rest.map((k, i) => [i, k])
      .filter((t: [number, Stmt]) => nestedRets(t[1]))
      .reduce((acc: [number[], number], t: [number, Stmt]) => {
        const arr = acc[0].concat([t[0] - acc[1]]);
        return [arr, t[0]] as [number[], number];
      }, [[], 0])[0];

    const earlyRet = function(code: Stmt[], dists: number[]): Stmt[] {
      const n = dists.shift();
      const currSlice = code.slice(0, n + 1);
      const remainder = code.slice(n + 1);

      if (remainder.length == 0) {
        return currSlice
      } else {
        const s: Stmt = {
          tag: "if",
          pred: {
            tag: "binop",
            binop: "==",
            arg1: { tag: "id", name: "___EARLY_RET" },
            arg2: { tag: "literal", value: { tag: "number", value: 0 } }
          },
          body1: (dists.length > 0) ? earlyRet(remainder, dists) : remainder,
          body2: []
        };
        return currSlice.concat([s]);
      }
    };

    const hasRet = (r: Stmt[]) =>
      !r.every(s => !nestedRets(s)) || r[r.length - 1].tag == "return";

    const iout2 =
        iout.addDecl(hasRet(rest) ? ["(local $___RET_VAL i32)",
                                     "(local $___EARLY_RET i32)",
                                     "(i32.const 0)",
                                     "(local.set $___EARLY_RET)"] : [])
            .addStmts((ds.length > 0) ? earlyRet(rest, ds) : rest)
            .addInstr(hasRet(rest) ? ["(local.get $___RET_VAL)"] : []);
    iout2.body[iout2.body.length - 1] += ")";

    // if any statement contains return statements
    const inputOutput = stmt.parameters
      .map(p => `(param $${p.name} i32)`)
      .concat(hasRet(rest) ?  [" (result i32)"] : [])
      .join(" ");

    this.defs = ([`(func $${stmt.name} ${inputOutput}`]).concat(iout2.toCode());
    return this
  }

  addStmts(stmts: Stmt[]): watBuilder {
    if (stmts.length == 0) {
      return this
    } else {
      if (stmts[stmts.length - 1].tag == "expr") {
        this.printLast = true;
      }
      return stmts.reduce((acc, s) => acc.addStmt(s), this);
    }
  }

  addStmt(stmt: Stmt): watBuilder {
    switch(stmt.tag) {
      case "define": 
        return this.addFunc(stmt);
      case "return": 
        // TODO: see if you can optimize away the last two instructions when there
        // is no branching
        return this.addExpr(stmt.value)
                   .addInstr(["(local.set $___RET_VAL)",
                              "(i32.const 1)",
                              "(local.set $___EARLY_RET)"]);
      case "assign": {
        return this.addExpr(stmt.value)
                   .addInstr([`(local.set $${stmt.name})`]);
      }
      case "expr":
        // the typechecker should prevent this EXCEPT for a lone expression at the
        // end of the program which will be implicitly returned
        // TODO: make into a print statement
        return this.addExpr(stmt.expr)
                   .addInstr(["(local.set $___IMPL_RET)"]);
      case "if": {
        const tmp = this.addExpr(stmt.pred)
                        .addInstr(["(if", "(then"])  // typechecker disallows empty body1
                        .addStmts(stmt.body1);
        tmp.body[tmp.body.length - 1] = tmp.body[tmp.body.length - 1] + ")";

        if (stmt.body2.length > 0) {
          const tmp_ = tmp.addInstr(["(else"])
                          .addStmts(stmt.body2);
          tmp_.body[tmp_.body.length - 1] = tmp_.body[tmp_.body.length - 1] + "))";
          return tmp_
        } else {
          tmp.body[tmp.body.length - 1] = tmp.body[tmp.body.length - 1] + ")";
          return tmp
        }
      }
      case "while": {
        // TODO: remove xor and switch 1 and 0 in br_if and br after writing
        // tests for more optimized code
        return this.addExpr(stmt.pred)
                   .addInstr(["(if", "(then", "(loop"])
                   .addStmts(stmt.body)
                   .addExpr(stmt.pred)
                   .addInstr(["(i32.const 1)", "(i32.xor)", "(br_if 1)", "(br 0))))"]);
      }
      case "pass": return this
    }
  }
}

// so us mere humans can understand the output
function indent(code: string[]): string[] {
  const indented: [number, string[]] =
    code.reduce((acc: [number, string[]], s: string) => {
      let cnt = 0;
      for (const c of s) {
        if (c == "(") {
          cnt += 1;
        } else if (c == ")") {
          cnt -= 1;
        }
      }
      const indentLvl = cnt + acc[0];
      const code_ = acc[1].concat(["  ".repeat(acc[0]) + s]);
      return [indentLvl, code_] as [number, string[]]
    }, [0, []]);
  return indented[1];
};

export function compile(source: string): string {
  const ast = parseProgram(source);
  typeCheckProgram(ast);

  // number of define statements
  const n = countDefDeclStmts(ast);
  const defStmts = ast.slice(0, n);
  const rest = ast.slice(n);

  const iout = defStmts
    .filter(s => s.tag == "assign")
    .reduce((acc, s) => {
      if (s.tag != "assign") { throw new Error("Compiler error. Check code.") }
      return acc.addStmt(s)
                .addDecl([`(local $${s.name} i32)`]);
    }, new watBuilder)
    .addStmts(defStmts.filter(s => s.tag == "define"))
    .addStmts(rest);

  let progBody = iout.decl.concat(iout.body);
  if (!iout.printLast) {
    progBody[progBody.length - 1] += "))";
  }
  const out = (iout.printLast) ? "(result i32)" : "";

  const code = ["(module"].concat(
    [`(func $print (import "imports" "print") (param i32) (result i32))`],
    [`(func $pow (import "imports" "pow") (param i32) (param i32) (result i32))`],
    iout.defs,
    [`(func (export "_start") ${out}`],
    ["(local $___IMPL_RET i32)"],
    progBody,
    (iout.printLast) ? ["(local.get $___IMPL_RET)))"] : [""]
  );

  return indent(code).join("\n");
}
