import { TreeCursor } from 'lezer';
import {parser} from 'lezer-python';
import {varType, Stmt, Expr, Literal, UniOp, BinOp, Type} from './ast';
import { ParseError } from './errors';

export function parseProgram(source: string): Array<Stmt> {
  const t = parser.parse(source).cursor();
  // The top node in the program is a Script node with a list of children
  // that are various statements
  t.firstChild();
  return parseFollowingStmts(source, t);
}

export function parseFollowingStmts(s: string, t: TreeCursor): Array<Stmt> {
  const stmts = [];
  do {
    const stmt = traverseStmt(s, t);
    if (stmt !== undefined) {
      stmts.push(stmt);
      // drop all statements after pass or early return
      if (stmt.tag == "pass" || stmt.tag == "return") {
        break
      }
    }
  } while(t.nextSibling()); // t.nextSibling() returns false when it reaches
                            //  the end of the list of children
  return stmts;
}

/*
  Invariant – t must focus on the same node at the end of the traversal
*/
export function traverseStmt(s: string, t: TreeCursor): Stmt {
  switch(t.type.name) {
    case "ReturnStatement": {
      t.firstChild();  // Focus return keyword
      t.nextSibling(); // Focus expression
      const value = traverseExpr(s, t);
      t.parent();
      return { tag: "return", value };
    }
    case "AssignStatement": {
      t.firstChild(); // focused on name (the first child)
      const name = s.substring(t.from, t.to);
      t.nextSibling(); // the declared type (if any)
      const type_ = (function() {
        if (t.firstChild()) {  // : in the type declaration
          t.nextSibling(); // the actual declared type
          const substr = s.substring(t.from, t.to);
          t.parent();
          if (substr == "bool" || substr == "int") {
            return substr;
          }
        }
        return "";
      })();
      t.nextSibling(); // focused on = sign. May need this for complex tasks, like +=!
      t.nextSibling(); // focused on the value expression

      const value = traverseExpr(s, t);
      t.parent();

      // Chocopy doesn't allow a non-literal on the rhs of variable declaration
      // and treats them as parse errors.
      if (type_ != "" && value.tag != "literal") {
        switch (value.tag) {
          case "id": throw new ParseError(`IDENTIFIER: ${value.name}`);
          case "call": throw new ParseError(`IDENTIFIER: ${value.name}`);
          case "binop":
            switch (value.binop) {
              case "+": throw new ParseError("PLUS: +");
              case "-": throw new ParseError("MINUS: -");
              case "*": throw new ParseError("TIMES: *");
              case "//": throw new ParseError("IDIV: //");
              case "%": throw new ParseError("MOD: %");
              case "==": throw new ParseError("EQEQ: ==");
              case "!=": throw new ParseError("NEQ: !=");
              case "<": throw new ParseError("LT: <");
              case ">": throw new ParseError("GT: >");
              case "<=": throw new ParseError("LEQ: <=");
              case ">=": throw new ParseError("GEQ: >=");
              case "is": throw new ParseError("IS: is");
            }
          case "uniop":
            switch (value.uniop) {
              case "neg": throw new ParseError("MINUS: -");
              case "not": throw new ParseError("NOT: not");
            }
          case "parens": throw new ParseError("LPAREN: (");
        }
      }

      return { tag: "assign", name, type_, value };
    }
    case "ExpressionStatement": {
      t.firstChild(); // The child is some kind of expression, the
                      // ExpressionStatement is just a wrapper with no information
      const expr = traverseExpr(s, t);
      t.parent();
      return { tag: "expr", expr: expr };
    }
    case "IfStatement": {
      t.firstChild();  // if statement

      const traverseIfs = function(s: string, t: TreeCursor): Stmt[] {
        if ((["if", "elif"]).includes(t.node.type.name)) {
          t.nextSibling(); // the predicate
          const pred = traverseExpr(s, t);
          if (pred === undefined) {
            throw new ParseError("COLON: :")
          }

          t.nextSibling(); // the body
          t.firstChild();  // : before the body
          t.nextSibling(); // the first statement of the body
          const body1 = parseFollowingStmts(s, t);
          // Body immediately after if cannot be empty
          if (body1.length == 0) {
            throw new ParseError("DEDENT");
          }

          t.parent(); // Body
          t.nextSibling(); // elif/else (if any)
          return [{ tag: "if", pred, body1, body2: traverseIfs(s, t) }];
        } else if (t.node.type.name == "else") {  // else
          t.nextSibling(); // the body
          t.firstChild();  // : before the body
          t.nextSibling(); // the first statement of the body
          const body = parseFollowingStmts(s, t);
          t.parent();
          return body
        } else {
          // no else
          return [];
        }
      };
      const ifstmt = traverseIfs(s, t);
      t.parent();
      return ifstmt[0];
    }
    case "WhileStatement": {
      t.firstChild();  // while
      t.nextSibling(); // predicate
      const pred = traverseExpr(s, t);
      if (pred === undefined) {
        throw new ParseError("COLON: :")
      }
      t.nextSibling(); // Body
      t.firstChild();  // colon
      t.nextSibling(); // statement
      const body = parseFollowingStmts(s, t);
      if (body.length == 0) {
        throw new ParseError("DEDENT");
      }
      t.parent();
      t.parent();
      return { tag: "while", pred, body }
    }
    case "PassStatement": return { tag: "pass" };
    case "FunctionDefinition":
      t.firstChild();  // Focus on def
      t.nextSibling(); // Focus on name of function
      const name = s.substring(t.from, t.to);
      t.nextSibling(); // Focus on ParamList
      const parameters = traverseParameters(s, t)
      t.nextSibling();
      const outputType = (() => {
        if (t.node.type.name == "TypeDef") {
          t.firstChild();
          t.nextSibling(); // the actual declared type
          const substr = s.substring(t.from, t.to);
          t.parent();
          if (substr == "bool" || substr == "int") {
            return substr;
          }
          t.nextSibling(); // Focus on Body
        } else {
          return "none";
        }
      })();
      t.nextSibling();  // Focus on :
      t.firstChild();
      t.nextSibling();
      const body = parseFollowingStmts(s, t);
      // nested defs don't count
      if (body.filter(s => s.tag != "define").length == 0) {
        throw new ParseError("DEDENT")
      };
      t.parent();      // Pop to Body
      t.parent();      // Pop to FunctionDefinition
      return { tag: "define", name, parameters, outputType, body }
  }
}

export function traverseParameters(s: string, t: TreeCursor): Array<varType> {
  const parameters = [];
  t.firstChild();  // Focuses on open paren
  do {
    t.nextSibling(); // Focuses on a VariableName
    const name = s.substring(t.from, t.to);
    if (name == ")") {
      break
    }
    t.nextSibling(); // Focuses on a typedef, if any
    if (t.node.type.name == "TypeDef") {
      t.firstChild();  // : in the type declaration
      t.nextSibling(); // the actual declared type
      const type_ = s.substring(t.from, t.to) as Type;
      t.parent();      // back to parameter
      parameters.push({ name, type_ });
    } else {
      throw new Error(`Parse error near token RPAREN: ${s.substring(t.node.from, t.node.to)}`);
    }
    t.nextSibling(); // Focus on , or )
  } while (s.substring(t.from, t.to) != ")");
  t.parent();      // Pop to ParamList
  return parameters
}

export function traverseExpr(s: string, t: TreeCursor): Expr {
  switch(t.type.name) {
    case "Number":
      return {
        tag: "literal",
        value: {
          tag: "number",
          value: Number(s.substring(t.from, t.to)) },
        type_: "int"
      };
    case "Boolean": {
      const bool = (() => {
        switch (s.substring(t.from, t.to)) {
          case "True": return true;
          case "False": return false;
        }
      })();
      return {
        tag: "literal",
        value: {
          tag: "bool",
          value: bool
        },
        type_: "bool"
      };
    }
    case "None": {
      return {
        tag: "literal",
        value: { tag: "none" },
        type_: "none"
      }
    }
    case "VariableName":
      return { tag: "id", name: s.substring(t.from, t.to), type_: "" };
    case "CallExpression": {
      t.firstChild(); // Focus name
      const name = s.substring(t.from, t.to);
      t.nextSibling(); // Focus ArgList
      t.firstChild(); // Focus open paren

      const argList = [];
      t.nextSibling(); // Focus on , or )
      while (s.substring(t.from, t.to) != ")") {
        argList.push(traverseExpr(s, t));
        t.nextSibling(); // Focus on parameter
        t.nextSibling(); // Focus on , or )
      }

      t.parent();
      t.parent();
      return { tag: "call", name, arguments: argList, type_: "" };
    }
    case "UnaryExpression": {
      t.firstChild();
      const uniop = (() => {
        switch (s.substring(t.from, t.to)) {
          case "-": return "neg" as UniOp;
          case "not": return "not" as UniOp;
        }
      })();
      t.nextSibling();
      const arg = traverseExpr(s, t);
      t.parent();
      return { tag: "uniop", arg, uniop, type_: "" }
    }
    case "BinaryExpression": {
      t.firstChild();
      const arg1 = traverseExpr(s, t);
      t.nextSibling();
      const binop = s.substring(t.from, t.to) as BinOp;
      t.nextSibling();
      const arg2 = traverseExpr(s, t);
      t.parent();
      return { tag: "binop", arg1, arg2, binop, type_: "" };
    }
    case "ParenthesizedExpression": {
      t.firstChild(); // focuses on "("
      t.nextSibling();
      const e = traverseExpr(s, t);
      t.parent();
      return { tag: "parens", expr: e, type_: "" }
    }
  }
}
