import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CAPTION_THEMES, hookVariants, suggestTags, titleIdeas, type Clip, type SourceVideo } from "../lib/data";
import { clamp, fmtDur, hashSeed, mulberry32, retuneScore } from "../lib/utils";
import type { BrandKit } from "../lib/storage";
import { Chip, ScoreRing, Seg, Toggle } from "./bits";
import {
  IcBolt, IcChevronL, IcCopy, IcDownload, IcFlame, IcGrip, IcHash, IcPalette, IcPause, IcPlay,
  IcRemix, IcScissors, IcShare, IcSparkles, IcSquare, IcTall, IcType, IcVolume, IcVolumeX, IcWide,
} from "./icons";

interface Props {
  clip: Clip;
  source: SourceVideo;
  brand: BrandKit;
  onBack: () => void;
  onUpdate: (id: string, patch: Partial<Clip>) => void;
  onExport: () => void;
  onPublish: () => void;
  notify: (msg: string, kind?: "ok" | "err" | "info") => void;
}

type Tab = "captions" | "trim" | "hook";
type Aspect = "9:16" | "1:1" | "16:9";

const ASPECT_CLASS: Record<Aspect, string> = {
  "9:16": "aspect-[9/16] h-[56vh] min-h-[380px] max-h-[560px]",
  "1:1": "aspect-square h-[46vh] min-h-[320px] max-h-[460px]",
  "16:9": "aspect-video w-full max-w-[680px]",
};

export function EditorScreen({ clip, source, brand, onBack, onUpdate, onExport, onPublish, notify }: Props) {
  const [tab, setTab] = useState<Tab>("captions");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(clip.start);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [themeId, setThemeId] = useState("hormozi");
  const [capSize, setCapSize] = useState(17);
  const [capPos, setCapPos] = useState<"low" | "mid">("low");
  const [guides, setGuides] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const [muted, setMuted] = useState(false);
  const [mediaErr, setMediaErr] = useState(false);
  const [draft, setDraft] = useState<{ a: number; b: number } | null>(null);
  const dragRef = useRef<"a" | "b" | null>(null);
  const [hookIdx, setHookIdx] = useState(0);
  const [aiTitle, setAiTitle] = useState<string | null>(null);
  const [titleIdx, setTitleIdx] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const duration = source.duration > 0 ? source.duration : clip.end + 60;

  /* ------- playback ------- */
  useEffect(() => {
    const v = videoRef.current;
    setPlaying(false);
    setMediaErr(false);
    if (v && source.url) {
      v.currentTime = clip.start;
      setTime(clip.start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = clip.start;
      setTime(clip.start);
      setDraft(null);
      setPlaying(false);
      v.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.start, clip.end]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      const v = videoRef.current;
      if (v) {
        if (v.currentTime >= clip.end - 0.06 || v.ended) v.currentTime = clip.start;
        setTime(v.currentTime);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, clip.start, clip.end]);

  const seek = (t: number) => {
    const v = videoRef.current;
    const c = clamp(t, 0, duration);
    if (v) v.currentTime = c;
    setTime(c);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || mediaErr || !source.url) return;
    if (v.paused) {
      if (v.currentTime < clip.start || v.currentTime >= clip.end - 0.05) v.currentTime = clip.start;
      void v.play().catch(() => setMediaErr(true));
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  /* ------- captions ------- */
  const theme = CAPTION_THEMES.find((t) => t.id === themeId) ?? CAPTION_THEMES[0];
  const activeLine = clip.transcript.find((l) => time >= l.start - 0.06 && time <= l.end) ?? null;
  const words = activeLine ? activeLine.text.split(/\s+/) : [];
  const wordIdx = activeLine
    ? clamp(Math.floor(((time - activeLine.start) / Math.max(0.2, activeLine.end - activeLine.start)) * words.length), 0, words.length - 1)
    : -1;
  const burstWord = clip.emojiBeats && activeLine && words[wordIdx] && words[wordIdx].replace(/\W/g, "").length >= 7;

  const updateLine = (idx: number, text: string) => {
    const lines = clip.transcript.map((l) => ({ ...l }));
    const line = lines[idx];
    if (!line) return;
    const newDur = clamp(text.split(/\s+/).filter(Boolean).length / 2.8 + 0.4, 1.4, 6.5);
    const delta = newDur - (line.end - line.start);
    line.text = text;
    line.end = +clamp(line.start + newDur, line.start + 0.5, clip.end).toFixed(2);
    for (let j = idx + 1; j < lines.length; j++) {
      lines[j] = { ...lines[j], start: +(lines[j].start + delta).toFixed(2), end: +(lines[j].end + delta).toFixed(2) };
    }
    onUpdate(clip.id, { transcript: lines });
  };

  /* ------- trim ------- */
  const win = draft ?? { a: clip.start, b: clip.end };
  const liveScore = retuneScore(clip.base, win.b - win.a);
  const delta = liveScore - clip.score;

  const bars = useMemo(() => {
    const rnd = mulberry32(hashSeed(clip.id + source.id));
    return Array.from({ length: 56 }, () => 0.18 + rnd() * 0.82);
  }, [clip.id, source.id]);

  const posToTime = (clientX: number) => {
    const el = waveRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return clamp(((clientX - r.left) / r.width) * duration, 0, duration);
  };

  const handleMove = (e: ReactPointerEvent, which: "a" | "b") => {
    if (dragRef.current !== which) return;
    const t = +posToTime(e.clientX).toFixed(1);
    setDraft((d) => {
      const cur = d ?? { a: clip.start, b: clip.end };
      if (which === "a") return { a: clamp(t, 0, cur.b - 6), b: cur.b };
      return { a: cur.a, b: clamp(t, cur.a + 6, duration) };
    });
  };

  const commitTrim = () => {
    if (!draft) return;
    onUpdate(clip.id, {
      start: +draft.a.toFixed(1),
      end: +draft.b.toFixed(1),
      score: retuneScore(clip.base, draft.b - draft.a),
      transcript: clip.transcript.filter((l) => l.end > draft.a && l.start < draft.b),
    });
    if (time < draft.a || time > draft.b) seek(draft.a);
    setDraft(null);
    notify(`Trim committed · ${fmtDur(draft.b - draft.a)} · virality ${retuneScore(clip.base, draft.b - draft.a)}`, "info");
  };

  /* ------- hooks ------- */
  const hooks = hookVariants(clip, source.category);
  const titles = titleIdeas(clip, source.category);
  const tags = suggestTags(source.category);

  const dur = clip.end - clip.start;
  const progress = clamp(((time - clip.start) / Math.max(0.1, dur)) * 100, 0, 100);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16">
      {/* top bar */}
      <div className="anim-fade-up flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-850 px-3 py-2 text-xs font-semibold text-fog transition-all hover:border-ink-600 hover:text-snow">
          <IcChevronL size={14} /> All clips
        </button>
        <input
          value={clip.title}
          onChange={(e) => onUpdate(clip.id, { title: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-display text-lg font-bold text-snow outline-none transition-colors focus:border-line focus:bg-ink-850"
          aria-label="Clip title"
        />
        <div className="flex items-center gap-2">
          <button onClick={onExport} className="flex items-center gap-1.5 rounded-lg border border-mint-400/40 bg-mint-400/10 px-3.5 py-2 text-xs font-bold text-mint-300 transition-all hover:bg-mint-400/20 active:scale-95">
            <IcDownload size={14} /> Export
          </button>
          <button onClick={onPublish} className="flex items-center gap-1.5 rounded-lg bg-ember-500 px-3.5 py-2 text-xs font-bold text-ink-950 transition-all hover:bg-ember-400 hover:shadow-[0_8px_24px_rgba(255,90,54,0.35)] active:scale-95">
            <IcShare size={14} /> Publish
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ---------- preview column ---------- */}
        <div className="anim-fade-up">
          <div className="flex items-center justify-center rounded-2xl border border-line bg-ink-900 p-5">
            <div className={`relative overflow-hidden rounded-2xl border border-line bg-black shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${ASPECT_CLASS[aspect]}`}>
              {source.url && !mediaErr ? (
                <video
                  ref={videoRef}
                  src={source.url}
                  muted={muted}
                  playsInline
                  preload="auto"
                  onError={() => setMediaErr(true)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0">
                  {source.thumb && <img src={source.thumb} alt="" className="h-full w-full object-cover opacity-40" />}
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <p className="rounded-xl bg-ink-950/85 px-4 py-3 text-xs leading-relaxed text-fog backdrop-blur">
                      {mediaErr ? "Media expired or unavailable — re-upload the source to resume playback. Captions stay editable." : "Storyboard mode — no media attached."}
                    </p>
                  </div>
                </div>
              )}

              {/* caption overlay */}
              {activeLine && (
                <div
                  className={`absolute left-3 right-3 text-center ${capPos === "low" ? "bottom-[16%]" : "top-1/2 -translate-y-1/2"} ${aspect !== "9:16" ? "left-10 right-10" : ""}`}
                  style={{ fontSize: capSize, lineHeight: 1.2 }}
                >
                  <p
                    className={`${theme.weight} drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]`}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {words.map((w, i) => (
                      <span
                        key={`${activeLine.start}-${i}`}
                        className="inline-block transition-all duration-100"
                        style={{
                          color: i === wordIdx ? theme.active : theme.base,
                          transform: i === wordIdx ? "scale(1.12)" : "scale(1)",
                          opacity: i <= wordIdx ? 1 : 0.72,
                        }}
                      >
                        {w}{" "}
                      </span>
                    ))}
                  </p>
                  {burstWord && (
                    <span key={`burst-${activeLine.start}`} className="anim-burst absolute -right-2 -top-4 text-ember-400">
                      <IcFlame size={20} />
                    </span>
                  )}
                </div>
              )}

              {/* safe zone guides */}
              {guides && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-x-[7%] inset-y-[13%] rounded-lg border border-dashed border-snow/25" />
                  <div className="absolute inset-y-0 left-1/3 w-px bg-snow/10" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-snow/10" />
                  <span className="absolute left-2 top-2 rounded bg-ink-950/70 px-1.5 py-0.5 font-mono text-[9px] text-snow/60">SAFE ZONE</span>
                </div>
              )}

              {/* burned progress bar (brand accent) */}
              {showBar && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-ink-950/60">
                  <div className="h-full transition-[width] duration-100" style={{ width: `${progress}%`, background: brand.color }} />
                </div>
              )}

              {/* logo watermark */}
              {brand.logo && (
                <img
                  src={brand.logo}
                  alt=""
                  className="absolute right-2.5 top-2.5 h-8 w-8 rounded-lg object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
                />
              )}

              {/* end-card outro */}
              {brand.outro && time >= clip.end - 1.6 && (
                <div className="anim-pop absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/92 px-6 text-center">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                    style={{ background: brand.color }}
                  >
                    {brand.logo ? (
                      <img src={brand.logo} alt="" className="h-10 w-10 object-contain" />
                    ) : (
                      <IcBolt size={26} className="text-ink-950" />
                    )}
                  </span>
                  <p className="font-display text-lg font-extrabold text-snow">{brand.name}</p>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-fog">follow for daily clips</p>
                  <span className="h-1 w-16 rounded-full" style={{ background: brand.color }} />
                </div>
              )}

              {/* live score */}
              <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-xl bg-ink-950/75 py-1 pl-1 pr-2.5 backdrop-blur">
                <ScoreRing score={draft ? liveScore : clip.score} size={34} stroke={3} />
                <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-fog">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember-500" /> live
                </span>
              </div>
            </div>
          </div>

          {/* transport */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={togglePlay}
              disabled={!source.url || mediaErr}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-ember-500 text-ink-950 transition-all hover:bg-ember-400 hover:shadow-[0_8px_28px_rgba(255,90,54,0.4)] active:scale-90 disabled:opacity-40"
            >
              {playing ? <IcPause size={20} /> : <IcPlay size={20} />}
            </button>
            <span className="font-mono text-[12px] tabular-nums text-fog">
              {fmtDur(Math.max(0, time - clip.start))} <span className="text-fog-dim">/ {fmtDur(dur)}</span>
            </span>
            <Chip tone="ember"><IcRemix size={10} /> loops in–out</Chip>
            <button
              onClick={() => { setMuted((m) => !m); if (videoRef.current) videoRef.current.muted = !muted; }}
              className="rounded-lg border border-line bg-ink-850 p-2 text-fog transition-all hover:border-ink-600 hover:text-snow"
            >
              {muted ? <IcVolumeX size={15} /> : <IcVolume size={15} />}
            </button>
            <Seg<Aspect>
              size="sm"
              value={aspect}
              onChange={setAspect}
              options={[
                { id: "9:16", icon: <IcTall size={13} />, title: "9:16 vertical" },
                { id: "1:1", icon: <IcSquare size={13} />, title: "1:1 square" },
                { id: "16:9", icon: <IcWide size={13} />, title: "16:9 horizontal" },
              ]}
            />
          </div>
          <p className="mt-2 text-center font-mono text-[10px] text-fog-dim">space to play · captions are burned on export</p>
        </div>

        {/* ---------- control column ---------- */}
        <div className="anim-fade-up" style={{ animationDelay: "0.12s" }}>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-850 p-3.5">
            <ScoreRing score={draft ? liveScore : clip.score} size={52} />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-snow">Virality score</p>
              <p className="font-mono text-[10px] text-fog-dim">
                {fmtDur(dur)} window · sweet spot 21–45s
              </p>
              {draft && (
                <p className={`mt-0.5 font-mono text-[11px] font-bold ${delta >= 0 ? "text-volt-300" : "text-ember-400"}`}>
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} vs committed
                </p>
              )}
            </div>
            {clip.emojiBeats && <Chip tone="ember"><IcFlame size={10} /> beats</Chip>}
          </div>

          <div className="mt-4">
            <Seg<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { id: "captions", label: "Captions", icon: <IcType size={13} /> },
                { id: "trim", label: "Trim", icon: <IcScissors size={13} /> },
                { id: "hook", label: "Hook AI", icon: <IcSparkles size={13} /> },
              ]}
            />
          </div>

          {/* ---- captions panel ---- */}
          {tab === "captions" && (
            <div className="anim-fade-up mt-4 space-y-4 rounded-xl border border-line bg-ink-850 p-4" style={{ animationDuration: "0.35s" }}>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim"><IcPalette size={12} /> Theme</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {CAPTION_THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      className={`rounded-lg border p-1.5 text-center transition-all ${themeId === t.id ? "border-ember-500 bg-ember-500/10" : "border-line bg-ink-900 hover:border-ink-600"}`}
                      title={t.desc}
                    >
                      <span className="mx-auto block h-1.5 w-6 rounded-full" style={{ background: t.swatch }} />
                      <span className="mt-1 block truncate text-[9px] font-bold text-fog">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Size · {capSize}px</p>
                <input type="range" min={12} max={26} value={capSize} onChange={(e) => setCapSize(+e.target.value)} className="w-full" />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Position</p>
                <Seg<"low" | "mid"> size="sm" value={capPos} onChange={setCapPos} options={[{ id: "low", label: "Low" }, { id: "mid", label: "Center" }]} />
              </div>

              <div className="space-y-0.5 rounded-lg bg-ink-900 p-1.5">
                <Toggle on={clip.emojiBeats} onChange={(v) => onUpdate(clip.id, { emojiBeats: v })} label="Reaction beats" hint="Flame pops on emphasis words" />
                <Toggle on={showBar} onChange={setShowBar} label="Progress bar" hint="Burned bottom bar" />
                <Toggle on={guides} onChange={setGuides} label="Safe-zone guides" hint="Platform UI overlay map" />
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">
                  Transcript · {clip.transcript.length} lines <span className="normal-case tracking-normal text-fog-dim">(re-times automatically)</span>
                </p>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {clip.transcript.map((l, i) => (
                    <div key={`${l.start}-${i}`} className={`rounded-lg border px-2.5 py-2 transition-colors ${activeLine?.start === l.start ? "border-ember-500/50 bg-ember-500/5" : "border-line bg-ink-900"}`}>
                      <div className="mb-1 flex items-center gap-2 font-mono text-[9px] text-fog-dim">
                        <span className="text-mint-400">{fmtDur(l.start)}</span>→<span>{fmtDur(l.end)}</span>
                      </div>
                      <textarea
                        rows={1}
                        value={l.text}
                        onChange={(e) => updateLine(i, e.target.value)}
                        className="w-full resize-none bg-transparent text-[12px] leading-snug text-snow outline-none"
                      />
                    </div>
                  ))}
                  {clip.transcript.length === 0 && <p className="py-4 text-center text-[11px] text-fog-dim">No lines in this window — widen the trim.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ---- trim panel ---- */}
          {tab === "trim" && (
            <div className="anim-fade-up mt-4 space-y-4 rounded-xl border border-line bg-ink-850 p-4" style={{ animationDuration: "0.35s" }}>
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Source timeline · drag the ember handles</p>
                <div
                  ref={waveRef}
                  className="relative h-24 cursor-crosshair select-none overflow-hidden rounded-lg border border-line bg-ink-900"
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).dataset.handle) return;
                    seek(posToTime(e.clientX));
                  }}
                >
                  <div className="absolute inset-0 flex items-end gap-[2px] px-1 pb-1 pt-3">
                    {bars.map((h, i) => {
                      const t = (i / bars.length) * duration;
                      const inside = t >= win.a && t <= win.b;
                      return <div key={i} className="flex-1 rounded-t-sm transition-colors duration-150" style={{ height: `${h * 100}%`, background: inside ? "rgba(255,90,54,0.75)" : "#2b3242" }} />;
                    })}
                  </div>
                  {/* window */}
                  <div
                    className="absolute inset-y-0 border-x-2 border-ember-400 bg-ember-500/10"
                    style={{ left: `${(win.a / duration) * 100}%`, width: `${((win.b - win.a) / duration) * 100}%` }}
                  />
                  {/* playhead */}
                  <div className="absolute inset-y-0 w-0.5 bg-snow/90" style={{ left: `${(clamp(time, 0, duration) / duration) * 100}%` }} />
                  {/* handles */}
                  {(["a", "b"] as const).map((which) => (
                    <div
                      key={which}
                      data-handle="1"
                      onPointerDown={(e) => { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); dragRef.current = which; }}
                      onPointerMove={(e) => handleMove(e, which)}
                      onPointerUp={() => { dragRef.current = null; }}
                      onPointerCancel={() => { dragRef.current = null; }}
                      className="absolute top-1/2 z-10 flex h-10 w-4 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-md border border-ember-300 bg-ember-500 text-ink-950 shadow-lg"
                      style={{ left: `calc(${((which === "a" ? win.a : win.b) / duration) * 100}% - 8px)` }}
                    >
                      <IcGrip size={11} />
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[10px] text-fog-dim">
                  <span>0:00</span><span>{fmtDur(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-ink-900 px-3 py-2.5">
                <div className="font-mono text-[12px] text-snow">
                  IN <span className="text-mint-300">{fmtDur(win.a)}</span> · OUT <span className="text-ember-300">{fmtDur(win.b)}</span>
                </div>
                <div className={`font-mono text-[12px] font-bold ${liveScore >= 85 ? "text-volt-300" : liveScore >= 70 ? "text-mint-300" : "text-gold-300"}`}>
                  score {liveScore}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={commitTrim}
                  disabled={!draft}
                  className="flex-1 rounded-lg bg-ember-500 py-2.5 text-[12px] font-bold text-ink-950 transition-all hover:bg-ember-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Commit trim
                </button>
                <button
                  onClick={() => setDraft(null)}
                  disabled={!draft}
                  className="rounded-lg border border-line bg-ink-900 px-4 py-2.5 text-[12px] font-bold text-fog transition-all hover:border-ink-600 hover:text-snow disabled:opacity-35"
                >
                  Reset
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-fog-dim">
                Scores recompute as you drag — the model rewards 21–45s windows that open mid-thought and resolve fast.
              </p>
            </div>
          )}

          {/* ---- hook ai panel ---- */}
          {tab === "hook" && (
            <div className="anim-fade-up mt-4 space-y-4 rounded-xl border border-line bg-ink-850 p-4" style={{ animationDuration: "0.35s" }}>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim"><IcSparkles size={12} /> Hook variants</p>
                <div className="space-y-1.5">
                  {hooks.map((h, i) => (
                    <div
                      key={h}
                      className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
                        clip.hook === h ? "border-volt-400/50 bg-volt-400/10" : "border-line bg-ink-900 hover:border-ink-600"
                      }`}
                    >
                      <p className={`flex-1 text-[12px] leading-snug ${clip.hook === h ? "font-bold text-volt-300" : "text-fog"}`}>{h}</p>
                      {clip.hook !== h && (
                        <button
                          onClick={() => { onUpdate(clip.id, { hook: h }); notify("Hook applied", "ok"); }}
                          className="shrink-0 rounded-md border border-line bg-ink-800 px-2 py-1 text-[10px] font-bold text-fog opacity-0 transition-all hover:border-volt-400/50 hover:text-volt-300 group-hover:opacity-100"
                        >
                          Use
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const next = (hookIdx + 1) % hooks.length;
                    setHookIdx(next);
                    onUpdate(clip.id, { hook: hooks[next] });
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-ink-900 py-2 text-[11px] font-bold text-fog transition-all hover:border-volt-400/40 hover:text-volt-300"
                >
                  <IcRemix size={12} /> Remix again
                </button>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim"><IcType size={12} /> Title lab</p>
                <div className="rounded-lg border border-line bg-ink-900 px-3 py-2.5">
                  <p className="font-display text-[14px] font-bold text-snow">{aiTitle ?? clip.title}</p>
                </div>
                <button
                  onClick={() => {
                    const t = titles[titleIdx % titles.length];
                    setTitleIdx((v) => v + 1);
                    setAiTitle(t);
                    onUpdate(clip.id, { title: t });
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-ink-900 py-2 text-[11px] font-bold text-fog transition-all hover:border-gold-400/40 hover:text-gold-300"
                >
                  <IcSparkles size={12} /> Generate title
                </button>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim"><IcHash size={12} /> Trend-matched tags</p>
                  <button
                    onClick={() => { void navigator.clipboard?.writeText(tags.join(" ")).catch(() => undefined); notify("Tags copied", "ok"); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-fog transition-colors hover:text-snow"
                  >
                    <IcCopy size={11} /> Copy all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => <Chip key={t} tone="mint">{t}</Chip>)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
