"use client";

import { useDictation } from "@/lib/useDictation";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function DictationButton({
  onTranscript,
  className,
}: {
  onTranscript: (text: string) => void;
  className?: string;
}) {
  const { isSupported, isListening, isTranscribing, error, start, stop } = useDictation(onTranscript);

  if (!isSupported) return null;

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={isListening ? stop : start}
        disabled={isTranscribing}
        aria-label={isListening ? "Stop dictation" : "Start dictation"}
        aria-pressed={isListening}
        title={
          isTranscribing
            ? "Transcribing..."
            : isListening
            ? "Listening — click to stop"
            : "Click to dictate"
        }
        className={cn(
          "shrink-0 p-2 rounded-lg transition-colors disabled:opacity-60",
          isListening
            ? "bg-signal/[0.15] text-signal"
            : "bg-panel-2 text-muted hover:text-ink-text",
          className
        )}
      >
        {isListening ? (
          <Mic className="w-4 h-4 animate-pulse" strokeWidth={1.75} />
        ) : isTranscribing ? (
          <Mic className="w-4 h-4 animate-pulse opacity-60" strokeWidth={1.75} />
        ) : (
          <MicOff className="w-4 h-4" strokeWidth={1.75} />
        )}
      </button>
      {error && (
        <div className="absolute bottom-full mb-2 right-0 w-48 text-[11px] text-signal/90 bg-panel border border-line rounded-lg px-2.5 py-1.5 shadow-lg z-10">
          {error}
        </div>
      )}
    </div>
  );
}
