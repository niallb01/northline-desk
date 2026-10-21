// Assess Northline refund rules. Export startRefund(). On pass, append pending.json (no payout).
//
//   startRefund({ accountId, chargeId })
//   → rejected if bad id / charge / already pending / outside window
//   → started (status pending) if in window or duplicate on same invoice

const fs = require("fs");
const path = require("path");
const { getAccount } = require("./accounts");

const pendingPath = path.join(__dirname, "pending.json");

const ANNUAL_WINDOW_DAYS = 30;
const MONTHLY_WINDOW_DAYS = 14;

function loadPending() {
  if (!fs.existsSync(pendingPath)) {
    return [];
  }

  const text = fs.readFileSync(pendingPath, "utf8");
  if (!text.trim()) {
    return [];
  }

  return JSON.parse(text);
}

function savePending(rows) {
  fs.writeFileSync(pendingPath, JSON.stringify(rows, null, 2) + "\n");
}

function ageInDays(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const chargeDate = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((today - chargeDate) / msPerDay);
}

function originalCharge(account, charge) {
  const successful = account.charges.filter(
    (item) => item.invoiceId === charge.invoiceId && item.status === "succeeded"
  );

  if (successful.length < 2) {
    return null;
  }

  if (successful[0].chargeId === charge.chargeId) {
    return null;
  }

  return successful[0];
}

function windowForPlan(plan) {
  if (plan === "annual") {
    return ANNUAL_WINDOW_DAYS;
  }
  if (plan === "monthly") {
    return MONTHLY_WINDOW_DAYS;
  }
  return null;
}

function rejected(accountId, chargeId, reason) {
  return {
    started: false,
    status: "rejected",
    accountId,
    chargeId,
    reason,
  };
}

function started(account, charge, reason) {
  const pending = loadPending();
  pending.push({
    accountId: account.id,
    customerName: account.customerName,
    plan: account.plan,
    chargeId: charge.chargeId,
    invoiceId: charge.invoiceId,
    amount: charge.amount,
    chargeDate: charge.date,
    status: "pending",
    reason,
    startedAt: new Date().toISOString(),
  });
  savePending(pending);

  return {
    started: true,
    status: "pending",
    accountId: account.id,
    chargeId: charge.chargeId,
    reason,
  };
}

function startRefund({ accountId, chargeId }) {
  const accountResult = getAccount(accountId);
  if (!accountResult.found) {
    return rejected(accountId, chargeId, accountResult.message);
  }

  const account = accountResult.account;
  const charge = account.charges.find((item) => item.chargeId === chargeId);
  if (!charge) {
    return rejected(
      accountId,
      chargeId,
      `No charge "${chargeId}" on account "${accountId}".`
    );
  }

  if (charge.status !== "succeeded") {
    return rejected(
      accountId,
      chargeId,
      `Charge ${chargeId} has status "${charge.status}", so a refund cannot be started. Nothing was saved.`
    );
  }

  const pending = loadPending();
  const alreadyPending = pending.some(
    (row) =>
      row.accountId === accountId &&
      row.chargeId === chargeId &&
      row.status === "pending"
  );
  if (alreadyPending) {
    return rejected(
      accountId,
      chargeId,
      "A refund for this charge is already pending. Nothing new was saved."
    );
  }

  const original = originalCharge(account, charge);
  if (original) {
    return started(
      account,
      charge,
      `Charge ${charge.chargeId} is a second successful charge on invoice ${charge.invoiceId} (original charge ${original.chargeId}). Refund started as pending for a person to approve. No money has been sent.`
    );
  }

  const windowDays = windowForPlan(account.plan);
  if (windowDays === null) {
    return rejected(
      accountId,
      chargeId,
      `Plan "${account.plan}" has no refund window in this tool. Nothing was saved.`
    );
  }

  const age = ageInDays(charge.date);
  const planLabel = account.plan === "annual" ? "Annual" : "Monthly";

  if (age <= windowDays) {
    return started(
      account,
      charge,
      `${planLabel} charge is ${age} days old (within ${windowDays} days). Refund started as pending for a person to approve. No money has been sent.`
    );
  }

  return rejected(
    accountId,
    chargeId,
    `${planLabel} charge is ${age} days old (past ${windowDays} days). Refund not started. Nothing was saved.`
  );
}

module.exports = { startRefund };
