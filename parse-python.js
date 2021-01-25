const python = require('lezer-python');

const input = "(x - 1 + 2)";

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

cursor.firstChild(); // ExpressionStatement
cursor.firstChild(); // ParenthesizedExpression
cursor.firstChild(); // "("
cursor.nextSibling(); // BinaryExpression
// cursor.nextSibling(); // ")"
printNode(cursor)
