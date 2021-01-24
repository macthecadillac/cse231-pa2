// custom error classes for better error handling
// FIXME: stack trace instance name
import { BinOp, Type, UniOp } from './ast';

export class BinaryOpTypeError extends Error {
  __proto__: Error;
  op: BinOp;
  t1: Type;
  t2: Type;
  constructor(op: BinOp, t1: Type, t2: Type) {
    super(`Cannot apply operator \`${op}\` on types \`${t1}\` and \`${t2}\``);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'BinaryOpTypeError'
    this.op = op;
    this.t1 = t1;
    this.t2 = t2;
    this.__proto__ = new.target.prototype;
  }
}

export class CompilerError extends Error {
  __proto__: Error;
  constructor() {
    super();
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotAVariable)
    }
    this.name = 'CompilerError';
    this.__proto__ = new.target.prototype;
  }
}

export class ConditionalExprTypeError extends Error {
  __proto__: Error;
  conditionalType: Type;
  constructor(conditionalType: Type) {
    super(`Conditional expression cannot be of type \`${conditionalType}\``);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotAVariable)
    }

    this.name = 'ConditionalExprTypeError'
    this.conditionalType = conditionalType;
    this.__proto__ = new.target.prototype;
  }
}

export class DuplicateDeclaration extends Error {
  __proto__: Error;
  ident: string
  constructor(ident: string) {
    super(`Duplicate declaration of identifier in same scope: ${ident}`);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DuplicateDeclaration)
    }

    this.name = 'DuplicateDeclaration'
    this.ident = ident;
    this.__proto__ = new.target.prototype;
  }
}
export class NotAFunctionOrClass extends Error {
  __proto__: Error;
  objName: string;
  constructor(objName: string) {
    super(`Not a function or class: ${objName}`);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotAVariable)
    }

    this.name = 'NotAFunctionOrClass'
    this.objName = objName;
    this.__proto__ = new.target.prototype;
  }
}

export class NotAVariable extends Error {
  __proto__: Error;
  varName: string;
  constructor(varName: string) {
    super(`Not a variable: ${varName}`);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotAVariable)
    }

    this.name = 'NotAVariable'
    this.varName = varName;
    this.__proto__ = new.target.prototype;
  }
}

export class NotDeclaredInScope extends Error {
  __proto__: Error;
  varName: string;
  constructor(varName: string) {
    super(`Cannot assign to variable that is not explicitly decalared in this scope: ${varName}`);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'NotDeclaredInScope'
    this.varName = varName;
    this.__proto__ = new.target.prototype;
  }
}

export class MissingReturn extends Error {
  __proto__: Error;
  constructor(f: string = "contains") {
    super(`All paths in this function/method must have a return statement: ${f}`);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'MissingReturn'
    this.__proto__ = new.target.prototype;
  }
}

export class GeneralTypeError extends Error {
  __proto__: Error;
  actualType: Type;
  expectedType: Type;
  constructor(actualType: Type, expectedType: Type) {
    super(`Expected type \`${expectedType}\`; got type \`${actualType}\``);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'GeneralTypeError'
    this.actualType = actualType;
    this.expectedType = expectedType;
    this.__proto__ = new.target.prototype;
  }
}

export class FuncCallTypError extends Error {
  __proto__: Error;
  actualType: Type;
  expectedType: Type;
  paramN: number;
  constructor(actualType: Type, expectedType: Type, paramN: number) {
    super(`Expected type \`${expectedType}\`; got type \`${actualType}\``);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FuncCallTypError)
    }

    this.name = 'FuncCallTypError'
    this.actualType = actualType;
    this.expectedType = expectedType;
    this.paramN = paramN;
    this.__proto__ = new.target.prototype;
  }
}

export class ParseError extends Error {
  __proto__: Error;
  token: string;
  constructor(token: string) {
    super(`Parse error near token ${token}`);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'ParseError'
    this.token = token;
    this.__proto__ = new.target.prototype;
  }
}

export class UniaryOpTypeError extends Error {
  __proto__: Error;
  op: UniOp;
  t: Type;
  constructor(op: UniOp, t: Type) {
    super(`Cannot apply operator \`${op}\` on type \`${t}\``);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'UniaryOpTypeError'
    this.op = op;
    this.t = t;
    this.__proto__ = new.target.prototype;
  }
}
