// Lets Cursor call get_account, list_charges, and start_refund over MCP (stdio).
//
//   expose the three tools to Cursor
//   each tool runs the matching function in accounts.js or refundRules.js
//   send the result back as JSON
//   wait on stdin until Cursor connects

const { McpServer } = require("@modelcontextprotocol/server");
const { serveStdio } = require("@modelcontextprotocol/server/stdio");
const { z } = require("zod");
const { getAccount, listCharges } = require("./accounts");
const { startRefund } = require("./refundRules");

function toolResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

function createServer() {
  const server = new McpServer({
    name: "northline-desk",
    version: "1.0.0",
  });

  server.registerTool(
    "get_account",
    {
      title: "Get account",
      description:
        "Look up one Northline account by id. Returns the plan, customer name, and charges, or a not-found message. Reads only. Does not start a refund or send money.",
      inputSchema: z.object({
        id: z.string().describe("Account id, such as acct-annual-ok."),
      }),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => toolResult(getAccount(id))
  );

  server.registerTool(
    "list_charges",
    {
      title: "List charges",
      description:
        "List charges for one Northline account: charge id, invoice id, amount, date, and status. Reads only. Does not start a refund or send money.",
      inputSchema: z.object({
        id: z.string().describe("Account id, such as acct-annual-ok."),
      }),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => toolResult(listCharges(id))
  );

  server.registerTool(
    "start_refund",
    {
      title: "Start refund",
      description:
        "Start a refund for one charge. Northline rules in code accept or reject it. On accept, status is pending until a person approves. On reject, nothing is saved. This never sends money.",
      inputSchema: z.object({
        accountId: z
          .string()
          .describe("Account id from get_account or list_charges."),
        chargeId: z.string().describe("Charge id from that account's charges."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ accountId, chargeId }) =>
      toolResult(startRefund({ accountId, chargeId }))
  );

  return server;
}

serveStdio(createServer);
