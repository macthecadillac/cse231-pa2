import { TreeCursor } from 'lezer';
import { varType, Stmt, Expr, Literal, UniOp, BinOp, Type,
         FuncType, countDefDeclStmts } from './ast';
import {
  ArityError,
  BinaryOpTypeError,
  ConditionalExprTypeError,
  DuplicateDeclaration,
  FuncCallTypError,
  GeneralTypeError,
  NotAFunctionOrClass,
  NotAVariable,
  NotDeclaredInScope,
  MissingReturn,
  UniaryOpTypeError,
} from './errors';

export const builtin = new Map;
builtin.set("print", { parameterTypes: ["polymorphic"], outputType: "none" });
builtin.set("abs", { parameterTypes: ["int"], outputType: "int" });
builtin.set("max", { parameterTypes: ["int", "int"], outputType: "int" });
builtin.set("min", { parameterTypes: ["int", "int"], outputType: "int" });
builtin.set("pow", { parameterTypes: ["int", "int"], outputType: "int" });

export function typeCheckStmt(stmt: Stmt,
                              varScope: Map<string, Type>,
                              funcScope: Map<string, FuncType>,
                              retType: Type) {
  buildTypedAST([stmt], varScope, funcScope, retType);
}

// A failure in the typechecking process leads to an unrecoverable failure so we
// might as well throw an error and exit. A pass at this stage however does not
// warrant any action.
export function buildTypedAST(stmts: Stmt[],
                              outerVarScope: Map<string, Type> = new Map,
                              outerFuncScope: Map<string, FuncType> = builtin,
                              retType: Type = "none",
                              strictMode: boolean = false): Stmt[] {
  // All the function definitions and variable declarations must be at the top
  // of the scope. The order of defs or decls doesn't matter--they can even be
  // interweaved, as long as no computation happens before then end of this
  // block. We'll call this the preamble.

  // Get the statement number where the preamble ends
  const n = countDefDeclStmts(stmts);
  
  // extract the assignment and definition statements
  const declBlock = stmts.slice(0, n).filter(x => x.tag == "assign");
  const defBlock = stmts.slice(0, n).filter(x => x.tag == "define");

  // check for deplicate declaration of identifiers
  let idents = new Map; 
  for (const stmt of stmts.slice(0, n)) {
    if (stmt.tag != "assign" && stmt.tag != "define") {
      throw new Error("Compiler error. Check code.")
    };
    if (idents.has(stmt.name)) {
      throw new DuplicateDeclaration(stmt.name)
    };
    if (strictMode) {
      if (outerVarScope.has(stmt.name) || outerFuncScope.has(stmt.name)) {
        throw new DuplicateDeclaration(stmt.name)
      }
    }
    idents.set(stmt.name, stmt);
  }

  // Keep a table of variables and their types
  // Note: definitions in the current scope will overwrite definitions from
  // outerscope if there are conflicts
  const varScope = declBlock.map(stmt => {
      if (stmt.tag != "assign") { throw new Error("Compiler error. Check code.") };
      if (stmt.type_ == "") {
        throw new NotAVariable(stmt.name);
      } else {
        return stmt
      }
    })
    // Merge with outer scope. Overwrite type declarations if necessary.
    .reduce((map: Map<string, Type>, t: varType) => {
      map.set(t.name, t.type_);
      return map
    }, new Map(outerVarScope));

  // Keep a table of all currently defined functions. Overwrite definitions from
  // the outer scope if necessary
  const funcScope = defBlock.reduce((map: Map<string, FuncType>, t) => {
      if (t.tag != "define") { throw new Error("Compiler error. Check code.") };
      const ftype = {
        parameterTypes: t.parameters.map(p => p.type_),
        outputType: t.outputType
      };
      map.set(t.name, ftype);
      return map
    }, new Map(outerFuncScope));

  // Typecheck each statement
  const addTypes = (stmt: Stmt) => {
    switch (stmt.tag) {
      case "assign": {
        // the previous steps registered all the declared variables so if
        // something isn't registered it is not declared
        if (!varScope.has(stmt.name)) {
          throw new NotAVariable(stmt.name);
        }
        const rhsType = inferExprType(stmt.value, varScope, funcScope);
        const lhsType = varScope.get(stmt.name);
        if (rhsType != lhsType) {
          throw new GeneralTypeError(lhsType, rhsType);
        }
        return { ...stmt, value: fillInExprTypeInfo(stmt.value, varScope, funcScope) };
      }
      case "expr": {
        return { ...stmt, expr: fillInExprTypeInfo(stmt.expr, varScope, funcScope) };
      }
      case "define": {
        // ChocoPy functions don't capture variables. Reset scope to be the
        // supplied parameters.
        const varScope = stmt.parameters
          .concat(declBlock as varType[])
          .reduce((map, p) => {
            map.set(p.name, p.type_);
            return map
          }, new Map);

        // check statements in the body, including matching return types to the
        // stated output type
        try {
          buildTypedAST(stmt.body, varScope, funcScope, stmt.outputType);
        }
        catch(err) {
          if (err instanceof NotAVariable) {
            if (varScope.has(err.varName)) {
              throw new NotDeclaredInScope(err.varName);
            }
          }
          throw err;
        }

        checkReturnType(stmt.name, stmt.body, varScope, funcScope, stmt.outputType);

        const body = buildTypedAST(stmt.body, varScope, funcScope, stmt.outputType);
        return { ...stmt, body };
      }
      case "return": {
        const t = inferExprType(stmt.value, varScope, funcScope);
        if (retType != t) {
          throw new GeneralTypeError(retType, t);
        }
        return { ...stmt, value: fillInExprTypeInfo(stmt.value, varScope, funcScope) };
      }
      case "if": {
        const t = inferExprType(stmt.pred, varScope, funcScope);
        if (t != "bool") {
          throw new ConditionalExprTypeError(t);
        }
        const pred = fillInExprTypeInfo(stmt.pred, varScope, funcScope);
        const body1 = buildTypedAST(stmt.body1, varScope, funcScope, retType);
        const body2 = buildTypedAST(stmt.body2, varScope, funcScope, retType);
        return { ...stmt, pred, body1, body2 };
      }
      case "while": {
        const t = inferExprType(stmt.pred, varScope, funcScope);
        if (t != "bool") {
          throw new ConditionalExprTypeError(t);
        }
        const pred = fillInExprTypeInfo(stmt.pred, varScope, funcScope);
        const body = buildTypedAST(stmt.body, varScope, funcScope, retType);
        return { ...stmt, pred, body };
      }
      case "pass": {
        return stmt
      }
    };
  }

  return stmts.map(addTypes);
}

export function checkReturnType(name: string,
                                stmts: Stmt[],
                                varScope: Map<string, Type>,
                                funcScope: Map<string, FuncType>,
                                retType: Type) {
  const checkLastStmtRetType = () => {
    // stmts.length == 0 should be caught be a ParseError
    const lastStmt = stmts[stmts.length - 1];
    if (lastStmt.tag == "return") {
      const t = inferExprType(lastStmt.value, varScope, funcScope);
      if (retType != t) {
        throw new GeneralTypeError(retType, t);
      }
    } else {  // no return since "return" is always the last statement
      if (retType != "none") {
        throw new MissingReturn(name);
      }
    }
  };

  // no nested statements (aside from func defs, which don't count)
  if (stmts.every(s => s.tag != "if" && s.tag != "while")) {
    checkLastStmtRetType();
  // There exists at least one if or while statement in the array
  } else {
    try {
      // check nested statements
      const stmtGroups = stmts.filter(s => s.tag == "if" || s.tag == "while")
        .map(s => {
          switch (s.tag) {
            case "if":
              return [s.body1, s.body2];
            case "while":
              return [s.body];
          }
        })
        .flat();
      for (const s of stmtGroups) {
        checkReturnType(name, s, varScope, funcScope, retType);
      }
    }
    catch (err) {
      if (err instanceof MissingReturn) {
        checkLastStmtRetType();
      }
    }
  }
}

function fillInExprTypeInfo(expr: Expr,
                            varScope: Map<string, Type>,
                            funcScope: Map<string, FuncType>): Expr {
  // leverage the type chekcing code in the inference algorithm
  switch (expr.tag) {
    case "call": {
      const args = expr.arguments.map(e => fillInExprTypeInfo(e, varScope, funcScope));
      const type_ = inferExprType(expr, varScope, funcScope);
      return { ...expr, arguments: args, type_ };
    }
    case "uniop": {
      const arg = fillInExprTypeInfo(expr.arg, varScope, funcScope);
      const type_ = inferExprType(expr, varScope, funcScope);
      return { ...expr, arg, type_ };
    }
    case "binop": {
      const arg1 = fillInExprTypeInfo(expr.arg1, varScope, funcScope);
      const arg2 = fillInExprTypeInfo(expr.arg2, varScope, funcScope);
      const type_ = inferExprType(expr, varScope, funcScope);
      return { ...expr, arg1, arg2, type_ };
    }
    case "parens": {
      const e = fillInExprTypeInfo(expr.expr, varScope, funcScope);
      const type_ = inferExprType(expr, varScope, funcScope);
      return { ...expr, expr: e, type_ };
    }
    default:
      return { ...expr, type_: inferExprType(expr, varScope, funcScope) };
  }
}

export function inferExprType(expr: Expr,
                              varScope: Map<string, Type>,
                              funcScope: Map<string, FuncType>): Type {
  switch (expr.tag) {
    case "literal": {
      const literal = expr.value;
      return (literal.tag == "number") ? "int" : literal.tag as Type;
    }
    case "id": {
      if (varScope.has(expr.name)) {
        return varScope.get(expr.name);
      } else {
        throw new NotAVariable(expr.name);
      }
    }
    case "call": {
      if (funcScope.has(expr.name)) {
        const ftype = funcScope.get(expr.name);
        // check that the function arity matches the number of parameters
        // supplied
        if (ftype.parameterTypes.length != expr.arguments.length) {
          throw new ArityError(ftype.parameterTypes.length, expr.arguments.length);
        }
        // check parameter types
        const zipped: [number, Type, Expr][] =
          ftype.parameterTypes.map((k, i) => [i, k, expr.arguments[i]]);
        for (const tuple of zipped) {
          const paramN = tuple[0];
          const t1 = tuple[1];
          const t2 = inferExprType(tuple[2], varScope, funcScope);
          if (t1 != t2 && t1 != "polymorphic") {
            throw new FuncCallTypError(t1, t2, paramN);
          }
        }
        return ftype.outputType;
      } else {
        throw new NotAFunctionOrClass(expr.name);
      }
    }
    case "uniop": {
      const t = inferExprType(expr.arg, varScope, funcScope);
      switch (expr.uniop) {
        case "not": {
          if (t != "bool") {
            throw new UniaryOpTypeError("not", t)
          } else {
            return "bool";
          }
        }
        case "neg": {
          if (t != "int") {
            throw new UniaryOpTypeError("neg", t);
          } else {
            return "int";
          }
        }
      }
    }
    case "binop": {
      const t1 = inferExprType((expr as { arg1: Expr }).arg1, varScope, funcScope);
      const t2 = inferExprType((expr as { arg2: Expr }).arg2, varScope, funcScope);
      const intOps = ["+", "-", "*", "//", "%", "==", "!=", ">=", "<=", ">", "<"];
      if (intOps.includes((expr as { binop: BinOp }).binop)) {
        if (t1 != "int" || t2 != "int") {
          const op = (expr as {binop: BinOp}).binop;
          throw new BinaryOpTypeError(op, t1, t2);
        } else {
          if ((["+", "-", "*", "//", "%"]).includes(expr.binop)) {
            return "int";
          } else {
            return "bool";
          }
        }
      // the "is" operator
      } else {
        if (t1 == "int" || t1 == "bool" || t2 == "int" || t2 == "bool") {
          throw new BinaryOpTypeError("is", t1, t2)
        } else {
          return "bool";
        }
      }
    }
    case "parens": 
      return inferExprType(expr.expr, varScope, funcScope);
  }
}
