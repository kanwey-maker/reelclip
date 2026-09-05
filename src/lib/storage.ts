import type { Clip, SourceVideo } from "./data";

const PROJECTS_KEY = "reelforge.projects.v1";
const SETTINGS_KEY = "reelforge.settings.v1";

export interface SavedProject {
  id: string;
  savedAt: number;
  source: SourceVideo;
  clips: Clip[];
}

export interface AppSettings {
  openaiKey: string;
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
    return raw ? { openaiKey: "", ...JSON.parse(raw) } : { openaiKey: "" };
  } catch {
    return { openaiKey: "" };
  }
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
