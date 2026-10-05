// Stops on the debugger statement so the debug UI can be inspected.
const orders = [{ sku: "ABC-1234", total: 12.3 }, { sku: "XYZ-0001", total: 4.5 }];
let sum = 0;
for (const order of orders) {
  sum += order.total;
  debugger;
}
console.log(`total ${sum}`);
