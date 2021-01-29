import { statSync } from 'fs';
import wabt from 'wabt';
import { Stmt, Expr, countDefDeclStmts } from './ast';
import { compile } from "./compiler";

export const importObject = {
  imports: {
    // we typically define print to mean logging to the console. To make testing
    // the compiler easier, we define print so it logs to a string object.
    //  We can then examine output to see what would have been printed in the
    //  console.
    printI32: (arg: number) => {
      importObject.output += arg;
      importObject.output += "\n";
    },
    printBool: (arg: number) => {
      if (arg == 1) {
        importObject.output += "True\n";
      } else if (arg == 0) {
        importObject.output += "False\n";
      } else {
        throw new Error("Calling printBool on an i32 argument")
      }
    },
    printNone: () => {
      importObject.output += "None\n";
    },
    pow: (x: number, y: number) => {
      return Math.pow(x, y)
    },
  },

  env: { heap: new WebAssembly.Memory({ initial: 1 }), size: 1 },
  output: ""
};

export async function runPython(pythonSrouce: string): Promise<number> {
  const wat = compile(pythonSrouce);
  return run(wat, importObject)
}

export async function run(watSource: string, importObj: typeof importObject): Promise<number> {
  const wabtApi = await wabt();
  // Next three lines are wat2wasm
  const parsed = wabtApi.parseWat("example", watSource);
  const binary = parsed.toBinary({});
  const wasmModule = await WebAssembly.instantiate(binary.buffer, importObj as any);

  // This next line is wasm-interp
  return (wasmModule.instance.exports as any)._start();
}
