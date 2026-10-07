export interface Progress {
  episodeId: string;
  partIndex: number;
  partTime: number;
  globalTime: number;
  time: number;
  duration: number;
  at: number;
}

const key = (episodeId: string) => `cinema:progress:${episodeId}`;
export const PROGRESS_EVENT = 'cinema:progress';

function normalizeProgress(raw: unknown, episodeId: string): Progress | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Partial<Progress> & { time?: number; globalTime?: number; partTime?: number; partIndex?: number };
  const partIndex = Number.isFinite(candidate.partIndex) ? Number(candidate.partIndex) : 0;
  const partTime = Number.isFinite(candidate.partTime) ? Number(candidate.partTime) : 0;
  const globalTime = Number.isFinite(candidate.globalTime) ? Number(candidate.globalTime) : Number.isFinite(candidate.time) ? Number(candidate.time) : 0;
  const duration = Number.isFinite(candidate.duration) ? Number(candidate.duration) : 0;

  if (!Number.isFinite(globalTime) || !Number.isFinite(duration) || duration <= 0) return null;

  return {
    episodeId,
    partIndex,
    partTime,
    globalTime,
    time: globalTime,
    duration,
    at: typeof candidate.at === 'number' ? candidate.at : Date.now(),
  };
}

export function readProgress(episodeId: string): Progress | null {
  try {
    const raw = localStorage.getItem(key(episodeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return normalizeProgress(parsed, episodeId);
  } catch {
    return null;
  }
}

export function clearProgress(episodeId: string): void {
  try {
    localStorage.removeItem(key(episodeId));
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  } catch {
    /* ignore */
  }
}

export function writeProgress(episodeId: string, partIndex: number, partTime: number, globalTime: number, duration: number): void {
  if (!Number.isFinite(partIndex) || !Number.isFinite(partTime) || !Number.isFinite(globalTime) || !Number.isFinite(duration) || duration <= 0) return;
  if (globalTime < 10 || duration - globalTime < 20) {
    clearProgress(episodeId);
    return;
  }

  try {
    const value: Progress = {
      episodeId,
      partIndex,
      partTime,
      globalTime,
      time: globalTime,
      duration,
      at: Date.now(),
    };
    localStorage.setItem(key(episodeId), JSON.stringify(value));
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  } catch {
    /* storage unavailable: resume is a nice-to-have */
  }
}
