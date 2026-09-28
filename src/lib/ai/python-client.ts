// src/lib/ai/python-client.ts
//
// Client for Vyris's own LLM server. Works with ANY server that speaks the
// OpenAI-compatible /v1/chat/completions protocol (vLLM, Ollama, LM Studio,
// Together, Fireworks, your own Python FastAPI wrapper, ...). No Anthropic
// or OpenAI SDK involved — it's a plain fetch.
//
// Env vars (set in Vercel -> Project Settings -> Environment Variables):
//   PYTHON_LLM_URL      full endpoint, e.g. https://your-host/v1/chat/completions
//   PYTHON_LLM_API_KEY  optional, sent as "Authorization: Bearer <key>"
//   PYTHON_LLM_MODEL    optional, defaults to "vyris-local"

const REQUEST_TIMEOUT_MS = 45_000;

export type PythonToolCallMessage = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type PythonMessage = {
  role: "user" | "assistant" | "tool";
  content: unknown;
  tool_calls?: PythonToolCallMessage[]; // assistant messages that requested tools
  tool_call_id?: string; // tool messages answering a request
};

export type PythonTool = {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
};

export type PythonToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type PythonCompletion = {
  text: string;
  toolCalls: PythonToolCall[];
  assistantContent: unknown;
  /** Ready-to-append assistant message (includes tool_calls) for agent loops. */
  assistantMessage: PythonMessage;
};

function getPythonLlmUrl() {
  const url = process.env.PYTHON_LLM_URL?.trim();
  if (!url) throw new Error("PYTHON_LLM_URL is not configured");
  return url;
}

function normalizeCompletion(data: any): PythonCompletion {
  const message = data?.choices?.[0]?.message ?? data;
  const rawToolCalls = message?.tool_calls ?? data?.tool_calls ?? [];

  const toolCalls: PythonToolCall[] = Array.isArray(rawToolCalls)
    ? rawToolCalls
        .map((call: any, index: number) => {
          const rawInput = call.input ?? call.arguments ?? call.function?.arguments ?? {};
          let input: unknown = rawInput;
          if (typeof rawInput === "string") {
            try {
              input = JSON.parse(rawInput);
            } catch {
              input = {};
            }
          }
          return {
            id: String(call.id ?? `python-tool-${index}`),
            name: String(call.name ?? call.function?.name ?? ""),
            input: input && typeof input === "object" ? (input as Record<string, unknown>) : {},
          };
        })
        .filter((call) => call.name.length > 0)
    : [];

  const content = message?.content ?? data?.text ?? data?.reply ?? "";
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .filter((part: any) => part?.type === "text")
            .map((part: any) => part.text)
            .join("\n")
        : "";

  const assistantMessage: PythonMessage = {
    role: "assistant",
    content: text || null,
    ...(toolCalls.length
      ? {
          tool_calls: toolCalls.map((c) => ({
            id: c.id,
            type: "function" as const,
            function: { name: c.name, arguments: JSON.stringify(c.input) },
          })),
        }
      : {}),
  };

  return { text, toolCalls, assistantContent: content, assistantMessage };
}

export async function completeWithPythonLlm(input: {
  system?: string;
  messages: PythonMessage[];
  tools?: readonly PythonTool[];
  maxTokens?: number;
}): Promise<PythonCompletion> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.PYTHON_LLM_API_KEY) {
    headers.Authorization = `Bearer ${process.env.PYTHON_LLM_API_KEY}`;
  }

  // OpenAI-compatible servers read the system prompt from the messages
  // array — a top-level "system" field is ignored by most of them.
  const messages = [
    ...(input.system ? [{ role: "system", content: input.system }] : []),
    ...input.messages,
  ];

  // Tool schemas: internal {name, description, input_schema} -> OpenAI function format.
  const tools = input.tools?.length
    ? input.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.input_schema },
      }))
    : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(getPythonLlmUrl(), {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.PYTHON_LLM_MODEL ?? "vyris-local",
        messages,
        tools,
        max_tokens: input.maxTokens,
      }),
    });

    if (!response.ok) {
      // Include the provider's error body so Vercel logs show the real reason.
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      throw new Error(`Python LLM request failed with status ${response.status}: ${detail}`);
    }

    return normalizeCompletion(await response.json());
  } finally {
    clearTimeout(timer);
  }
}

export function pythonLlmConfigured() {
  return Boolean(process.env.PYTHON_LLM_URL?.trim());
}
