import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Sign in to use dictation." },
      { status: 401 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "missing_api_key",
        message: "OPENAI_API_KEY is not set on the server. Add it to .env.local to enable dictation.",
      },
      { status: 500 }
    );
  }

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Expected multipart form data with an 'audio' field." },
      { status: 400 }
    );
  }

  const audio = incoming.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json(
      { error: "missing_audio", message: "No audio was provided." },
      { status: 400 }
    );
  }

  // Reject anything absurdly long to keep per-call cost bounded (~10 min cap).
  const MAX_BYTES = 25 * 1024 * 1024; // Whisper's own upload limit is 25MB
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "audio_too_large", message: "That recording is too long to transcribe." },
      { status: 413 }
    );
  }

  const forwardForm = new FormData();
  forwardForm.append("file", audio, "dictation.webm");
  forwardForm.append("model", "whisper-1");

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: forwardForm,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("Whisper transcription error:", response.status, errText);
      return NextResponse.json(
        { error: "transcription_failed", message: "Couldn't transcribe that. Try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text ?? "" });
  } catch (err) {
    console.error("Whisper request failed:", err);
    return NextResponse.json(
      { error: "transcription_failed", message: "Couldn't reach the transcription service." },
      { status: 502 }
    );
  }
}
