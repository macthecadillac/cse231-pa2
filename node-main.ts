import { compile, run } from './compiler';
import { CompilerError } from './errors';

// command to run:
// node node-main.js 987
const input = process.argv[2];
try {
  const result = compile(input);
  console.log(result);
  run(result).then((value) => {
    console.log(value);
  });
}
catch(err) {
  if (!(err instanceof CompilerError)) {
    throw err
  }
}
