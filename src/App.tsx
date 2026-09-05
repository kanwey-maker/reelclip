import { useCallback, useRef, useState } from "react";
import { EditorScreen } from "./components/EditorScreen";
import { ExportModal } from "./components/ExportModal";
import { ImportScreen } from "./components/ImportScreen";
import { ProcessingScreen } from "./components/ProcessingScreen";
import { PublishModal } from "./components/PublishModal";
import { ResultsScreen } from "./components/ResultsScreen";
import { IcBolt, IcCheck } from "./components/icons";
import type { Clip, SourceVideo } from "./lib/data";

type Stage = "import" | "processing" | "results" | "editor";
type ToastKind = "ok" | "err" | "info";
interface Toast { id: number; msg: string; kind: ToastKind }

const STEPS = ["Source", "Forge", "Clips", "Studio"];
const STAGE_IDX: Record<Stage, number> = { import: 0, processing: 1, results: 2, editor: 3 };

export default function App() {
  const [stage, setStage] = useState<Stage>("import");
  const [source, setSource] = useState<SourceVideo | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [published, setPublished] = useState<Record<string, string[]>>({});
  const [exportId, setExportId] = useState<string | null>(null);
  const [publishId, setPublishId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reforgeN = useRef(0);

  const notify = useCallback((msg: string, kind: ToastKind = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const pickSource = (s: SourceVideo) => {
    setSource(s);
    setClips([]);
    setPublished({});
    setActiveId(null);
    setStage("processing");
  };

  const onForged = (c: Clip[]) => {
    setClips(c);
    setStage("results");
    const top = Math.max(...c.map((x) => x.score));
    notify(`${c.length} clips forged · top virality ${top}`);
  };

  const reforge = () => {
    if (!source) return;
    reforgeN.current += 1;
    setSource({ ...source, id: `${source.id.split("-r")[0]}-r${reforgeN.current}` });
    setStage("processing");
  };

  const reset = () => {
    setStage("import");
    setSource(null);
    setClips([]);
    setActiveId(null);
    setPublished({});
    setExportId(null);
    setPublishId(null);
  };

  const updateClip = (id: string, patch: Partial<Clip>) => {
    setClips((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const onPublishDone = (id: string, platformIds: string[]) => {
    setPublished((p) => ({ ...p, [id]: [...new Set([...(p[id] ?? []), ...platformIds])] }));
  };

  const exportClip = clips.find((c) => c.id === exportId) ?? null;
  const publishClip = clips.find((c) => c.id === publishId) ?? null;
  const stepIdx = STAGE_IDX[stage];

  return (
    <div className="min-h-screen font-body text-snow">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="dotgrid absolute inset-0 opacity-50" />
        <div className="absolute -left-44 -top-44 h-[580px] w-[580px] rounded-full blur-[150px]" style={{ background: "rgba(255,90,54,0.09)", animation: "driftA 19s ease-in-out infinite" }} />
        <div className="absolute -bottom-52 -right-36 h-[620px] w-[620px] rounded-full blur-[160px]" style={{ background: "rgba(69,214,200,0.07)", animation: "driftB 23s ease-in-out infinite" }} />
        <div className="absolute left-1/3 top-1/2 h-[380px] w-[380px] rounded-full blur-[130px]" style={{ background: "rgba(200,242,79,0.04)", animation: "driftA 26s ease-in-out infinite reverse" }} />
        <div className="noise absolute inset-0" />
      </div>

      {/* header */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-5">
          <button onClick={reset} className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500 text-ink-950 shadow-[0_4px_18px_rgba(255,90,54,0.4)]">
              <IcBolt size={17} />
            </span>
            <span className="font-display text-[17px] font-extrabold tracking-tight">
              Reel<span className="text-ember-500">Forge</span>
            </span>
            <span className="hidden rounded border border-mint-400/40 bg-mint-400/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-mint-300 sm:block">
              beta
            </span>
          </button>

          {/* stepper */}
          <nav className="mx-auto hidden items-center gap-1 md:flex">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <span
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-300 ${
                    i === stepIdx
                      ? "bg-ember-500/15 text-ember-300 shadow-[inset_0_0_0_1px_rgba(255,90,54,0.45)]"
                      : i < stepIdx
                        ? "text-volt-300"
                        : "text-fog-dim"
                  }`}
                >
                  {i < stepIdx ? <IcCheck size={11} /> : <span className={`font-mono ${i === stepIdx ? "" : "opacity-60"}`}>{i + 1}</span>}
                  {s}
                </span>
                {i < STEPS.length - 1 && <span className={`h-px w-5 ${i < stepIdx ? "bg-volt-400/50" : "bg-line"}`} />}
              </div>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {stage !== "import" && (
              <button
                onClick={reset}
                className="rounded-lg border border-line bg-ink-850 px-3 py-1.5 text-[11px] font-bold text-fog transition-all hover:border-ink-600 hover:text-snow"
              >
                + New project
              </button>
            )}
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line font-display text-[11px] font-extrabold text-mint-300"
              style={{ background: "linear-gradient(135deg, rgba(255,90,54,0.25), rgba(69,214,200,0.2))" }}
              title="Demo session"
            >
              RF
            </span>
          </div>
        </div>
      </header>

      {/* main */}
      <main className="relative z-10">
        {stage === "import" && <ImportScreen onPick={pickSource} />}
        {stage === "processing" && source && (
          <ProcessingScreen source={source} onDone={onForged} onCancel={() => setStage("import")} />
        )}
        {stage === "results" && source && (
          <ResultsScreen
            source={source}
            clips={clips}
            published={published}
            onEdit={(id) => { setActiveId(id); setStage("editor"); }}
            onExport={(c) => setExportId(c.id)}
            onNewProject={reset}
            onReforge={reforge}
          />
        )}
        {stage === "editor" && source && activeId && (
          <EditorScreen
            source={source}
            clips={clips}
            activeId={activeId}
            published={published}
            onSelect={setActiveId}
            onUpdate={updateClip}
            onBack={() => setStage("results")}
            onExport={(c) => setExportId(c.id)}
            onPublish={(c) => setPublishId(c.id)}
            notify={notify}
          />
        )}
      </main>

      <footer className="relative z-10 border-t border-line py-5">
        <p className="mx-auto max-w-[1440px] px-5 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-dim">
          ReelForge · clips are forged locally in your browser · sample footage © Blender Foundation
        </p>
      </footer>

      {/* modals */}
      {exportClip && source && (
        <ExportModal clip={exportClip} source={source} onClose={() => setExportId(null)} notify={notify} />
      )}
      {publishClip && source && (
        <PublishModal
          clip={publishClip}
          source={source}
          onClose={() => setPublishId(null)}
          onDone={(ids) => onPublishDone(publishClip.id, ids)}
          notify={notify}
        />
      )}

      {/* toasts */}
      <div className="fixed bottom-5 right-5 z-[70] flex w-[320px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`anim-toast flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.5)] backdrop-blur-md ${
              t.kind === "ok" ? "border-volt-400/35 bg-ink-850/95" : t.kind === "err" ? "border-ember-500/40 bg-ink-850/95" : "border-line bg-ink-850/95"
            }`}
          >
            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${t.kind === "ok" ? "bg-volt-400" : t.kind === "err" ? "bg-ember-500" : "bg-mint-400"}`} />
            <p className="text-[12px] font-semibold leading-snug text-snow">{t.msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
