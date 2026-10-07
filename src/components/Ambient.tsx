import { motion, useReducedMotion } from 'framer-motion';

// Deterministic positions: no layout shift, no Math.random on render.
const DOTS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 53 + 7) % 100}%`,
  size: 2 + (i % 3),
  delay: (i % 7) * 0.9,
  duration: 9 + (i % 5) * 2,
}));

/** Slow floating motes. Transform/opacity only; disabled with reduced motion. */
export default function Ambient() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {DOTS.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-bone/40"
          style={{ left: d.left, top: d.top, width: d.size, height: d.size }}
          animate={{ y: [0, -40, 0], opacity: [0, 0.5, 0] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
