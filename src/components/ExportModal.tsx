import { useEffect, useRef, useState } from "react";
import type { Clip, SourceVideo } from "../lib/data";
import { buildSrt, downloadBlob, fmtDur, slugify } from "../lib/utils";
import { Chip, Modal, Seg, Toggle } from "./bits";
import { IcCheck, IcCloud, IcDownload, IcFilm, IcFlame, IcHash, IcType } from "./icons";

interface Props {
  clip: Clip;
  source: SourceVideo;
  onClose: () => void;
  notify: (msg: string, kind?: "ok" | "err" | "info") => void;
}

type Phase = "config" | "render" | "done";

const RENDER_STAGES: [number, string][] = [
  [0, "Reframing to 9:16"],
  [28, "Burning captions"],
  [55, "Removing silences"],
  [78, "Normalizing loudness"],
  [90, "Encoding H.264"],
];

export function ExportModal({ clip, source, onClose, notify }: Props) {
  const [phase, setPhase] = useState<Phase>("config");
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<"MP4" | "MOV">("MP4");
  const [res, setRes] = useState<"1080" | "720" | "4K">("1080");
  const [burnCaps, setBurnCaps] = useState(true);
  const [cleanAudio, setCleanAudio] = useState(true);
  const [emojiBeats, setEmojiBeats] = useState(true);
  const [queued, setQueued] = useState(false);
  const [previewState, setPreviewState] = useState<"idle" | "working" | "done" | "err">("idle");
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slug = slugify(clip.title);
  const dur = clip.end - clip.start;
  const sizeMB = (dur * (res === "4K" ? 1.4 : res === "1080" ? 0.42 : 0.24)).toFixed(1);

  useEffect(() => () => { if (ivRef.current) clearInterval(ivRef.current); }, []);

  const startRender = () => {
    setPhase("render");
    setProgress(0);
    ivRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 1.5 + Math.random() * 4.5;
        if (next >= 100) {
          if (ivRef.current) clearInterval(ivRef.current);
          setTimeout(() => setPhase("done"), 450);
          return 100;
        }
        return next;
      });
    }, 90);
  };

  const stage = [...RENDER_STAGES].reverse().find(([p]) => progress >= p)?.[1] ?? "Warming up";
  const frames = Math.floor((progress / 100) * dur * 30);

  /* ------- real in-browser preview render (first ~6s → WebM) ------- */
  const renderPreview = async () => {
    if (typeof MediaRecorder === "undefined") {
      setPreviewState("err");
      notify("MediaRecorder not available in this browser", "err");
      return;
    }
    setPreviewState("working");
    try {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.playsInline = true;
      v.src = source.url;
      await new Promise<void>((res2, rej) => {
        v.onloadeddata = () => res2();
        v.onerror = () => rej(new Error("load"));
        setTimeout(() => rej(new Error("timeout")), 9000);
      });
      const startAt = Math.min(clip.start, Math.max(0, (v.duration || clip.end) - 1));
      v.currentTime = startAt;
      await new Promise<void>((res2) => {
        v.onseeked = () => res2();
        setTimeout(res2, 1500);
      });

      const canvas = document.createElement("canvas");
      canvas.width = 540;
      canvas.height = 960;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("ctx");
      const stream = canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const stopped = new Promise<Blob>((res2) => { rec.onstop = () => res2(new Blob(chunks, { type: "video/webm" })); });

      const draw = () => {
        const vw = v.videoWidth || 1920;
        const vh = v.videoHeight || 1080;
        const scale = Math.max(canvas.width / vw, canvas.height / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        ctx.fillStyle = "#0a0c10";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(v, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);

        const line = clip.transcript.find((l) => v.currentTime >= l.start - 0.08 && v.currentTime <= l.end);
        if (line) {
          let fs = 40;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `800 ${fs}px "Bricolage Grotesque", sans-serif`;
          const maxW = canvas.width - 60;
          const tw = ctx.measureText(line.text.toUpperCase()).width;
          if (tw > maxW) fs = Math.max(22, Math.floor(fs * (maxW / tw)));
          ctx.font = `800 ${fs}px "Bricolage Grotesque", sans-serif`;
          ctx.lineWidth = Math.max(4, fs / 6);
          ctx.strokeStyle = "rgba(10,12,16,0.92)";
          ctx.lineJoin = "round";
          const y = canvas.height * 0.8;
          ctx.strokeText(line.text.toUpperCase(), canvas.width / 2, y);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(line.text.toUpperCase(), canvas.width / 2, y);
        }

        if (burnCaps) {
          const p = Math.min(1, Math.max(0, (v.currentTime - clip.start) / Math.max(0.1, clip.end - clip.start)));
          ctx.fillStyle = "rgba(10,12,16,0.5)";
          ctx.fillRect(0, 0, canvas.width, 8);
          ctx.fillStyle = "#ff5a36";
          ctx.fillRect(0, 0, canvas.width * p, 8);
        }
      };

      rec.start();
      await v.play();
      const t0 = performance.now();
      await new Promise<void>((res2) => {
        const loop = () => {
          draw();
          if (performance.now() - t0 < 6000 && v.currentTime < clip.end - 0.05 && !v.ended) requestAnimationFrame(loop);
          else res2();
        };
        loop();
      });
      v.pause();
      rec.stop();
      const blob = await stopped;
      if (blob.size < 1000) throw new Error("empty");
      downloadBlob(`${slug}-preview.webm`, blob);
      setPreviewState("done");
      notify("Preview rendered — WebM downloaded", "ok");
    } catch {
      setPreviewState("err");
      notify("In-browser render blocked (source CORS). SRT + JSON still ready.", "err");
    }
  };

  const downloadSrt = () => {
    const lines = clip.transcript.filter((l) => l.end > clip.start && l.start < clip.end);
    downloadBlob(`${slug}.srt`, new Blob([buildSrt(lines, clip.start)], { type: "text/plain" }));
    notify("Captions .srt downloaded", "ok");
  };

  const downloadJson = () => {
    const project = {
      app: "ReelForge",
      version: 2,
      source: { title: source.title, creator: source.creator, category: source.category },
      clip: { ...clip, transcript: clip.transcript.filter((l) => l.end > clip.start && l.start < clip.end) },
      export: { format, resolution: res, burnCaptions: burnCaps, cleanAudio, emojiBeats },
      exportedAt: new Date().toISOString(),
    };
    downloadBlob(`${slug}.reelforge.json`, new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }));
    notify("Project JSON downloaded", "ok");
  };

  return (
    <Modal
      title="Export clip"
      subtitle={`${clip.title} · ${fmtDur(dur)} · virality ${clip.score}`}
      onClose={onClose}
      width={600}
    >
      {phase === "config" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Format</p>
              <Seg<"MP4" | "MOV"> value={format} onChange={setFormat} options={[{ id: "MP4", label: "MP4" }, { id: "MOV", label: "MOV" }]} />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Resolution · 9:16</p>
              <Seg<"1080" | "720" | "4K">
                value={res}
                onChange={setRes}
                options={[{ id: "720", label: "720p" }, { id: "1080", label: "1080p" }, { id: "4K", label: "4K" }]}
              />
            </div>
          </div>

          <div className="space-y-1 rounded-xl border border-line bg-ink-900 p-2">
            <Toggle on={burnCaps} onChange={setBurnCaps} label="Burn captions" hint="Word-level karaoke, baked into pixels" />
            <Toggle on={cleanAudio} onChange={setCleanAudio} label="AI audio cleanup" hint="Remove silences & breaths, level loudness" />
            <Toggle on={emojiBeats} onChange={setEmojiBeats} label="Reaction beats" hint="Timed flame pops on emphasis words" />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line bg-ink-900 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <IcFilm size={18} className="text-mint-400" />
              <div>
                <p className="font-mono text-[13px] font-bold text-snow">{slug}.{format.toLowerCase()}</p>
                <p className="font-mono text-[10px] text-fog-dim">{res === "4K" ? "2160×3840" : res === "1080" ? "1080×1920" : "720×1280"} · ~{sizeMB} MB · {Math.round(dur * 30)} frames</p>
              </div>
            </div>
            <Chip tone="ember">H.264 · 30fps</Chip>
          </div>

          <button
            onClick={startRender}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ember-500 py-3.5 text-sm font-bold text-ink-950 transition-all hover:bg-ember-400 hover:shadow-[0_10px_35px_rgba(255,90,54,0.35)] active:scale-[0.98]"
          >
            <IcFlame size={16} /> Start render
          </button>
        </div>
      )}

      {phase === "render" && (
        <div className="py-6 text-center">
          <p className="font-mono text-5xl font-bold tabular-nums text-snow">{Math.floor(progress)}<span className="text-2xl text-fog-dim">%</span></p>
          <p className="mt-2 font-mono text-xs text-mint-300">{stage}…</p>
          <div className="mx-auto mt-5 h-2 max-w-sm overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #ff5a36, #ffc247, #45d6c8)" }}
            />
          </div>
          <p className="mt-3 font-mono text-[11px] text-fog-dim">
            frame {frames.toLocaleString()} / {Math.round(dur * 30).toLocaleString()} · gpu accelerated
          </p>
          <button
            onClick={() => { if (ivRef.current) clearInterval(ivRef.current); setPhase("config"); setProgress(0); }}
            className="mt-6 rounded-lg border border-line bg-ink-800 px-4 py-2 text-xs font-bold text-fog transition-all hover:border-ink-600 hover:text-snow"
          >
            Cancel render
          </button>
        </div>
      )}

      {phase === "done" && (
        <div>
          <div className="anim-pop flex items-center gap-3 rounded-xl border border-volt-400/30 bg-volt-400/10 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-volt-400/20 text-volt-300"><IcCheck size={18} /></span>
            <div>
              <p className="text-sm font-bold text-snow">Render complete</p>
              <p className="text-[11px] text-fog">{fmtDur(dur)} · {res === "4K" ? "2160×3840" : res === "1080" ? "1080×1920" : "720×1280"} · ~{sizeMB} MB</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {/* cloud mp4 */}
            <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-900 p-3">
              <IcCloud size={18} className="shrink-0 text-ember-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-snow">{slug}.{format.toLowerCase()}</p>
                <p className="text-[10px] text-fog-dim">Full-quality master · cloud render queue</p>
              </div>
              {queued ? (
                <Chip tone="volt"><IcCheck size={10} /> queued · link to inbox</Chip>
              ) : (
                <button
                  onClick={() => { setQueued(true); notify("Master render queued — download link headed to your inbox", "info"); }}
                  className="rounded-lg bg-ember-500 px-3.5 py-2 text-xs font-bold text-ink-950 transition-all hover:bg-ember-400 active:scale-95"
                >
                  Queue render
                </button>
              )}
            </div>

            {/* real webm preview */}
            <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-900 p-3">
              <IcFilm size={18} className="shrink-0 text-mint-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-snow">{slug}-preview.webm</p>
                <p className="text-[10px] text-fog-dim">Real render, right here in your browser · first 6s with captions</p>
              </div>
              {previewState === "working" ? (
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-mint-300">
                  <span className="h-2 w-2 animate-ping rounded-full bg-mint-400" /> recording…
                </span>
              ) : (
                <button
                  onClick={renderPreview}
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                    previewState === "done"
                      ? "border border-volt-400/50 text-volt-300 hover:bg-volt-400/10"
                      : "border border-mint-400/40 bg-mint-400/10 text-mint-300 hover:bg-mint-400/20"
                  }`}
                >
                  {previewState === "done" ? "Re-render" : previewState === "err" ? "Retry" : "Render now"}
                </button>
              )}
            </div>

            {/* srt + json */}
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={downloadSrt} className="flex items-center justify-center gap-2 rounded-xl border border-line bg-ink-900 py-3 text-xs font-bold text-fog transition-all hover:border-ink-600 hover:text-snow active:scale-[0.98]">
                <IcType size={14} className="text-gold-400" /> Captions .srt
              </button>
              <button onClick={downloadJson} className="flex items-center justify-center gap-2 rounded-xl border border-line bg-ink-900 py-3 text-xs font-bold text-fog transition-all hover:border-ink-600 hover:text-snow active:scale-[0.98]">
                <IcHash size={14} className="text-gold-400" /> Project .json
              </button>
            </div>
          </div>

          <button onClick={onClose} className="mt-4 w-full rounded-xl border border-line bg-ink-800 py-2.5 text-xs font-bold text-fog transition-all hover:border-ink-600 hover:text-snow">
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}

export function ExportIcon() {
  return <IcDownload size={14} />;
}
