import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PLATFORMS, PLATFORM_COLORS, metricsFor, type Clip, type SourceVideo } from "../lib/data";
import { fmtCountdown, fmtNum, scoreColor } from "../lib/utils";
import { Chip, ScoreRing } from "./bits";
import { IcArrowR, IcCalendar, IcChevronL, IcEye, IcFlame, IcStar, IcTrend, PLATFORM_ICONS } from "./icons";

interface Props {
  clips: Clip[];
  source: SourceVideo | null;
  onBack: () => void;
  onEdit: (id: string) => void;
}

const TOOLTIP_STYLE = {
  background: "#12151c",
  border: "1px solid #252b39",
  borderRadius: 10,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  color: "#eef1f7",
} as const;

const TICK = { fill: "#5d6579", fontSize: 10, fontFamily: "JetBrains Mono, monospace" } as const;

export function LiveScreen({ clips, source, onBack, onEdit }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(iv);
  }, []);

  const live = useMemo(() => clips.filter((c) => c.published && c.published.length > 0), [clips]);
  const queued = useMemo(() => clips.filter((c) => c.scheduled).sort((a, b) => (a.scheduled!.at - b.scheduled!.at)), [clips]);

  const metrics = useMemo(() => live.map((clip) => ({ clip, m: metricsFor(clip, now) })), [live, now]);

  const platformIds = useMemo(
    () => Array.from(new Set(live.flatMap((c) => c.published ?? []))),
    [live]
  );

  const totals = useMemo(() => {
    const views = metrics.reduce((a, x) => a + x.m.views, 0);
    const likes = metrics.reduce((a, x) => a + x.m.likes, 0);
    const shares = metrics.reduce((a, x) => a + x.m.shares, 0);
    const watch = views > 0 ? metrics.reduce((a, x) => a + x.m.watchPct * x.m.views, 0) / views : 0;
    const best = [...metrics].sort((a, b) => b.m.views - a.m.views)[0] ?? null;
    return { views, likes, shares, watch: Math.round(watch), best };
  }, [metrics]);

  const chartRows = useMemo(() => {
    const rows: Record<string, number | string>[] = [];
    for (let i = 0; i < 24; i++) {
      const row: Record<string, number | string> = { h: i === 23 ? "now" : `-${23 - i}h` };
      platformIds.forEach((p) => (row[p] = 0));
      rows.push(row);
    }
    metrics.forEach(({ m }) => {
      Object.entries(m.hourlyByPlatform).forEach(([p, arr]) => {
        arr.forEach((v, i) => {
          rows[i][p] = (rows[i][p] as number) + v;
        });
      });
    });
    return rows;
  }, [metrics, platformIds]);

  const retentionRows = useMemo(() => {
    const totalViews = metrics.reduce((a, x) => a + x.m.views, 0) || 1;
    return Array.from({ length: 26 }, (_, i) => ({
      p: `${Math.round((i / 25) * 100)}%`,
      v: Math.round(metrics.reduce((a, x) => a + x.m.retention[i] * x.m.views, 0) / totalViews),
    }));
  }, [metrics]);

  const platformName = (id: string) => PLATFORMS.find((p) => p.id === id)?.name ?? id;

  if (live.length === 0 && queued.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 pb-16 pt-10 text-center">
        <div className="anim-pop relative mx-auto flex h-28 w-28 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-dashed border-line anim-spin-slow" />
          <span className="absolute inset-3 rounded-full border border-line" />
          <IcTrend size={34} className="text-fog-dim" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-snow">Nothing is live yet</h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-fog">
          Publish or schedule a clip from the studio and this board starts tracking views, watch time and platform split in real time.
        </p>
        <button
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ember-500 px-5 py-2.5 text-[13px] font-bold text-ink-950 transition-all hover:bg-ember-400 hover:shadow-[0_10px_30px_rgba(255,90,54,0.35)] active:scale-95"
        >
          Back to your clips <IcArrowR size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16">
      {/* header */}
      <div className="anim-fade-up flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-850 px-3 py-2 text-xs font-semibold text-fog transition-all hover:border-ink-600 hover:text-snow">
          <IcChevronL size={14} /> Studio
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-snow">Live performance</h1>
          <p className="truncate font-mono text-[11px] text-fog-dim">{source?.title ?? "project"}</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-lg border border-ember-500/40 bg-ember-500/10 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ember-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember-400" /> live · refreshes 3s
        </span>
      </div>

      {/* stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: <IcEye size={16} />, label: "Total views", value: fmtNum(totals.views), tone: "text-ember-300", ring: "border-ember-500/25" },
          { icon: <IcTrend size={16} />, label: "Avg watch time", value: `${totals.watch}%`, tone: "text-mint-300", ring: "border-mint-400/25" },
          { icon: <IcStar size={16} />, label: "Likes", value: fmtNum(totals.likes), tone: "text-gold-300", ring: "border-gold-400/25" },
          { icon: <IcFlame size={16} />, label: "Shares", value: fmtNum(totals.shares), tone: "text-volt-300", ring: "border-volt-400/25" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`anim-fade-up rounded-xl border ${s.ring} bg-ink-850 p-4 transition-transform duration-200 hover:-translate-y-0.5`}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-center gap-2 text-fog">
              {s.icon}
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]">{s.label}</span>
            </div>
            <p className={`mt-2 font-mono text-[26px] font-bold leading-none tabular-nums ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* charts */}
      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        <div className="anim-fade-up rounded-xl border border-line bg-ink-850 p-4 lg:col-span-3" style={{ animationDelay: "0.15s" }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Views · last 24h by platform</p>
            <div className="flex items-center gap-2.5">
              {platformIds.map((p) => (
                <span key={p} className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase text-fog">
                  <span className="h-2 w-2 rounded-sm" style={{ background: PLATFORM_COLORS[p] }} />
                  {platformName(p)}
                </span>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRows} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                <defs>
                  {platformIds.map((p) => (
                    <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PLATFORM_COLORS[p]} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={PLATFORM_COLORS[p]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="#1b202b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="h" tick={TICK} axisLine={false} tickLine={false} interval={5} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtNum(v)} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number | string) => fmtNum(Number(v))} />
                {platformIds.map((p) => (
                  <Area
                    key={p}
                    type="monotone"
                    dataKey={p}
                    stackId="views"
                    stroke={PLATFORM_COLORS[p]}
                    strokeWidth={2}
                    fill={`url(#grad-${p})`}
                    name={platformName(p)}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="anim-fade-up rounded-xl border border-line bg-ink-850 p-4 lg:col-span-2" style={{ animationDelay: "0.22s" }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Retention curve</p>
            <Chip tone="mint">{totals.watch}% avg</Chip>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionRows} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#1b202b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="p" tick={TICK} axisLine={false} tickLine={false} interval={5} />
                <YAxis domain={[0, 100]} tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number | string) => `${v}% still watching`} />
                <ReferenceLine y={50} stroke="#2b3242" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="v" stroke="#45D6C8" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#45D6C8" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* leaderboard + queue */}
      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        <div className="anim-fade-up rounded-xl border border-line bg-ink-850 lg:col-span-3" style={{ animationDelay: "0.28s" }}>
          <p className="border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Clip leaderboard</p>
          <div className="divide-y divide-line/70">
            {[...metrics]
              .sort((a, b) => b.m.views - a.m.views)
              .map(({ clip, m }, rank) => (
                <button
                  key={clip.id}
                  onClick={() => onEdit(clip.id)}
                  className="group flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-ink-800/60"
                >
                  <span className="w-5 font-mono text-[11px] font-bold text-fog-dim">#{rank + 1}</span>
                  <ScoreRing score={clip.score} size={38} stroke={3} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-snow group-hover:text-ember-300">{clip.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {(clip.published ?? []).map((p) => {
                        const Icon = PLATFORM_ICONS[p];
                        return Icon ? <Icon key={p} size={12} className="text-fog-dim" /> : null;
                      })}
                      <span className="ml-1 font-mono text-[9px] uppercase text-fog-dim">{(clip.published ?? []).length} platforms</span>
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-mono text-[14px] font-bold tabular-nums text-snow">{fmtNum(m.views)}</p>
                    <p className="font-mono text-[9px] uppercase text-fog-dim">views</p>
                  </div>
                  <div className="hidden w-24 md:block">
                    <div className="h-1 overflow-hidden rounded-full bg-ink-600">
                      <div className="h-full rounded-full" style={{ width: `${m.watchPct}%`, background: scoreColor(m.watchPct) }} />
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-fog-dim">{m.watchPct}% watched</p>
                  </div>
                  <Chip tone={m.vsForecast >= 0 ? "volt" : "ember"}>
                    {m.vsForecast >= 0 ? "▲" : "▼"} {Math.abs(m.vsForecast)}% vs forecast
                  </Chip>
                  <IcArrowR size={14} className="text-fog-dim transition-all group-hover:translate-x-0.5 group-hover:text-ember-300" />
                </button>
              ))}
          </div>
        </div>

        <div className="anim-fade-up rounded-xl border border-line bg-ink-850 lg:col-span-2" style={{ animationDelay: "0.34s" }}>
          <p className="border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">
            Scheduled queue · {queued.length}
          </p>
          <div className="space-y-3 p-4">
            {queued.length === 0 && (
              <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
                <IcCalendar size={20} className="mx-auto text-fog-dim" />
                <p className="mt-2 text-[12px] text-fog">Queue is empty.</p>
                <p className="text-[11px] text-fog-dim">Use “At best time” in Publish to schedule here.</p>
              </div>
            )}
            {queued.map((c) => (
              <div key={c.id} className="rounded-xl border border-gold-400/25 bg-gold-400/5 p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400/15 text-gold-300">
                    <IcCalendar size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-snow">{c.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {(c.scheduled?.platforms ?? []).map((p) => {
                        const Icon = PLATFORM_ICONS[p];
                        return Icon ? <Icon key={p} size={12} className="text-fog-dim" /> : null;
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[15px] font-bold tabular-nums text-gold-300">
                      {fmtCountdown(((c.scheduled?.at ?? now) - now) / 1000)}
                    </p>
                    <p className="font-mono text-[9px] uppercase text-fog-dim">until live</p>
                  </div>
                </div>
                <p className="mt-2 font-mono text-[10px] leading-relaxed text-fog-dim">
                  auto-publishes at the AI slot — you'll get a toast the second it lands
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
