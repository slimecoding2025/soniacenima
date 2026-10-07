import { Play } from 'lucide-react';
import type { Episode } from '../types/episode';
import type { Progress } from '../utils/progress';
import { formatTime, pad2 } from '../utils/format';

interface Props {
  episode: Episode;
  progress: Progress;
  onResume: () => void;
}

export default function ContinueWatching({ episode, progress, onResume }: Props) {
  const pct = Math.min(100, Math.max(0, (progress.time / progress.duration) * 100));
  return (
    <button
      type="button"
      onClick={onResume}
      className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-graphite p-3 text-left transition-colors hover:bg-charcoal sm:gap-6 sm:p-4"
    >
      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-charcoal sm:w-44">
        {episode.thumbnailUrl && <img src={episode.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play size={22} fill="currentColor" aria-hidden />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-bone/55">Continue watching</p>
        <p className="mt-1 truncate font-display text-xl">Episode {pad2(episode.episode)}</p>
        <p className="mt-1 text-sm text-bone/65">
          {formatTime(progress.time)} / {formatTime(progress.duration)}
        </p>
        <div
          role="progressbar"
          aria-label="Watched"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          className="mt-3 h-1 overflow-hidden rounded-full bg-white/15"
        >
          <div className="h-full rounded-full bg-ember" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </button>
  );
}
