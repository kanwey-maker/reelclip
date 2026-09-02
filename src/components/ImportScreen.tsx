import { useRef, useState, type DragEvent } from "react";
import { SAMPLE_SOURCES, type SourceVideo } from "../lib/data";
import { fmtLong } from "../lib/utils";
import { Reveal } from "./bits";
import { IcArrowR, IcBolt, IcClock, IcFilm, IcLink, IcSparkles, IcTrend, IcTikTok, IcUpload, IcYouTube, IcInstagram, IcXSocial } from "./icons";

type Tab = "link" | "upload" | "library";

const MARQUEE = ["Hook detection", "Virality scoring", "Auto-captions", "9:16 smart reframe", "Silence removal", "Trend matching", "Emoji beats", "One-tap publish"];

export function ImportScreen({ onPick }: { onPick: (s: SourceVideo) => void }) {
  const [tab, setTab] = useState<Tab>("library");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submitUrl = () => {
    if (!url.trim()) {
      setErr(true);
      setTimeout(() => setErr(false), 700);
      return;
    }
    const pick = SAMPLE_SOURCES[url.length % SAMPLE_SOURCES.length];
    onPick({ ...pick, id: `url-${Date.now()}` });
  };

  const handleFile = (f: File | undefined | null) => {
    if (!f) return;
    const name = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    onPick({
      id: `file-${Date.now()}`,
      title: name.charAt(0).toUpperCase() + name.slice(1),
      category: "Podcast",
      creator: "Local upload",
      duration: 0,
      url: URL.createObjectURL(f),
      thumb: "",
      words: 4200 + (f.size % 5000),
      custom: true,
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 lg:pt-16">
      <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr]">
        {/* -------- left: pitch -------- */}
        <div>
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-850 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mint-300">
              <IcBolt size={12} className="text-ember-400" /> AI clip studio
            </div>
          </Reveal>
          <h1 className="mt-5 font-display text-[42px] font-extrabold leading-[1.02] tracking-tight text-snow sm:text-6xl">
            <span className="line-mask"><span style={{ animationDelay: "80ms" }}>Long video in.</span></span>
            <span className="line-mask"><span style={{ animationDelay: "180ms" }} className="text-ember-500">Six viral shorts</span></span>
            <span className="line-mask"><span style={{ animationDelay: "280ms" }}>out. <span className="text-fog-dim">In a minute.</span></span></span>
          </h1>
          <Reveal delay={320}>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fog">
              ReelForge watches your whole video, finds the moments people actually replay, reframes them vertical, captions them word-by-word — and hands you a studio to polish, export and publish.
            </p>
          </Reveal>

          <Reveal delay={400}>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              {[
                { icon: <IcClock size={15} />, big: "38s", small: "to first clip" },
                { icon: <IcTrend size={15} />, big: "3.2×", small: "avg reach lift" },
                { icon: <IcSparkles size={15} />, big: "2.4M", small: "clips forged" },
              ].map((s) => (
                <div key={s.small} className="rounded-xl border border-line bg-ink-850/80 p-3.5 transition-colors hover:border-ink-600">
                  <div className="text-mint-400">{s.icon}</div>
                  <div className="mt-1.5 font-mono text-xl font-bold text-snow">{s.big}</div>
                  <div className="text-[11px] text-fog">{s.small}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={480}>
            <div className="mt-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-fog-dim">
              <span>Publishes to</span>
              <span className="flex items-center gap-2.5 text-fog">
                <IcTikTok size={16} /> <IcYouTube size={16} /> <IcInstagram size={16} /> <IcXSocial size={14} />
              </span>
            </div>
          </Reveal>
        </div>

        {/* -------- right: intake card -------- */}
        <Reveal delay={200}>
          <div className="overflow-hidden rounded-2xl border border-line bg-ink-850 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <div className="grid grid-cols-3 border-b border-line">
              {([
                ["library", "Library", <IcFilm key="i" size={14} />],
                ["link", "Paste link", <IcLink key="i" size={14} />],
                ["upload", "Upload", <IcUpload key="i" size={14} />],
              ] as [Tab, string, React.ReactNode][]).map(([id, label, icon]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center justify-center gap-2 py-3.5 text-[13px] font-semibold transition-colors ${
                    tab === id ? "bg-ink-800 text-snow shadow-[inset_0_-2px_0_#ff5a36]" : "text-fog hover:text-snow"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === "library" && (
                <div className="space-y-3">
                  <p className="text-xs text-fog">Grab a sample long-form source and watch the forge work.</p>
                  {SAMPLE_SOURCES.map((s, i) => (
                    <Reveal key={s.id} delay={i * 70}>
                      <button
                        onClick={() => onPick(s)}
                        className="group flex w-full items-center gap-3.5 rounded-xl border border-line bg-ink-800 p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-ember-500/60 hover:bg-ink-750 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                      >
                        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-ink-700">
                          <div className="absolute inset-0 bg-gradient-to-br from-ink-600 to-ink-800" />
                          {s.thumb && (
                            <img src={s.thumb} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          )}
                          <span className="absolute bottom-1 right-1 rounded bg-ink-950/85 px-1 py-0.5 font-mono text-[9px] font-bold text-snow">
                            {fmtLong(s.duration)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-mint-400/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-mint-300">{s.category}</span>
                            <span className="text-[10px] text-fog-dim">{s.creator}</span>
                          </div>
                          <p className="mt-1 truncate text-[13px] font-semibold text-snow">{s.title}</p>
                        </div>
                        <IcArrowR size={16} className="shrink-0 text-fog-dim transition-all group-hover:translate-x-1 group-hover:text-ember-400" />
                      </button>
                    </Reveal>
                  ))}
                </div>
              )}

              {tab === "link" && (
                <div className={err ? "anim-shake" : ""}>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-fog">Video URL</label>
                  <div className={`mt-2 flex items-center gap-2 rounded-xl border bg-ink-900 px-3 py-3 transition-colors ${err ? "border-ember-500" : "border-line focus-within:border-mint-400/60"}`}>
                    <IcLink size={16} className="shrink-0 text-fog-dim" />
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitUrl()}
                      placeholder="https://youtube.com/watch?v=…"
                      className="w-full bg-transparent font-mono text-[13px] text-snow outline-none placeholder:text-fog-dim"
                    />
                  </div>
                  {err && <p className="mt-2 text-[11px] font-medium text-ember-400">Drop a link first — anything works in this demo.</p>}
                  <p className="mt-2 text-[11px] leading-relaxed text-fog-dim">YouTube, Twitch VODs, Drive, Rumble… the forge fetches, transcribes and scores it.</p>
                  <button
                    onClick={submitUrl}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ember-500 py-3 text-sm font-bold text-ink-950 transition-all hover:bg-ember-400 hover:shadow-[0_8px_30px_rgba(255,90,54,0.35)] active:scale-[0.98]"
                  >
                    <IcBolt size={16} /> Forge clips
                  </button>
                </div>
              )}

              {tab === "upload" && (
                <div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all ${
                      drag ? "border-mint-400 bg-mint-400/5 scale-[1.01]" : "border-line bg-ink-900 hover:border-ink-600"
                    }`}
                  >
                    <div className={`rounded-xl border p-3 ${drag ? "border-mint-400/50 text-mint-300" : "border-line text-fog"}`}>
                      <IcUpload size={22} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-snow">Drop your video here</p>
                    <p className="mt-1 text-[11px] text-fog-dim">mp4 · mov · webm — up to 4 GB · never leaves your browser in this demo</p>
                  </div>
                  <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                  <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fog-dim">
                    <IcSparkles size={12} className="text-gold-400" /> Pro tip: raw podcast VODs and gaming streams forge the hottest clips.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* -------- capability marquee -------- */}
      <Reveal delay={500}>
        <div className="relative mt-14 overflow-hidden border-y border-line py-3 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="flex items-center gap-8 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-fog-dim">
                {m} <span className="text-ember-500">◆</span>
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
