import { actions } from "@/lib/ai/actions";

export async function POST(req: Request) {
  // 1. read the body ONCE
  const { message, conversationId, page, pageData } = await req.json();
  const userId = /* your real auth code goes here */;

  // 2. create or verify the conversation
  let convoId = conversationId;
  if (!convoId) {
    convoId = (await createConversation(userId, message.slice(0, 40))).id;
  } else {
    const owns = await getConversation(convoId, userId);
    if (!owns) return Response.json({ error: "Not found" }, { status: 404 });
  }

  await saveMessage(convoId, "user", message);

  // 3. build the system prompt
  const system = `You control an app. Available actions:
${Object.entries(actions).map(([n, a]) => `- ${n}: ${a.description}`).join("\n")}

If the user asks for something an action can do, reply with ONLY this JSON, nothing else:
{"action":"<name>","args":{...}}
Otherwise reply in plain text.

Current page: ${page}
Page data: ${JSON.stringify(pageData).slice(0, 4000)}`;

  // 4. call the LLM with the last 20 saved messages
  const history = await getRecentMessages(convoId, 20);
  const raw = await callPythonLLM(system, history);

  // 5. parse and execute, but DON'T return yet
  let reply = raw;
  let parsed;
  try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? ""); } catch {}

  if (parsed?.action && actions[parsed.action as keyof typeof actions]) {
    const a = actions[parsed.action as keyof typeof actions];
    const args = a.schema.safeParse(parsed.args);
    reply = args.success
      ? await a.run(userId, args.data as any)
      : "I couldn't understand those details. Try again?";
  }

  // 6. save and return ONCE, at the very end
  await saveMessage(convoId, "assistant", reply);
  return Response.json({ reply, conversationId: convoId });
}