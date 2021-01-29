import { compile } from './compiler';
import { run, importObject } from './runner';
import { CompilerError } from './errors';

var obj = importObject;

// command to run:
// node node-main.js 987
const input = process.argv[2];
try {
  const result = compile(input);
  console.log(result);
  run(result, obj).then((value) => {
    console.log(value);
  });
}
catch(err) {
  if (!(err instanceof CompilerError)) {
    throw err
  }
}
