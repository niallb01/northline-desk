// Read accounts.json. Export getAccount(id) and listCharges(id).

const fs = require("fs");
const path = require("path");

const accountsPath = path.join(__dirname, "accounts.json");

function loadAccounts() {
  const text = fs.readFileSync(accountsPath, "utf8");
  return JSON.parse(text);
}

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

module.exports = { getAccount, listCharges };
