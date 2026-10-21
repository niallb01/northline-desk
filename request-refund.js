// CLI: request a refund for one account via OpenAI; run tools; print trace + final answer.
//
//   read --id
//   define tools: get_account, list_charges, start_refund
//   loop: model → tool call → our function → tool result → model
//   print each tool name, args, result; then final assistant message

const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env"),
  quiet: true,
});

const OpenAI = require("openai");
const { getAccount, listCharges } = require("./accounts");
const { startRefund } = require("./refundRules");

const MODEL = "gpt-4.1-mini";
const MAX_ROUNDS = 8;

const tools = [
  {
    type: "function",
    function: {
      name: "get_account",
      description:
        "Look up one Northline account by id. Returns the plan, customer name, and charges, or a not-found message. Reads only. Does not start a refund or send money.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: {
            type: "string",
            description: "Account id, such as acct-annual-ok.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_charges",
      description:
        "List charges for one Northline account: charge id, invoice id, amount, date, and status. Reads only. Does not start a refund or send money.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: {
            type: "string",
            description: "Account id, such as acct-annual-ok.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_refund",
      description:
        "Start a refund for one charge. Northline rules in code accept or reject it. On accept, status is pending until a person approves. On reject, nothing is saved. This never sends money.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          accountId: {
            type: "string",
            description: "Account id from get_account or list_charges.",
          },
          chargeId: {
            type: "string",
            description: "Charge id from that account's charges.",
          },
        },
        required: ["accountId", "chargeId"],
      },
    },
  },
];

function readId(argv) {
  const index = argv.indexOf("--id");
  if (index === -1 || !argv[index + 1]) {
    return null;
  }
  return argv[index + 1];
}

function runTool(name, args) {
  if (name === "get_account") {
    return getAccount(args.id || args.accountId);
  }

  if (name === "list_charges") {
    return listCharges(args.id || args.accountId);
  }

  if (name === "start_refund") {
    return startRefund({
      accountId: args.accountId || args.id,
      chargeId: args.chargeId,
    });
  }

  return { error: `Unknown tool "${name}".` };
}

function printTrace(name, args, result) {
  console.log(`tool: ${name}`);
  console.log(`arguments: ${JSON.stringify(args, null, 2)}`);
  console.log(`result: ${JSON.stringify(result, null, 2)}`);
  console.log("");
}

async function main() {
  const id = readId(process.argv);
  if (!id) {
    console.error("Usage: node request-refund.js --id <account-id>");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and set it.");
    process.exit(1);
  }

  const client = new OpenAI();
  const messages = [
    {
      role: "system",
      content:
        "You are a Northline support assistant. Use the tools for account facts and for starting a refund. Look up the account and its charges, then call start_refund for the charge on this request and let that tool accept or reject. start_refund never sends money. status pending means it is waiting for a person. status rejected means the refund was not started. When the tools are done, reply with one plain sentence. If the refund was not started, say the refund was not started. If it is pending, say it is waiting for a person. Say that no money was sent.",
    },
    {
      role: "user",
      content: `A customer wants a refund for account ${id}. Look it up and start the refund. The tool decides whether it is allowed.`,
    },
  ];

  let refundRequested = false;

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages,
      tools,
      parallel_tool_calls: false,
      tool_choice: refundRequested ? "auto" : "required",
    });

    const message = response.choices[0] && response.choices[0].message;
    if (!message) {
      console.error("The model returned no message.");
      process.exit(1);
    }

    messages.push(message);

    const calls = message.tool_calls || [];
    if (calls.length === 0) {
      const text = (message.content || "").trim();
      console.log(text || "(The model returned no final sentence.)");
      return;
    }

    for (const call of calls) {
      const name = call.function.name;
      let args;

      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch (err) {
        const result = { error: "Tool arguments were not valid JSON." };
        printTrace(name, call.function.arguments, result);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
        continue;
      }

      const result = runTool(name, args);
      if (name === "start_refund") {
        refundRequested = true;
      }

      printTrace(name, args, result);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  console.error("Stopped: the model kept calling tools without a final sentence.");
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
