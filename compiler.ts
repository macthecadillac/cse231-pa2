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

  // Next three lines are wat2wasm
  const parsed = wabtApi.parseWat("example", watSource);
  const binary = parsed.toBinary({});
  const wasmModule = await WebAssembly.instantiate(binary.buffer, {});

  // This next line is wasm-interp
  return (wasmModule.instance.exports as any)._start();
}

// (window as any)["runWat"] = run;

type intermediateOutput = { decl: string[], body: string[], builtinTmpMemSize: number };

function codeGenFuncCalls(expr: Expr, n: number): intermediateOutput {
  if (expr.tag != "call") {
    throw new Error(`${expr.tag} is not a function call`);
  }

  const declTmpVar = function(n: number, m: number): string[] {
    if (m > n) {
      return [`(local $___TMP${n} i32)`].concat(declTmpVar(n + 1, m))
    } else {
      return []
    }
  }

  switch (expr.name) {
    case "print":
      throw new Error("Not implemented.");
    case "max": {
      const decl = declTmpVar(n, 2);
      const arg1 = codeGenExpr(expr.arguments[0]).concat(["(local.set $___TMP0)"]);
      const arg2 = codeGenExpr(expr.arguments[1]).concat(["(local.set $___TMP1)"]);
      const body = arg1.concat(arg2).concat([
        "(local.get $___TMP0)",
        "(local.get $___TMP1)",
        "(local.get $___TMP0)",
        "(local.get $___TMP1)",
        "(i32.gt_s)",
        "(select)"
      ]);
      return { decl, body, builtinTmpMemSize: Math.max(2, n) };
    }
    case "min": {
      const decl = declTmpVar(n, 2);
      const arg1 = codeGenExpr(expr.arguments[0]).concat(["(local.set $___TMP0)"]);
      const arg2 = codeGenExpr(expr.arguments[1]).concat(["(local.set $___TMP1)"]);
      const body = arg1.concat(arg2).concat([
        "(local.get $___TMP0)",
        "(local.get $___TMP1)",
        "(local.get $___TMP0)",
        "(local.get $___TMP1)",
        "(i32.lt_s)",
        "(select)"
      ]);
      return { decl, body, builtinTmpMemSize: Math.max(2, n) };
    }
    case "pow": {
      const decl = declTmpVar(n, 4);
      const arg1 = codeGenExpr(expr.arguments[0]).concat(["(local.set $___TMP0)"]);
      const arg2 = codeGenExpr(expr.arguments[1]).concat(["(local.set $___TMP1)"]);
      const body = arg1.concat(arg2).concat([
        "(local $___TMP2 i32)",
        "(local $___TMP3 i32)",
        "(local.get $___TMP0)",
        "(local.set $___TMP2)",
        "(i32.const 1)",
        "(local.set $___TMP3)",
        "(local.get $___TMP1)",
        "(i32.const 1)",
        "(i32.gt_s)",
        "(if",
        "  (then",
        "    (loop",
        "      (local.get $___TMP1)",
        "      (i32.const 2)",
        "      (i32.rem_s)",
        "      (i32.const 0)",
        "      (i32.eq)",
        "      (if",
        "        (then",
        "          (loop",
        "            (local.get $___TMP2)",
        "            (local.get $___TMP2)",
        "            (i32.mul)",
        "            (local.set $___TMP2)",
        "            (local.get $___TMP1)",
        "            (i32.const 2)",
        "            (i32.div_s)",
        "            (local.set $___TMP1)",
        "            (local.get $___TMP1)",
        "            (i32.const 2)",
        "            (i32.rem_s)",
        "            (i32.const 0)",
        "            (i32.eq)",
        "            (i32.const 1)",
        "            (i32.xor)",
        "            (br_if 1)",
        "            (br 0))))",
        "      (local.get $___TMP3)",
        "      (local.get $___TMP0)",
        "      (i32.mul)",
        "      (local.set $___TMP3)",
        "      (local.get $___TMP1)",
        "      (i32.const 1)",
        "      (i32.sub)",
        "      (local.set $___TMP1)",
        "      (local.get $___TMP1)",
        "      (i32.const 1)",
        "      (i32.gt_s)",
        "      (i32.const 1)",
        "      (i32.xor)",
        "      (br_if 1)",
        "      (br 0))))",
        "(local.get $___TMP2)",
        "(local.get $___TMP3)",
        "(i32.mul)",
      ]);
      return { decl, body, builtinTmpMemSize: Math.max(4, n) };
    }
    case "abs": {
      const decl = declTmpVar(n, 1);
      const arg = codeGenExpr(expr.arguments[0]).concat(["(local.set $___TMP0)"]);
      const body = arg.concat([
	    "(local.get $___TMP0)",
	    "(local.get $___TMP0)",
	    "(i32.const -1)",
	    "(i32.mul)",
	    "(local.get $___TMP0)",
	    "(i32.const 0)",
	    "(i32.gt_s)",
	    "(select)",
      ]);
      return { decl, body, builtinTmpMemSize: Math.max(2, n) };
    }
    default: {
      const decl: string[] = [];
      const body = expr.arguments
        .map(codeGenExpr)
        .flat()
        .concat([`(call $${expr.name})`]);
      return { decl, body, builtinTmpMemSize: n };
    }
  }
}

export function codeGenExpr(expr: Expr): Array<string> {
  switch(expr.tag) {
    case "id":
      return [`(local.get $${expr.name})`];
    case "literal": {
      const literal = expr.value;
      switch (literal.tag) {
        case "bool":
          return (literal.value) ? [`(i32.const 1)`] : [`(i32.const 0)`];
        case "number":
          return [`(i32.const ${literal.value})`];
        default:
          throw new Error("None not implemented yet");
      }
    }
    case "call": 
      return expr.arguments
        .map(codeGenExpr)
        .flat()
        .concat([`(call $${expr.name})`]);
    case "uniop": {
      const instr = (() => {
        switch (expr.uniop) {
          case "not":
            return ["(i32.const 1)", "(i32.xor)"]
          case "neg":
            return ["(i32.const -1)", "(i32.mul)"]
        }
      })();
      const argExpr = codeGenExpr(expr.arg);
      return argExpr.concat(instr);
    }
    case "binop": {
      const argExpr1 = codeGenExpr(expr.arg1);
      const argExpr2 = codeGenExpr(expr.arg2);
      const args = argExpr1.concat(argExpr2);
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
      return args.concat([`(i32.${binop})`]);
    }
  }
}

export function hasReturns(stmt: Stmt): boolean {
  switch (stmt.tag) {
    case "if":
      return !stmt.body1.every(s => !hasReturns(s))
          || !stmt.body2.every(s => !hasReturns(s))
          || !stmt.body1.every(s => s.tag != "return")
          || !stmt.body2.every(s => s.tag != "return");
    case "while":
      return !stmt.body.every(s => !hasReturns(s))
          || !stmt.body.every(s => s.tag != "return")
    default:
      return false
  }
}

export function codeGenStmt(stmt: Stmt): string[] {
  switch(stmt.tag) {
    case "define": {
      let inputOutput = stmt.parameters.map(p => `(param $${p.name} i32)`).join(" ");
      // number of define statements
      const n = countDefDeclStmts(stmt.body);
      const defStmts = stmt.body.slice(0, n);
      const rest = stmt.body.slice(n);

      const decls = defStmts.filter(s => s.tag == "assign")
        .map(s => {
          if (s.tag != "assign") { throw new Error("Compiler error. Check code.") }
          return `(local $${s.name} i32)`;
        });
      const defs = defStmts.map(codeGenStmt).flat();
      let preamble = decls.concat(defs).map(s => "    " + s);

      const distBetweenNestedReturn = rest.map((k, i) => [i, k])
        .filter((t: [number, Stmt]) => hasReturns(t[1]))
        .reduce((acc: [number[], number], t: [number, Stmt]) => {
          const arr = acc[0].concat([t[0] - acc[1]]);
          return [arr, t[0]] as [number[], number];
        }, [[], 0])[0];

      // manipulate the AST instead of doing this manually
      const addIfElseEnclosure = function(code: Stmt[], dists: number[]): string[] {
        const n = dists.shift();
        const currSlice = code.slice(0, n + 1);
        const maybeEarlyRet = currSlice.map(codeGenStmt).flat().map(s => "    " + s);

        const remainder = code.slice(n + 1);
        let maybeSkip;
        if (dists.length > 0) {
          maybeSkip = addIfElseEnclosure(remainder, dists).flat().map(s => "    " + s);
        } else {
          maybeSkip = remainder.map(codeGenStmt).flat().map(s => "    " + s);
        }
        maybeSkip[maybeSkip.length - 1] += "))";
        const maybeBlock = ["(local.get $___EARLY_RET)", "(i32.const 1)",
                          "(i32.xor)", "(if", "  (then"]
          .concat(maybeSkip)
          .map(s => "    " + s);

        return maybeEarlyRet.concat(maybeBlock);
      };

      let remainder = (() => {
        if (distBetweenNestedReturn.length > 0) {
          return addIfElseEnclosure(rest, distBetweenNestedReturn);
        } else {
          return rest.map(codeGenStmt).flat().map(s => "    " + s);
        }
      })();

      // if any statement contains nested return statements
      if (!rest.every(s => !hasReturns(s)) || rest[rest.length - 1].tag == "return") {
        inputOutput += " (result i32)";
        preamble.unshift("    (local $___RET_VAL i32)");
        preamble.unshift("    (local $___EARLY_RET i32)");
        preamble.push("    (i32.const 0)");
        preamble.push("    (local.set $___EARLY_RET)");
        remainder.push("    (local.get $___RET_VAL)");
      }
      remainder[remainder.length - 1] += ")";

      return ([`  (func $${stmt.name} ${inputOutput}`]).concat(preamble, remainder);
    }
    case "return": 
      // TODO: see if you can optimize away the last two instructions when there
      // is no branching
      return codeGenExpr(stmt.value).concat([
          "(local.set $___RET_VAL)",
          "(i32.const 1)",
          "(local.set $___EARLY_RET)"
      ]);
    case "assign": {
      return codeGenExpr(stmt.value).concat([`(local.set $${stmt.name})`]);
    }
    case "expr":
      // the typechecker should prevent this EXCEPT for a lone expression at the
      // end of the program which will be implicitly returned
      // TODO: make into a print statement
      return codeGenExpr(stmt.expr).concat(["(local.set $___IMPL_RET)"]);
    case "if": {
      const pred = codeGenExpr(stmt.pred);
      let body1 = stmt.body1.map(codeGenStmt).flat().map(s => "    " + s);
      body1[body1.length - 1] = body1[body1.length - 1] + ")";
      let body2 = stmt.body2.map(codeGenStmt).flat().map(s => "    " + s);
      body2[body2.length - 1] = body2[body2.length - 1] + "))";
      const thenCl = (body1.length > 0) ? "  (then" : "  (then)";
      const elseCl = (body2.length > 0) ? "  (else" : "  (else))";
      return (pred).concat(["(if", thenCl], body1, [elseCl], body2);
    }
    case "while": {
      const pred = codeGenExpr(stmt.pred);
      const body = stmt.body
        .map(codeGenStmt)
        .flat()
        // TODO: remove xor and switch 1 and 0 in br_if and br after writing
        // tests for more optimized code
        .concat(pred, ["(i32.const 1)", "(i32.xor)", "(br_if 1)", "(br 0))))"])
        .map(s => "      " + s);
      return (pred).concat(["(if", "  (then", "    (loop"], body);
    }
    case "pass": return []
  }
}

export function compile(source: string): string {
  const ast = parseProgram(source);
  try {
    typeCheckProgram(ast);
    const vars: Array<string> = [];
    ast.forEach((stmt) => {
      if(stmt.tag === "assign") { vars.push(stmt.name); }
    });
    const funs: Array<string> = [];
    ast.forEach((stmt, i) => {
      if(stmt.tag === "define") { funs.push(codeGenStmt(stmt).join("\n")); }
    });
    const allFuns = funs.join("\n\n");
    const stmts = ast.filter((stmt) => stmt.tag !== "define");
    
    const varDecls: Array<string> = [];
    varDecls.push(`(local $___IMPL_RET i32)`);
    vars.forEach(v => { varDecls.push(`(local $${v} i32)`); });

    const allStmts = stmts.map(codeGenStmt).flat();
    const ourCode = varDecls.concat(allStmts).map(s => "    " + s).join("\n");

    const lastStmt = ast[ast.length - 1];
    const isExpr = lastStmt.tag === "expr";
    const scaffold = [
      "(module",
      allFuns,
      `  (func (export "_start") ${(isExpr) ? "(result i32)" : ""}`,
      (isExpr) ? ourCode : ourCode + "))",
      (isExpr) ? "    (local.get $___IMPL_RET)))" : ""
    ];
    return scaffold.join("\n")
  }
  catch(err) {
    alert(err.message);
    throw new CompilerError();
  }
}
