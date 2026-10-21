// CLI: start one refund and print started or rejected.
//
//   read --id and --charge
//   startRefund(...)
//   print status + reason

const { startRefund } = require("./refundRules");

function readFlag(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1 || !argv[index + 1]) {
    return null;
  }
  return argv[index + 1];
}

const accountId = readFlag(process.argv, "--id");
const chargeId = readFlag(process.argv, "--charge");

if (!accountId || !chargeId) {
  console.error(
    "Usage: node start-refund.js --id <account-id> --charge <charge-id>"
  );
  process.exit(1);
}

const result = startRefund({ accountId, chargeId });
const label = result.started ? "Started" : "Rejected";

console.log(`${label} (${result.status})`);
console.log(`Account: ${result.accountId}`);
console.log(`Charge: ${result.chargeId}`);
console.log(result.reason);
