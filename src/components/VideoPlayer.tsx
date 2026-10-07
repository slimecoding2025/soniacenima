import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Gauge, Loader2, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume1, Volume2, VolumeX } from 'lucide-react';
import { resolveStorageUrl } from '../services/episodes';
import type { Episode } from '../types/episode';
import { formatTime, pad2 } from '../utils/format';
import { clearProgress, writeProgress } from '../utils/progress';

interface Props {
  episode: Episode;
  startAt: number;
  onClose: () => void;
}

type Failure = 'network' | 'unsupported' | 'unknown' | null;
type WebkitVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const FAILURE_COPY: Record<Exclude<Failure, null>, string> = {
  network: 'Unable to continue playback.',
  unsupported: 'Unable to continue playback.',
  unknown: 'Unable to continue playback.',
};

const iconBtn =
  'inline-flex h-11 w-11 items-center justify-center rounded-full text-bone transition-colors hover:bg-white/15 active:bg-white/20';

const getPartStartOffset = (index: number, partDurations: number[]) => {
  let offset = 0;
  for (let i = 0; i < index; i += 1) offset += partDurations[i] || 0;
  return offset;
};

const findPartIndexForGlobalTime = (target: number, partDurations: number[]) => {
  if (partDurations.length === 0) return 0;

  let cursor = 0;
  for (let i = 0; i < partDurations.length; i += 1) {
    const partDuration = partDurations[i] || 0;
    const end = cursor + partDuration;
    if (target < end || i === partDurations.length - 1) return i;
    cursor = end;
  }
  return partDurations.length - 1;
};

const getGlobalTimeFromPart = (partIndex: number, partTime: number, partDurations: number[]) => {
  return getPartStartOffset(partIndex, partDurations) + partTime;
};

const getDurationFromUrl = async (url: string): Promise<number> => {
  return await new Promise((resolve) => {
    const candidate = document.createElement('video');
    candidate.preload = 'metadata';
    candidate.src = url;
    candidate.onloadedmetadata = () => resolve(Number.isFinite(candidate.duration) ? candidate.duration : 0);
    candidate.onerror = () => resolve(0);
  });
};

export default function VideoPlayer({ episode, startAt, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startAtRef = useRef(startAt);
  const lastSave = useRef(0);
  const hideTimer = useRef<number | undefined>(undefined);
  const pointerType = useRef('mouse');
  const preloadedRef = useRef<Record<number, string>>({});

  const defaultPartDurations = useMemo(() => episode.parts.map((part) => part.durationSeconds ?? 0), [episode.parts]);
  const [partDurations, setPartDurations] = useState<number[]>(defaultPartDurations);
  const [currentPartIndex, setCurrentPartIndex] = useState(() => findPartIndexForGlobalTime(startAt, defaultPartDurations));
  const [src, setSrc] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<Failure>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(startAt);
  const [duration, setDuration] = useState(episode.durationSeconds ?? defaultPartDurations.reduce((sum, value) => sum + value, 0));
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [rateMenu, setRateMenu] = useState(false);
  const [controls, setControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateDurations = async () => {
      const nextDurations = [...defaultPartDurations];

      await Promise.all(
        episode.parts.map(async (part, index) => {
          if (part.durationSeconds && part.durationSeconds > 0) return;
          try {
            const url = await resolveStorageUrl(part.storagePath, episode.updatedAt);
            const durationValue = await getDurationFromUrl(url);
            if (!cancelled && durationValue > 0) nextDurations[index] = durationValue;
          } catch {
            // Missing or unreadable part metadata should not crash the episode.
          }
        }),
      );

      if (cancelled) return;

      const total = nextDurations.reduce((sum, value) => sum + value, 0);
      setPartDurations(nextDurations);
      setDuration(total || episode.durationSeconds || 0);
      setTime((current) => {
        const capped = Math.min(Math.max(current, 0), total || episode.durationSeconds || 0);
        return capped;
      });
      setCurrentPartIndex((current) => {
        if (!nextDurations.length) return 0;
        const nextIndex = findPartIndexForGlobalTime(startAtRef.current || current, nextDurations);
        return nextIndex;
      });
    };

    void hydrateDurations();
    return () => {
      cancelled = true;
    };
  }, [defaultPartDurations, episode.parts, episode.updatedAt, episode.durationSeconds]);

  const preloadPart = useCallback(
    (index: number) => {
      if (index < 0 || index >= episode.parts.length || preloadedRef.current[index] || index === currentPartIndex) return;
      const part = episode.parts[index];
      if (!part) return;

      resolveStorageUrl(part.storagePath, episode.updatedAt)
        .then((url) => {
          preloadedRef.current[index] = url;
        })
        .catch(() => {
          delete preloadedRef.current[index];
        });
    },
    [currentPartIndex, episode.parts, episode.updatedAt],
  );

  useEffect(() => {
    if (!episode.parts.length) {
      setFailure('unknown');
      return;
    }

    const index = currentPartIndex;
    const part = episode.parts[index];
    if (!part) {
      setFailure('unknown');
      return;
    }

    let cancelled = false;
    setFailure(null);
    setReady(false);
    setWaiting(true);
    setSrc(null);

    resolveStorageUrl(part.storagePath, episode.updatedAt)
      .then((url) => {
        if (cancelled) return;
        preloadedRef.current[index] = url;
        setSrc(url);
        setWaiting(false);
        if (index + 1 < episode.parts.length) preloadPart(index + 1);
      })
      .catch(() => {
        if (!cancelled) setFailure(navigator.onLine ? 'unknown' : 'network');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, currentPartIndex, episode.parts, episode.updatedAt, preloadPart]);

  useEffect(() => {
    const flush = () => {
      const currentPartTime = videoRef.current ? videoRef.current.currentTime : 0;
      const currentGlobal = getGlobalTimeFromPart(currentPartIndex, currentPartTime, partDurations);
      writeProgress(episode.id, currentPartIndex, currentPartTime, currentGlobal, duration || currentGlobal || 1);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [currentPartIndex, duration, episode.id, partDurations]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    containerRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const poke = useCallback(() => {
    setControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) {
        setControls(false);
        setRateMenu(false);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    if (playing) poke();
    else setControls(true);
    return () => window.clearTimeout(hideTimer.current);
  }, [playing, poke]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, []);

  const seekToTime = useCallback(
    (target: number) => {
      if (!partDurations.length) return;
      const clampedTarget = Math.min(Math.max(target, 0), duration || target);
      const nextIndex = findPartIndexForGlobalTime(clampedTarget, partDurations);
      const localCapped = Math.max(0, clampedTarget - getPartStartOffset(nextIndex, partDurations));
      setCurrentPartIndex(nextIndex);
      setTime(clampedTarget);
      const v = videoRef.current;
      if (v) {
        v.currentTime = localCapped;
        if (v.paused) void v.play().catch(() => undefined);
      }
    },
    [duration, partDurations],
  );

  const seekBy = useCallback(
    (delta: number) => {
      const next = Math.max(0, time + delta);
      seekToTime(next);
    },
    [seekToTime, time],
  );

  const changeVolume = useCallback((next: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.min(1, Math.max(0, next));
    v.volume = clamped;
    v.muted = clamped === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    const v = videoRef.current as WebkitVideo | null;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (c?.requestFullscreen) {
      void c.requestFullscreen().catch(() => undefined);
    } else if (v?.webkitEnterFullscreen) {
      v.webkitEnterFullscreen();
    }
  }, []);

  useEffect(() => {
    const on = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const applyRate = (r: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = r;
    setRate(r);
    setRateMenu(false);
  };

  const retry = () => {
    setFailure(null);
    setEnded(false);
    setAttempt((n) => n + 1);
  };

  const replay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setTime(0);
    setEnded(false);
    void v.play().catch(() => undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if ((e.key === ' ' || e.key === 'Enter') && tag === 'BUTTON') return;
      if (tag === 'INPUT' && e.key.startsWith('Arrow')) return;
      const v = videoRef.current;
      let handled = true;
      switch (e.key) {
        case ' ':
        case 'k':
          togglePlay();
          break;
        case 'ArrowLeft':
          seekBy(-5);
          break;
        case 'ArrowRight':
          seekBy(5);
          break;
        case 'j':
          seekBy(-10);
          break;
        case 'l':
          seekBy(10);
          break;
        case 'ArrowUp':
          if (v) changeVolume(v.volume + 0.1);
          break;
        case 'ArrowDown':
          if (v) changeVolume(v.volume - 0.1);
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'Escape':
          if (!document.fullscreenElement) onClose();
          break;
        default:
          handled = false;
      }
      if (handled) {
        e.preventDefault();
        poke();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeVolume, onClose, poke, seekBy, toggleFullscreen, toggleMute, togglePlay]);

  const syncBuffered = (v: HTMLVideoElement) => {
    for (let i = 0; i < v.buffered.length; i += 1) {
      if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime) {
        setBuffered(v.buffered.end(i));
        return;
      }
    }
  };

  const onLoadedMetadata = (e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    const nextDurations = [...partDurations];
    if (Number.isFinite(v.duration) && v.duration > 0) nextDurations[currentPartIndex] = v.duration;
    setPartDurations(nextDurations);
    const partTotal = nextDurations.reduce((sum, value) => sum + value, 0);
    setDuration(partTotal || episode.durationSeconds || 0);

    const offset = getPartStartOffset(currentPartIndex, nextDurations);
    const globalResume = startAtRef.current > 0 ? startAtRef.current : 0;
    const localResume = globalResume > 0 ? Math.max(0, globalResume - offset) : 0;
    if (globalResume > 0 && localResume < v.duration - 5) {
      v.currentTime = localResume;
      setTime(globalResume);
    } else {
      setTime(offset);
    }
    startAtRef.current = 0;
    v.playbackRate = rate;
    setReady(true);
    setWaiting(false);
    if (!v.paused) setPlaying(true);
  };

  const onTimeUpdate = (e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    const globalValue = getGlobalTimeFromPart(currentPartIndex, v.currentTime, partDurations);
    setTime(globalValue);
    syncBuffered(v);
    if (Date.now() - lastSave.current > 5000) {
      lastSave.current = Date.now();
      writeProgress(episode.id, currentPartIndex, v.currentTime, globalValue, duration || globalValue || 1);
    }

    const nextIndex = currentPartIndex + 1;
    if (currentPartIndex < episode.parts.length - 1 && v.duration > 0 && v.currentTime >= v.duration - 1.5) {
      preloadPart(nextIndex);
    }
  };

  const onError = (e: SyntheticEvent<HTMLVideoElement>) => {
    const code = e.currentTarget.error?.code;
    setWaiting(false);
    setPlaying(false);
    setFailure(code === 2 || !navigator.onLine ? 'network' : code === 4 ? 'unsupported' : 'unknown');
  };

  const pct = (n: number) => (duration > 0 ? Math.min(100, (n / duration) * 100) : 0);
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const showSpinner = !failure && !ended && (!ready || waiting);

  const onSurfaceClick = () => {
    if (pointerType.current === 'touch') {
      if (controls && playing) setControls(false);
      else poke();
    } else {
      togglePlay();
      poke();
    }
  };

  useEffect(() => {
    if (videoRef.current && src) {
      const v = videoRef.current;
      if (startAtRef.current > 0) {
        const partOffset = getPartStartOffset(currentPartIndex, partDurations);
        const localResume = Math.max(0, startAtRef.current - partOffset);
        if (localResume > 0 && localResume < (v.duration || Number.POSITIVE_INFINITY)) v.currentTime = localResume;
      }
      if (playing) void v.play().catch(() => undefined);
    }
  }, [currentPartIndex, partDurations, playing, src]);

  return (
    <motion.div
      ref={containerRef}
      tabIndex={-1}
      role="region"
      aria-label={`Player: ${episode.title}`}
      className="fixed inset-0 z-50 select-none bg-black outline-none"
      style={{ cursor: controls ? 'default' : 'none' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onPointerDown={(e) => {
        pointerType.current = e.pointerType;
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'touch') poke();
      }}
    >
      {src && (
        <video
          key={src}
          ref={videoRef}
          src={src}
          poster={episode.thumbnailUrl ?? undefined}
          preload="auto"
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full bg-black object-contain"
          onLoadedMetadata={onLoadedMetadata}
          onDurationChange={(e) => {
            const next = Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0;
            if (next > 0) {
              const nextDurations = [...partDurations];
              nextDurations[currentPartIndex] = next;
              setPartDurations(nextDurations);
              setDuration(nextDurations.reduce((sum, value) => sum + value, 0) || episode.durationSeconds || 0);
            }
          }}
          onTimeUpdate={onTimeUpdate}
          onProgress={(e) => syncBuffered(e.currentTarget)}
          onWaiting={() => setWaiting(true)}
          onCanPlay={() => setWaiting(false)}
          onPlaying={() => {
            setWaiting(false);
            setPlaying(true);
          }}
          onPlay={() => {
            setPlaying(true);
            setEnded(false);
          }}
          onPause={(e) => {
            setPlaying(false);
            const currentGlobal = getGlobalTimeFromPart(currentPartIndex, e.currentTarget.currentTime, partDurations);
            writeProgress(episode.id, currentPartIndex, e.currentTarget.currentTime, currentGlobal, duration || currentGlobal || 1);
          }}
          onEnded={() => {
            if (currentPartIndex < episode.parts.length - 1) {
              const nextIndex = currentPartIndex + 1;
              const nextPart = episode.parts[nextIndex];
              const nextStart = getPartStartOffset(nextIndex, partDurations);
              setCurrentPartIndex(nextIndex);
              setTime(nextStart);
              setReady(false);
              setWaiting(true);
              setEnded(false);
              if (nextPart) {
                const nextUrl = preloadedRef.current[nextIndex] ?? null;
                if (nextUrl) setSrc(nextUrl);
              }
              return;
            }
            clearProgress(episode.id);
            setPlaying(false);
            setEnded(true);
          }}
          onVolumeChange={(e) => {
            setVolume(e.currentTarget.volume);
            setMuted(e.currentTarget.muted);
          }}
          onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
          onError={onError}
        />
      )}

      {!ready && !failure && episode.thumbnailUrl && (
        <img src={episode.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      )}

      <div className="absolute inset-0" onClick={onSurfaceClick} aria-hidden />

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent pb-10 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] transition-opacity duration-300 ${
          controls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <button type="button" onClick={onClose} className={iconBtn} aria-label="Back to home">
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{episode.title}</p>
            <p className="text-xs text-bone/60">
              Season {pad2(episode.season)}, Episode {pad2(episode.episode)}
            </p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {showSpinner ? (
          <div role="status" aria-label="Buffering">
            <Loader2 size={44} className="animate-spin text-bone/80" />
          </div>
        ) : (
          !failure &&
          !ended && (
            <div
              className={`pointer-events-auto flex items-center gap-6 transition-opacity duration-300 sm:gap-10 ${
                controls ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <button type="button" onClick={() => seekBy(-10)} className={`${iconBtn} relative h-14 w-14`} aria-label="Back 10 seconds">
                <RotateCcw size={30} />
                <span className="absolute text-[10px] font-semibold">10</span>
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-bone backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" className="ml-1" />}
              </button>
              <button type="button" onClick={() => seekBy(10)} className={`${iconBtn} relative h-14 w-14`} aria-label="Forward 10 seconds">
                <RotateCw size={30} />
                <span className="absolute text-[10px] font-semibold">10</span>
              </button>
            </div>
          )
        )}
      </div>

      <div
        onFocus={poke}
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-12 transition-opacity duration-300 ${
          controls ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="relative h-7">
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20" />
          <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/30" style={{ width: `${pct(buffered)}%` }} />
          <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-ember" style={{ width: `${pct(time)}%` }} />
          <input
            type="range"
            className="range absolute inset-0"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            disabled={!ready}
            aria-label="Seek"
            aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
            onChange={(e) => {
              const newValue = Number(e.target.value);
              seekToTime(newValue);
            }}
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={togglePlay} className={iconBtn} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>

          <div className="group hidden items-center sm:flex">
            <button type="button" onClick={toggleMute} className={iconBtn} aria-label={muted ? 'Unmute' : 'Mute'}>
              <VolumeIcon size={22} />
            </button>
            <div className="relative h-7 w-0 overflow-hidden transition-[width] duration-200 focus-within:w-24 group-hover:w-24">
              <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20" />
              <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-bone" style={{ width: `${(muted ? 0 : volume) * 100}%` }} />
              <input
                type="range"
                className="range absolute inset-0"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => changeVolume(Number(e.target.value))}
              />
            </div>
          </div>

          <p className="ml-1 text-sm tabular-nums text-bone/80">
            {formatTime(time)} / {formatTime(duration || 0)}
          </p>

          <div className="ml-auto flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setRateMenu((o) => !o)}
                className={`${iconBtn} w-auto gap-1.5 px-3 text-sm`}
                aria-haspopup="menu"
                aria-expanded={rateMenu}
                aria-label={`Playback speed ${rate}x`}
              >
                <Gauge size={20} />
                <span className="tabular-nums">{rate}x</span>
              </button>
              {rateMenu && (
                <ul role="menu" className="absolute bottom-full right-0 mb-2 w-32 overflow-hidden rounded-lg border border-white/10 bg-black/90 py-1 backdrop-blur-md">
                  {RATES.map((r) => (
                    <li key={r} role="none">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={r === rate}
                        onClick={() => applyRate(r)}
                        className="flex min-h-[44px] w-full items-center justify-between px-4 text-sm hover:bg-white/10"
                      >
                        {r === 1 ? 'Normal' : `${r}x`}
                        {r === rate && <Check size={16} aria-hidden />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" onClick={toggleFullscreen} className={iconBtn} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {fullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
          </div>
        </div>
      </div>

      {failure && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/85 px-6 text-center">
          <h2 className="font-display text-3xl font-light">{FAILURE_COPY[failure]}</h2>
          <p className="max-w-sm text-bone/60">Retry to continue from the current point.</p>
          <div className="flex gap-3">
            <button type="button" onClick={retry} className="min-h-[48px] rounded-full bg-bone px-6 text-sm font-semibold text-ink">
              Retry
            </button>
            <button type="button" onClick={onClose} className="min-h-[48px] rounded-full border border-white/25 px-6 text-sm">
              Back
            </button>
          </div>
        </div>
      )}

      {ended && !failure && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/80 px-6 text-center">
          <h2 className="font-display text-3xl font-light sm:text-4xl">That’s the episode.</h2>
          <p className="text-bone/60">Until the next one.</p>
          <div className="flex gap-3">
            <button type="button" onClick={replay} className="min-h-[48px] rounded-full border border-white/25 px-6 text-sm">
              Watch again
            </button>
            <button type="button" onClick={onClose} className="min-h-[48px] rounded-full bg-bone px-6 text-sm font-semibold text-ink">
              Back home
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
