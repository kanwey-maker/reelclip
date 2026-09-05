import { useRef, useState } from "react";
import { inferCategory, SAMPLE_SOURCES, type SourceVideo } from "../lib/data";
import type { SavedProject } from "../lib/storage";
import { fmtLong, timeAgo, uid } from "../lib/utils";
import { Chip, ScoreRing } from "./bits";
import { IcArrowR, IcClock, IcFilm, IcLink, IcScissors, IcSparkles, IcTrash, IcTrend, IcUpload, IcWand } from "./icons";

interface Props {
  onForge: (s: SourceVideo) => void;
  projects: SavedProject[];
  onResume: (id: string) => void;
  onDeleteProject: (id: string) => void;
  notify: (msg: string, kind?: "ok" | "err" | "info") => void;
}

const PROXY_MEDIA: Record<string, string> = {
  "Podcast & Creator Economy": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "Esports & Gaming": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "Food & Travel": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "Tech & Startups": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
};

const PROXY_THUMB: Record<string, string> = {
  "Podcast & Creator Economy": "https://image.qwenlm.ai/generated-images/9cd68db4-227a-492f-928b-b9bc560bcbf9/_result.png",
  "Esports & Gaming": "https://image.qwenlm.ai/generated-images/5080177d-2d30-4a50-95c3-e50ee957282c/_result.png",
  "Food & Travel": "https://image.qwenlm.ai/generated-images/7589ffa6-9dc1-4e84-8830-f7b120de66ad/_result.png",
  "Tech & Startups": "https://image.qwenlm.ai/generated-images/c7169d5b-ce00-45db-b05a-a68f37cffd3a/_result.png",
};

export function ImportScreen({ onForge, projects, onResume, onDeleteProject, notify }: Props) {
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [probing, setProbing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const forgeUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\/.+\..+/.test(u)) {
      notify("Paste a full link — https://…", "err");
      return;
    }
    let host = "video";
    try {
      host = new URL(u).hostname.replace("www.", "");
    } catch { /* keep default */ }
    const category = inferCategory(u);
    notify("Remote ingest queued — using proxy media for this demo", "info");
    onForge({
      id: uid(),
      title: `Imported from ${host}`,
      creator: host,
      category,
      duration: 2847,
      words: 0,
      url: PROXY_MEDIA[category],
      thumb: PROXY_THUMB[category],
      isProxy: true,
      transcript: [],
    });
  };

  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)) {
      notify("That is not a video file", "err");
      return;
    }
    const videoUrl = URL.createObjectURL(file);
    setProbing(file.name);
    let settled = false;
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = videoUrl;
    const finish = (duration: number) => {
      if (settled) return;
      settled = true;
      setProbing(null);
      onForge({
        id: uid(),
        title: file.name.replace(/\.[^.]+$/, ""),
        creator: "Local upload",
        category: inferCategory(file.name),
        duration: duration > 1 ? duration : 600,
        words: 0,
        url: videoUrl,
        file,
        transcript: [],
      });
    };
    probe.onloadedmetadata = () => finish(isFinite(probe.duration) ? probe.duration : 600);
    probe.onerror = () => {
      setProbing(null);
      notify("Could not read that video file", "err");
      URL.revokeObjectURL(videoUrl);
    };
    setTimeout(() => finish(600), 6000);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16">
      {/* signature opening: the forge bench */}
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <section className="anim-fade-up rounded-2xl border border-line bg-ink-850 p-7">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-ember-400">
            Step 01 — feed the forge
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] text-snow sm:text-5xl">
            <span className="line-mask"><span>Long video in.</span></span>
            <span className="line-mask"><span style={{ animationDelay: "0.12s" }}>Six short</span></span>
            <span className="line-mask"><span className="text-ember-400" style={{ animationDelay: "0.24s" }}>bangers out.</span></span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-fog">
            ReelForge reads the whole timeline — pacing, hooks, tension, silence — and cuts the
            moments people actually replay. Scored, captioned, publish-ready.
          </p>

          {/* url intake */}
          <div className="mt-7">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">
              <IcLink size={12} /> Paste a link
            </label>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && forgeUrl()}
                placeholder="https://youtube.com/watch?v=… or twitch, drive, any mp4"
                className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-ink-900 px-3.5 font-mono text-[13px] text-snow outline-none transition-colors placeholder:text-fog-dim focus:border-ember-500/60"
              />
              <button
                onClick={forgeUrl}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-ember-500 px-4 text-[13px] font-bold text-ink-950 transition-all hover:bg-ember-400 hover:shadow-[0_8px_28px_rgba(255,90,54,0.35)] active:scale-95"
              >
                <IcWand size={15} /> Forge
              </button>
            </div>
          </div>

          {/* upload */}
          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
            className={`mt-3 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-5 text-sm font-semibold transition-all duration-200 ${
              dragOver
                ? "scale-[1.01] border-mint-400 bg-mint-400/10 text-mint-300"
                : "border-line bg-ink-900/60 text-fog hover:border-ink-600 hover:text-snow"
            }`}
          >
            {probing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-mint-400 border-t-transparent" />
                Probing {probing}…
              </>
            ) : (
              <>
                <IcUpload size={18} className={dragOver ? "text-mint-300" : "text-fog-dim"} />
                {dragOver ? "Drop it — let's go" : "or drag a video file here"}
                <span className="hidden font-mono text-[10px] text-fog-dim sm:inline">mp4 · webm · mov · ≤2GB</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />

          {/* pipeline strip */}
          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-5 text-[11px] font-semibold text-fog-dim">
            <span className="flex items-center gap-1.5 text-fog"><IcFilm size={13} className="text-ember-400" /> Transcribe</span>
            <IcArrowR size={12} />
            <span className="flex items-center gap-1.5 text-fog"><IcTrend size={13} className="text-mint-400" /> Map attention</span>
            <IcArrowR size={12} />
            <span className="flex items-center gap-1.5 text-fog"><IcScissors size={13} className="text-gold-400" /> Cut & score</span>
            <IcArrowR size={12} />
            <span className="flex items-center gap-1.5 text-fog"><IcSparkles size={13} className="text-volt-400" /> Caption & publish</span>
          </div>
        </section>

        {/* sample library */}
        <section className="anim-fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-mint-400">Sample library</p>
              <h3 className="mt-1 font-display text-xl font-bold text-snow">Try it on real long-form</h3>
            </div>
            <span className="font-mono text-[10px] text-fog-dim">{SAMPLE_SOURCES.length} sources</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SAMPLE_SOURCES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => onForge(s)}
                className="group relative overflow-hidden rounded-xl border border-line bg-ink-850 text-left transition-all duration-300 hover:-translate-y-1 hover:border-ember-500/50 hover:shadow-[0_16px_44px_rgba(0,0,0,0.45)]"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="relative aspect-video overflow-hidden bg-ink-700">
                  <div className="absolute inset-0 bg-gradient-to-br from-ink-600 to-ink-800" />
                  {s.thumb && (
                    <img
                      src={s.thumb}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-transparent" />
                  <span className="absolute right-2 top-2 rounded-md bg-ink-950/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-snow backdrop-blur">
                    {fmtLong(s.duration)}
                  </span>
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-ember-500 px-2 py-1 text-[10px] font-bold text-ink-950 opacity-0 transition-all duration-200 group-hover:opacity-100">
                    Forge <IcArrowR size={11} />
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate text-[13px] font-bold text-snow">{s.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-fog-dim">{s.creator} · {s.category}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* recent forges — persisted studio */}
      {projects.length > 0 && (
        <section className="anim-fade-up mt-10" style={{ animationDelay: "0.25s" }}>
          <div className="mb-3 flex items-center gap-2">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-400">Your studio</p>
            <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-fog">{projects.length} saved</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-ink-850">
            {projects.map((p, i) => {
              const top = p.clips.reduce((a, c) => Math.max(a, c.score), 0);
              return (
                <div
                  key={p.id}
                  className={`group flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-ink-750 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <div className="relative hidden h-11 w-[74px] shrink-0 overflow-hidden rounded-lg bg-ink-700 sm:block">
                    {p.source.thumb && <img src={p.source.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-snow">{p.source.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-fog-dim">
                      <span className="flex items-center gap-1"><IcClock size={10} /> {timeAgo(p.savedAt)}</span>
                      <span>{p.clips.length} clips</span>
                      {p.clips.some((c) => c.published?.length) && <Chip tone="mint">published</Chip>}
                    </p>
                  </div>
                  <ScoreRing score={top} size={34} stroke={3} />
                  <button
                    onClick={() => onResume(p.id)}
                    className="rounded-lg border border-line bg-ink-800 px-3 py-1.5 text-[11px] font-bold text-fog transition-all hover:border-mint-400/50 hover:text-mint-300 active:scale-95"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => { onDeleteProject(p.id); notify("Project deleted", "info"); }}
                    className="rounded-lg border border-line bg-ink-800 p-1.5 text-fog-dim transition-all hover:border-ember-500/50 hover:text-ember-400 active:scale-95"
                    title="Delete project"
                  >
                    <IcTrash size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 text-[11px] text-fog-dim">
            Projects persist in your browser — edits, captions and publish state survive a refresh.
          </p>
        </section>
      )}
    </div>
  );
}
