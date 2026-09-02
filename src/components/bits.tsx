import { useEffect, useRef, useState, type ReactNode } from "react";
import { scoreColor } from "../lib/utils";
import { IcClose } from "./icons";

/* ---------- scroll reveal ---------- */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVis(true);
          io.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- score ring ---------- */
export function ScoreRing({ score, size = 46, stroke = 4, num = true }: { score: number; size?: number; stroke?: number; num?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const col = scoreColor(score);
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#252b39" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={col}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(.22,1,.36,1), stroke 0.5s" }}
        />
      </svg>
      {num && (
        <span className="absolute font-mono font-bold leading-none" style={{ fontSize: size * 0.3, color: col, transition: "color .5s" }}>
          {score}
        </span>
      )}
    </div>
  );
}

/* ---------- metric bars ---------- */
const METRIC_LABELS: [string, keyof { hook: number; retention: number; emotion: number; trend: number; pacing: number }][] = [
  ["Hook", "hook"],
  ["Retention", "retention"],
  ["Emotion", "emotion"],
  ["Trend fit", "trend"],
  ["Pacing", "pacing"],
];

export function MiniBars({ metrics, dim = false }: { metrics: Record<string, number>; dim?: boolean }) {
  return (
    <div className="space-y-1.5">
      {METRIC_LABELS.map(([label, key]) => {
        const v = metrics[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-16 text-[10px] uppercase tracking-[0.14em] ${dim ? "text-fog-dim" : "text-fog"}`}>{label}</span>
            <div className={`h-1 flex-1 rounded-full ${dim ? "bg-ink-700" : "bg-ink-600"} overflow-hidden`}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{ width: `${v}%`, background: scoreColor(v) }}
              />
            </div>
            <span className="w-6 text-right font-mono text-[10px] text-fog">{v}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- toggle ---------- */
export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="group flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-ink-750"
    >
      <span>
        <span className="block text-[13px] font-medium text-snow">{label}</span>
        {hint && <span className="block text-[11px] text-fog-dim">{hint}</span>}
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-ember-500" : "bg-ink-600 group-hover:bg-ink-600"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-snow shadow transition-all duration-200 ${on ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

/* ---------- segmented control ---------- */
export interface SegOption<T extends string> {
  id: T;
  label?: string;
  icon?: ReactNode;
  title?: string;
}

export function Seg<T extends string>({ options, value, onChange, size = "md" }: { options: SegOption<T>[]; value: T; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className={`inline-flex items-center gap-0.5 rounded-lg border border-line bg-ink-900 p-0.5 ${size === "sm" ? "h-8" : "h-9"}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.title}
          onClick={() => onChange(o.id)}
          className={`flex h-full items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-semibold transition-all duration-150 ${
            value === o.id ? "bg-ink-700 text-snow shadow-sm" : "text-fog hover:text-snow"
          }`}
        >
          {o.icon}
          {o.label && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- modal ---------- */
export function Modal({ title, subtitle, onClose, children, width = 560 }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className="anim-pop relative max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-line bg-ink-850 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        style={{ maxWidth: width }}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-ink-850/95 px-6 py-4 backdrop-blur">
          <div>
            <h3 className="font-display text-lg font-bold text-snow">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-fog">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-line bg-ink-800 p-1.5 text-fog transition-all hover:border-ink-600 hover:text-snow"
          >
            <IcClose size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- chip ---------- */
export function Chip({ children, tone = "line" }: { children: ReactNode; tone?: "line" | "ember" | "mint" | "volt" | "gold" }) {
  const tones: Record<string, string> = {
    line: "border-line text-fog",
    ember: "border-ember-500/40 text-ember-300 bg-ember-500/10",
    mint: "border-mint-400/40 text-mint-300 bg-mint-400/10",
    volt: "border-volt-400/40 text-volt-300 bg-volt-400/10",
    gold: "border-gold-400/40 text-gold-300 bg-gold-400/10",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
