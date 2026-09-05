import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import confetti from "canvas-confetti";
import { EditorScreen } from "./components/EditorScreen";
import { ExportModal } from "./components/ExportModal";
import { ImportScreen } from "./components/ImportScreen";
import { LiveScreen } from "./components/LiveScreen";
import { ProcessingScreen } from "./components/ProcessingScreen";
import { PublishModal } from "./components/PublishModal";
import { ResultsScreen } from "./components/ResultsScreen";
import { SettingsModal } from "./components/SettingsModal";
import { IcBolt, IcCheck, IcClose, IcFilm, IcKey, IcScissors, IcTrend } from "./components/icons";
import { prepareSource, type Clip, type SourceVideo } from "./lib/data";
import {
  clearProjects, deleteProject, loadProjects, loadSettings, saveProject, saveSettings,
  type AppSettings, type SavedProject,
} from "./lib/storage";
import { transcribeWithWhisper } from "./lib/whisper";

type Stage = "home" | "processing" | "results" | "editor" | "live";
type ToastKind = "ok" | "err" | "info";

interface Toast {
  id: number;
  msg: string;
  kind: ToastKind;
}

export default function App() {
  const [stage, setStage] = useState<Stage>("home");
  const [source, setSource] = useState<SourceVideo | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [projects, setProjects] = useState<SavedProject[]>(() => loadProjects());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [exportClip, setExportClip] = useState<Clip | null>(null);
  const [publishClip, setPublishClip] = useState<Clip | null>(null);
  const toastId = useRef(0);

  const notify = useCallback((msg: string, kind: ToastKind = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  /* ---------- persistence ---------- */
  useEffect(() => {
    if ((stage !== "results" && stage !== "editor" && stage !== "live") || !source || clips.length === 0) return;
    const t = setTimeout(() => {
      const p: SavedProject = {
        id: source.id,
        savedAt: Date.now(),
        source: { ...source, file: undefined },
        clips,
      };
      setProjects(saveProject(p));
    }, 600);
    return () => clearTimeout(t);
  }, [stage, source, clips]);

  /* ---------- flow ---------- */
  const handleForge = async (raw: SourceVideo) => {
    let s = prepareSource(raw);
    if (s.file && settings.openaiKey) {
      notify("Transcribing with Whisper — real engine engaged", "info");
      try {
        const lines = await transcribeWithWhisper(s.file, settings.openaiKey);
        s = { ...s, transcript: lines, realTranscript: true, words: lines.reduce((a, l) => a + l.text.split(" ").length, 0) };
        notify(`Whisper returned ${lines.length} segments`, "ok");
      } catch (err) {
        notify(err instanceof Error && err.message.includes("25MB") ? "File over 25MB — using local transcript engine" : "Whisper unavailable — using local transcript engine", "err");
      }
    }
    setSource(s);
    setClips([]);
    setActiveId(null);
    setStage("processing");
    window.scrollTo({ top: 0 });
  };

  const handleForgeDone = (forged: Clip[]) => {
    setClips(forged);
    setActiveId(forged[0]?.id ?? null);
    setStage("results");
    window.scrollTo({ top: 0 });
    notify(`${forged.length} clips forged — top score ${Math.max(...forged.map((c) => c.score))}`, "ok");
  };

  const updateClip = useCallback((id: string, patch: Partial<Clip>) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const handlePublishDone = (ids: string[]) => {
    if (!publishClip) return;
    updateClip(publishClip.id, {
      published: Array.from(new Set([...(publishClip.published ?? []), ...ids])),
      publishedAt: publishClip.publishedAt ?? Date.now(),
      scheduled: undefined,
    });
  };

  const handleScheduled = (ids: string[], at: number) => {
    if (!publishClip) return;
    updateClip(publishClip.id, { scheduled: { platforms: ids, at } });
  };

  /* ---------- scheduler: auto-fire posts whose best slot arrived ---------- */
  const clipsRef = useRef(clips);
  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      clipsRef.current.forEach((c) => {
        if (c.scheduled && c.scheduled.at <= now) {
          const platforms = c.scheduled.platforms;
          updateClip(c.id, {
            scheduled: undefined,
            published: Array.from(new Set([...(c.published ?? []), ...platforms])),
            publishedAt: now,
          });
          notify(`“${c.title}” just went live on ${platforms.length} platform${platforms.length > 1 ? "s" : ""}`, "ok");
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ["#FFC247", "#FF5A36", "#45D6C8", "#C8F24F"] });
        }
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [updateClip, notify]);

  const handleResume = (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    setSource(p.source);
    setClips(p.clips);
    setActiveId(p.clips[0]?.id ?? null);
    setStage("results");
    window.scrollTo({ top: 0 });
    notify(`Resumed “${p.source.title}”`, "info");
  };

  const activeClip = clips.find((c) => c.id === activeId) ?? null;
  const stageIdx = stage === "home" ? 0 : stage === "processing" ? 1 : stage === "live" ? 3 : 2;
  const engineOn = settings.openaiKey.length > 0;
  const liveEnabled = clips.some((c) => (c.published && c.published.length > 0) || c.scheduled);

  const steps: { label: string; icon: (p: { size?: number }) => ReactNode; go: () => void; enabled: boolean; pulse?: boolean }[] = [
    { label: "Import", icon: IcFilm, go: () => setStage("home"), enabled: true },
    { label: "Forge", icon: IcBolt, go: () => stage !== "processing" && stageIdx === 2 && setStage("processing"), enabled: false },
    { label: "Studio", icon: IcScissors, go: () => { if (clips.length > 0) setStage("results"); }, enabled: clips.length > 0 },
    { label: "Live", icon: IcTrend, go: () => { if (liveEnabled) setStage("live"); }, enabled: liveEnabled, pulse: liveEnabled },
  ];

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-ink-950" />
        <div
          className="absolute -left-40 top-[-15%] h-[560px] w-[560px] rounded-full opacity-[0.13] blur-[120px]"
          style={{ background: "radial-gradient(circle, #ff5a36 0%, transparent 65%)", animation: "driftA 16s ease-in-out infinite" }}
        />
        <div
          className="absolute right-[-12%] top-[30%] h-[520px] w-[520px] rounded-full opacity-[0.1] blur-[120px]"
          style={{ background: "radial-gradient(circle, #45d6c8 0%, transparent 65%)", animation: "driftB 19s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[-20%] left-[30%] h-[480px] w-[480px] rounded-full opacity-[0.07] blur-[110px]"
          style={{ background: "radial-gradient(circle, #ffc247 0%, transparent 65%)", animation: "driftA 22s ease-in-out infinite reverse" }}
        />
        <div className="dotgrid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_75%)]" />
        <div className="noise absolute inset-0" />
      </div>

      {/* header */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-ink-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-5">
          <button onClick={() => setStage("home")} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500 text-ink-950 shadow-[0_4px_18px_rgba(255,90,54,0.45)]">
              <IcBolt size={17} />
            </span>
            <span className="font-display text-[17px] font-bold tracking-tight text-snow">
              ReelForge
            </span>
            <span className="hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-fog sm:inline">
              beta
            </span>
          </button>

          {/* stepper */}
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {steps.map((s, i) => {
              const done = i < stageIdx;
              const current = i === stageIdx;
              const Icon = s.icon;
              return (
                <button
                  key={s.label}
                  onClick={s.go}
                  disabled={!s.enabled && !done && !current}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                    current ? "bg-ink-800 text-snow" : done ? "text-mint-400 hover:bg-ink-850" : "text-fog-dim hover:text-fog"
                  }`}
                >
                  <Icon size={13} />
                  {s.label}
                  {done && <IcCheck size={11} />}
                  {s.pulse && !current && (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember-400" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <button
              onClick={() => setShowSettings(true)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-bold transition-all active:scale-95 ${
                engineOn
                  ? "border-mint-400/40 bg-mint-400/10 text-mint-300 hover:bg-mint-400/20"
                  : "border-line bg-ink-850 text-fog hover:border-ink-600 hover:text-snow"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${engineOn ? "animate-pulse bg-mint-400" : "bg-fog-dim"}`} />
              {engineOn ? "whisper linked" : "engine: demo"}
              <IcKey size={11} />
            </button>
          </div>
        </div>
      </header>

      {/* stage */}
      <main className="pt-8">
        {stage === "home" && (
          <ImportScreen
            onForge={(s) => void handleForge(s)}
            projects={projects}
            onResume={handleResume}
            onDeleteProject={(id) => setProjects(deleteProject(id))}
            notify={notify}
          />
        )}
        {stage === "processing" && source && (
          <ProcessingScreen source={source} onDone={handleForgeDone} onCancel={() => setStage("home")} />
        )}
        {stage === "results" && source && (
          <ResultsScreen
            source={source}
            clips={clips}
            onEdit={(id) => { setActiveId(id); setStage("editor"); window.scrollTo({ top: 0 }); }}
            onExport={(c) => setExportClip(c)}
            onPublish={(c) => setPublishClip(c)}
            onBack={() => setStage("home")}
          />
        )}
        {stage === "editor" && source && activeClip && (
          <EditorScreen
            clip={activeClip}
            source={source}
            brand={settings.brand}
            onBack={() => setStage("results")}
            onUpdate={updateClip}
            onExport={() => setExportClip(activeClip)}
            onPublish={() => setPublishClip(activeClip)}
            notify={notify}
          />
        )}
        {stage === "live" && (
          <LiveScreen
            clips={clips}
            source={source}
            onBack={() => setStage(clips.length > 0 ? "results" : "home")}
            onEdit={(id) => { setActiveId(id); setStage("editor"); window.scrollTo({ top: 0 }); }}
          />
        )}
      </main>

      {/* footer */}
      <footer className="mt-10 border-t border-line/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-dim">
            ReelForge · forge-v2 · runs entirely in your browser
          </p>
          <p className="font-mono text-[10px] text-fog-dim">
            exports: webm · srt · json — projects persist locally
          </p>
        </div>
      </footer>

      {/* modals */}
      {exportClip && source && (
        <ExportModal
          clip={clips.find((c) => c.id === exportClip.id) ?? exportClip}
          source={source}
          brand={settings.brand}
          onClose={() => setExportClip(null)}
          notify={notify}
        />
      )}
      {publishClip && source && (
        <PublishModal
          clip={publishClip}
          source={source}
          onClose={() => setPublishClip(null)}
          onDone={handlePublishDone}
          onScheduled={handleScheduled}
          notify={notify}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={(next) => {
            setSettings(next);
            saveSettings(next);
          }}
          onClearData={() => {
            setProjects([]);
            clearProjects();
            notify("Studio data cleared", "info");
          }}
          onClose={() => setShowSettings(false)}
          notify={notify}
        />
      )}

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[320px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`anim-toast pointer-events-auto flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur ${
              t.kind === "ok"
                ? "border-volt-400/40 bg-ink-850/95 text-volt-300"
                : t.kind === "err"
                  ? "border-ember-500/40 bg-ink-850/95 text-ember-300"
                  : "border-line bg-ink-850/95 text-fog"
            }`}
          >
            {t.kind === "ok" ? <IcCheck size={15} /> : t.kind === "err" ? <IcClose size={15} /> : <IcBolt size={15} className="text-gold-400" />}
            <p className="text-[12px] font-semibold leading-snug text-snow">{t.msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
