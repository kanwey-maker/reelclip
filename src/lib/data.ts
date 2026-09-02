import { clamp, hashStr, mulberry32, shuffle } from "./utils";

export type Category = "Podcast" | "Gaming" | "Cooking" | "Tech";

export interface SourceVideo {
  id: string;
  title: string;
  category: Category;
  creator: string;
  duration: number; // seconds (0 = unknown until metadata)
  url: string;
  thumb: string;
  words: number;
  custom?: boolean;
}

export interface WordT { w: string; t: number; d: number }
export interface Line { id: string; text: string; start: number; end: number; words: WordT[] }
export interface Metrics { hook: number; retention: number; emotion: number; trend: number; pacing: number }

export interface Clip {
  id: string;
  title: string;
  hook: string;
  start: number;
  end: number;
  base: number;
  score: number;
  metrics: Metrics;
  tags: string[];
  reasons: string[];
  transcript: Line[];
  sourceId: string;
}

export const SAMPLE_SOURCES: SourceVideo[] = [
  {
    id: "pod",
    title: "Creator Economy Podcast #142 — Money, Burnout & the Algorithm",
    category: "Podcast",
    creator: "Signal & Noise",
    duration: 3526,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumb: "https://image.qwenlm.ai/generated-images/9cd68db4-227a-492f-928b-b9bc560bcbf9/_result.png",
    words: 9124,
  },
  {
    id: "game",
    title: "Road to Radiant — Ranked Grind (Full VOD)",
    category: "Gaming",
    creator: "nyx.plays",
    duration: 11520,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumb: "https://image.qwenlm.ai/generated-images/5080177d-2d30-4a50-95c3-e50ee957282c/_result.png",
    words: 14802,
  },
  {
    id: "cook",
    title: "Street Food Masterclass — Tonkotsu Ramen From Scratch",
    category: "Cooking",
    creator: "Umami Lab",
    duration: 2530,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumb: "https://image.qwenlm.ai/generated-images/7589ffa6-9dc1-4e84-8830-f7b120de66ad/_result.png",
    words: 6341,
  },
  {
    id: "tech",
    title: "Founder Stage — AI Keynote & Live Q&A",
    category: "Tech",
    creator: "Fwd Summit",
    duration: 2970,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumb: "https://image.qwenlm.ai/generated-images/c7169d5b-ce00-45db-b05a-a68f37cffd3a/_result.png",
    words: 7988,
  },
];

/* ------------------------------------------------------------------ */
/* Content banks                                                       */
/* ------------------------------------------------------------------ */

interface Entry { title: string; hook: string; tags: string[]; reasons: string[]; base: number }

const ENTRIES: Record<Category, Entry[]> = {
  Podcast: [
    { title: "The 1% Rule Nobody Follows", hook: "You don't need a million fans. You need 1,000 true ones — here's the math.", tags: ["creatoreconomy", "podcasting", "audience"], reasons: ["Hook lands inside 1.4s", "Retention spike at 0:09 (contrarian claim)", "Question loop closes at the end"], base: 96 },
    { title: "Why Episode 30 Kills Channels", hook: "We tracked 400 podcasts. Almost all of them die at the exact same episode.", tags: ["podcasttips", "consistency", "data"], reasons: ["Data point creates authority", "Curiosity gap holds to 82%", "Shareable stat for comments"], base: 91 },
    { title: "Sponsorship Math Exposed", hook: "Your CPM is lying to you. Real brand-deal money looks nothing like the screenshots.", tags: ["money", "sponsorships", "creator"], reasons: ["Money topic = high save rate", "Strong 'insider' framing", "CTA-ready ending"], base: 88 },
    { title: "Burnout Is a Business Problem", hook: "Stop calling it burnout. It's a business model problem — and it has a fix.", tags: ["burnout", "mindset", "creators"], reasons: ["Reframe pattern interrupts scroll", "Emotional peak mid-clip", "High replay value"], base: 84 },
    { title: "Your Niche Is a Promise", hook: "A niche isn't a topic. It's a promise you make to a stranger in three seconds.", tags: ["niche", "branding", "strategy"], reasons: ["Memorable one-liner at 0:06", "Clean narrative arc", "Comments bait ('what's your promise?')"], base: 79 },
    { title: "The First 1,000 Fans", hook: "Your first 1,000 fans aren't made. They're found. Go where they already gather.", tags: ["growth", "community", "0to1"], reasons: ["Actionable framing", "Steady pacing, zero dead air", "Strong last-line loop"], base: 74 },
    { title: "Trust Compounds, Reach Doesn't", hook: "Reach is rented. Trust compounds. Every viral post you chase is a tax on both.", tags: ["trust", "longgame", "content"], reasons: ["Polarizing opener", "Good stitch/duet bait", "Slight mid-clip sag — trim tighter"], base: 69 },
  ],
  Gaming: [
    { title: "The Clutch That Broke the Lobby", hook: "Down two, eleven seconds left. Watch the minimap — the answer was there the whole time.", tags: ["clutch", "ranked", "esports"], reasons: ["Instant action cold-open", "Play-by-play narration holds retention", "Skill gap makes it rewatchable"], base: 97 },
    { title: "This Meta Rewards Patience", hook: "Raw aim is overrated. This meta is won by the player who refuses to peek first.", tags: ["meta", "gamesense", "tips"], reasons: ["Contrarian take on aim culture", "Clip peaks twice", "High save-rate topic"], base: 90 },
    { title: "Rank Anxiety Is Real", hook: "Your crosshair placement falls apart the second ranked anxiety kicks in. Here's proof.", tags: ["ranked", "mental", "improvement"], reasons: ["Relatability hook", "Before/after structure", "Comment magnets ('so true')"], base: 86 },
    { title: "Comms Win Rounds", hook: "Aim wins highlights. Comms win rounds. This clip is the entire argument.", tags: ["comms", "teamplay", "tactics"], reasons: ["Clear thesis in 2s", "Escalating stakes", "Shareable to squads"], base: 82 },
    { title: "One Utility, Whole Site", hook: "One grenade, perfectly timed, flipped the entire site take. Frame by frame.", tags: ["utility", "tactics", "breakdown"], reasons: ["Frame-by-frame promise delivers", "Tight 24s runtime", "Coaching content saves well"], base: 77 },
    { title: "Scripted by Muscle Memory", hook: "That wasn't luck. That was 2,000 hours of muscle memory pretending to be luck.", tags: ["practice", "aim", "grind"], reasons: ["Inspirational angle", "Slow-mo moment mid-clip", "Good sound-on pacing"], base: 72 },
    { title: "The Rotation Nobody Called", hook: "Nobody called this rotation. Nobody had to — the scoreboard told the whole story.", tags: ["gamesense", "rotation", "iq"], reasons: ["Mystery opener", "Payoff at 0:18", "Slight hook delay costs 3 pts"], base: 68 },
  ],
  Cooking: [
    { title: "Why Your Broth Goes Cloudy", hook: "One violent boil is all it takes to ruin 12 hours of broth. Here's the fix in 20 seconds.", tags: ["ramen", "broth", "technique"], reasons: ["Problem → fix in first 3s", "Visual payoff is instant", "Save-rate monster"], base: 95 },
    { title: "The 63-Degree Egg", hook: "A perfect ramen egg wants 63 degrees — not a rolling boil. Your kitchen timer is lying.", tags: ["egg", "precision", "ramen"], reasons: ["Specific number = authority", "Myth-busting hook", "Clean arc, tight runtime"], base: 90 },
    { title: "Street Vendors Win on Margin", hook: "Street food isn't magic. It's margins. This bowl costs 90 cents and sells for eight.", tags: ["streetfood", "business", "margins"], reasons: ["Money angle widens audience", "Behind-the-scenes pull", "Strong comment bait"], base: 87 },
    { title: "Umami Is a Layering Game", hook: "Salt is layer one. Umami is layer five. Most home cooks never get past two.", tags: ["umami", "flavor", "science"], reasons: ["Layered metaphor sticks", "Taste-test reaction shot", "Educational saves"], base: 83 },
    { title: "Tare Is the Soul", hook: "Nobody respects the tare — and it's the entire soul of the bowl. Let me prove it.", tags: ["tare", "ramen", "secret"], reasons: ["Insider term creates curiosity", "Side-by-side proof", "Good rewatch loop"], base: 78 },
    { title: "Your Knife Decides the Texture", hook: "Texture is decided by your knife before the pot ever gets hot. Watch the cut.", tags: ["knifeskills", "prep", "technique"], reasons: ["Satisfying ASMR visuals", "Clear before/after", "Mid-clip pacing dip"], base: 71 },
    { title: "Chashu Needs Rest", hook: "Slice it hot and it falls apart. Rest the chashu — 30 minutes changes everything.", tags: ["chashu", "patience", "ramen"], reasons: ["Single-tip format works", "Weaker hook, strong payoff", "Trim the intro 2s"], base: 67 },
  ],
  Tech: [
    { title: "Agents Will Eat the Roadmap", hook: "AI agents won't follow your roadmap. They'll eat it. Here's what shipping looks like after.", tags: ["aiagents", "product", "future"], reasons: ["Provocative opener at 0.8s", "Strong 'insider' framing", "Debate bait in comments"], base: 94 },
    { title: "Distribution Is the Only Moat", hook: "Models are commodities now. The only moat left is distribution — and everyone's ignoring it.", tags: ["moats", "startups", "distribution"], reasons: ["Clear thesis, zero filler", "Founder credibility transfer", "High share to X/LinkedIn"], base: 89 },
    { title: "Evals Are the New Unit Tests", hook: "If you're not running evals, you're not shipping software — you're shipping vibes.", tags: ["evals", "engineering", "llm"], reasons: ["Punchy one-liner at 0:05", "Practitioner audience saves", "Good stitch bait"], base: 85 },
    { title: "Demo Magic vs. Latency Budget", hook: "Every AI demo looks magic until you read the latency budget. Let's read one together.", tags: ["ai", "latency", "reality"], reasons: ["Myth-busting structure", "Live teardown energy", "Technical depth rewards replays"], base: 81 },
    { title: "Series A Math Punishes Rent", hook: "Series A math is brutal: rented audiences don't compound, and VCs can smell the rent.", tags: ["fundraising", "saas", "metrics"], reasons: ["Money stakes hook", "Insider language", "Narrow but deep audience"], base: 76 },
    { title: "Ship the Boring Version", hook: "Ship the boring version. Instrument everything. The magic comes from the data, not the demo.", tags: ["shipping", "mvp", "data"], reasons: ["Actionable for builders", "Steady pacing", "Hook arrives 1s late"], base: 70 },
    { title: "The Interface Is a Progress Bar", hook: "The interface of the future isn't a chat window. It's a prompt and a progress bar.", tags: ["ux", "ai", "design"], reasons: ["Memorable prediction format", "Visual examples carry it", "Mid-clip energy dip"], base: 66 },
  ],
};

const SENTENCES: Record<Category, string[]> = {
  Podcast: [
    "the algorithm is not a person it is a mirror of attention",
    "every creator hits the same wall around episode thirty",
    "money follows trust and trust follows consistency",
    "we tracked four hundred channels and the pattern was brutal",
    "your niche is not a topic it is a promise to a stranger",
    "burnout is a business model problem not a mindset problem",
    "the first thousand fans are found not made",
    "sponsorship math changes everything after ten thousand subs",
    "attention is rented but trust actually compounds",
    "the best hook is a question your audience already asks",
  ],
  Gaming: [
    "the lobby went silent after that one rotation",
    "we were down two and the clock was bleeding out",
    "this meta rewards patience more than raw aim",
    "rank anxiety is real and it wrecks crosshair placement",
    "watch the minimap because the answer is always there",
    "comms win rounds that aim never could",
    "one utility usage completely flipped the site take",
    "the clutch was scripted by pure muscle memory",
    "peeking first is a tax you pay every single round",
    "the scoreboard was telling the story before the fight",
  ],
  Cooking: [
    "the broth goes cloudy if you let it boil hard",
    "twelve hours of simmering and you cannot rush minute one",
    "the egg wants sixty three degrees not a rolling boil",
    "street vendors win on margin not on magic",
    "umami is a layering game and salt is only layer one",
    "your knife work decides the texture before the pot does",
    "tare is the soul of the bowl and nobody respects it",
    "chashu needs rest or it falls apart on the cut",
    "a handful of katsuobushi at the end changes everything",
    "taste the broth at every hour not just at the end",
  ],
  Tech: [
    "agents will eat the roadmap before the roadmap eats them",
    "distribution is the only moat that compounds",
    "every demo looks magic until you read the latency budget",
    "the model is a commodity the workflow is the product",
    "series A math punishes rented audiences",
    "ship the boring version and instrument everything",
    "evals are the new unit tests and everyone is failing",
    "the interface of the future is a prompt and a progress bar",
    "context windows turned product strategy upside down",
    "users forgive latency but they never forgive confusion",
  ],
};

const NOUNS: Record<Category, string[]> = {
  Podcast: ["the algorithm", "creator burnout", "your first 1,000 fans", "brand deals", "niche selection"],
  Gaming: ["this clutch", "rank anxiety", "the meta shift", "aim training", "team comms"],
  Cooking: ["ramen broth", "the 63° egg", "knife skills", "street-food margins", "umami layering"],
  Tech: ["AI agents", "your roadmap", "series A math", "distribution", "evals"],
};

const HOOK_TEMPLATES = [
  "Stop scrolling — {x} is not what you think",
  "Nobody talks about {x} like this",
  "I was wrong about {x} for years",
  "The {x} secret gatekeepers hate",
  "{x}, explained before your coffee cools",
  "This changed how I see {x} forever",
  "30 seconds of {x} will save you months",
];

const HASHTAGS: Record<Category, string[]> = {
  Podcast: ["#creatoreconomy", "#podcastclips", "#audiencefirst", "#buildinpublic"],
  Gaming: ["#clutch", "#ranked", "#gamingclips", "#esports"],
  Cooking: ["#ramen", "#streetfood", "#foodtok", "#chefmode"],
  Tech: ["#ai", "#startups", "#techclips", "#buildinpublic"],
};

export const GENERIC_TAGS = ["#shorts", "#fyp", "#viral"];

export function suggestTags(cat: Category): string[] {
  return [...HASHTAGS[cat], ...GENERIC_TAGS];
}

export function remixHooks(cat: Category, seed: number): string[] {
  const rng = mulberry32(seed >>> 0 || 1);
  const templates = shuffle(HOOK_TEMPLATES, rng).slice(0, 3);
  const nouns = NOUNS[cat];
  return templates.map((t) => t.replace("{x}", nouns[Math.floor(rng() * nouns.length)]));
}

export function altTitles(cat: Category, seed: number): string[] {
  const rng = mulberry32(seed >>> 0 || 7);
  const nouns = NOUNS[cat];
  const pats = [
    (n: string) => `The truth about ${n} in ${20 + Math.floor(rng() * 25)} seconds`,
    (n: string) => `${n[0].toUpperCase()}${n.slice(1)}: the part everyone skips`,
    (n: string) => `Why ${n} decides everything`,
  ];
  return shuffle(pats, rng).slice(0, 2).map((f) => f(nouns[Math.floor(rng() * nouns.length)]));
}

/* ------------------------------------------------------------------ */
/* Transcript + clip generation                                        */
/* ------------------------------------------------------------------ */

function buildTranscript(rng: () => number, cat: Category, start: number, end: number): Line[] {
  const dur = Math.max(6, end - start);
  const targetWords = Math.round(dur * 2.3);
  const bank = SENTENCES[cat];
  const words: string[] = [];
  let guard = 0;
  while (words.length < targetWords && guard++ < 500) {
    const s = bank[Math.floor(rng() * bank.length)];
    words.push(...s.split(" "));
  }
  words.length = Math.min(words.length, targetWords);

  const chunks: string[][] = [];
  let i = 0;
  while (i < words.length) {
    const n = Math.min(words.length - i, 5 + Math.floor(rng() * 4));
    chunks.push(words.slice(i, i + n));
    i += n;
  }

  const cursor = { t: start + 0.15 };
  const span = (dur - 0.5) / Math.max(1, chunks.length);
  return chunks.map((ws, li) => {
    const raws = ws.map((w) => 0.5 + w.length * 0.11 + rng() * 0.25);
    const sum = raws.reduce((a, b) => a + b, 0);
    let t = cursor.t;
    const wordTs: WordT[] = ws.map((w, wi) => {
      const d = Math.max(0.12, span * 0.9 * (raws[wi] / sum));
      const o = { w, t, d };
      t += d;
      return o;
    });
    const line: Line = {
      id: `L${li}`,
      text: ws.join(" "),
      start: cursor.t,
      end: cursor.t + span * 0.9 + 0.1,
      words: wordTs,
    };
    cursor.t += span;
    return line;
  });
}

export function forgeClips(source: SourceVideo): Clip[] {
  const rng = mulberry32(hashStr(source.id + source.title));
  const cat = source.category;
  const entries = shuffle(ENTRIES[cat], rng).slice(0, 6);
  const usable = Math.min(source.duration > 60 ? source.duration : 600, 560);

  return entries.map((e, i) => {
    const start = Math.round(18 + ((usable - 150) * i) / 6 + rng() * 40);
    const end = Math.min(start + Math.round(22 + rng() * 34), usable - 4);
    const base = clamp(e.base + Math.round(rng() * 4 - 2), 60, 98);
    const m = () => clamp(Math.round(base + (rng() * 22 - 11)), 52, 99);
    return {
      id: `${source.id}-c${i}`,
      title: e.title,
      hook: e.hook,
      start,
      end,
      base,
      score: base,
      metrics: { hook: m(), retention: m(), emotion: m(), trend: m(), pacing: m() },
      tags: e.tags,
      reasons: e.reasons,
      transcript: buildTranscript(rng, cat, start, end),
      sourceId: source.id,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Caption themes                                                      */
/* ------------------------------------------------------------------ */

export interface CaptionTheme {
  id: string;
  name: string;
  color: string;
  dim: string;
  active: string;
  activeBg?: string;
  boxed?: boolean;
  stroke: boolean;
  glow?: boolean;
  font: string;
  weight: number;
  transform: "uppercase" | "none";
}

export const CAPTION_THEMES: CaptionTheme[] = [
  { id: "karaoke", name: "Karaoke Pop", color: "#ffffff", dim: "rgba(255,255,255,0.45)", active: "#ff5a36", stroke: true, font: "Bricolage Grotesque", weight: 800, transform: "uppercase" },
  { id: "beast", name: "Beast Yellow", color: "#ffe14d", dim: "rgba(255,225,77,0.4)", active: "#0e1116", activeBg: "#ffe14d", stroke: true, font: "Bricolage Grotesque", weight: 800, transform: "uppercase" },
  { id: "clean", name: "Clean Cut", color: "rgba(255,255,255,0.94)", dim: "rgba(255,255,255,0.4)", active: "#45d6c8", stroke: false, font: "Instrument Sans", weight: 600, transform: "none" },
  { id: "neon", name: "Night Signal", color: "#d9fbf5", dim: "rgba(217,251,245,0.38)", active: "#45d6c8", stroke: true, glow: true, font: "Bricolage Grotesque", weight: 700, transform: "uppercase" },
  { id: "lite", name: "Subtitle Lite", color: "#ffffff", dim: "rgba(255,255,255,0.5)", active: "#ffd57e", boxed: true, stroke: false, font: "Instrument Sans", weight: 500, transform: "none" },
];

/* ------------------------------------------------------------------ */
/* Platforms + processing plan                                         */
/* ------------------------------------------------------------------ */

export interface Platform {
  id: string;
  name: string;
  handle: string;
  best: string;
  audience: string;
}

export const PLATFORMS: Platform[] = [
  { id: "tiktok", name: "TikTok", handle: "@reelforge.demo", best: "Thu · 6:40 PM", audience: "12.4K followers" },
  { id: "ytshorts", name: "YouTube Shorts", handle: "@reelforge", best: "Fri · 12:15 PM", audience: "8.1K subscribers" },
  { id: "reels", name: "Instagram Reels", handle: "@reelforge.studio", best: "Sat · 9:05 AM", audience: "5.7K followers" },
  { id: "x", name: "X / Twitter", handle: "@reelforge", best: "Thu · 8:30 AM", audience: "3.2K followers" },
];

export interface StagePlan {
  label: string;
  dur: number;
  logs: string[];
}

export function processingPlan(source: SourceVideo): StagePlan[] {
  const mins = Math.max(1, Math.round((source.duration || 600) / 60));
  return [
    { label: "Fetching source", dur: 1000, logs: [`Pulling stream · ${source.creator}`, "Container mp4 · h264 · 1080p24", `${mins} min ingested · audio separated`] },
    { label: "Transcribing audio", dur: 1900, logs: ["whisper-large-v3 · 98.2% confidence", `${source.words.toLocaleString()} words transcribed`, "Speaker diarization · 2 voices"] },
    { label: "Mapping attention", dur: 1700, logs: ["Hook strength scored every 500 ms", "14 emotion peaks detected", "Pacing & silence analysis done"] },
    { label: "Cutting viral moments", dur: 1500, logs: ["23 candidate moments ranked", "Predicted-retention curves fitted", "6 clips forged · reframed 9:16"] },
  ];
}
