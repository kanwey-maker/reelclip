import type { TranscriptLine } from "./data";

/**
 * Real transcription via OpenAI Whisper (bring-your-own key, called from the
 * browser — fine for prosumer use; production should proxy through a server).
 */
export async function transcribeWithWhisper(file: File, key: string): Promise<TranscriptLine[]> {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("File exceeds the 25MB Whisper limit");
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("model", "whisper-1");
  fd.append("response_format", "verbose_json");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`Whisper API error ${res.status}`);
    }
    const json = (await res.json()) as { segments?: { start: number; end: number; text: string }[] };
    const lines = (json.segments ?? [])
      .map((s) => ({ start: +s.start.toFixed(2), end: +s.end.toFixed(2), text: s.text.trim() }))
      .filter((l) => l.text.length > 0);
    if (lines.length === 0) throw new Error("Whisper returned no segments");
    return lines;
  } finally {
    clearTimeout(timer);
  }
}
