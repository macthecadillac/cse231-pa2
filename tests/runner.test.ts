import { compile } from '../compiler';
import { runPython } from '../runner';
import { expect } from 'chai';
import 'mocha';

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
  },

  output: ""
};

// Clear the output before every test
beforeEach(function () {
  importObject.output = "";
});
  
// We write end-to-end tests here to make sure the compiler works as expected.
// You should write enough end-to-end tests until you are confident the compiler
// runs as expected. 
describe('run(source, config) function', () => {
  const config = { importObject };
  
  // We can test the behavior of the compiler in several ways:
  // 1- we can test the return value of a program
  // Note: since run is an async function, we use await to retrieve the 
  // asynchronous return value. 
  it('returns the right number', async () => {
    const result = await runPython("987");
    expect(result).to.equal(987);
  });

  // 2- we can test the behavior of the compiler by also looking at the log 
  // resulting from running the program
  it('prints something right', async() => {
    var result = await runPython("print(1337)");
    expect(config.importObject.output).to.equal("1337\n");
  });

  // 3- we can also combine both type of assertions, or feel free to use any 
  // other assertions provided by chai.
  it('prints two numbers but returns last one', async () => {
    var result = await runPython("print(987)");
    expect(result).to.equal(987);
    result = await runPython("print(123)");
    expect(result).to.equal(123);
  });
    
  // Note: it is often helpful to write tests for a functionality before you
  // implement it. You will make this test pass!
  it('adds two numbers', async() => {
    const result = await runPython("2 + 3");
    expect(result).to.equal(5);
  });

  it('subtracts two numbers', async() => {
    const result = await runPython("2 - 3");
    expect(result).to.equal(-1);
  });

  it('multiplies two numbers', async() => {
    const result = await runPython("2 * 3");
    expect(result).to.equal(6);
  });

  it('eval function w/ if-else', async() => {
    const source = [
      "def lt3(x: int) -> bool:",
      "    if x < 3:",
      "        return True",
      "    else:",
      "        return False",
      "lt3(4)"
    ].join("\n");
    const result = await runPython(source);
    expect(result).to.equal(0);
  });

  it('eval function w/ if no else', async() => {
    const source = [
      "def lt3(x: int) -> bool:",
      "    if x < 3:",
      "        return True",
      "    return False",
      "lt3(4)"
    ].join("\n");
    const result = await runPython(source);
    expect(result).to.equal(0);
  });

  it('eval function w/ immediate return', async() => {
    const source = [
      "def always_true(x: int) -> bool:",
      "    return True",
      "always_true(4)"
    ].join("\n");
    const result = await runPython(source);
    expect(result).to.equal(1);
  });

  it('eval function w/ early return in some branches', async() => {
    const source = [
      "def lt3(x: int) -> bool:",
      "    if x < 3:",
      "        return True",
      "    else:",
      "        x = x + 1",
      "    return False",
      "lt3(4)"
    ].join("\n");
    const result = await runPython(source);
    expect(result).to.equal(0);
  });

  it('eval function w/ early return in some branches', async() => {
    const source = [
      "def lt3(x: int) -> bool:",
      "    if x < 3:",
      "        return True",
      "    else:",
      "        x = x + 1",
      "    return False",
      "lt3(1)"
    ].join("\n");
    const result = await runPython(source);
    expect(result).to.equal(1);
  });

  it('eval while-loop', async() => {
    const source = [
      "x: int = 0",
      "while x < 10:",
      "    x = x + 1",
      "x"
    ].join("\n");
    const result = await runPython(source);
    expect(result).to.equal(10);
  });

  it('define a variable, add a number to it, and print the result', async() => {
    const result = await runPython("x = 2\nprint(x + 2)");
    expect(config.importObject.output).to.equal("4\n");
  });

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

  it('multiple binary operators', async() => {
    const result = await runPython("1 + 2 * 3");
    expect(result).to.equal(7);
  });

  it('parenthesized expressions', async() => {
    const result = await runPython("(1 + 2) * 3");
    expect(result).to.equal(9);
  });
});
