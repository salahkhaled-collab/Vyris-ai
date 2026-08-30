"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "audio/webm";
}

/**
 * Dictation only — records audio, sends it to the server for transcription,
 * and hands the resulting text back for the user to review and edit before
 * submitting. Not a conversational voice mode: no text-to-speech, no
 * automatic submission.
 */
export function useDictation(onTranscript: (text: string) => void) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setIsSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined"
    );
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) return;

        setIsTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "dictation.webm");

          const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
          const data = await res.json();

          if (!res.ok) {
            setError(data.message ?? "Couldn't transcribe that. Try again.");
            return;
          }
          if (data.text?.trim()) onTranscript(data.text.trim());
        } catch {
          setError("Couldn't reach the transcription service.");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch {
      setError("Microphone access was denied or is unavailable.");
    }
  }, [onTranscript, stopTracks]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      stopTracks();
    };
  }, [stopTracks]);

  return { isSupported, isListening, isTranscribing, error, start, stop };
}
