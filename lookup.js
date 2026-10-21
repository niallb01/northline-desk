// Run this file when you want to see one Northline customer on screen.
// You pass an account id (like acct-annual-ok); it prints the name, plan, and charges.
// It does not call the AI and it does not start a refund.

// use the lookup helpers from accounts.js
const { getAccount, listCharges } = require("./accounts");

// pull the value after --id from the command line
function readId(argv) {
  const index = argv.indexOf("--id");
  if (index === -1 || !argv[index + 1]) {
    return null;
  }
  return argv[index + 1];
}

// stop early if the user forgot --id
const id = readId(process.argv);
if (!id) {
  console.error("Usage: node lookup.js --id <account-id>");
  process.exit(1);
}

// ask accounts.js for this customer and their charges
const accountResult = getAccount(id);
const chargesResult = listCharges(id);

// unknown id: print the message and we are done
if (!accountResult.found) {
  console.log(accountResult.message);
  process.exit(0);
}

const account = accountResult.account;
const charges = chargesResult.charges;

// print the account header, then one line per charge
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
