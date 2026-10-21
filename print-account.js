// CLI: print one account and its charges to the terminal.
//
//   read --id
//   getAccount + listCharges
//   print or not-found message

const { getAccount, listCharges } = require("./accounts");

function readId(argv) {
  const index = argv.indexOf("--id");
  if (index === -1 || !argv[index + 1]) {
    return null;
  }
  return argv[index + 1];
}

const id = readId(process.argv);
if (!id) {
  console.error("Usage: node print-account.js --id <account-id>");
  process.exit(1);
}

const accountResult = getAccount(id);
const chargesResult = listCharges(id);

if (!accountResult.found) {
  console.log(accountResult.message);
  process.exit(0);
}

const account = accountResult.account;
const charges = chargesResult.charges;

console.log(`Account ${account.id}`);
console.log(`Customer: ${account.customerName}`);
console.log(`Plan: ${account.plan}`);
console.log("");
console.log(`Charges (${charges.length}):`);

for (const charge of charges) {
  console.log(
    `- ${charge.chargeId}  invoice ${charge.invoiceId}  ${charge.amount}  ${charge.date}  ${charge.status}`
  );
}
