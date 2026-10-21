// Shared helpers for reading customer records from accounts.json.
// Other scripts import these functions; running "node accounts.js" by itself does nothing useful.

const fs = require("fs");
const path = require("path");

const accountsPath = path.join(__dirname, "accounts.json");

// read accounts.json and return the list of customers
function loadAccounts() {
  const text = fs.readFileSync(accountsPath, "utf8");
  return JSON.parse(text);
}

// find one customer by id, or return found: false with a short message
function getAccount(id) {
  const accounts = loadAccounts();
  const account = accounts.find((item) => item.id === id);

  if (!account) {
    return {
      found: false,
      id,
      message: `No account with id "${id}".`,
    };
  }

  return { found: true, account };
}

// same lookup, but only return the charges array when the customer exists
function listCharges(id) {
  const result = getAccount(id);

  if (!result.found) {
    return result;
  }

  return {
    found: true,
    id,
    charges: result.account.charges,
  };
}

// expose these two for lookup.js and later tools
module.exports = { getAccount, listCharges };
