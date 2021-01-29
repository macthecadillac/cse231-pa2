import { compile } from './compiler';
import { run, importObject } from './runner';
import { CompilerError } from './errors';
import { REPL } from './repl';

const obj = importObject;

document.addEventListener("DOMContentLoaded", async () => {
  const runButton = document.getElementById("run");
  const userCode = document.getElementById("user-code") as HTMLTextAreaElement;
  runButton.addEventListener("click", async () => {
    const code = document.getElementById("generated-code");
    code.textContent = "";  // clear output

    const program = userCode.value;
    const output = document.getElementById("output");
    output.textContent = "";  // clear output
    obj.output = "";  // clear output

    try {
      const wat = compile(program);
      code.textContent = "WAT output:\n";
      code.textContent += wat;
      const result = await run(wat);
      output.textContent = "STDOUT:\n";
      output.textContent += obj.output;
      output.textContent += "\nProgram return:\n";
      output.textContent += String(result);
      output.setAttribute("style", "color: black");
    }
    catch(e) {
      if (e instanceof CompilerError) {
        output.textContent = e.message;
        output.setAttribute("style", "color: red");
      } else {
      output.textContent = String(e);
      output.setAttribute("style", "color: red");
      }
    }
  });
});

//   // const repl = new BasicREPL(importObject);

//   // function renderResult(result : any) : void {
//   //   if(result === undefined) { console.log("skip"); return; }
//   //   const elt = document.createElement("pre");
//   //   document.getElementById("output").appendChild(elt);
//   //   elt.innerText = String(result);
//   // }

//   // function renderError(result : any) : void {
//   //   const elt = document.createElement("pre");
//   //   document.getElementById("output").appendChild(elt);
//   //   elt.setAttribute("style", "color: red");
//   //   elt.innerText = String(result);
//   // }

//   // function setupRepl() {
//   //   document.getElementById("output").innerHTML = "";
//   //   const replCodeElement = document.getElementById("next-code") as HTMLInputElement;
//   //   replCodeElement.addEventListener("keypress", (e) => {
//   //     if(e.key === "Enter") {
//   //       const output = document.createElement("div");
//   //       const prompt = document.createElement("span");
//   //       prompt.innerText = "»";
//   //       output.appendChild(prompt);
//   //       const elt = document.createElement("input");
//   //       elt.type = "text";
//   //       elt.disabled = true;
//   //       elt.className = "repl-code";
//   //       output.appendChild(elt);
//   //       document.getElementById("output").appendChild(output);
//   //       const source = replCodeElement.value;
//   //       elt.value = source;
//   //       replCodeElement.value = "";
//   //       repl.run(source).then((r) => { renderResult(r); console.log ("run finished") })
//   //           .catch((e) => { renderError(e); console.log("run failed", e) });;
//   //     }
//   //   });
//   // }

//   const runButton = document.getElementById("run");
//   const userCode = document.getElementById("user-code") as HTMLTextAreaElement;
//   runButton.addEventListener("click", async () => {
//     const program = userCode.value;
//     const wat = compile(program);
//     const code = document.getElementById("generated-code");
//     code.textContent = wat;
//     const output = document.getElementById("output");
//     try {
//       const result = await run(wat);
//       output.textContent = String(result);
//       output.setAttribute("style", "color: black");
//     }
//     catch(e) {
//       output.textContent = String(e);
//       output.setAttribute("style", "color: red");
//     }
//   });
