# Northline desk

A support agent asks about a Northline customer account. An AI assistant may **look up** the account and **start** a refund (pending approval). It cannot **pay** the customer. Started refunds are stored in a local pending file until a person approves them—payment is out of scope for this repo.

Northline is the same fictional B2B company as in [policy-desk](https://github.com/niallb01/policy-desk). Refund windows and duplicate-charge handling match that repo’s policy pages, but the rules are enforced in **this** project’s code so a model cannot talk past a rejected tool result. This folder does not import `policy-desk`, `ticket-extractor`, or `ticket-extractor-learn`.

**Language:** Node.js (JavaScript). **Storage:** `accounts.json` and `pending.json` on disk—no hosted database, email, or payment API.

## Why this exists

Reading an account is low risk. Moving money is high risk. A model that can search charges and file a structured request saves agent time. A model that can trigger a payout is how a wrong answer becomes a bank transfer. Northline desk draws the line in the **tools**: lookup and list are read-only; the only write path creates a **pending** row with a pass/fail decision already made in code.

## Finished shape (all milestones)

When the build is complete, the repo looks like this:

```
accounts.json          ← only customer data tools may use
accounts.js            ← getAccount, listCharges
refundRules.js         ← startRefund (assess rules; on pass write pending.json)
print-account.js       ← CLI: print one account and charges (no AI)
start-refund.js        ← CLI: start one refund (no AI)
request-refund.js  ← model picks tools; you see every step
server.js              ← same three tools over MCP for Cursor
pending.json           ← created locally; gitignored
```

**Flow:**

1. **Data** — Three fixed accounts in `accounts.json`.
2. **Functions** — Plain Node functions read the file and apply refund rules.
3. **Tools** — Those functions become three named tools the model (or Cursor) can call.
4. **Refund request script** — One terminal run shows tool name, arguments, result, then a final sentence.
5. **MCP server** — Same tools on stdio so Cursor calls them without duplicate logic or looser rules.

## The three tools

| Tool | What it does | Pays money? |
| --- | --- | --- |
| `get_account` | Return one customer (plan, name, id) | No |
| `list_charges` | Return charges for that account | No |
| `start_refund` | Check Northline rules; if allowed, append to `pending.json` with status `pending` | No |

`start_refund` **rejects** (and writes nothing) when:

- Annual charge is older than **30** days
- Monthly charge is older than **14** days
- The charge is not a duplicate on the same invoice (see billing policy)
- A refund for that charge is **already** pending

It **allows pending** when:

- Annual charge is 30 days old or newer
- Monthly charge is 14 days old or newer
- Two successful charges share the same invoice—the **duplicate** charge id can be started even if the date is old

## Sample accounts

| Account id | Story | Refund expectation |
| --- | --- | --- |
| `acct-annual-ok` | Annual plan, one charge ~10 days ago | Allowed within window |
| `acct-monthly-late` | Monthly plan, one charge ~40 days ago | Rejected (too old) |
| `acct-double` | Two successful charges on one invoice | Duplicate (`ch_double_dup`) can be pending |

Open `accounts.json` for charge ids, amounts, and dates.

## How to run the project

Clone the repo, then work through stages in order. Full session rules live in `MILESTONES.md` (one milestone per session).

### Look up an account (Milestone 2)

```bash
node print-account.js --id acct-annual-ok
node print-account.js --id acct-double
node print-account.js --id acct-missing
```

### Start a refund, do not pay (Milestone 3)

```bash
node start-refund.js --id acct-annual-ok --charge ch_annual_1
node start-refund.js --id acct-monthly-late --charge ch_monthly_1
node start-refund.js --id acct-double --charge ch_double_dup
```

Check `pending.json` for allowed rows; rejected runs leave the file unchanged for that charge.

### Watch the model choose tools (Milestone 4)

```bash
npm install
cp .env.example .env   # set OPENAI_API_KEY
node request-refund.js --id acct-monthly-late
node request-refund.js --id acct-annual-ok
```

You should see each tool call and a final answer that respects rejections and pending state—still no payout.

### Same tools in Cursor (Milestone 5)

```bash
node server.js
```

The process waits on stdio (idle until a client connects). In Cursor MCP settings: command `node`, args the full path to `server.js`. Example question: *“Can we refund Northline customer account acct-monthly-late?”* — expect lookup and/or `start_refund`, and no new pending row when the tool rejects the refund.

## Build status

This README describes the **full** project. The repo may only contain early milestones until you finish the rest. See git history and `MILESTONES.md` for what is implemented today.

| Milestone | Topic |
| --- | --- |
| 0 | Folder and map |
| 1 | `accounts.json` |
| 2 | `accounts.js`, `print-account.js` |
| 3 | `refundRules.js`, `start-refund.js`, `pending.json` |
| 4 | `request-refund.js`, OpenAI tool loop |
| 5 | `server.js`, MCP |

## Secrets

The repository is public. Put `OPENAI_API_KEY` in a local `.env` (from `.env.example` once Milestone 4 exists). Do not commit `.env` or `pending.json`.

## Learning path

- **policy-desk** — answer support questions from company markdown with citations and refusals.
- **northline-desk** (this repo) — agent actions on account data with a hard boundary on refunds.
- **ticket-extractor-learn** — triage ticket text against a fixed schema and grader.

Same fictional company where it helps the story; separate codebases throughout.
