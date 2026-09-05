import { useMemo, useState } from "react";
import type { Clip, SourceVideo } from "../lib/data";
import { fmtDur, fmtLong, scoreColor, scoreLabel } from "../lib/utils";
import { Chip, MiniBars, Reveal, ScoreRing, Seg } from "./bits";
import { IcArrowR, IcDownload, IcEye, IcFlame, IcScissors, IcSparkles, PLATFORM_ICONS } from "./icons";

interface Props {
  source: SourceVideo;
  clips: Clip[];
  published: Record<string, string[]>;
  onEdit: (id: string) => void;
  onExport: (c: Clip) => void;
  onNewProject: () => void;
  onReforge: () => void;
}

type Sort = "score" | "long" | "short" | "order";

export function ResultsScreen({ source, clips, published, onEdit, onExport, onNewProject, onReforge }: Props) {
  const [sort, setSort] = useState<Sort>("score");
  const [hotOnly, setHotOnly] = useState(false);

  const list = useMemo(() => {
    let l = clips.filter((c) => !hotOnly || c.score >= 85);
    l = [...l].sort((a, b) =>
      sort === "score" ? b.score - a.score : sort === "long" ? b.end - b.start - (a.end - a.start) : sort === "short" ? a.end - a.start - (b.end - b.start) : 0
    );
    return l;
  }, [clips, sort, hotOnly]);

  const top = useMemo(() => [...clips].sort((a, b) => b.score - a.score)[0], [clips]);
  const avg = Math.round(clips.reduce((a, c) => a + c.score, 0) / Math.max(1, clips.length));
  const totalShort = clips.reduce((a, c) => a + (c.end - c.start), 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-8">
      {/* source summary */}
      <Reveal>
        <div className="overflow-hidden rounded-2xl border border-line bg-ink-850">
          <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
            <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-ink-700 md:h-28 md:w-48">
              <div className="absolute inset-0 bg-gradient-to-br from-ink-600 to-ink-800" />
              {source.thumb && <img src={source.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <span className="absolute left-2 top-2 rounded bg-ink-950/85 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-mint-300">
                {source.category}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-dim">Source · {source.creator}</p>
              <h2 className="mt-1 truncate font-display text-xl font-bold text-snow md:text-2xl">{source.title}</h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Chip>{source.duration > 0 ? fmtLong(source.duration) : "live"} long</Chip>
                <Chip tone="mint">{clips.length} clips forged</Chip>
                <Chip tone="volt">avg score {avg}</Chip>
                <Chip tone="gold">{fmtDur(totalShort)} of shorts</Chip>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-center">
                <ScoreRing score={top?.score ?? 0} size={64} stroke={5} />
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-fog-dim">top clip</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={onReforge}
                  className="flex items-center gap-2 rounded-lg border border-line bg-ink-800 px-3.5 py-2 text-xs font-bold text-fog transition-all hover:border-ink-600 hover:text-snow"
                >
                  <IcSparkles size={14} className="text-mint-400" /> Re-forge
                </button>
                <button
                  onClick={onNewProject}
                  className="flex items-center gap-2 rounded-lg border border-line bg-ink-800 px-3.5 py-2 text-xs font-bold text-fog transition-all hover:border-ink-600 hover:text-snow"
                >
                  New source
                </button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* controls */}
      <Reveal delay={120}>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-snow">
            Your clips <span className="ml-1 font-mono text-sm font-semibold text-fog-dim">{list.length}/{clips.length}</span>
          </h3>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setHotOnly((v) => !v)}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-all ${
                hotOnly ? "border-ember-500/60 bg-ember-500/10 text-ember-300" : "border-line bg-ink-850 text-fog hover:text-snow"
              }`}
            >
              <IcFlame size={14} /> 85+ only
            </button>
            <Seg<Sort>
              size="md"
              value={sort}
              onChange={setSort}
              options={[
                { id: "score", label: "Hottest" },
                { id: "long", label: "Longest" },
                { id: "short", label: "Shortest" },
                { id: "order", label: "Timeline" },
              ]}
            />
          </div>
        </div>
      </Reveal>

      {/* grid */}
      {list.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-ink-850/50 p-14 text-center">
          <IcFlame size={28} className="mx-auto text-fog-dim" />
          <p className="mt-3 font-display text-lg font-bold text-snow">Nothing above 85 this round</p>
          <p className="mt-1 text-sm text-fog">The algorithm giveth, the algorithm taketh. Loosen the filter or re-forge.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c, i) => {
            const dur = c.end - c.start;
            const pubs = published[c.id] ?? [];
            return (
              <Reveal key={c.id} delay={(i % 3) * 90}>
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-ink-850 transition-all duration-300 hover:-translate-y-1 hover:border-ink-600 hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                  <button onClick={() => onEdit(c.id)} className="relative block aspect-video w-full overflow-hidden bg-ink-700 text-left">
                    <div className="absolute inset-0 bg-gradient-to-br from-ink-600 to-ink-800" />
                    {source.thumb && (
                      <img src={source.thumb} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/10 to-ink-950/30" />
                    <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                      <span className="rounded bg-ink-950/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-fog">
                        {Math.floor(c.start / 60)}:{Math.floor(c.start % 60).toString().padStart(2, "0")} → {Math.floor(c.end / 60)}:{Math.floor(c.end % 60).toString().padStart(2, "0")}
                      </span>
                      {pubs.length > 0 && (
                        <span className="flex items-center gap-1 rounded bg-volt-400/15 px-1.5 py-0.5 text-volt-300">
                          {pubs.map((p) => {
                            const I = PLATFORM_ICONS[p];
                            return I ? <I key={p} size={11} /> : null;
                          })}
                        </span>
                      )}
                    </div>
                    <div className="absolute right-2.5 top-2.5 rounded-xl border border-line bg-ink-950/80 p-1 backdrop-blur-sm">
                      <ScoreRing score={c.score} size={44} stroke={4} />
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
                      <span className="rounded bg-ember-500 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-950">{fmtDur(dur)}</span>
                      <span className="rounded bg-ink-950/85 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-mint-300">9:16</span>
                    </div>
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="flex items-center gap-2 rounded-full bg-ember-500 px-4 py-2 text-xs font-bold text-ink-950 shadow-[0_8px_30px_rgba(255,90,54,0.4)]">
                        <IcScissors size={14} /> Open in studio
                      </span>
                    </span>
                  </button>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: scoreColor(c.score) }}>
                        {scoreLabel(c.score)}
                      </p>
                      <span className="font-mono text-[10px] text-fog-dim">~{(dur * 0.42).toFixed(1)} MB</span>
                    </div>
                    <h4 className="mt-1.5 font-display text-[17px] font-bold leading-snug text-snow">{c.title}</h4>
                    <p className="mt-1.5 line-clamp-2 text-[13px] italic leading-relaxed text-fog">“{c.hook}”</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.tags.map((t) => (
                        <span key={t} className="rounded bg-ink-750 px-1.5 py-0.5 font-mono text-[10px] text-fog">#{t}</span>
                      ))}
                    </div>

                    <div className="mt-4 border-t border-line pt-3.5">
                      <MiniBars metrics={c.metrics as unknown as Record<string, number>} dim />
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => onEdit(c.id)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ember-500 py-2.5 text-[13px] font-bold text-ink-950 transition-all hover:bg-ember-400 active:scale-[0.97]"
                      >
                        <IcScissors size={15} /> Edit clip
                      </button>
                      <button
                        onClick={() => onExport(c)}
                        title="Export"
                        className="flex items-center justify-center rounded-lg border border-line bg-ink-800 px-3 text-fog transition-all hover:border-ink-600 hover:text-snow"
                      >
                        <IcDownload size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}

      {/* insight strip */}
      <Reveal delay={200}>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-mint-400/25 bg-gradient-to-r from-mint-400/10 via-ink-850 to-ink-850 p-5 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <IcEye size={20} className="mt-0.5 shrink-0 text-mint-300" />
            <div>
              <p className="text-sm font-bold text-snow">Forge insight</p>
              <p className="mt-0.5 max-w-xl text-[13px] leading-relaxed text-fog">
                Your strongest hook lands in <span className="font-mono text-mint-300">{top ? `${top.title}` : "—"}</span> — clips that open on a contrarian claim held
                <span className="font-mono text-volt-300"> 82%</span> of viewers past second three. Post it first.
              </p>
            </div>
          </div>
          {top && (
            <button
              onClick={() => onEdit(top.id)}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-mint-400/40 bg-mint-400/10 px-4 py-2.5 text-[13px] font-bold text-mint-300 transition-all hover:bg-mint-400/20"
            >
              Polish the winner <IcArrowR size={15} />
            </button>
          )}
        </div>
      </Reveal>
    </div>
  );
}
