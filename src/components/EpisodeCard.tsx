import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Play } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useFinePointer } from '../hooks/useFinePointer';
import type { Episode } from '../types/episode';
import { formatDate, formatTime, pad2 } from '../utils/format';

interface Props {
  episode: Episode;
  onWatch: () => void;
}

export default function EpisodeCard({ episode, onWatch }: Props) {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const tilt = fine && !reduce;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), { stiffness: 150, damping: 18 });

  const move = (e: ReactPointerEvent<HTMLElement>) => {
    if (!tilt) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => {
    px.set(0);
    py.set(0);
  };

  const date = formatDate(episode.releaseDate);

  return (
    <div style={{ perspective: 1100 }}>
      <motion.article
        onPointerMove={move}
        onPointerLeave={leave}
        style={tilt ? { rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' } : undefined}
        whileHover={tilt ? { y: -6 } : undefined}
        className="group relative grid overflow-hidden rounded-xl border border-white/10 bg-graphite shadow-2xl shadow-black/60 md:grid-cols-[1.25fr_1fr]"
      >
        <div className="relative aspect-video md:aspect-auto md:min-h-[360px]">
          {episode.thumbnailUrl ? (
            <img src={episode.thumbnailUrl} alt={`Still from ${episode.title}`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_80%_at_30%_30%,#3a1020,#111114)]" />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-graphite via-transparent to-transparent md:bg-gradient-to-r" />
        </div>

        <div className="relative flex flex-col justify-center gap-4 p-6 sm:p-9" style={tilt ? { transform: 'translateZ(40px)' } : undefined}>
          <p className="text-sm text-bone/55">
            Season {pad2(episode.season)}, Episode {pad2(episode.episode)}
          </p>
          <h2 className="font-display text-3xl font-light leading-tight sm:text-4xl">{episode.title}</h2>
          {episode.description && <p className="max-w-prose leading-relaxed text-bone/70">{episode.description}</p>}
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-bone/55">
            {episode.durationSeconds ? (
              <div className="flex gap-2">
                <dt className="sr-only">Duration</dt>
                <dd>{formatTime(episode.durationSeconds)}</dd>
              </div>
            ) : null}
            {date && (
              <div className="flex gap-2">
                <dt className="sr-only">Release date</dt>
                <dd>{date}</dd>
              </div>
            )}
          </dl>
          <button
            type="button"
            onClick={onWatch}
            className="mt-2 inline-flex min-h-[52px] w-fit items-center gap-2 rounded-full bg-ember px-7 text-[15px] font-semibold text-bone transition-colors hover:bg-[#b82638]"
          >
            <Play size={17} fill="currentColor" aria-hidden /> Watch now
          </button>
        </div>
      </motion.article>
    </div>
  );
}
