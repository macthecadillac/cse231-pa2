// custom CompilerError classes for better error handling
// FIXME: stack trace instance name
import { BinOp, Type, UniOp } from './ast';

export class CompilerError extends Error {
  __proto__: Error;
  constructor(msg?: string) {
    super(msg);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotAVariable)
    }
    this.name = 'CompilerError';
    this.__proto__ = new.target.prototype;
  }
}

export class BinaryOpTypeError extends CompilerError {
  __proto__: CompilerError;
  op: BinOp;
  t1: Type;
  t2: Type;
  constructor(op: BinOp, t1: Type, t2: Type) {
    super(`Cannot apply operator \`${op}\` on types \`${t1}\` and \`${t2}\``);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'BinaryOpTypeError'
    this.op = op;
    this.t1 = t1;
    this.t2 = t2;
    this.__proto__ = new.target.prototype;
  }
}

export class ConditionalExprTypeError extends CompilerError {
  __proto__: CompilerError;
  conditionalType: Type;
  constructor(conditionalType: Type) {
    super(`Conditional expression cannot be of type \`${conditionalType}\``);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, NotAVariable)
    }

    this.name = 'ConditionalExprTypeError'
    this.conditionalType = conditionalType;
    this.__proto__ = new.target.prototype;
  }
}

export class DuplicateDeclaration extends CompilerError {
  __proto__: CompilerError;
  ident: string
  constructor(ident: string) {
    super(`Duplicate declaration of identifier in same scope: ${ident}`);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, DuplicateDeclaration)
    }

    this.name = 'DuplicateDeclaration'
    this.ident = ident;
    this.__proto__ = new.target.prototype;
  }
}
export class NotAFunctionOrClass extends CompilerError {
  __proto__: CompilerError;
  objName: string;
  constructor(objName: string) {
    super(`Not a function or class: ${objName}`);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, NotAVariable)
    }

    this.name = 'NotAFunctionOrClass'
    this.objName = objName;
    this.__proto__ = new.target.prototype;
  }
}

export class NotAVariable extends CompilerError {
  __proto__: CompilerError;
  varName: string;
  constructor(varName: string) {
    super(`Not a variable: ${varName}`);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, NotAVariable)
    }

    this.name = 'NotAVariable'
    this.varName = varName;
    this.__proto__ = new.target.prototype;
  }
}

export class NotDeclaredInScope extends CompilerError {
  __proto__: CompilerError;
  varName: string;
  constructor(varName: string) {
    super(`Cannot assign to variable that is not explicitly decalared in this scope: ${varName}`);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'NotDeclaredInScope'
    this.varName = varName;
    this.__proto__ = new.target.prototype;
  }
}

export class MissingReturn extends CompilerError {
  __proto__: CompilerError;
  constructor(f: string = "contains") {
    super(`All paths in this function/method must have a return statement: ${f}`);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'MissingReturn'
    this.__proto__ = new.target.prototype;
  }
}

export class GeneralTypeError extends CompilerError {
  __proto__: CompilerError;
  actualType: Type;
  expectedType: Type;
  constructor(actualType: Type, expectedType: Type) {
    super(`Expected type \`${expectedType}\`; got type \`${actualType}\``);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'GeneralTypeError'
    this.actualType = actualType;
    this.expectedType = expectedType;
    this.__proto__ = new.target.prototype;
  }
}

export class FuncCallTypError extends CompilerError {
  __proto__: CompilerError;
  actualType: Type;
  expectedType: Type;
  paramN: number;
  constructor(actualType: Type, expectedType: Type, paramN: number) {
    super(`Expected type \`${expectedType}\`; got type \`${actualType}\``);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, FuncCallTypError)
    }

    this.name = 'FuncCallTypError'
    this.actualType = actualType;
    this.expectedType = expectedType;
    this.paramN = paramN;
    this.__proto__ = new.target.prototype;
  }
}

export class ParseError extends CompilerError {
  __proto__: CompilerError;
  token: string;
  constructor(token: string) {
    super(`Parse error near token ${token}`);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'ParseError'
    this.token = token;
    this.__proto__ = new.target.prototype;
  }
}

export class UniaryOpTypeError extends CompilerError {
  __proto__: CompilerError;
  op: UniOp;
  t: Type;
  constructor(op: UniOp, t: Type) {
    super(`Cannot apply operator \`${op}\` on type \`${t}\``);
    if (CompilerError.captureStackTrace) {
      CompilerError.captureStackTrace(this, NotDeclaredInScope)
    }

    this.name = 'UniaryOpTypeError'
    this.op = op;
    this.t = t;
    this.__proto__ = new.target.prototype;
  }
}
