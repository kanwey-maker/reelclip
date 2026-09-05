import { useEffect, useMemo, useRef, useState } from "react";
import { forgeClips, processingPlan, type Clip, type SourceVideo } from "../lib/data";
import { fmtLong } from "../lib/utils";
import { IcBolt, IcCheck, IcChevronL } from "./icons";

interface Props {
  source: SourceVideo;
  onDone: (clips: Clip[]) => void;
  onCancel: () => void;
}

export function ProcessingScreen({ source, onDone, onCancel }: Props) {
  const plan = useMemo(() => processingPlan(source), [source]);
  const clips = useMemo(() => forgeClips(source), [source]);
  const total = useMemo(() => plan.reduce((a, s) => a + s.dur, 0) + 500, [plan]);
  const [elapsed, setElapsed] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => setElapsed((e) => Math.min(total, e + 50)), 50);
    return () => clearInterval(iv);
  }, [total]);

  useEffect(() => {
    if (elapsed >= total && !firedRef.current) {
      firedRef.current = true;
      const t = setTimeout(() => onDone(clips), 450);
      return () => clearTimeout(t);
    }
  }, [elapsed, total, clips, onDone]);

  const pct = Math.round((elapsed / total) * 100);
  let acc = 0;
  const stageStarts = plan.map((s) => {
    const st = acc;
    acc += s.dur;
    return st;
  });

  const logs: { at: number; text: string }[] = [];
  plan.forEach((s, si) => {
    s.logs.forEach((l, li) => logs.push({ at: stageStarts[si] + ((li + 1) * s.dur) / (s.logs.length + 1), text: l }));
  });
  const visibleLogs = logs.filter((l) => elapsed >= l.at);
  const activeStage = plan.findIndex((s, i) => elapsed < stageStarts[i] + s.dur);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-16 pt-12">
      <button onClick={onCancel} className="flex items-center gap-1.5 text-xs font-semibold text-fog transition-colors hover:text-snow">
        <IcChevronL size={14} /> Cancel — back to sources
      </button>

      <div className="mt-8 grid gap-6 md:grid-cols-[280px_1fr]">
        {/* left: ring + stages */}
        <div className="rounded-2xl border border-line bg-ink-850 p-6">
          <div className="relative mx-auto h-40 w-40">
            <svg width="160" height="160" className="-rotate-90">
              <circle cx="80" cy="80" r="70" stroke="#252b39" strokeWidth="8" fill="none" />
              <circle
                cx="80" cy="80" r="70" fill="none" strokeWidth="8" strokeLinecap="round"
                stroke="url(#forgeGrad)"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - pct / 100)}
                style={{ transition: "stroke-dashoffset 0.2s linear" }}
              />
              <defs>
                <linearGradient id="forgeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff5a36" />
                  <stop offset="100%" stopColor="#45d6c8" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl font-bold text-snow">{pct}%</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-fog">forging</span>
            </div>
          </div>

          {/* eq bars */}
          <div className="mt-5 flex h-8 items-end justify-center gap-1">
            {[0.9, 0.5, 0.7, 1, 0.6, 0.85, 0.45, 0.75, 0.95, 0.55, 0.8, 0.65].map((h, i) => (
              <div
                key={i}
                className="eq-bar w-1.5 rounded-full"
                style={{ height: `${h * 100}%`, background: i % 3 === 0 ? "#ff5a36" : i % 3 === 1 ? "#45d6c8" : "#2b3242", animationDelay: `${i * 70}ms`, animationDuration: `${700 + (i % 4) * 140}ms` }}
              />
            ))}
          </div>

          <div className="mt-6 space-y-2.5">
            {plan.map((s, i) => {
              const done = elapsed >= stageStarts[i] + s.dur;
              const active = i === activeStage;
              return (
                <div key={s.label} className={`flex items-center gap-2.5 text-[13px] transition-colors ${done ? "text-snow" : active ? "text-snow" : "text-fog-dim"}`}>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold transition-all ${
                      done ? "border-volt-400/60 bg-volt-400/15 text-volt-300" : active ? "border-ember-500 text-ember-400" : "border-line text-fog-dim"
                    }`}
                    style={active && !done ? { animation: "pulseRing 1.2s ease-out infinite" } : undefined}
                  >
                    {done ? <IcCheck size={11} /> : i + 1}
                  </span>
                  <span className={active && !done ? "font-semibold" : ""}>{s.label}</span>
                  {active && !done && <span className="ml-auto font-mono text-[10px] text-ember-400">···</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* right: source + terminal */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-ink-850 p-4">
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-ink-700">
              <div className="absolute inset-0 bg-gradient-to-br from-ink-600 to-ink-800" />
              {source.thumb && <img src={source.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-snow">{source.title}</p>
              <p className="mt-0.5 font-mono text-[11px] text-fog">
                {source.duration > 0 ? fmtLong(source.duration) : "—:—"} · {source.words.toLocaleString()} words · {source.category}
              </p>
            </div>
            <IcBolt size={18} className="ml-auto shrink-0 animate-pulse text-ember-400" />
          </div>

          <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-line bg-ink-900">
            <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ember-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-volt-400/80" />
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-dim">reelforge · pipeline</span>
            </div>
            <div className="h-56 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed">
              {visibleLogs.map((l, i) => (
                <p key={i} className="anim-fade-up whitespace-nowrap text-fog" style={{ animationDuration: "0.3s" }}>
                  <span className="text-fog-dim">$</span> <span className={l.text.startsWith("6 clips") || l.text.includes("forged") ? "text-volt-300" : l.text.includes("%") ? "text-mint-300" : ""}>{l.text}</span>
                </p>
              ))}
              <span className="caret inline-block h-3.5 w-2 translate-y-0.5 bg-mint-400" />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] text-fog-dim">Model: forge-v2 · running locally in your browser</p>
            <button
              onClick={() => onDone(clips)}
              className="rounded-lg border border-line bg-ink-800 px-3.5 py-2 text-xs font-bold text-fog transition-all hover:border-ink-600 hover:text-snow"
            >
              Skip the theatre →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
