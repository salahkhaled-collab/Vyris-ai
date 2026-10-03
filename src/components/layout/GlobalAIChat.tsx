"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DictationButton } from "@/components/ui/DictationButton";
import {
  Bot,
  X,
  Send,
  Minimize2,
  Maximize2,
  Sparkles,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Page-specific context labels
function getPageContext(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/strategy")) return "Strategic Planning";
  if (pathname.startsWith("/decisions")) return "Decision Support";
  if (pathname.startsWith("/risks")) return "Risks";
  if (pathname.startsWith("/inbox")) return "Inbox";
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/calendar")) return "Calendar";
  if (pathname.startsWith("/meetings")) return "Meetings";
  if (pathname.startsWith("/comms")) return "Communications";
  if (pathname.startsWith("/automation")) return "AI & Automation";
  if (pathname.startsWith("/contacts")) return "Contacts";
  if (pathname.startsWith("/documents")) return "Documents";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Vyris";
}

// Suggested prompts per page
function getPageSuggestions(pathname: string): string[] {
  if (pathname.startsWith("/projects"))
    return [
      "Create a new project called Marketing Q4",
      "What projects are in progress?",
      "Add a task to my latest project",
    ];
  if (pathname.startsWith("/decisions"))
    return [
      "Help me think through a decision",
      "What decisions are still open?",
      "Add a new decision to track",
    ];
  if (pathname.startsWith("/risks"))
    return [
      "What risks should I be aware of?",
      "Add a new risk item",
      "Help me assess a risk",
    ];
  if (pathname.startsWith("/strategy"))
    return [
      "Review my current objectives",
      "Add a new strategic objective",
      "What should I focus on this quarter?",
    ];
  if (pathname.startsWith("/contacts"))
    return [
      "Add a new contact",
      "Find contacts at a specific company",
      "Summarize my network",
    ];
  if (pathname.startsWith("/automation"))
    return [
      "Create a new automation rule",
      "What automations are active?",
      "Help me set up a workflow",
    ];
  return [
    "Summarize what needs my attention today",
    "What are my open decisions?",
    "Help me think through a challenge",
  ];
}

export function GlobalAIChat() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pageContext = getPageContext(pathname);
  const suggestions = getPageSuggestions(pathname);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Try to perform page actions based on the user message
  const tryPageAction = useCallback(
    async (userMessage: string): Promise<string | null> => {
      const msg = userMessage.toLowerCase();

      // Project creation
      if (
        (msg.includes("create") || msg.includes("add") || msg.includes("new")) &&
        msg.includes("project")
      ) {
        const titleMatch =
          userMessage.match(/project (?:called|named|titled) ["']?([^"'\n]+?)["']?(?:\s|$)/i) ||
          userMessage.match(/["']([^"']+)["'] project/i) ||
          userMessage.match(/new project[:\s]+([^\n.?!]+)/i);
        if (titleMatch) {
          const title = titleMatch[1].trim();
          try {
            const res = await fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title }),
            });
            if (res.ok) {
              if (!pathname.startsWith("/projects")) router.push("/projects");
              return `✓ Project "${title}" created successfully.`;
            }
          } catch {
            // silent fail
          }
        }
      }

      // Contact creation
      if (
        (msg.includes("add") || msg.includes("create") || msg.includes("new")) &&
        msg.includes("contact")
      ) {
        const nameMatch =
          userMessage.match(/contact (?:called|named) ["']?([^"'\n]+?)["']?(?:\s|$)/i) ||
          userMessage.match(/add ["']?([^"'\n]+?)["']? (?:as a |to )?contact/i);
        if (nameMatch) {
          const name = nameMatch[1].trim();
          try {
            const res = await fetch("/api/contacts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name }),
            });
            if (res.ok) {
              if (!pathname.startsWith("/contacts")) router.push("/contacts");
              return `✓ Contact "${name}" added successfully.`;
            }
          } catch {
            // silent fail
          }
        }
      }

      // Navigation commands
      const navMap: [RegExp, string][] = [
        [/(go to|open|navigate to|show) (projects?)/i, "/projects"],
        [/(go to|open|navigate to|show) (decisions?)/i, "/decisions"],
        [/(go to|open|navigate to|show) (risks?)/i, "/risks"],
        [/(go to|open|navigate to|show) (strat(egy|egic)?)/i, "/strategy"],
        [/(go to|open|navigate to|show) (contacts?)/i, "/contacts"],
        [/(go to|open|navigate to|show) (calendar)/i, "/calendar"],
        [/(go to|open|navigate to|show) (dashboard|home)/i, "/dashboard"],
        [/(go to|open|navigate to|show) (automation|ai)/i, "/automation"],
        [/(go to|open|navigate to|show) (inbox)/i, "/inbox"],
        [/(go to|open|navigate to|show) (meetings?)/i, "/meetings"],
        [/(go to|open|navigate to|show) (documents?|docs?)/i, "/documents"],
        [/(go to|open|navigate to|show) (comms?|communications?)/i, "/comms"],
        [/(go to|open|navigate to|show) (settings?)/i, "/settings"],
      ];

      for (const [pattern, href] of navMap) {
        if (pattern.test(userMessage)) {
          router.push(href);
          return `✓ Navigating to ${href.slice(1).replace(/-/g, " ")}.`;
        }
      }

      return null;
    },
    [pathname, router]
  );

  async function handleSend(overrideInput?: string) {
    const text = (overrideInput ?? input).trim();
    if (!text || pending) return;

    const userMsg: Message = {
      id: `m${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setError(null);
    setActionFeedback(null);
    setPending(true);

    // Try page action first (in parallel with AI response)
    const actionPromise = tryPageAction(text);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Vyris couldn't respond right now.");
        setPending(false);
        return;
      }

      const reply: Message = {
        id: `m${Date.now() + 1}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, reply]);

      // Show action feedback if any action was taken
      const feedback = await actionPromise;
      if (feedback) setActionFeedback(feedback);
    } catch {
      setError("Could not reach Vyris. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  const panelW = expanded ? "lg:w-[480px]" : "lg:w-[360px]";
  const panelH = expanded ? "lg:h-[600px]" : "lg:h-[460px]";

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          id="global-ai-chat-trigger"
          onClick={() => setOpen(true)}
          aria-label="Open Vyris AI assistant"
          className={cn(
            "fixed bottom-20 right-5 z-50 lg:bottom-6 lg:right-6",
            "flex items-center gap-2.5 px-4 py-3 rounded-2xl",
            "bg-brass text-white shadow-lg hover:shadow-xl hover:scale-105",
            "transition-all duration-200"
          )}
        >
          <Bot className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-sm font-medium">Ask Vyris</span>
          <Sparkles className="w-3.5 h-3.5 opacity-70" strokeWidth={2} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 flex flex-col",
            "bottom-20 right-5 lg:bottom-6 lg:right-6",
            "bg-panel border border-line rounded-2xl shadow-2xl",
            "w-[calc(100vw-40px)] h-[420px]",
            panelW,
            panelH,
            "transition-all duration-300 ease-out"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-brass/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-brass" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-none">Vyris</div>
                <div className="text-[10px] text-muted mt-0.5 truncate">
                  {pageContext} · AI Chief of Staff
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_0_3px_rgba(127,224,200,0.15)]" />
              <button
                onClick={() => setExpanded((v) => !v)}
                className="hidden lg:flex p-1.5 rounded-lg text-muted hover:text-ink-text hover:bg-black/[0.05] transition-colors ml-1"
                aria-label={expanded ? "Shrink panel" : "Expand panel"}
              >
                {expanded ? (
                  <Minimize2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                )}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-ink-text hover:bg-black/[0.05] transition-colors"
                aria-label="Close AI chat"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-thin">
            {messages.length === 0 && !pending && (
              <div className="space-y-3">
                <div className="text-xs text-muted text-center pt-2">
                  Ask anything — I can answer questions, take actions, and navigate the app.
                </div>
                <div className="space-y-1.5 pt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className={cn(
                        "w-full text-left text-xs px-3 py-2 rounded-lg",
                        "bg-panel-2 text-muted hover:text-ink-text hover:bg-black/[0.06]",
                        "border border-line transition-colors"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-brass text-white"
                      : "bg-panel-2 text-ink-text/90 border border-line"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <div
                    className={cn(
                      "text-[10px] mt-1.5 font-mono",
                      m.role === "user" ? "text-white/60" : "text-muted"
                    )}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {pending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl px-3.5 py-3 text-sm bg-panel-2 border border-line">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-signal/80 px-1">{error}</div>
            )}

            {actionFeedback && (
              <div className="text-xs text-signal bg-signal/10 rounded-lg px-3 py-2 border border-signal/20">
                {actionFeedback}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div className="px-3 py-3 border-t border-line flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={`Ask Vyris on ${pageContext}...`}
              disabled={pending}
              className={cn(
                "flex-1 bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm",
                "placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass",
                "disabled:opacity-60 min-w-0"
              )}
            />
            <DictationButton
              onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
            />
            <button
              id="global-ai-chat-send"
              onClick={() => handleSend()}
              disabled={pending || !input.trim()}
              aria-label="Send message to Vyris"
              className="shrink-0 p-2 rounded-lg bg-brass text-white disabled:opacity-50 hover:bg-brass/90 transition-colors"
            >
              <Send className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
