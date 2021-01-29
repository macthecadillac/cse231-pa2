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
    const program = userCode.value;
    const output = document.getElementById("script-output");
    obj.output = "";  // clear output

    try {
      const wat = compile(program);
      code.textContent = "WAT output:\n";
      code.textContent += wat;
      const result = await run(wat, obj);
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

  userCode.addEventListener("keydown", (event) => {
    if (event.keyCode == 9) {
      event.preventDefault();
      const start = userCode.selectionStart;
      const end = userCode.selectionEnd;

      // set textarea value to: text before caret + tab + text after caret
      userCode.value = userCode.value.substring(0, start) +
        "    " + userCode.value.substring(end);

      // put caret at right position again
      userCode.selectionStart =
        userCode.selectionEnd = start + 4;
      }
  });

  function renderResult(result: number) {
    if (result === undefined && obj.output == "") {
      console.log("skip");
      return;
    }
    const elt = document.createElement("pre");
    document.getElementById("repl-output").appendChild(elt);
    elt.innerText = obj.output;
  }

  function renderError(err: Error) {
    const elt = document.createElement("pre");
    document.getElementById("repl-output").appendChild(elt);
    elt.setAttribute("style", "color: red");
    if (err instanceof CompilerError) {
      elt.innerText = err.message;
    } else {
      elt.innerText = String(err);
    }
  }

  const repl = new REPL;
  document.getElementById("repl-output").innerHTML = "";
  const replCodeElement = document.getElementById("next-code") as HTMLInputElement;
  replCodeElement.addEventListener("keypress", (event) => {
    if (event.keyCode == 13 && event.shiftKey) {
      event.preventDefault();
      obj.output = "";
      const output = document.createElement("div");
      const elt = document.createElement("div");
      elt.className = "old-code";
      const spacer = document.createElement("div");
      spacer.className = "spacer";
      output.appendChild(elt);
      output.appendChild(spacer);
      document.getElementById("repl-output").appendChild(output);
      const source = replCodeElement.value;
      elt.textContent = source;

      const textbox = document.getElementById("next-code");
      textbox.setAttribute("rows", "1");

      repl.run(source)
          .then((r) => {
            // print wat
            const code = document.getElementById("generated-code");
            code.textContent = "WAT output:\n";
            const wat = r[1];
            code.textContent += wat;

            // execute the code
            r[0].then(result => {
              renderResult(result);
              console.log ("run finished")
            });
          })
          .catch((e) => { renderError(e); console.log("run failed", e) });;
      replCodeElement.value = "";
    }
  });

  // override tab action for easier text editing
  replCodeElement.addEventListener("keydown", async (event) => {
    if (event.keyCode == 9) {
      event.preventDefault();
      const start = replCodeElement.selectionStart;
      const end = replCodeElement.selectionEnd;

      // set textarea value to: text before caret + tab + text after caret
      replCodeElement.value = replCodeElement.value.substring(0, start) +
        "    " + replCodeElement.value.substring(end);

      // put caret at right position again
      replCodeElement.selectionStart =
        replCodeElement.selectionEnd = start + 4;
      }
  });

  replCodeElement.addEventListener("input", (_) => {
    const textbox = document.getElementById("next-code");
    const n = replCodeElement.value.split("\n").length;
    textbox.setAttribute("rows", String(n));
  })
});
