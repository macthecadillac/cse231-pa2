const python = require('lezer-python');

const input = "def foo(a: int, b: int) -> int:\n\nfoo(1, 2)";

const tree = python.parser.parse(input);

const cursor = tree.cursor();

// do {
//   const name = cursor.node.type.name;
//   const substr = input.substring(cursor.node.from, cursor.node.to);
//   console.log(`${name}: "${substr}"`);
// } while(cursor.next());
function printNode(t) {
  const name = t.node.type.name;
  const substr = input.substring(t.node.from, t.node.to);
  console.log(`${name}: "${substr}"`);
}

cursor.firstChild(); // FunctionDefinition
cursor.firstChild(); // FunctionDefinition
cursor.nextSibling(); // FunctionDefinition
cursor.nextSibling(); // FunctionDefinition
cursor.nextSibling(); // FunctionDefinition
cursor.nextSibling(); // FunctionDefinition
printNode(cursor)
