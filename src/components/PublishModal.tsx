import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { PLATFORMS, suggestTags, type Clip, type SourceVideo } from "../lib/data";
import { Chip, Modal, Toggle } from "./bits";
import { IcCalendar, IcCheck, IcCopy, IcShare, IcSparkles, IcTrend, PLATFORM_ICONS } from "./icons";

interface Props {
  clip: Clip;
  source: SourceVideo;
  onClose: () => void;
  onDone: (platformIds: string[]) => void;
  notify: (msg: string, kind?: "ok" | "err" | "info") => void;
}

type RowState = "idle" | "busy" | "done";

export function PublishModal({ clip, source, onClose, onDone, notify }: Props) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ tiktok: true, ytshorts: true, reels: false, x: false });
  const [caption, setCaption] = useState(() => `${clip.hook} ${suggestTags(source.category).slice(0, 4).join(" ")}`);
  const [phase, setPhase] = useState<"pick" | "working" | "done">("pick");
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const targets = PLATFORMS.filter((p) => enabled[p.id]);

  const publish = () => {
    if (targets.length === 0) return;
    setPhase("working");
    const ids = targets.map((t) => t.id);
    ids.forEach((id, i) => {
      timers.current.push(setTimeout(() => setRows((r) => ({ ...r, [id]: "busy" })), i * 750));
      timers.current.push(
        setTimeout(() => {
          setRows((r) => ({ ...r, [id]: "done" }));
          if (i === ids.length - 1) {
            timers.current.push(
              setTimeout(() => {
                setPhase("done");
                onDone(ids);
                confetti({ particleCount: 150, spread: 78, origin: { y: 0.62 }, colors: ["#FF5A36", "#45D6C8", "#C8F24F", "#FFC247", "#EEF1F7"] });
                notify(`Live on ${ids.length} platform${ids.length > 1 ? "s" : ""}`, "ok");
              }, 600)
            );
          }
        }, i * 750 + 620)
      );
    });
  };

  const shareLink = `reelforge.app/c/${clip.id}`;

  return (
    <Modal
      title={phase === "done" ? "It's live" : "Publish clip"}
      subtitle={phase === "done" ? undefined : `${clip.title} · AI picked the slots with your highest historical reach`}
      onClose={onClose}
      width={560}
    >
      {phase !== "done" ? (
        <div>
          <div className="space-y-2">
            {PLATFORMS.map((p) => {
              const Icon = PLATFORM_ICONS[p.id];
              const st = rows[p.id] ?? "idle";
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                    enabled[p.id] ? "border-mint-400/40 bg-mint-400/5" : "border-line bg-ink-900"
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${enabled[p.id] ? "border-mint-400/40 text-mint-300" : "border-line text-fog-dim"}`}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-snow">{p.name}</p>
                      {phase === "working" && st === "busy" && <span className="h-2 w-2 animate-ping rounded-full bg-gold-400" />}
                      {st === "done" && <IcCheck size={14} className="text-volt-300" />}
                    </div>
                    <p className="font-mono text-[10px] text-fog-dim">{p.handle} · {p.audience}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="flex items-center justify-end gap-1 font-mono text-[10px] font-bold text-gold-300">
                      <IcCalendar size={11} /> {p.best}
                    </p>
                    <p className="text-[9px] text-fog-dim">AI best time</p>
                  </div>
                  <div className="w-10">
                    <Toggle on={enabled[p.id]} onChange={(v) => setEnabled((e) => ({ ...e, [p.id]: v }))} label="" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Caption</p>
              <button onClick={() => { void navigator.clipboard?.writeText(caption).catch(() => undefined); notify("Caption copied", "ok"); }} className="flex items-center gap-1 text-[10px] font-bold text-fog transition-colors hover:text-snow">
                <IcCopy size={11} /> Copy
              </button>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl border border-line bg-ink-900 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-snow outline-none focus:border-mint-400/50"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-gold-400/25 bg-gold-400/5 px-3.5 py-2.5">
            <IcTrend size={15} className="shrink-0 text-gold-400" />
            <p className="text-[11px] leading-snug text-fog">
              <span className="font-bold text-gold-300">Forecast:</span> this hook over-indexes with 18–24s viewers. Posting in the suggested slots lifts expected reach by <span className="font-mono font-bold text-volt-300">~31%</span>.
            </p>
          </div>

          <button
            onClick={publish}
            disabled={targets.length === 0 || phase === "working"}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-mint-400 py-3.5 text-sm font-bold text-ink-950 transition-all hover:bg-mint-300 hover:shadow-[0_10px_35px_rgba(69,214,200,0.3)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IcShare size={16} />
            {phase === "working" ? "Publishing…" : `Publish to ${targets.length} platform${targets.length === 1 ? "" : "s"}`}
          </button>
        </div>
      ) : (
        <div className="anim-pop py-2 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-volt-400/15 text-volt-300">
            <IcCheck size={30} />
          </span>
          <h4 className="mt-4 font-display text-xl font-bold text-snow">Live on {targets.length} platform{targets.length > 1 ? "s" : ""}</h4>
          <p className="mt-1 text-[13px] text-fog">First engagement metrics land in about 20 minutes.</p>

          <div className="mx-auto mt-5 flex max-w-sm items-center gap-2 rounded-xl border border-line bg-ink-900 px-3.5 py-3">
            <span className="truncate font-mono text-[12px] text-mint-300">{shareLink}</span>
            <button
              onClick={() => { void navigator.clipboard?.writeText(`https://${shareLink}`).catch(() => undefined); notify("Share link copied", "ok"); }}
              className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-[11px] font-bold text-fog transition-all hover:border-ink-600 hover:text-snow"
            >
              <IcCopy size={12} /> Copy
            </button>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {targets.map((p) => {
              const Icon = PLATFORM_ICONS[p.id];
              return (
                <span key={p.id} className="flex items-center gap-1.5 rounded-lg border border-volt-400/30 bg-volt-400/10 px-2.5 py-1.5 text-[11px] font-bold text-volt-300">
                  <Icon size={13} /> {p.name}
                </span>
              );
            })}
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-fog-dim">
            <IcSparkles size={12} className="text-gold-400" /> ReelForge will auto-pin the top comment and watch the first hour for you.
          </p>

          <div className="mt-4 flex gap-2">
            <Chip tone="mint"><IcCalendar size={10} /> auto-repost at peak +6h</Chip>
            <Chip tone="gold">first-hour monitor on</Chip>
          </div>

          <button onClick={onClose} className="mt-6 w-full rounded-xl border border-line bg-ink-800 py-2.5 text-xs font-bold text-fog transition-all hover:border-ink-600 hover:text-snow">
            Back to the studio
          </button>
        </div>
      )}
    </Modal>
  );
}
