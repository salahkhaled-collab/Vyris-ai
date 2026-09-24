export type PythonMessage = {
  role: "user" | "assistant" | "tool";
  content: unknown;
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
};

function getPythonLlmUrl() {
  const url = process.env.PYTHON_LLM_URL?.trim();
  if (!url) throw new Error("PYTHON_LLM_URL is not configured");
  return url;
}

function normalizeCompletion(data: any): PythonCompletion {
  const message = data?.choices?.[0]?.message ?? data;
  const rawToolCalls = message?.tool_calls ?? data?.tool_calls ?? [];
  const toolCalls = Array.isArray(rawToolCalls)
    ? rawToolCalls.map((call: any, index: number) => {
        const rawInput = call.input ?? call.arguments ?? call.function?.arguments ?? {};
        let input = rawInput;
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
          input: input && typeof input === "object" ? input : {},
        };
      })
    : [];

  const content = message?.content ?? data?.text ?? data?.reply ?? "";
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.filter((part: any) => part?.type === "text").map((part: any) => part.text).join("\n")
      : "";

  return { text, toolCalls, assistantContent: content };
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

  const response = await fetch(getPythonLlmUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: process.env.PYTHON_LLM_MODEL ?? "vyris-local",
      system: input.system,
      messages: input.messages,
      tools: input.tools,
      max_tokens: input.maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`Python LLM request failed with status ${response.status}`);
  }

  return normalizeCompletion(await response.json());
}

export function pythonLlmConfigured() {
  return Boolean(process.env.PYTHON_LLM_URL?.trim());
}