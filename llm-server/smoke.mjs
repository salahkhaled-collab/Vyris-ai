// Checks an AI server the way Vyris uses it, before Vyris is switched to it.
//
//   PYTHON_LLM_URL=https://<pod>-8000.proxy.runpod.net/v1/chat/completions \
//   PYTHON_LLM_API_KEY=... PYTHON_LLM_MODEL=openai/gpt-oss-120b \
//   node llm-server/smoke.mjs
//
// Same three settings Vyris reads in Vercel. Prints PASS/FAIL per check and
// exits non-zero if anything fails. Sends only made-up test text.

const url = process.env.PYTHON_LLM_URL?.trim();
const key = process.env.PYTHON_LLM_API_KEY ?? "";
const model = process.env.PYTHON_LLM_MODEL ?? "openai/gpt-oss-120b";
if (!url) {
  console.error("Set PYTHON_LLM_URL (and PYTHON_LLM_API_KEY, PYTHON_LLM_MODEL) first.");
  process.exit(2);
}

const results = [];
let failed = 0;
async function check(name, fn) {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push(`PASS ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)${note ? ` - ${note}` : ""}`);
  } catch (e) {
    failed++;
    results.push(`FAIL ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s) - ${e.message}`);
  }
}

async function chat(body, apiKey = key, timeoutMs = 120_000) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({ model, ...body }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep the text for the error
  }
  return { status: res.status, json, text };
}

// The same tool shape Vyris's assistant sends.
const createTask = {
  type: "function",
  function: {
    name: "create_task",
    description: "Create a task in a project.",
    parameters: {
      type: "object",
      properties: { title: { type: "string" }, projectTitle: { type: "string" }, dueDateISO: { type: "string" } },
      required: ["title"],
    },
  },
};

await check("rejects a wrong key", async () => {
  const r = await chat({ messages: [{ role: "user", content: "hi" }], max_tokens: 5 }, "wrong-key-for-smoke-test", 30_000);
  if (r.status !== 401 && r.status !== 403) throw new Error(`expected 401, got ${r.status}. The server may be open to anyone.`);
});

await check("answers a plain message", async () => {
  const r = await chat({ messages: [{ role: "system", content: "Reply in one short sentence." }, { role: "user", content: "Say hello to a founder." }], max_tokens: 200 });
  if (r.status !== 200) throw new Error(`status ${r.status}: ${r.text.slice(0, 200)}`);
  const content = r.json?.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("empty reply");
  return JSON.stringify(content.slice(0, 80));
});

await check("calls a tool with valid JSON arguments", async () => {
  const r = await chat({
    messages: [{ role: "system", content: "You manage tasks. Use tools." }, { role: "user", content: "Add a task 'Send Omar the proposal' in Atlas Retail, due 2026-11-19." }],
    tools: [createTask],
    max_tokens: 800,
  });
  if (r.status !== 200) throw new Error(`status ${r.status}: ${r.text.slice(0, 200)}`);
  const call = r.json?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("no tool call returned. Check --enable-auto-tool-choice --tool-call-parser openai");
  if (call.function?.name !== "create_task") throw new Error(`called ${call.function?.name}`);
  const args = JSON.parse(call.function.arguments);
  if (!/proposal/i.test(args.title ?? "")) throw new Error(`odd arguments: ${call.function.arguments}`);
  return call.function.arguments;
});

await check("continues after a tool result (the assistant loop)", async () => {
  const r = await chat({
    messages: [
      { role: "user", content: "Add a task 'Send Omar the proposal'." },
      { role: "assistant", content: null, tool_calls: [{ id: "call_1", type: "function", function: { name: "create_task", arguments: "{\"title\":\"Send Omar the proposal\"}" } }] },
      { role: "tool", tool_call_id: "call_1", content: "{\"ok\":true,\"created\":{\"title\":\"Send Omar the proposal\"}}" },
    ],
    tools: [createTask],
    max_tokens: 300,
  });
  if (r.status !== 200) throw new Error(`status ${r.status}: ${r.text.slice(0, 200)}`);
  const msg = r.json?.choices?.[0]?.message;
  if (!msg?.content?.trim()) throw new Error("no text after the tool result");
});

await check("replies in Arabic when written to in Arabic", async () => {
  const r = await chat({ messages: [{ role: "system", content: "Reply in the language of the user's message, one sentence." }, { role: "user", content: "ممكن تقولي إزاي أرتب يومي؟" }], max_tokens: 300 });
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  const content = r.json?.choices?.[0]?.message?.content ?? "";
  if (!/[؀-ۿ]/.test(content)) throw new Error(`not Arabic: ${content.slice(0, 80)}`);
});

await check("returns JSON when asked (inbox sorting format)", async () => {
  const r = await chat({ messages: [{ role: "system", content: 'Reply with ONLY JSON: {"priority": "urgent"|"needs_reply"|"fyi"|"low"}' }, { role: "user", content: "Email: 'Can you send the contract today? It's urgent.'" }], max_tokens: 400 });
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  const c = r.json?.choices?.[0]?.message?.content ?? "";
  const o = JSON.parse(c.slice(c.indexOf("{"), c.lastIndexOf("}") + 1));
  if (!["urgent", "needs_reply", "fyi", "low"].includes(o.priority)) throw new Error(c);
  return o.priority;
});

console.log(results.join("\n"));
console.log(failed ? `\n${failed} check(s) failed. Don't switch Vyris yet.` : "\nAll checks passed. Safe to switch Vyris to this server.");
process.exit(failed ? 1 : 0);
