import * as mocha from 'mocha';
import {expect} from 'chai';
import { parser } from 'lezer-python';
import { traverseExpr, traverseStmt, parseProgram } from '../parser';

// We write tests for each function in parser.ts here. Each function gets its 
// own describe statement. Each it statement represents a single test. You
// should write enough unit tests for each function until you are confident
// the parser works as expected. 
describe('traverseExpr(s, c) function', () => {
  it('parses a number in the beginning', () => {
    const source = "987";
    const cursor = parser.parse(source).cursor();
    cursor.firstChild();
    cursor.firstChild();
    const parsedExpr = traverseExpr(source, cursor);
    expect(parsedExpr).to.deep.equal({
      tag: "literal",
      value: {
        tag: "number",
        value: 987
      },
      type_: "int"
    });
  })

  it('parses a function', () => {
    const source = "abs(1)";
    const cursor = parser.parse(source).cursor();
    cursor.firstChild();
    cursor.firstChild();
    const parseExpr = traverseExpr(source, cursor);
    expect(parseExpr).to.deep.equal({
      tag: "call",
      name: "abs",
      arguments: [{
        tag: "literal",
        value: {
          tag: "number",
          value: 1
        },
        type_: "int"
      }],
      type_: ""
    });
  })
});

describe('traverseStmt(s, c) function', () => {
  it('parses a declaration', () => {
    const source = "x: int = 2";
    const cursor = parser.parse(source).cursor();
    cursor.firstChild();
    const parseStmt = traverseStmt(source, cursor);
    expect(parseStmt).to.deep.equal({
      tag: "assign",
      name: "x",
      type_: "int",
      value: {
        tag: "literal",
        value: {
          tag: "number",
          value: 2
        },
        type_: "int"
      }
    });
  })

  it('parses an assignment', () => {
    const source = "x = 2";
    const cursor = parser.parse(source).cursor();
    cursor.firstChild();
    const parseStmt = traverseStmt(source, cursor);
    expect(parseStmt).to.deep.equal({
      tag: "assign",
      name: "x",
      type_: "",
      value: {
        tag: "literal",
        value: {
          tag: "number",
          value: 2
        },
        type_: "int"
      }
    });
  })

  it('parses a function definition', () => {
    const source = "def fun(x: int, y: int) -> bool:\n    pass";
    const cursor = parser.parse(source).cursor();
    cursor.firstChild();
    const parseStmt = traverseStmt(source, cursor);
    expect(parseStmt).to.deep.equal({
      tag: "define",
      name: "fun",
      parameters: [ { name: "x", type_: "int" }, { name: "y", type_: "int" } ],
      outputType: "bool",
      body: [{ tag: "pass" }]
    });
  })

  it('parses an if statement', () => {
    const source = "if x == 1:\n    return 1\nelse:\n    pass";
    const cursor = parser.parse(source).cursor();
    cursor.firstChild();
    const parseStmt = traverseStmt(source, cursor);
    expect(parseStmt).to.deep.equal({
      tag: "if",
      pred: {
        tag: "binop",
        binop: "==",
        arg1: { tag: "id", name: "x", type_: "" },
        arg2: { tag: "literal", type_: "int", value: { tag: "number", value: 1 } },
        type_: ""
      },
      body1: [{
        tag: "return",
        value: {
          tag: "literal",
          value: {
            tag: "number",
            value: 1
          },
          type_: "int"
        }
      }],
      body2: [{ tag: "pass" }]
    });
  })
});

describe('parseProgram(source) function', () => {
  it('parse a number', () => {
    const parsed = parseProgram("987");
    expect(parsed).to.deep.equal([{
      tag: "expr",
      expr: {
        tag: "literal",
        value: {
          tag: "number",
          value: 987
        },
        type_: "int"
      }
    }]);
  });  
});
