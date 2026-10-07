import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { INTRO_LINES } from '../content';

interface Props {
  onDone: () => void;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const glow = ['rgba(92,16,32,0.45)', 'rgba(52,40,96,0.40)', 'rgba(163,32,47,0.38)'];

export default function WelcomeIntro({ onDone }: Props) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const line = INTRO_LINES[index];

  const finish = useCallback(() => onDone(), [onDone]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (index >= INTRO_LINES.length - 1) finish();
      else setIndex((i) => i + 1);
    }, line.ms);
    return () => window.clearTimeout(t);
  }, [index, line.ms, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const lineVariants: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0, filter: 'blur(14px)', scale: 1.06, y: 14 },
        show: { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0, transition: { duration: 0.95, ease: EASE, staggerChildren: 0.07 } },
        exit: { opacity: 0, filter: 'blur(10px)', scale: 0.97, y: -8, transition: { duration: 0.5, ease: 'easeIn' } },
      };

  const wordVariants: Variants = reduce
    ? { hidden: {}, show: {} }
    : line.playful
      ? {
          hidden: { opacity: 0, y: 24, rotate: -3 },
          show: { opacity: 1, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 220, damping: 14 } },
        }
      : { hidden: { opacity: 0.001 }, show: { opacity: 1 } };

  const words = line.text.split(' ');

  return (
    <motion.div
      role="dialog"
      aria-label="Welcome"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black px-6"
      initial={{ opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.12, filter: 'blur(18px)', transition: { duration: 1, ease: EASE } }}
    >
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        animate={{ backgroundColor: glow[Math.min(index, glow.length - 1)], scale: reduce ? 1 : [1, 1.12, 1] }}
        transition={{ backgroundColor: { duration: 1.2 }, scale: { duration: 4, ease: 'easeInOut' } }}
      />

      <div className="relative max-w-3xl text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.h1
            key={index}
            variants={lineVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className={`font-display font-light leading-[1.1] tracking-tight text-bone ${
              line.text.length > 30 ? 'text-3xl sm:text-5xl' : 'text-5xl sm:text-7xl'
            }`}
          >
            {words.map((w, i) => (
              <motion.span key={`${w}-${i}`} variants={wordVariants} className="mr-[0.25em] inline-block last:mr-0">
                {w}
              </motion.span>
            ))}
          </motion.h1>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={finish}
        className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] right-6 rounded-full px-4 py-2 text-sm text-smoke transition-colors hover:text-bone sm:right-10"
      >
        Skip
      </button>
    </motion.div>
  );
}
