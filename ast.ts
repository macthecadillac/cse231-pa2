export type varType = { name: string, type_: Type }

export type Stmt =
    { tag: "assign", name: string, type_: Type, value: Expr }
  | { tag: "expr", expr: Expr }
  | { tag: "define", name: string, parameters: varType[], outputType: Type, body: Stmt[] }
  | { tag: "return", value: Expr }
  | { tag: "if", pred: Expr, body1: Stmt[], body2: Stmt[] }
  | { tag: "while", pred: Expr, body: Stmt[] }
  | { tag: "pass" }

export type Expr = 
    { tag: "literal", value: Literal }
  | { tag: "id", name: string }
  | { tag: "call", name: string, arguments: Expr[] }
  | { tag: "uniop", uniop: UniOp, arg: Expr }
  | { tag: "binop", binop: BinOp, arg1: Expr, arg2: Expr }

export type Type = "" | "none" | "bool" | "int"

export type Literal =
    { tag: "none", }
  | { tag: "bool", value: boolean }
  | { tag: "number", value: number }

export type UniOp = "not" | "neg"

export type BinOp =
    "+"
  | "-"
  | "*"
  | "//"
  | "%"
  | "=="
  | "!="
  | "<="
  | ">="
  | "<"
  | ">"
  | "is"

export function countDefDeclStmts(stmts: Stmt[]): number {
  const f = (acc: [boolean, number], x: Stmt) => {
    const b = (() => {
      switch (x.tag) {
        case "define": return true;
        case "assign": return !(x.type_ == "")
        default: return false
      }
    })();
    return (acc[0] && b) ? [true, acc[1] + 1] : [false, acc[1]];
  };
  return (stmts.reduce(f, [true, 0]) as [boolean, number])[1];
}
