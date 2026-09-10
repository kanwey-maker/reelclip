import type { TranscriptLine } from "./data";

/**
 * Deepgram transcription API integration
 * Handles files of any size with better accuracy than Whisper
 */

export interface DeepgramResponse {
  results: {
    channels: {
      alternatives: {
        words: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
        }>;
      }[];
    }[];
  };
}

export async function transcribeWithDeepgram(
  file: File,
  apiKey: string,
  onProgress?: (pct: number) => void
): Promise<TranscriptLine[]> {
  if (!apiKey) {
    throw new Error("Deepgram API key not configured");
  }

  onProgress?.(10);

  const formData = new FormData();
  formData.append("file", file);

  onProgress?.(25);

  const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
    },
    body: formData,
  });

  onProgress?.(70);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram API error ${response.status}: ${error.slice(0, 200)}`);
  }

  onProgress?.(90);

  const data = (await response.json()) as DeepgramResponse;

  const words = data.results.channels[0].alternatives[0].words;

  if (!words || words.length === 0) {
    throw new Error("No transcription returned");
  }

  // Group words into lines (roughly every 8-12 words or at natural pauses)
  const lines: TranscriptLine[] = [];
  let currentLine: { words: typeof words; start: number } = { words: [], start: 0 };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (currentLine.words.length === 0) {
      currentLine.start = word.start;
    }

    currentLine.words.push(word);

    // Create a new line every 10 words or if there's a gap > 0.5s
    const nextWord = words[i + 1];
    const gap = nextWord ? nextWord.start - word.end : 0;
    const shouldBreak = currentLine.words.length >= 10 || gap > 0.5;

    if (shouldBreak || i === words.length - 1) {
      const text = currentLine.words.map((w) => w.word).join(" ");
      const end = currentLine.words[currentLine.words.length - 1].end;

      lines.push({
        start: currentLine.start,
        end: end,
        text: text,
      });

      currentLine = { words: [], start: 0 };
    }
  }

  onProgress?.(100);

  return lines;
}
