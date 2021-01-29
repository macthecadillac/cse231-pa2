import { compile } from '../compiler';
import { expect } from 'chai';
import 'mocha';
import { importObject, runPython } from '../runner';

// Clear the output before every test
beforeEach(function () {
  importObject.output = "";
});
  
// We write end-to-end tests here to make sure the compiler works as expected.
// You should write enough end-to-end tests until you are confident the compiler
// runs as expected. 
describe('run(source, config) function', () => {
  const config = { importObject };
  
  // IMPLCIT RETURNS
  it('implicit return', async () => {
    const result = await runPython("987");
    expect(result).to.equal(987);
  });

  // PRINT FUNCTIONS
  it('print int', async() => {
    var result = await runPython("print(1337)");
    expect(config.importObject.output).to.equal("1337\n");
  });

  it('print bool (true)', async() => {
    var result = await runPython("print(False)");
    expect(config.importObject.output).to.equal("False\n");
  });

  it('print bool (false)', async() => {
    var result = await runPython("print(True)");
    expect(config.importObject.output).to.equal("True\n");
  });

  it('print none', async() => {
    var result = await runPython("print(None)");
    expect(config.importObject.output).to.equal("None\n");
  });

  // UNARY OPERATORS
  it('`neg` operator', async() => {
    const result = await runPython("x: int = 1\n-x");
    expect(result).to.equal(-1);
  });

  it('`not` operator', async() => {
    const result = await runPython("x: bool = True\nnot x");
    expect(result).to.equal(0);
  });

  // BINARY OPERATORS
  it('`+` operator', async() => {
    const result = await runPython("2 + 3");
    expect(result).to.equal(5);
  });

  it('`-` operator', async() => {
    const result = await runPython("2 - 3");
    expect(result).to.equal(-1);
  });

  it('`*` operator', async() => {
    const result = await runPython("10 * 12");
    expect(result).to.equal(120);
  });

  it('`//` operator', async() => {
    const result = await runPython("20 // 2");
    expect(result).to.equal(10);
  });

  it('`%` operator', async() => {
    const result = await runPython("12 % 5");
    expect(result).to.equal(2);
  });

  it('`==` operator', async() => {
    const result = await runPython("12 == 11");
    expect(result).to.equal(0);
  });

  it('`!=` operator', async() => {
    const result = await runPython("12 != 11");
    expect(result).to.equal(1);
  });

  it('`>` operator', async() => {
    const result = await runPython("12 > 11");
    expect(result).to.equal(1);
  });

  it('`<` operator', async() => {
    const result = await runPython("4 < 3");
    expect(result).to.equal(0);
  });

  it('`>=` operator', async() => {
    const result = await runPython("3 >= 3");
    expect(result).to.equal(1);
  });

  it('`<=` operator', async() => {
    const result = await runPython("4 <= 3");
    expect(result).to.equal(0);
  });

  it('`is` operator', async() => {
    const result = await runPython("None is None");
    expect(result).to.equal(1);
  });

  // functions
  it('eval function w/ if-else', async() => {
    const source = [
      "def lt3(x: int) -> bool:",
      "    if x < 3:",
      "        return True",
      "    else:",
      "        return False",
      "print(lt3(4))"
    ].join("\n");
    const result = await runPython(source);
    expect(config.importObject.output).to.equal("False\n");
  });

  it('eval function w/ if no else', async() => {
    const source = [
      "def lt3(x: int) -> bool:",
      "    if x < 3:",
      "        return True",
      "    return False",
      "print(lt3(4))"
    ].join("\n");
    const result = await runPython(source);
    expect(config.importObject.output).to.equal("False\n");
  });

  it('eval function w/ immediate return', async() => {
    const source = [
      "def always_true(x: int) -> bool:",
      "    return True",
      "print(always_true(4))"
    ].join("\n");
    const result = await runPython(source);
    expect(config.importObject.output).to.equal("True\n");
  });

  it('eval function w/ early return in some branches', async() => {
    const source = [
      "def lt3(x: int) -> bool:",
      "    if x < 3:",
      "        return True",
      "    else:",
      "        x = x + 1",
      "    return False",
      "print(lt3(4))"
    ].join("\n");
    const result = await runPython(source);
    expect(config.importObject.output).to.equal("False\n");
  });

  it('eval function w/ early return in some branches', async() => {
    const source = [
      "def lt3(x: int) -> bool:",
      "    if x < 3:",
      "        return True",
      "    else:",
      "        x = x + 1",
      "    return False",
      "print(lt3(1))"
    ].join("\n");
    const result = await runPython(source);
    expect(config.importObject.output).to.equal("True\n");
  });

  it('eval while-loop', async() => {
    const source = [
      "x: int = 0",
      "while x < 10:",
      "    x = x + 1",
      "print(x)"
    ].join("\n");
    const result = await runPython(source);
    expect(config.importObject.output).to.equal("10\n");
  });

  it('define a variable, add a number to it, and print the result', async() => {
    const result = await runPython("x: int = 2\nprint(x + 2)");
    expect(config.importObject.output).to.equal("4\n");
  });

  // BUILTIN FUNCTIONS (not print)
  it('max', async() => {
    const result = await runPython("max(1, 2)");
    expect(result).to.equal(2);
  });

  it('abs', async() => {
    const result = await runPython("abs(1)");
    expect(result).to.equal(1);
  });

  it('min', async() => {
    const result = await runPython("min(1, 2)");
    expect(result).to.equal(1);
  });

  it('pow', async() => {
    const result = await runPython("pow(2, 3)");
    expect(result).to.equal(8);
  });

  // MISC
  it('multiple binary operators', async() => {
    const result = await runPython("1 + 2 * 3");
    expect(result).to.equal(7);
  });

  it('parenthesized expressions', async() => {
    const result = await runPython("(1 + 2) * 3");
    expect(result).to.equal(9);
  });
});
