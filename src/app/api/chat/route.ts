// src/app/api/chat/route.ts (your existing chat route)
import { actions } from "@/lib/ai/actions";

export async function POST(req: Request) {
  const { messages, page, pageData } = await req.json();
  const userId = /* your existing auth code */;

  // PART 2: build the system prompt
  const system = `You control an app. Available actions:
${Object.entries(actions).map(([n, a]) => `- ${n}: ${a.description}`).join("\n")}

If the user asks for something an action can do, reply with ONLY this JSON, nothing else:
{"action":"<name>","args":{...}}
Otherwise reply in plain text.

Current page: ${page}
Page data: ${JSON.stringify(pageData).slice(0, 4000)}`;

  // your existing call to the Python LLM, now with the new system prompt
  const raw = await callPythonLLM(system, messages);

  // PART 3: parse, validate, execute
  let parsed;
  try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? ""); } catch {}

  if (parsed?.action && actions[parsed.action as keyof typeof actions]) {
    const a = actions[parsed.action as keyof typeof actions];
    const args = a.schema.safeParse(parsed.args);
    if (!args.success) return Response.json({ reply: "I couldn't understand those details. Try again?" });
    const result = await a.run(userId, args.data as any);
    return Response.json({ reply: result });
  }

  return Response.json({ reply: raw });
}