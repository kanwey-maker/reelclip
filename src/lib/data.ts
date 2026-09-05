import { clamp, hashSeed, mulberry32, uid } from "./utils";

export interface TranscriptLine {
  start: number;
  end: number;
  text: string;
}

export interface SourceVideo {
  id: string;
  title: string;
  creator: string;
  category: string;
  duration: number;
  words: number;
  url?: string;
  file?: File;
  thumb?: string;
  isProxy?: boolean;
  realTranscript?: boolean;
  transcript: TranscriptLine[];
}

export interface ClipMetrics {
  hook: number;
  retention: number;
  emotion: number;
  trend: number;
  pacing: number;
}

export interface Clip {
  id: string;
  title: string;
  hook: string;
  start: number;
  end: number;
  score: number;
  base: number;
  tags: string[];
  reasons: string[];
  metrics: ClipMetrics;
  emojiBeats: boolean;
  published?: string[];
  publishedAt?: number;
  scheduled?: { platforms: string[]; at: number };
  transcript: TranscriptLine[];
}

const CDN = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/";
const IMG = "https://image.qwenlm.ai/generated-images/";

export const SAMPLE_SOURCES: SourceVideo[] = [
  {
    id: "src-podcast",
    title: "The Creator Economy Deep Dive — Ep. 142",
    creator: "Signal & Noise Podcast",
    category: "Podcast & Creator Economy",
    duration: 2847,
    words: 0,
    url: CDN + "TearsOfSteel.mp4",
    thumb: IMG + "9cd68db4-227a-492f-928b-b9bc560bcbf9/_result.png",
    transcript: [],
  },
  {
    id: "src-gaming",
    title: "Grand Finals VOD — Nexus Arena Championship",
    creator: "Voidline Esports",
    category: "Esports & Gaming",
    duration: 3124,
    words: 0,
    url: CDN + "BigBuckBunny.mp4",
    thumb: IMG + "5080177d-2d30-4a50-95c3-e50ee957282c/_result.png",
    transcript: [],
  },
  {
    id: "src-food",
    title: "48 Hours of Tokyo Street Food",
    creator: "Fork & Frame",
    category: "Food & Travel",
    duration: 1986,
    words: 0,
    url: CDN + "ElephantsDream.mp4",
    thumb: IMG + "7589ffa6-9dc1-4e84-8830-f7b120de66ad/_result.png",
    transcript: [],
  },
  {
    id: "src-tech",
    title: "Shipping AI Products in 2026 — Founder Keynote",
    creator: "Build Loop Conf",
    category: "Tech & Startups",
    duration: 2415,
    words: 0,
    url: CDN + "Sintel.mp4",
    thumb: IMG + "c7169d5b-ce00-45db-b05a-a68f37cffd3a/_result.png",
    transcript: [],
  },
];

/* ------------------------------------------------------------------ */
/* transcript synthesis                                                */
/* ------------------------------------------------------------------ */

const SENTENCES: Record<string, string[]> = {
  "Podcast & Creator Economy": [
    "nobody tells you the first hundred days are pure signal testing",
    "we tripled retention the week we deleted our intro entirely",
    "the algorithm is not luck, it is a mirror of watch time",
    "your hook is a promise and your payoff better keep it",
    "creators who win in 2026 treat clips like a newsroom",
    "I stopped posting daily and my reach went up forty percent",
    "the comment section is your cheapest research lab",
    "shorts are not ads for the long form, they are the product",
    "authenticity scales until you try to script it",
    "the best editors think in beats, not in cuts",
    "you do not need better gear, you need better first lines",
    "every viral clip I studied opened mid-sentence",
  ],
  "Esports & Gaming": [
    "he had eleven hp and somehow traded both of them",
    "that rotation was read three rounds before it happened",
    "the crowd literally could not believe the clutch",
    "one pixel of an angle and the whole map opens up",
    "this is exactly why you never chase into fog",
    "the utility usage here is a masterclass honestly",
    "watch the minimap, the setup starts way earlier",
    "he faked the plant and froze the entire site",
    "forty seconds of silence then absolute chaos",
    "that flick will be on highlight reels for years",
    "comms were calm and that is what won the round",
    "the economy call here changed the entire half",
  ],
  "Food & Travel": [
    "this broth simmers for eighteen hours and you can taste every one",
    "the vendor has made the same dish for thirty one years",
    "you have to eat this within ninety seconds or the crust dies",
    "we followed the steam down an alley with no sign",
    "the secret is lard, and they are not hiding it",
    "one bowl costs less than the train ride here",
    "watch the wok breathe, that char is called wok hei",
    "the line wraps the block by seven in the morning",
    "this knife work took him a decade to learn",
    "the yolk should break into the broth like a sunrise",
    "street food is the fastest museum in any city",
    "he seasons with his hands and never measures twice",
  ],
  "Tech & Startups": [
    "we shipped the demo before we finished the product",
    "distribution is the moat, the model is a commodity",
    "our churn dropped when we removed three features",
    "the best founders I know obsess over the first minute",
    "you are not competing on ai, you compete on taste",
    "the pitch deck that worked had nine words on slide one",
    "latency is a feature and users feel ten milliseconds",
    "we priced on value and doubled conversion overnight",
    "every roadmap is a guess, ship the smallest honest one",
    "the market does not reward effort, it rewards timing",
    "build for the user you were two years ago",
    "our best growth channel was a screenshot of the tool",
  ],
};

const REASONS: Record<string, string[]> = {
  "Podcast & Creator Economy": [
    "Contrarian claim in the first 3 seconds",
    "Numbers drop creates save-worthy moment",
    "Speaker pace rises 22% at the payoff",
    "Question hook invites comment debate",
    "Story loop resolves inside 30s",
  ],
  "Esports & Gaming": [
    "Crowd audio peaks at the clutch moment",
    "Underdog HP trade — high share trigger",
    "Cast commentary syncs with the kill feed",
    "Slow-mo window maps to beat drop",
    "Round-swing stakes are instantly legible",
  ],
  "Food & Travel": [
    "Steam macro shot stops the scroll",
    "Price reveal creates comment bait",
    "Sizzle audio at 11s retention spike",
    "Process reveal has satisfying loop point",
    "Location reveal withheld until the end",
  ],
  "Tech & Startups": [
    "Contrarian take lands in one sentence",
    "Specific metric anchors credibility",
    "Founder cadence rises into the insight",
    "Framework is quotable in a single line",
    "Demo reveal timed with the claim",
  ],
};

const HOOKS: Record<string, string[]> = {
  "Podcast & Creator Economy": [
    "The algorithm is not luck. It is a mirror.",
    "We deleted our intro and retention tripled.",
    "Shorts are not ads. They are the product.",
    "Nobody tells you the first 100 days are a test.",
  ],
  "Esports & Gaming": [
    "He had 11 HP and traded both of them.",
    "This clutch broke the entire arena.",
    "One pixel. That is all the angle he needed.",
    "40 seconds of silence, then pure chaos.",
  ],
  "Food & Travel": [
    "This broth simmered 18 hours. You can taste it.",
    "One bowl. Less than your train ticket.",
    "Eat it in 90 seconds or the crust dies.",
    "We followed the steam into an unnamed alley.",
  ],
  "Tech & Startups": [
    "You are not competing on AI. You compete on taste.",
    "We removed 3 features and churn dropped.",
    "Slide one had nine words. It raised the round.",
    "Users feel ten milliseconds. Ship for that.",
  ],
};

const TITLES: Record<string, string[]> = {
  "Podcast & Creator Economy": [
    "Delete your intro. Watch retention triple.",
    "The 100-day test nobody warns creators about",
    "Shorts ARE the product now",
    "Your hook is a promise — keep it",
  ],
  "Esports & Gaming": [
    "11 HP. Two kills. Zero panic.",
    "The clutch that silenced the arena",
    "He read the rotation 3 rounds early",
    "40 seconds of silence, then everything",
  ],
  "Food & Travel": [
    "18-hour broth in a nameless alley",
    "Tokyo's cheapest perfect bowl",
    "90 seconds or the crust is gone",
    "The vendor who refuses to scale",
  ],
  "Tech & Startups": [
    "Taste is the only moat left",
    "We cut 3 features. Churn fell.",
    "Nine words that raised a round",
    "10ms is a feature. Act like it.",
  ],
};

const TAGS: Record<string, string[]> = {
  "Podcast & Creator Economy": ["#creator", "#shorts", "#growthtips", "#contentstrategy", "#podcast", "#viraltips", "#creatoreconomy"],
  "Esports & Gaming": ["#esports", "#clutch", "#gaming", "#highlight", "#competitive", "#fps", "#grandfinals"],
  "Food & Travel": ["#streetfood", "#tokyo", "#foodie", "#ramen", "#travel", "#hiddenGem", "#wokhei"],
  "Tech & Startups": ["#startup", "#ai", "#founder", "#product", "#saas", "#buildinpublic", "#tech"],
};

export function makeTranscript(duration: number, category: string, seed: string): TranscriptLine[] {
  const cat = SENTENCES[category] ? category : "Tech & Startups";
  const pool = SENTENCES[cat];
  const rnd = mulberry32(hashSeed(seed));
  const lines: TranscriptLine[] = [];
  let t = 0;
  let i = Math.floor(rnd() * pool.length);
  while (t < duration - 4) {
    const text = pool[i % pool.length];
    i += 1 + Math.floor(rnd() * 2);
    const words = text.split(" ").length;
    const dur = clamp(words / 2.6 + 0.4, 2.2, 5.6);
    lines.push({ start: +t.toFixed(2), end: +(t + dur).toFixed(2), text });
    t += dur + 0.25 + rnd() * 0.9;
  }
  return lines;
}

export function prepareSource(s: SourceVideo): SourceVideo {
  if (s.transcript.length > 0) {
    return { ...s, words: s.transcript.reduce((a, l) => a + l.text.split(" ").length, 0) };
  }
  const transcript = makeTranscript(s.duration, s.category, s.id + s.title);
  return { ...s, transcript, words: transcript.reduce((a, l) => a + l.text.split(" ").length, 0) };
}

/* ------------------------------------------------------------------ */
/* clip forging                                                        */
/* ------------------------------------------------------------------ */

export function forgeClips(source: SourceVideo): Clip[] {
  const rnd = mulberry32(hashSeed(source.id + "forge"));
  const usable = Math.max(60, Math.min(source.duration - 30, 560));
  const count = 6;
  const slots: { start: number; len: number }[] = [];
  for (let i = 0; i < count; i++) {
    const zone = (usable - 90) / count;
    const len = 18 + Math.floor(rnd() * 25);
    const start = 30 + i * zone + rnd() * Math.max(4, zone - len - 6);
    slots.push({ start: +start.toFixed(1), len });
  }
  const scores = Array.from({ length: count }, () => 62 + Math.floor(rnd() * 36))
    .sort((a, b) => b - a);

  return slots.map((slot, i) => {
    const start = slot.start;
    const end = +(start + slot.len).toFixed(1);
    const score = scores[i];
    const cat = source.category;
    const transcript = source.transcript.filter((l) => l.end > start && l.start < end);
    const m = (jitter: number) => clamp(Math.round(score + jitter), 38, 99);
    return {
      id: `${source.id}-clip-${i + 1}`,
      title: (TITLES[cat] ?? TITLES["Tech & Startups"])[i % 4],
      hook: (HOOKS[cat] ?? HOOKS["Tech & Startups"])[i % 4],
      start,
      end,
      score,
      base: score - 3,
      tags: (TAGS[cat] ?? TAGS["Tech & Startups"]).slice(0, 3 + (i % 3)),
      reasons: [...(REASONS[cat] ?? REASONS["Tech & Startups"])]
        .sort(() => rnd() - 0.5)
        .slice(0, 2 + (i % 2)),
      metrics: {
        hook: m(4 + Math.floor(rnd() * 6)),
        retention: m(-2 + Math.floor(rnd() * 8)),
        emotion: m(-6 + Math.floor(rnd() * 10)),
        trend: m(-8 + Math.floor(rnd() * 12)),
        pacing: m(-4 + Math.floor(rnd() * 9)),
      },
      emojiBeats: score >= 78,
      transcript,
    };
  });
}

/* ------------------------------------------------------------------ */
/* processing plan                                                     */
/* ------------------------------------------------------------------ */

export interface Stage {
  label: string;
  dur: number;
  logs: string[];
}

export function processingPlan(source: SourceVideo): Stage[] {
  return [
    {
      label: "Ingest & decode",
      dur: 700,
      logs: [`mounted ${source.title}`, "demuxing audio track · 48kHz", "keyframes indexed"],
    },
    {
      label: source.realTranscript ? "Whisper transcript attached" : "Transcribe audio",
      dur: 1100,
      logs: source.realTranscript
        ? [`whisper segments: ${source.transcript.length}`, "word-level timestamps locked"]
        : [`vocoder chunks: ${Math.ceil(source.duration / 30)}`, `${source.words.toLocaleString()} words recognized`, "speaker diarization: 2 voices"],
    },
    {
      label: "Map attention curve",
      dur: 1000,
      logs: ["prosody spikes: 14", "laughter & applause: 6 events", "silence gaps pruned"],
    },
    {
      label: "Detect hooks & payoffs",
      dur: 950,
      logs: ["semantic tension arcs: 9", "open loops detected: 7", "hook candidates: 12"],
    },
    {
      label: "Rank & package clips",
      dur: 750,
      logs: ["virality model: forge-v2", "6 clips forged · sweet-spot aligned", "captions & safe zones ready"],
    },
  ];
}

/* ------------------------------------------------------------------ */
/* caption themes & ai helpers                                         */
/* ------------------------------------------------------------------ */

export interface CaptionTheme {
  id: string;
  name: string;
  desc: string;
  weight: string;
  active: string;
  base: string;
  swatch: string;
}

export const CAPTION_THEMES: CaptionTheme[] = [
  { id: "hormozi", name: "Bold Pop", desc: "All-caps, punchy", weight: "font-extrabold uppercase", active: "#FFC247", base: "#ffffff", swatch: "#FFC247" },
  { id: "punch", name: "Mint Punch", desc: "Streamer energy", weight: "font-extrabold uppercase", active: "#45D6C8", base: "#ffffff", swatch: "#45D6C8" },
  { id: "minimal", name: "Clean Sans", desc: "Quiet & readable", weight: "font-semibold", active: "#EEF1F7", base: "#8b94a9", swatch: "#8b94a9" },
  { id: "news", name: "Broadcast", desc: "Lower-third style", weight: "font-bold", active: "#FF5A36", base: "#ffffff", swatch: "#FF5A36" },
  { id: "volt", name: "Volt Italic", desc: "Vlog flavor", weight: "font-bold italic", active: "#C8F24F", base: "#f4f6fb", swatch: "#C8F24F" },
];

export function hookVariants(clip: Clip, category: string): string[] {
  const pool = HOOKS[category] ?? HOOKS["Tech & Startups"];
  const extras = [
    `Stop scrolling — ${clip.hook.toLowerCase()}`,
    `POV: ${clip.hook.toLowerCase()}`,
    `I rewatched this 10 times. ${clip.hook}`,
    `This ${Math.round(clip.end - clip.start)}s beat the 45-minute version.`,
  ];
  return [clip.hook, ...pool.filter((h) => h !== clip.hook), ...extras].slice(0, 6);
}

export function suggestTags(category: string): string[] {
  return TAGS[category] ?? TAGS["Tech & Startups"];
}

export function titleIdeas(clip: Clip, category: string): string[] {
  const pool = TITLES[category] ?? TITLES["Tech & Startups"];
  const extras = [
    `${Math.round(clip.end - clip.start)}s that outperformed the full video`,
    clip.hook.replace(/\.$/, ""),
    `Watch before this gets buried`,
    `The moment everyone clipped back`,
  ];
  return [clip.title, ...pool.filter((t) => t !== clip.title), ...extras].slice(0, 7);
}

export const PLATFORMS = [
  { id: "tiktok", name: "TikTok", handle: "@reelforge.clips", audience: "212K followers", best: "Thu · 7:40 PM" },
  { id: "ytshorts", name: "YT Shorts", handle: "ReelForge Studio", audience: "96K subs", best: "Fri · 5:15 PM" },
  { id: "reels", name: "IG Reels", handle: "@reelforge", audience: "141K followers", best: "Thu · 8:05 PM" },
  { id: "x", name: "X / Twitter", handle: "@reelforge", audience: "58K followers", best: "Wed · 12:30 PM" },
] as const;

export function inferCategory(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("twitch") || u.includes("gaming")) return "Esports & Gaming";
  if (u.includes("food") || u.includes("travel")) return "Food & Travel";
  if (u.includes("tech") || u.includes("ycombinator")) return "Tech & Startups";
  return "Podcast & Creator Economy";
}

export function makeClipId(): string {
  return uid();
}

/* ------------------------------------------------------------------ */
/* live metrics simulation (deterministic per clip, grows with time)   */
/* ------------------------------------------------------------------ */

export interface ClipLiveMetrics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  watchPct: number;
  vsForecast: number;
  byPlatform: { id: string; views: number }[];
  hourlyByPlatform: Record<string, number[]>;
  retention: number[];
}

const PLATFORM_WEIGHTS: Record<string, number> = { tiktok: 0.44, ytshorts: 0.26, reels: 0.2, x: 0.1 };

export const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "#FF5A36",
  ytshorts: "#FFC247",
  reels: "#45D6C8",
  x: "#8B94A9",
};

export function metricsFor(clip: Clip, now: number): ClipLiveMetrics {
  const rnd = mulberry32(hashSeed(clip.id + ":live"));
  const platforms = clip.published ?? [];
  const at = clip.publishedAt ?? now - 90000;
  const mins = Math.max(0.75, (now - at) / 60000);
  const hours = mins * 6; /* demo acceleration: real minutes → "hours" of reach */
  const reach = platforms.reduce((a, p) => a + (PLATFORM_WEIGHTS[p] ?? 0.1), 0);

  const views = Math.round(((clip.score / 100) ** 2.4) * 5200 * reach * Math.pow(hours, 0.82) * (0.9 + rnd() * 0.25));
  const likes = Math.round(views * (0.055 + rnd() * 0.05));
  const shares = Math.round(views * (0.006 + rnd() * 0.007));
  const comments = Math.round(views * (0.004 + rnd() * 0.005));
  const watchPct = Math.round(clamp(38 + clip.score * 0.42 + (rnd() * 8 - 4), 30, 96));
  const vsForecast = Math.round(((watchPct - 52) / 52) * 100);

  const byPlatform = platforms.map((p) => ({
    id: p,
    views: Math.round(views * ((PLATFORM_WEIGHTS[p] ?? 0.1) / Math.max(0.001, reach)) * (0.85 + rnd() * 0.3)),
  }));

  const hourlyByPlatform: Record<string, number[]> = {};
  platforms.forEach((p) => {
    const total = byPlatform.find((b) => b.id === p)?.views ?? 0;
    const weights: number[] = [];
    let acc = 0;
    for (let i = 0; i < 24; i++) {
      const w = Math.pow((i + 1) / 24, 1.6) * (0.8 + rnd() * 0.4);
      weights.push(w);
      acc += w;
    }
    hourlyByPlatform[p] = weights.map((w) => Math.round((w / acc) * total));
  });

  const retention: number[] = [];
  const floor = clamp(30 + clip.score * 0.45, 40, 82);
  for (let i = 0; i <= 25; i++) {
    const t = i / 25;
    let v = 100 - (100 - floor) * Math.pow(t, 0.8);
    if (t > 0.35 && t < 0.55) v += 6 * Math.sin(((t - 0.35) / 0.2) * Math.PI);
    if (t > 0.9) v += 3;
    retention.push(Math.round(clamp(v + (rnd() * 4 - 2), 5, 100)));
  }

  return { views, likes, shares, comments, watchPct, vsForecast, byPlatform, hourlyByPlatform, retention };
}

/** Demo-accelerated "AI best slot" — seconds from now. */
export function scheduleOffsetFor(clipId: string): number {
  return 45 + (hashSeed(clipId) % 150);
}
