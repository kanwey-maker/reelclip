export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** m:ss */
export function fmtDur(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** mm:ss.d timecode */
export function fmtTC(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const d = Math.floor((s % 1) * 10);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${d}`;
}

/** h:mm:ss */
export function fmtLong(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
    : `${m}:${sec.toString().padStart(2, "0")}`;
}

function srtPart(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

export interface SrtLine {
  text: string;
  start: number;
  end: number;
}

export function buildSrt(lines: SrtLine[], offset: number): string {
  return lines
    .map((l, i) => `${i + 1}\n${srtPart(Math.max(0, l.start - offset))} --> ${srtPart(Math.max(0.1, l.end - offset))}\n${l.text}`)
    .join("\n\n") + "\n";
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Live virality re-score: rewards the 21–45s sweet spot, punishes drift. */
export function retuneScore(base: number, dur: number): number {
  let delta = 0;
  if (dur >= 21 && dur <= 45) delta += 4;
  else if (dur >= 15 && dur < 21) delta += 1;
  else if (dur > 45 && dur <= 60) delta -= 2;
  else if (dur > 60) delta -= 6;
  else delta -= 5;
  if (dur >= 27 && dur <= 38) delta += 2; // the golden pocket
  return clamp(Math.round(base + delta), 40, 99);
}

export function scoreColor(score: number): string {
  if (score >= 85) return "#c8f24f";
  if (score >= 70) return "#ffc247";
  return "#ff7a55";
}

export function scoreLabel(score: number): string {
  if (score >= 92) return "Certified banger";
  if (score >= 85) return "High viral potential";
  if (score >= 75) return "Strong performer";
  if (score >= 65) return "Solid cut";
  return "Worth testing";
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "clip";
}
