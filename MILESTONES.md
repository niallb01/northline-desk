# Northline desk — incremental build

**Location:** `Desktop/ai learning path/northline-desk/`
**Separate from:** `ticket-extractor/`, `ticket-extractor-learn/`, and `policy-desk/`. This folder does not import them.
**Git:** local only — no push unless you choose to later
**Language:** JavaScript (Node)

**Rule:** One milestone per session. Run the “You run” command and confirm output before the next milestone.

**What this is:** A support agent asks about a Northline account. The model may look the account up and may file a refund request. It cannot send the money. A request sits in a pending file until a person approves it, which is Week 4’s job.

**Why a company would care:** The risky step is the refund, not the lookup. A model that can read an account and draft the request saves the agent the search. A model that can pay the customer is how a bad answer becomes a bank transfer. This project draws that line in the tool, so a confident sentence cannot move money.

**Same company:** Refund windows match `policy-desk/docs/refunds.md`. A duplicate charge matches `policy-desk/docs/billing.md`. The numbers live in this project’s own check, so the tool still says no when the model forgets the page.

**Finished shape:** Three tools (`get_account`, `list_charges`, `start_refund`), a local script where you can see the model pick one, then the same tools behind an MCP server Cursor can call. No hosted database. No email. No payment.

---

## Milestone 0 — Folder + map (this file)

**Purpose:** Agree on the path before any code.

**Deliverables:** This folder, `MILESTONES.md`.

**You run:** Nothing yet.

**You should understand:** Data file → plain lookup functions → a refund tool that only writes a pending request → a visible tool-calling loop → the same tools as an MCP server.

---

## Milestone 1 — The accounts

**Purpose:** See the only customer data the tools are allowed to use. No code, no model.

**Files to add:**
- `accounts.json` — three Northline accounts:
  - `acct-annual-ok` — annual plan, charged 10 days ago, one charge. A refund is allowed.
  - `acct-monthly-late` — monthly plan, charged 40 days ago, one charge. A refund is not allowed.
  - `acct-double` — two successful charges for the same invoice. The duplicate can be refunded even though the date is old.

Each account has an id, a plan, a customer name, and a list of charges (invoice id, charge id, amount, date, status).

**You run:** Open `accounts.json` and read the three accounts.

**You should see:** Three records, with the dates and the double charge written out.

**You should understand:** Later tools read this file. They do not invent an account, a plan, or a charge.

---

## Milestone 2 — Look up an account

**Purpose:** Read one account from disk and print it. No model, no MCP.

**Files to add:**
- `accounts.js` — `getAccount(id)` and `listCharges(id)`. Missing ids return a clear not-found result, not a throw the caller has to guess at.
- `print-account.js` — CLI: print one account and its charges to the terminal.

**You run:**
```bash
cd "/Users/niallbennett/Desktop/ai learning path/northline-desk"
node print-account.js --id acct-annual-ok
node print-account.js --id acct-double
node print-account.js --id acct-missing
```

**You should see:** The annual account and its single charge, the double-charge account with both charge ids, and a not-found line for the missing id.

**You should understand:** `get_account` and `list_charges` are ordinary functions over a JSON file. The model is not involved yet.

---

## Milestone 3 — Start a refund, do not pay it

**Purpose:** The write tool checks the Northline rules and starts a refund (pending row). It does not transfer money.

**Files to add:**
- `refundRules.js` — `startRefund({ accountId, chargeId })`:
  - Annual charge 30 days old or newer → pending
  - Monthly charge 14 days old or newer → pending
  - Two successful charges on the same invoice → the duplicate can be pending
  - Anything else → rejected, and nothing is added
  - A second start for the same charge → rejected as already pending
- `start-refund.js` — run one start and print started or rejected, plus the reason
- `pending.json` is created when a refund is started. It starts empty of real payouts.

**You run:**
```bash
node start-refund.js --id acct-annual-ok --charge ch_annual_1
node start-refund.js --id acct-monthly-late --charge ch_monthly_1
node start-refund.js --id acct-double --charge ch_double_dup
```

**You should see:** The annual charge and the duplicate land in `pending.json` with status `pending`. The late monthly charge is rejected and is absent from that file.

**You should understand:** The safety check is code, using the same windows as the refunds page. The model cannot talk its way past a rejected tool result. Pending means “a person has not approved this.”

---

## Milestone 4 — Watch the model choose a tool

**Purpose:** One script sends a request. The model picks a tool, your code runs it, the result goes back, and the model stops with a sentence. You see every step.

**Files to add:**
- `.env.example`, `.gitignore` (include `.env` and `pending.json`)
- `package.json` — `openai`, `dotenv`
- `request-refund.js` — tools are the three functions above. Print each tool name, the arguments, and the tool result, then the final sentence.

**You run:**
```bash
npm install
cp .env.example .env   # add OPENAI_API_KEY
node request-refund.js --id acct-monthly-late
node request-refund.js --id acct-annual-ok
```

**You should see:** For the late monthly account, a lookup and a rejected start_refund, then a sentence that says the refund was not started. For the annual account, a started refund (pending) and a sentence that says it is waiting for a person. Neither run pays anything.

**You should understand:** The model chooses the tool and the arguments. Your functions decide what comes back. When the tool says no, the model is supposed to stop. The trace is how you check that it did.

---

## Milestone 5 — The same tools as an MCP server

**Purpose:** Cursor can call the same three functions without a new set of rules.

**Files to add:**
- `server.js` — MCP server on stdio. Tools: `get_account`, `list_charges`, `start_refund`. Each one calls the function from Milestone 2 or 3.
- A short note in this file’s Milestone 5 section is enough for the Cursor config; a README can wait until the server runs.

**You run:**
```bash
node server.js
```
That process waits for a client, so it will look idle. Stop it with Ctrl+C. Then add the server in Cursor’s MCP settings, command `node`, args the full path to `server.js`. Ask: “Can we refund Northline account acct-monthly-late?”

**You should see:** In Cursor, a tool call to `get_account` or `start_refund`, and an answer that the refund was not started. `pending.json` does not gain a row for that account.

**You should understand:** MCP is the socket. The tools are the ones you already ran. A new client does not get a new, looser refund rule.

---

## Session checklist (every time)

1. Read **Purpose** + **You should understand** for this milestone only.
2. I add **only** the files listed for that milestone.
3. You run the command; paste output if something looks off.
4. Say **“Milestone N done”** before asking for N+1.

## When you’re ready to build

Say: **“Start Milestone 1”** — we will not skip ahead.
