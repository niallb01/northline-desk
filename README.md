# Northline desk

A support agent asks about a Northline customer account. Later, a model will be allowed to look the account up and to **propose** a refund. It will not be allowed to send money. Any approved payout stays a human step.

Northline is the same fictional company as in [policy-desk](https://github.com/niallb01/policy-desk). Refund windows in code match that project’s refunds page. This repo is separate code and its own data file—it does not import the other folders.

## Why this exists

The risky step is paying the customer, not reading the account. Tools that only read data and write a **pending** request draw a hard line: a confident model answer cannot become a bank transfer by itself.

## What is in the repo now

| File | Role |
| --- | --- |
| `accounts.json` | Three sample customers and their charges (the only account data tools may use) |
| `accounts.js` | Load the file and find one account or its charges by id |
| `lookup.js` | Terminal script to print one account (no AI, no refund) |
| `MILESTONES.md` | Step-by-step build plan (one milestone per session) |

**Milestone 1 — the accounts:** Open `accounts.json` and read the three records. Tools must not invent accounts or charges that are not in this file.

**Milestone 2 — look up an account:** Run lookup from the project folder:

```bash
cd northline-desk   # or your full path to this repo
node lookup.js --id acct-annual-ok
node lookup.js --id acct-double
node lookup.js --id acct-missing
```

You should see the annual and double-charge accounts printed, and a clear not-found line for `acct-missing`. `accounts.js` is imported by other scripts; running `node accounts.js` alone does nothing useful.

Later milestones add refund proposals (`pending.json`), a visible model tool loop (`assist.js`), and the same tools as an MCP server (`server.js`). See `MILESTONES.md` for the full path.

## Secrets

When you reach the milestone that calls OpenAI, use a local `.env` with `OPENAI_API_KEY`. Do not commit `.env` or `pending.json`.
