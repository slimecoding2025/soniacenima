import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Play, RotateCcw } from 'lucide-react';
import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useFinePointer } from '../hooks/useFinePointer';
import type { Episode } from '../types/episode';
import type { Progress } from '../utils/progress';
import { formatTime, pad2 } from '../utils/format';
import Ambient from './Ambient';

interface Props {
  episode: Episode;
  progress: Progress | null;
  onWatch: (resume: boolean) => void;
}

export default function Hero({ episode, progress, onWatch }: Props) {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const ref = useRef<HTMLElement>(null);
  const motionOn = !reduce;

  // Mouse-follow light
  const mx = useMotionValue(50);
  const my = useMotionValue(40);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });
  const light = useMotionTemplate`radial-gradient(520px circle at ${sx}% ${sy}%, rgba(163,32,47,0.22), transparent 65%)`;

  // Parallax backdrop
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', motionOn ? '18%' : '0%']);

  const onMove = (e: ReactPointerEvent) => {
    if (!fine || !motionOn || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  };

  return (
    <section id="home" ref={ref} onPointerMove={onMove} className="grain relative isolate min-h-[100dvh] overflow-hidden">
      <motion.div aria-hidden style={{ y: bgY }} className="absolute inset-0 -z-10 scale-110">
        {episode.thumbnailUrl ? (
          <img src={episode.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-40" decoding="async" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(70%_60%_at_70%_20%,rgba(52,40,96,0.5),transparent_70%)]" />
        )}
      </motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-ink/30" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-transparent to-transparent" />
      {fine && motionOn && <motion.div aria-hidden style={{ background: light }} className="absolute inset-0 -z-10" />}
      <Ambient />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-end px-5 pb-32 pt-28 sm:px-10 sm:pb-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="text-sm tracking-wide text-bone/60">
            Season {pad2(episode.season)}, Episode {pad2(episode.episode)}
          </p>
          <h1 className="mt-4 font-display text-5xl font-light leading-[1.02] tracking-tight sm:text-7xl"># Tonight’s episode from selimou </h1>
          <p className="mt-5 max-w-md text-lg text-bone/70">
            {episode.title}. Ready?
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onWatch(false)}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-bone px-7 text-[15px] font-semibold text-ink transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <Play size={18} fill="currentColor" aria-hidden /> Watch Episode
            </button>
            {progress && (
              <button
                type="button"
                onClick={() => onWatch(true)}
                className="inline-flex min-h-[52px] items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 text-[15px] backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                <RotateCcw size={17} aria-hidden /> Continue Watching
                <span className="text-bone/60">{formatTime(progress.time)}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
