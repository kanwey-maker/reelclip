import { useRef, useState } from "react";
import { compressLogo, type AppSettings, type BrandKit } from "../lib/storage";
import { Chip, Modal, Seg, Toggle } from "./bits";
import { IcBolt, IcKey, IcPalette, IcTrash, IcUpload } from "./icons";

interface Props {
  settings: AppSettings;
  onSave: (next: AppSettings) => void;
  onClearData: () => void;
  onClose: () => void;
  notify: (msg: string, kind?: "ok" | "err" | "info") => void;
}

const SWATCHES = ["#FF5A36", "#45D6C8", "#C8F24F", "#FFC247", "#FF7AC8", "#7AB8FF", "#EEF1F7"];

export function SettingsModal({ settings, onSave, onClearData, onClose, notify }: Props) {
  const [tab, setTab] = useState<"engine" | "brand">("engine");
  const [keyDraft, setKeyDraft] = useState(settings.openaiKey);
  const [brand, setBrand] = useState<BrandKit>({ ...settings.brand });
  const [hexDraft, setHexDraft] = useState(settings.brand.color);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const engineOn = keyDraft.trim().length > 0;

  const pickLogo = async (file: File) => {
    try {
      const data = await compressLogo(file);
      setBrand((b) => ({ ...b, logo: data }));
      notify("Logo compressed & attached", "ok");
    } catch {
      notify("Couldn't read that image — try a PNG or JPG", "err");
    }
  };

  const applyHex = (raw: string) => {
    setHexDraft(raw);
    const m = raw.trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (m) setBrand((b) => ({ ...b, color: `#${m[1].toUpperCase()}` }));
  };

  const save = () => {
    onSave({ openaiKey: keyDraft.trim(), brand });
    onClose();
    notify(tab === "brand" ? "Brand kit saved — applied across the studio" : engineOn ? "Whisper engine linked" : "Engine reset to local demo", "ok");
  };

  return (
    <Modal title="Studio settings" subtitle="Engine wiring & your brand identity" onClose={onClose} width={540}>
      <Seg<"engine" | "brand">
        value={tab}
        onChange={setTab}
        options={[
          { id: "engine", label: "Engine", icon: <IcKey size={13} /> },
          { id: "brand", label: "Brand kit", icon: <IcPalette size={13} /> },
        ]}
      />

      {tab === "engine" && (
        <div className="anim-fade-up mt-4 space-y-4" style={{ animationDuration: "0.35s" }}>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-900 p-3.5">
            <span className={`h-2.5 w-2.5 rounded-full ${engineOn ? "animate-pulse bg-mint-400" : "bg-fog-dim"}`} />
            <p className="text-[13px] font-semibold text-snow">
              {engineOn ? "Whisper connected — uploads get real transcripts" : "Demo engine — transcripts are synthesized locally"}
            </p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">
              <IcKey size={12} /> OpenAI API key
            </label>
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="sk-…"
              className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3.5 font-mono text-[13px] text-snow outline-none transition-colors placeholder:text-fog-dim focus:border-mint-400/60"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-fog-dim">
              Stored only in this browser and sent only to api.openai.com. Uploads ≤ 25MB are transcribed with{" "}
              <span className="font-mono text-fog">whisper-1</span> before forging.
            </p>
          </div>
        </div>
      )}

      {tab === "brand" && (
        <div className="anim-fade-up mt-4 space-y-4" style={{ animationDuration: "0.35s" }}>
          {/* logo */}
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Logo · watermark</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickLogo(f);
                e.target.value = "";
              }}
            />
            {brand.logo ? (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-900 p-3">
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line bg-ink-950">
                  <img src={brand.logo} alt="logo" className="h-10 w-10 object-contain" />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-snow">Attached · 96×96</p>
                  <p className="text-[10px] text-fog-dim">Burned top-right on exports & previews</p>
                </div>
                <button
                  onClick={() => { setBrand((b) => ({ ...b, logo: undefined })); notify("Logo removed", "info"); }}
                  className="rounded-lg border border-line bg-ink-800 p-2 text-fog transition-all hover:border-ember-500/50 hover:text-ember-300 active:scale-95"
                >
                  <IcTrash size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void pickLogo(f);
                }}
                className={`flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed py-5 transition-all ${
                  dragOver ? "border-ember-500 bg-ember-500/5" : "border-line bg-ink-900 hover:border-ink-600"
                }`}
              >
                <IcUpload size={18} className="text-fog" />
                <span className="text-[12px] font-bold text-snow">Drop a logo or click to browse</span>
                <span className="font-mono text-[10px] text-fog-dim">png · jpg · svg → auto-compressed</span>
              </button>
            )}
          </div>

          {/* name + color */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Brand name</label>
              <input
                value={brand.name}
                onChange={(e) => setBrand((b) => ({ ...b, name: e.target.value.slice(0, 24) }))}
                className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3.5 text-[13px] font-semibold text-snow outline-none transition-colors focus:border-ember-500/60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Accent hex</label>
              <input
                value={hexDraft}
                onChange={(e) => applyHex(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3.5 font-mono text-[13px] text-snow outline-none transition-colors focus:border-ember-500/60"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">Accent color · progress bar & outro</p>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setBrand((b) => ({ ...b, color: c })); setHexDraft(c); }}
                  className={`h-8 w-8 rounded-lg transition-all active:scale-90 ${
                    brand.color.toUpperCase() === c ? "ring-2 ring-snow ring-offset-2 ring-offset-ink-850" : "hover:scale-110"
                  }`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
              <label className="relative ml-1 flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-ink-900 px-2.5 text-[10px] font-bold text-fog transition-all hover:border-ink-600">
                <span className="h-4 w-4 rounded-md border border-line" style={{ background: brand.color }} />
                custom
                <input
                  type="color"
                  value={brand.color}
                  onChange={(e) => { setBrand((b) => ({ ...b, color: e.target.value.toUpperCase() })); setHexDraft(e.target.value.toUpperCase()); }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>

          <div className="space-y-0.5 rounded-lg bg-ink-900 p-1.5">
            <Toggle on={brand.outro} onChange={(v) => setBrand((b) => ({ ...b, outro: v }))} label="End-card outro" hint="Logo + follow prompt in the final 1.5s, burned on export" />
          </div>

          {/* live mini-preview */}
          <div>
            <p className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-fog-dim">
              <span>Live preview</span>
              <Chip tone="ember">what viewers see</Chip>
            </p>
            <div className="relative h-44 overflow-hidden rounded-xl border border-line bg-ink-950">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,148,169,0.12),transparent_60%)]" />
              {brand.logo && (
                <img src={brand.logo} alt="" className="absolute right-2.5 top-2.5 h-7 w-7 rounded-md object-contain drop-shadow" />
              )}
              <div className="absolute inset-x-5 bottom-10 text-center">
                <p className="font-display text-[15px] font-extrabold uppercase leading-tight text-snow drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  this changes <span style={{ color: brand.color }}>everything</span>
                </p>
              </div>
              {brand.outro && (
                <div className="anim-pop absolute inset-x-6 bottom-14 mx-auto hidden w-fit items-center gap-2 rounded-lg bg-ink-950/85 px-3 py-1.5 backdrop-blur">
                  <span className="flex h-5 w-5 items-center justify-center rounded" style={{ background: brand.color }}>
                    {brand.logo ? <img src={brand.logo} alt="" className="h-4 w-4 object-contain" /> : <IcBolt size={11} className="text-ink-950" />}
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-snow">follow {brand.name}</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-ink-700">
                <div className="h-full w-2/3 transition-colors" style={{ background: brand.color }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button
          onClick={save}
          className="flex-1 rounded-xl bg-ember-500 py-2.5 text-[12px] font-bold text-ink-950 transition-all hover:bg-ember-400 hover:shadow-[0_8px_24px_rgba(255,90,54,0.3)] active:scale-[0.98]"
        >
          Save settings
        </button>
        <button
          onClick={() => { onClearData(); onClose(); }}
          className="flex items-center gap-1.5 rounded-xl border border-ember-500/40 bg-ember-500/10 px-4 py-2.5 text-[12px] font-bold text-ember-300 transition-all hover:bg-ember-500/20 active:scale-[0.98]"
        >
          <IcTrash size={13} /> Clear data
        </button>
      </div>
    </Modal>
  );
}
