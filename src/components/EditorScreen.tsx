import { useEffect, useMemo, useRef, useState } from "react";
import {
  altTitles, CAPTION_THEMES, remixHooks, suggestTags,
  type CaptionTheme, type Clip, type Line, type SourceVideo, type WordT,
} from "../lib/data";
import { clamp, fmtDur, fmtTC, hashStr, mulberry32, retuneScore, scoreColor } from "../lib/utils";
import { Chip, MiniBars, ScoreRing, Seg, Toggle } from "./bits";
import {
  IcBolt, IcCheck, IcChevronL, IcCopy, IcDownload, IcFlame, IcGrip, IcHash, IcPalette,
  IcPause, IcPlay, IcRemix, IcRestart, IcScissors, IcShare, IcSparkles, IcSquare, IcTall,
  IcType, IcVolume, IcVolumeX, IcWand, IcWide,
} from "./icons";

interface Props {
  source: SourceVideo;
  clips: Clip[];
  activeId: string;
  published: Record<string, string[]>;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Clip>) => void;
  onBack: () => void;
  onExport: (c: Clip) => void;
  onPublish: (c: Clip) => void;
  notify: (msg: string, kind?: "ok" | "err" | "info") => void;
}

type Aspect = "9:16" | "1:1" | "16:9";
type Tab = "captions" | "style" | "hook";
const DIMS: Record<Aspect, [number, number]> = { "9:16": [300, 533], "1:1": [350, 350], "16:9": [470, 264] };

function rebuildWords(text: string, start: number, end: number): WordT[] {
  const ws = text.trim().split(/\s+/).filter(Boolean);
  const span = Math.max(0.5, end - start - 0.1);
  const raws = ws.map((w) => 0.5 + w.length * 0.11);
  const sum = raws.reduce((a, b) => a + b, 0) || 1;
  let t = start;
  return ws.map((w, i) => {
    const d = Math.max(0.12, span * (raws[i] / sum));
    const o = { w, t, d };
    t += d;
    return o;
  });
}

const STROKE = "2.5px 0 rgba(10,12,16,0.9), -2.5px 0 rgba(10,12,16,0.9), 0 2.5px rgba(10,12,16,0.9), 0 -2.5px rgba(10,12,16,0.9), 2px 2px rgba(10,12,16,0.85), -2px 2px rgba(10,12,16,0.85), 2px -2px rgba(10,12,16,0.85), -2px -2px rgba(10,12,16,0.85)";

export function EditorScreen(props: Props) {
  const { source, clips, activeId, published, onSelect, onUpdate, onBack, onExport, onPublish, notify } = props;
  const clip = clips.find((c) => c.id === activeId) ?? clips[0];

  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<null | "in" | "out">(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(clip.start);
  const [metaDur, setMetaDur] = useState(source.duration > 60 ? source.duration : 600);
  const metaDurRef = useRef(metaDur);
  metaDurRef.current = metaDur;

  const [inT, setInT] = useState(clip.start);
  const [outT, setOutT] = useState(clip.end);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [tab, setTab] = useState<Tab>("captions");
  const [themeId, setThemeId] = useState("karaoke");
  const [capSize, setCapSize] = useState(24);
  const [capPos, setCapPos] = useState<"top" | "mid" | "bottom">("bottom");
  const [showProgress, setShowProgress] = useState(true);
  const [showFlames, setShowFlames] = useState(true);
  const [guides, setGuides] = useState(false);
  const [remixCount, setRemixCount] = useState(0);
  const [variants, setVariants] = useState<string[]>([]);
  const [remixing, setRemixing] = useState(false);
  const titles = useMemo(() => altTitles(source.category, hashStr(clip.id)), [source.category, clip.id]);

  /* ---- reset when switching clips ---- */
  useEffect(() => {
    setInT(clip.start);
    setOutT(clip.end);
    setTime(clip.start);
    setPlaying(false);
    setVariants([]);
    setRemixCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  /* ---- playback clock ---- */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v && !v.paused) {
        if (v.currentTime >= outT - 0.03) v.currentTime = inT;
        if (v.currentTime < inT - 0.5) v.currentTime = inT;
        setTime(v.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inT, outT]);

  /* ---- spacebar ---- */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inT, outT]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < inT || v.currentTime >= outT - 0.1) v.currentTime = inT;
      void v.play().catch(() => undefined);
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    const ct = clamp(t, 0, metaDurRef.current - 0.1);
    if (v) v.currentTime = ct;
    setTime(ct);
  };

  /* ---- trim handles ---- */
  const timeAt = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return 0;
    return clamp((clientX - r.left) / r.width, 0, 1) * metaDurRef.current;
  };
  const commitTrim = (a: number, b: number) => {
    const dur = b - a;
    onUpdate(clip.id, { start: +a.toFixed(1), end: +b.toFixed(1), score: retuneScore(clip.base, dur) });
    if (time < a || time > b) seek(a);
    notify(`Trim committed · ${fmtDur(dur)} · virality re-scored`, "info");
  };

  const liveScore = retuneScore(clip.base, outT - inT);
  const delta = liveScore - clip.base;

  /* ---- captions ---- */
  const theme: CaptionTheme = CAPTION_THEMES.find((t) => t.id === themeId) ?? CAPTION_THEMES[0];
  const activeLine: Line | undefined = clip.transcript.find((l) => time >= l.start - 0.08 && time <= l.end);
  const windowLines = useMemo(
    () => clip.transcript.filter((l) => l.end > inT && l.start < outT),
    [clip.transcript, inT, outT]
  );

  const editLine = (id: string, text: string) => {
    onUpdate(clip.id, {
      transcript: clip.transcript.map((l) => (l.id === id ? { ...l, text, words: rebuildWords(text, l.start, l.end) } : l)),
    });
  };

  /* ---- waveform bars ---- */
  const bars = useMemo(() => {
    const rng = mulberry32(hashStr(clip.id + "wave"));
    return Array.from({ length: 96 }, () => 0.25 + rng() * 0.75);
  }, [clip.id]);

  /* ---- flame beats ---- */
  const beat = Math.floor((time - inT) / 3.5);
  const beatPhase = (time - inT) % 3.5;
  const flameOn = showFlames && playing && beatPhase < 1.15 && time > inT + 0.4;

  /* ---- ai tools ---- */
  const doRemix = () => {
    setRemixing(true);
    setTimeout(() => {
      setVariants(remixHooks(source.category, Date.now() % 100000));
      setRemixCount((c) => c + 1);
      setRemixing(false);
      notify("3 fresh hooks forged", "ok");
    }, 700);
  };
  const copy = (text: string, msg: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    notify(msg, "ok");
  };

  const [w, h] = DIMS[aspect];
  const progress = clamp((time - inT) / Math.max(0.1, outT - inT), 0, 1);
  const pubs = published[clip.id] ?? [];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-5">
      {/* ---------- top bar ---------- */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-ink-850 px-4 py-3">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-3 py-2 text-xs font-bold text-fog transition-all hover:border-ink-600 hover:text-snow">
          <IcChevronL size={14} /> All clips
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-display text-[17px] font-bold text-snow">{clip.title}</h2>
            {pubs.length > 0 && <Chip tone="volt"><IcCheck size={10} /> live on {pubs.length}</Chip>}
          </div>
          <p className="truncate font-mono text-[10px] text-fog-dim">
            {source.title} · in {fmtTC(inT)} → out {fmtTC(outT)} · {fmtDur(outT - inT)}
          </p>
        </div>

        <div className="flex items-center gap-2" title="Live virality — re-scores as you trim">
          <ScoreRing score={liveScore} size={44} stroke={4} />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-fog-dim">virality</span>
            <span className={`font-mono text-xs font-bold ${delta > 0 ? "text-volt-300" : delta < 0 ? "text-ember-400" : "text-fog"}`}>
              {delta > 0 ? `+${delta}` : delta === 0 ? "±0" : delta} vs base
            </span>
          </div>
        </div>

        <Seg<Aspect>
          size="md"
          value={aspect}
          onChange={setAspect}
          options={[
            { id: "9:16", icon: <IcTall size={15} />, title: "9:16 — Shorts / Reels / TikTok" },
            { id: "1:1", icon: <IcSquare size={15} />, title: "1:1 — Feed" },
            { id: "16:9", icon: <IcWide size={15} />, title: "16:9 — Landscape" },
          ]}
        />

        <button
          onClick={() => onPublish(clip)}
          className="flex items-center gap-2 rounded-lg border border-mint-400/40 bg-mint-400/10 px-3.5 py-2 text-xs font-bold text-mint-300 transition-all hover:bg-mint-400/20 active:scale-[0.97]"
        >
          <IcShare size={14} /> Publish
        </button>
        <button
          onClick={() => onExport(clip)}
          className="flex items-center gap-2 rounded-lg bg-ember-500 px-4 py-2 text-xs font-bold text-ink-950 transition-all hover:bg-ember-400 hover:shadow-[0_6px_24px_rgba(255,90,54,0.35)] active:scale-[0.97]"
        >
          <IcDownload size={14} /> Export
        </button>
      </div>

      {/* ---------- main grid ---------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_330px]">
        {/* ===== left: queue + DNA ===== */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-ink-850 p-3.5">
            <p className="px-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-fog-dim">Clip queue</p>
            <div className="mt-2.5 max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
              {clips.map((c, i) => {
                const active = c.id === clip.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                      active ? "border-ember-500/60 bg-ink-750" : "border-transparent hover:border-line hover:bg-ink-800"
                    }`}
                  >
                    <span className="font-mono text-[10px] font-bold text-fog-dim">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-mono text-sm font-bold" style={{ color: scoreColor(c.score) }}>{c.score}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-snow">{c.title}</span>
                      <span className="font-mono text-[9px] text-fog-dim">{fmtDur(c.end - c.start)} · {fmtTC(c.start)}</span>
                    </span>
                    {(published[c.id] ?? []).length > 0 && <IcCheck size={13} className="shrink-0 text-volt-300" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-ink-850 p-4">
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-fog-dim">
              <IcBolt size={11} className="text-ember-400" /> Clip DNA
            </p>
            <div className="mt-3">
              <MiniBars metrics={clip.metrics as unknown as Record<string, number>} />
            </div>
            <div className="mt-4 space-y-2 border-t border-line pt-3.5">
              {clip.reasons.map((r) => (
                <p key={r} className="flex items-start gap-2 text-[12px] leading-snug text-fog">
                  <IcSparkles size={12} className="mt-0.5 shrink-0 text-gold-400" /> {r}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ===== center: preview + timeline ===== */}
        <div className="min-w-0">
          <div className="dotgrid relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-line bg-ink-900 p-6 xl:min-h-[560px]">
            {/* phone frame */}
            <div
              className="relative overflow-hidden rounded-[22px] border-[3px] border-ink-600 bg-ink-950 shadow-[0_24px_70px_rgba(0,0,0,0.55)] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ width: w, height: h, maxWidth: "100%" }}
            >
              <video
                key={clip.id + source.url}
                ref={videoRef}
                src={source.url}
                muted={muted}
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (isFinite(v.duration) && v.duration > 1) {
                    setMetaDur(v.duration);
                    const s = clip.start < v.duration - 4 ? clip.start : 0;
                    v.currentTime = s;
                    setTime(s);
                  }
                }}
                onEnded={() => setPlaying(false)}
              />

              {/* progress bar */}
              {showProgress && (
                <div className="absolute left-0 top-0 z-10 h-[3px] w-full bg-ink-950/50">
                  <div className="h-full bg-ember-500" style={{ width: `${progress * 100}%` }} />
                </div>
              )}

              {/* safe-zone guides */}
              {guides && (
                <div className="pointer-events-none absolute inset-0 z-10">
                  <div className="absolute inset-x-0 top-[12%] border-t border-dashed border-mint-400/50" />
                  <div className="absolute inset-x-0 bottom-[18%] border-t border-dashed border-mint-400/50" />
                  <span className="absolute left-2 top-[12%] -translate-y-full font-mono text-[8px] text-mint-300/80">UI safe</span>
                </div>
              )}

              {/* flame beats */}
              {flameOn && (
                <div key={beat} className="anim-burst absolute right-4 top-14 z-10">
                  <IcFlame size={34} className={beat % 2 ? "text-mint-400" : "text-ember-500"} style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }} />
                </div>
              )}

              {/* captions */}
              {activeLine && (
                <div
                  className={`absolute inset-x-0 z-10 flex justify-center px-4 ${
                    capPos === "top" ? "top-[14%]" : capPos === "mid" ? "top-1/2 -translate-y-1/2" : "bottom-[12%]"
                  }`}
                >
                  <div
                    className={`max-w-full text-center leading-[1.15] ${theme.boxed ? "rounded-lg bg-ink-950/75 px-3 py-1.5" : ""}`}
                    style={{
                      fontFamily: `'${theme.font}', sans-serif`,
                      fontWeight: theme.weight,
                      fontSize: capSize,
                      textTransform: theme.transform,
                      color: theme.color,
                      textShadow: theme.stroke ? STROKE : theme.glow ? `0 0 18px ${theme.active}66` : "0 2px 8px rgba(0,0,0,0.6)",
                    }}
                  >
                    {activeLine.words.map((wd, wi) => {
                      const isActiveW = time >= wd.t && time < wd.t + wd.d;
                      const done = time >= wd.t + wd.d;
                      return (
                        <span
                          key={wi}
                          className="inline-block transition-transform duration-100"
                          style={{
                            color: isActiveW ? theme.active : done ? theme.color : theme.dim,
                            background: isActiveW && theme.activeBg ? theme.activeBg : undefined,
                            borderRadius: isActiveW && theme.activeBg ? 5 : undefined,
                            padding: isActiveW && theme.activeBg ? "0 4px" : undefined,
                            transform: isActiveW ? "scale(1.12)" : undefined,
                          }}
                        >
                          {wd.w}&nbsp;
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* paused veil */}
              {!playing && (
                <button onClick={togglePlay} className="absolute inset-0 z-20 flex items-center justify-center bg-ink-950/25 transition-opacity hover:bg-ink-950/15">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ember-500 text-ink-950 shadow-[0_10px_40px_rgba(255,90,54,0.5)] transition-transform hover:scale-110" style={{ animation: "pulseRing 1.6s ease-out infinite" }}>
                    <IcPlay size={26} className="translate-x-0.5" />
                  </span>
                </button>
              )}

              <span className="absolute bottom-2.5 left-2.5 z-10 rounded bg-ink-950/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-mint-300">{aspect}</span>
            </div>
          </div>

          {/* transport */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-ink-850 px-4 py-3">
            <button onClick={() => { seek(inT); }} title="Back to IN point" className="rounded-lg border border-line bg-ink-800 p-2 text-fog transition-all hover:border-ink-600 hover:text-snow active:scale-95">
              <IcRestart size={15} />
            </button>
            <button
              onClick={togglePlay}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ember-500 text-ink-950 shadow-[0_6px_20px_rgba(255,90,54,0.4)] transition-all hover:bg-ember-400 active:scale-95"
            >
              {playing ? <IcPause size={18} /> : <IcPlay size={18} className="translate-x-0.5" />}
            </button>
            <button onClick={() => setMuted((m) => !m)} className="rounded-lg border border-line bg-ink-800 p-2 text-fog transition-all hover:border-ink-600 hover:text-snow active:scale-95" title={muted ? "Unmute" : "Mute"}>
              {muted ? <IcVolumeX size={15} /> : <IcVolume size={15} />}
            </button>
            <span className="font-mono text-sm font-semibold tabular-nums text-snow">
              {fmtTC(Math.max(0, time - inT))} <span className="text-fog-dim">/ {fmtDur(outT - inT)}</span>
            </span>
            <Chip tone="ember">LOOP {fmtTC(inT)}–{fmtTC(outT)}</Chip>
            <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.16em] text-fog-dim sm:block">space = play/pause</span>
          </div>

          {/* timeline */}
          <div className="mt-4 rounded-2xl border border-line bg-ink-850 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-fog-dim">
                <IcScissors size={12} className="text-ember-400" /> Trim — drag the handles, virality re-scores live
              </p>
              <span className="font-mono text-[11px] font-bold" style={{ color: scoreColor(liveScore) }}>
                {liveScore} · {fmtDur(outT - inT)}
              </span>
            </div>

            <div
              ref={trackRef}
              className="relative mt-3 h-16 cursor-pointer select-none overflow-hidden rounded-lg bg-ink-900"
              onPointerDown={(e) => {
                if (dragRef.current) return;
                seek(timeAt(e.clientX));
              }}
            >
              {/* waveform */}
              <div className="absolute inset-0 flex items-end gap-[2px] px-1 pb-1.5 pt-2">
                {bars.map((b, i) => {
                  const t = (i / bars.length) * metaDur;
                  const inside = t >= inT && t <= outT;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-colors duration-150"
                      style={{ height: `${b * 100}%`, background: inside ? (i % 7 === 0 ? "#ff5a36" : "#45d6c8") : "#252b39", opacity: inside ? 0.9 : 0.6 }}
                    />
                  );
                })}
              </div>

              {/* dimmed outs */}
              <div className="absolute inset-y-0 left-0 bg-ink-950/70" style={{ width: `${(inT / metaDur) * 100}%` }} />
              <div className="absolute inset-y-0 right-0 bg-ink-950/70" style={{ width: `${(1 - outT / metaDur) * 100}%` }} />

              {/* playhead */}
              <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${(time / metaDur) * 100}%` }}>
                <div className="h-full w-[2px] -translate-x-1/2 bg-snow shadow-[0_0_10px_rgba(238,241,247,0.6)]" />
                <div className="absolute -top-0.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-snow" />
              </div>

              {/* handles */}
              {(["in", "out"] as const).map((which) => {
                const val = which === "in" ? inT : outT;
                return (
                  <div
                    key={which}
                    className="absolute inset-y-0 z-20 flex w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center"
                    style={{ left: `${(val / metaDur) * 100}%` }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      dragRef.current = which;
                    }}
                    onPointerMove={(e) => {
                      if (dragRef.current !== which) return;
                      const t = timeAt(e.clientX);
                      if (which === "in") setInT(clamp(t, 0, outT - 6));
                      else setOutT(clamp(t, inT + 6, metaDur));
                    }}
                    onPointerUp={() => {
                      if (!dragRef.current) return;
                      dragRef.current = null;
                      commitTrim(inT, outT);
                    }}
                  >
                    <div className={`flex h-full w-2.5 items-center justify-center rounded-md border text-ink-950 ${which === "in" ? "border-ember-300 bg-ember-500" : "border-mint-300 bg-mint-400"}`}>
                      <IcGrip size={9} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex justify-between font-mono text-[9px] text-fog-dim">
              <span>0:00</span>
              <span>{fmtTC(metaDur / 2)}</span>
              <span>{fmtDur(metaDur)}</span>
            </div>
          </div>
        </div>

        {/* ===== right: tool tabs ===== */}
        <div className="rounded-2xl border border-line bg-ink-850 lg:col-span-2 xl:col-span-1">
          <div className="flex border-b border-line p-2">
            <Seg<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { id: "captions", label: "Captions", icon: <IcType size={14} /> },
                { id: "style", label: "Style", icon: <IcPalette size={14} /> },
                { id: "hook", label: "Hook AI", icon: <IcWand size={14} /> },
              ]}
            />
          </div>

          <div className="max-h-[720px] overflow-y-auto p-4">
            {/* ---------- captions ---------- */}
            {tab === "captions" && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-snow">Auto-captions · EN</p>
                  <Chip tone="mint">{windowLines.length} lines in cut</Chip>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-fog-dim">Word-level timing. Edit any line — words re-time instantly.</p>
                <div className="mt-3 space-y-2.5">
                  {windowLines.map((l, i) => {
                    const live = activeLine?.id === l.id;
                    return (
                      <div key={l.id} className={`rounded-xl border p-2.5 transition-colors ${live ? "border-ember-500/50 bg-ember-500/5" : "border-line bg-ink-900"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] font-bold text-fog-dim">
                            {String(i + 1).padStart(2, "0")} · {fmtTC(l.start - inT > 0 ? l.start - inT : 0)}
                          </span>
                          {live && <Chip tone="ember">on air</Chip>}
                        </div>
                        <textarea
                          value={l.text}
                          onChange={(e) => editLine(l.id, e.target.value)}
                          rows={2}
                          className="mt-1.5 w-full resize-none rounded-lg bg-ink-850 px-2.5 py-2 text-[13px] leading-snug text-snow outline-none ring-ember-500/40 focus:ring-2"
                        />
                      </div>
                    );
                  })}
                  {windowLines.length === 0 && (
                    <p className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-fog-dim">No caption lines inside the current trim.</p>
                  )}
                </div>
              </div>
            )}

            {/* ---------- style ---------- */}
            {tab === "style" && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-snow">Caption theme</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {CAPTION_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setThemeId(t.id); notify(`Theme: ${t.name}`, "info"); }}
                        className={`rounded-xl border p-3 text-left transition-all ${themeId === t.id ? "border-ember-500/70 bg-ink-750" : "border-line bg-ink-900 hover:border-ink-600"}`}
                      >
                        <span
                          className="block text-base leading-none"
                          style={{
                            fontFamily: `'${t.font}', sans-serif`,
                            fontWeight: t.weight,
                            textTransform: t.transform,
                            color: t.active,
                            textShadow: t.stroke ? "1.5px 0 #0a0c10, -1.5px 0 #0a0c10, 0 1.5px #0a0c10, 0 -1.5px #0a0c10" : undefined,
                          }}
                        >
                          Aa
                        </span>
                        <span className="mt-2 block text-[11px] font-semibold text-fog">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-snow">Size</p>
                    <span className="font-mono text-[11px] text-fog">{capSize}px</span>
                  </div>
                  <input type="range" min={15} max={34} value={capSize} onChange={(e) => setCapSize(+e.target.value)} className="mt-2 w-full" />
                </div>

                <div>
                  <p className="text-xs font-bold text-snow">Position</p>
                  <div className="mt-2">
                    <Seg<"top" | "mid" | "bottom">
                      value={capPos}
                      onChange={setCapPos}
                      options={[
                        { id: "top", label: "Top" },
                        { id: "mid", label: "Middle" },
                        { id: "bottom", label: "Bottom" },
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-1 border-t border-line pt-3">
                  <Toggle on={showProgress} onChange={setShowProgress} label="Burned progress bar" hint="Thin hook bar across the top" />
                  <Toggle on={showFlames} onChange={setShowFlames} label="Reaction beats" hint="Timed flame pops on emphasis words" />
                  <Toggle on={guides} onChange={setGuides} label="Safe-zone guides" hint="Platform UI overlay lines" />
                </div>
              </div>
            )}

            {/* ---------- hook AI ---------- */}
            {tab === "hook" && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-snow">Hook · first 1.2s</p>
                    <button
                      onClick={doRemix}
                      disabled={remixing}
                      className="flex items-center gap-1.5 rounded-lg border border-ember-500/40 bg-ember-500/10 px-2.5 py-1.5 text-[11px] font-bold text-ember-300 transition-all hover:bg-ember-500/20 active:scale-95 disabled:opacity-50"
                    >
                      <IcRemix size={12} className={remixing ? "anim-spin-slow" : ""} style={remixing ? { animationDuration: "0.8s" } : undefined} />
                      {remixing ? "Forging…" : "Remix"}
                    </button>
                  </div>
                  <textarea
                    value={clip.hook}
                    onChange={(e) => onUpdate(clip.id, { hook: e.target.value })}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-[13px] leading-snug text-snow outline-none focus:border-ember-500/50"
                  />
                </div>

                {variants.length > 0 && (
                  <div className="anim-fade-up">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-fog-dim">Variants · round {remixCount}</p>
                    <div className="mt-2 space-y-2">
                      {variants.map((v, i) => (
                        <button
                          key={`${remixCount}-${i}`}
                          onClick={() => { onUpdate(clip.id, { hook: v }); notify("Hook applied", "ok"); }}
                          className="group flex w-full items-start gap-2 rounded-xl border border-line bg-ink-900 p-2.5 text-left transition-all hover:border-mint-400/50 hover:bg-ink-750"
                        >
                          <span className="mt-0.5 font-mono text-[10px] font-bold text-mint-400">{i + 1}</span>
                          <span className="flex-1 text-[12px] leading-snug text-fog group-hover:text-snow">{v}</span>
                          <IcCheck size={13} className="mt-0.5 shrink-0 text-fog-dim opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-volt-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-line pt-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-fog-dim">Title ideas</p>
                  <div className="mt-2 space-y-2">
                    {titles.map((t) => (
                      <div key={t} className="flex items-center gap-2 rounded-xl border border-line bg-ink-900 p-2.5">
                        <span className="flex-1 text-[12px] text-fog">{t}</span>
                        <button
                          onClick={() => { onUpdate(clip.id, { title: t }); notify("Title applied", "ok"); }}
                          className="rounded-md border border-line px-2 py-1 text-[10px] font-bold text-fog transition-all hover:border-mint-400/50 hover:text-mint-300"
                        >
                          Use
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-line pt-4">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-fog-dim">
                      <IcHash size={11} className="text-mint-400" /> Trend-matched tags
                    </p>
                    <button onClick={() => copy(suggestTags(source.category).join(" "), "Tags copied")} className="flex items-center gap-1 text-[10px] font-bold text-fog transition-colors hover:text-snow">
                      <IcCopy size={11} /> Copy all
                    </button>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {suggestTags(source.category).map((t) => (
                      <button key={t} onClick={() => copy(t, `${t} copied`)} className="rounded-lg bg-ink-750 px-2 py-1 font-mono text-[11px] text-mint-300 transition-all hover:bg-ink-700 active:scale-95">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
