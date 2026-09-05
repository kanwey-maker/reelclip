import { useMemo, useState } from "react";
import type { Clip, SourceVideo } from "../lib/data";
import { fmtDur, fmtLong, scoreColor } from "../lib/utils";
import { Chip, MiniBars, Reveal, ScoreRing } from "./bits";
import { IcArrowR, IcChevronL, IcDownload, IcFilm, IcFlame, IcScissors, IcShare, IcTrend, PLATFORM_ICONS } from "./icons";

interface Props {
  source: SourceVideo;
  clips: Clip[];
  onEdit: (id: string) => void;
  onExport: (clip: Clip) => void;
  onPublish: (clip: Clip) => void;
  onBack: () => void;
}

type Sort = "score" | "long" | "short" | "time";

const SORTS: { id: Sort; label: string }[] = [
  { id: "score", label: "Hottest first" },
  { id: "long", label: "Longest" },
  { id: "short", label: "Shortest" },
  { id: "time", label: "Timeline order" },
];

export function ResultsScreen({ source, clips, onEdit, onExport, onPublish, onBack }: Props) {
  const [sort, setSort] = useState<Sort>("score");
  const [only85, setOnly85] = useState(false);

  const sorted = useMemo(() => {
    const base = [...clips];
    if (only85) return base.filter((c) => c.score >= 85);
    switch (sort) {
      case "long": return base.sort((a, b) => (b.end - b.start) - (a.end - a.start));
      case "short": return base.sort((a, b) => (a.end - a.start) - (b.end - b.start));
      case "time": return base.sort((a, b) => a.start - b.start);
      default: return base.sort((a, b) => b.score - a.score);
    }
  }, [clips, sort, only85]);

  const avg = Math.round(clips.reduce((a, c) => a + c.score, 0) / Math.max(1, clips.length));
  const totalSec = clips.reduce((a, c) => a + (c.end - c.start), 0);
  const top = [...clips].sort((a, b) => b.score - a.score)[0];
  const publishedCount = clips.filter((c) => c.published?.length).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16">
      {/* header band */}
      <div className="anim-fade-up flex flex-col gap-5 rounded-2xl border border-line bg-ink-850 p-6 lg:flex-row lg:items-center">
        <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-xs font-semibold text-fog transition-colors hover:text-snow">
          <IcChevronL size={14} /> New source
        </button>
        <div className="flex flex-1 items-center gap-4">
          <div className="relative hidden h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-ink-700 sm:block">
            {source.thumb && <img src={source.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold text-snow">{source.title}</h2>
              {source.realTranscript && <Chip tone="mint">whisper transcript</Chip>}
              {source.isProxy && <Chip tone="gold">proxy media</Chip>}
            </div>
            <p className="mt-1 font-mono text-[11px] text-fog">
              {source.creator} · {fmtLong(source.duration)} · {source.words.toLocaleString()} words · {source.category}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <div className="text-center">
            <p className="font-display text-3xl font-bold" style={{ color: scoreColor(avg) }}>{avg}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-fog-dim">avg score</p>
          </div>
          <div className="h-10 w-px bg-line" />
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-snow">{clips.length}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-fog-dim">clips</p>
          </div>
          <div className="h-10 w-px bg-line" />
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-mint-400">{publishedCount}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-fog-dim">live</p>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${
                sort === s.id && !only85
                  ? "border-ember-500/60 bg-ember-500/10 text-ember-300"
                  : "border-line bg-ink-850 text-fog hover:border-ink-600 hover:text-snow"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOnly85((v) => !v)}
          className={`ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${
            only85 ? "border-volt-400/60 bg-volt-400/10 text-volt-300" : "border-line bg-ink-850 text-fog hover:border-ink-600 hover:text-snow"
          }`}
        >
          <IcFlame size={12} /> 85+ only
        </button>
      </div>

      {/* grid */}
      {sorted.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-ink-900/50 p-12 text-center">
          <p className="font-display text-lg font-bold text-snow">Nothing above 85 this time</p>
          <p className="mt-1 text-sm text-fog">Lower the filter — or trim a clip toward the 21–45s sweet spot in the editor.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((clip, i) => {
            const dur = clip.end - clip.start;
            return (
              <Reveal key={clip.id} delay={i * 60}>
                <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-ink-850 transition-all duration-300 hover:-translate-y-1 hover:border-ink-600 hover:shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
                  <div className="relative aspect-video overflow-hidden bg-ink-700">
                    <div className="absolute inset-0 bg-gradient-to-br from-ink-600 to-ink-800" />
                    {source.thumb && (
                      <img src={source.thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/10 to-transparent" />
                    <div className="absolute left-2.5 top-2.5"><ScoreRing score={clip.score} size={44} /></div>
                    {i === 0 && sort === "score" && !only85 && (
                      <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md bg-volt-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-950">
                        <IcFlame size={10} /> TOP PICK
                      </span>
                    )}
                    <span className="absolute bottom-2.5 left-2.5 rounded-md bg-ink-950/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-snow backdrop-blur">
                      {fmtDur(dur)} · {fmtDur(clip.start)}–{fmtDur(clip.end)}
                    </span>
                    {clip.published && clip.published.length > 0 && (
                      <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-mint-400/15 px-1.5 py-1 text-mint-300 backdrop-blur">
                        {clip.published.map((id) => {
                          const Icon = PLATFORM_ICONS[id];
                          return Icon ? <Icon key={id} size={12} /> : null;
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-display text-[15px] font-bold leading-snug text-snow">{clip.title}</h3>
                    {((clip.published && clip.published.length > 0) || clip.scheduled) && (
                      <div className="mt-1.5 flex gap-1.5">
                        {clip.published && clip.published.length > 0 && (
                          <Chip tone="volt">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-volt-300" /> LIVE
                          </Chip>
                        )}
                        {clip.scheduled && <Chip tone="gold">QUEUED</Chip>}
                      </div>
                    )}
                    <p className="mt-1 text-[12px] italic leading-snug text-fog">“{clip.hook}”</p>

                    <div className="mt-3"><MiniBars metrics={clip.metrics as unknown as Record<string, number>} /></div>

                    <ul className="mt-3 space-y-1">
                      {clip.reasons.map((r) => (
                        <li key={r} className="flex items-start gap-1.5 text-[11px] leading-snug text-fog">
                          <IcTrend size={11} className="mt-0.5 shrink-0 text-mint-400" /> {r}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {clip.tags.map((t) => <Chip key={t}>{t}</Chip>)}
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-4">
                      <button
                        onClick={() => onEdit(clip.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ember-500 py-2 text-[12px] font-bold text-ink-950 transition-all hover:bg-ember-400 active:scale-95"
                      >
                        <IcScissors size={13} /> Edit
                      </button>
                      <button
                        onClick={() => onExport(clip)}
                        title="Export"
                        className="rounded-lg border border-line bg-ink-800 p-2 text-fog transition-all hover:border-mint-400/50 hover:text-mint-300 active:scale-95"
                      >
                        <IcDownload size={14} />
                      </button>
                      <button
                        onClick={() => onPublish(clip)}
                        title="Publish"
                        className="rounded-lg border border-line bg-ink-800 p-2 text-fog transition-all hover:border-volt-400/50 hover:text-volt-300 active:scale-95"
                      >
                        <IcShare size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}

      {/* forge insight */}
      {top && (
        <Reveal className="mt-8">
          <div className="flex flex-col gap-3 rounded-xl border border-gold-400/25 bg-gradient-to-r from-gold-400/10 via-ink-850 to-ink-850 p-5 sm:flex-row sm:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/15 text-gold-400"><IcFilm size={18} /></span>
            <p className="text-[13px] leading-relaxed text-fog">
              <span className="font-bold text-gold-300">Forge insight —</span> your strongest moment is{" "}
              <span className="font-semibold text-snow">“{top.title}”</span> ({top.reasons[0]?.toLowerCase()}). It lands{" "}
              <span className="font-mono font-bold text-mint-300">{fmtDur(totalSec)}</span> of shorts from one source — post the top two
              48h apart and let the winner pull the rest.
            </p>
            <button
              onClick={() => onEdit(top.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gold-400/40 bg-gold-400/10 px-3.5 py-2 text-[12px] font-bold text-gold-300 transition-all hover:bg-gold-400/20 active:scale-95"
            >
              Open in editor <IcArrowR size={13} />
            </button>
          </div>
        </Reveal>
      )}
    </div>
  );
}
