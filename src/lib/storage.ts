import type { Clip, SourceVideo } from "./data";

const PROJECTS_KEY = "reelforge.projects.v1";
const SETTINGS_KEY = "reelforge.settings.v1";

export interface SavedProject {
  id: string;
  savedAt: number;
  source: SourceVideo;
  clips: Clip[];
}

export interface BrandKit {
  name: string;
  color: string;
  logo?: string;
  outro: boolean;
}

export const DEFAULT_BRAND: BrandKit = {
  name: "ReelForge",
  color: "#FF5A36",
  outro: true,
};

export interface AppSettings {
  openaiKey: string;
  brand: BrandKit;
}

export function loadProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProject(p: SavedProject): SavedProject[] {
  const rest = loadProjects().filter((x) => x.id !== p.id);
  const next = [p, ...rest].slice(0, 12);
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
  } catch {
    /* quota — ignore */
  }
  return next;
}

export function deleteProject(id: string): SavedProject[] {
  const next = loadProjects().filter((x) => x.id !== id);
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearProjects(): void {
  try {
    localStorage.removeItem(PROJECTS_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { openaiKey: "", brand: { ...DEFAULT_BRAND } };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      openaiKey: parsed.openaiKey ?? "",
      brand: { ...DEFAULT_BRAND, ...(parsed.brand ?? {}) },
    };
  } catch {
    return { openaiKey: "", brand: { ...DEFAULT_BRAND } };
  }
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Downsize an uploaded logo to ≤96px PNG dataURL so it fits localStorage. */
export function compressLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Not an image"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 96;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas unavailable"));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}
