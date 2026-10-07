import { motion, useReducedMotion } from 'framer-motion';
import ContinueWatching from '../components/ContinueWatching';
import EpisodeCard from '../components/EpisodeCard';
import ErrorState from '../components/ErrorState';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import LoadingState from '../components/LoadingState';
import Navbar from '../components/Navbar';
import type { EpisodeState } from '../hooks/useCurrentEpisode';
import { useProgress } from '../hooks/useProgress';

interface Props {
  state: EpisodeState;
  onRetry: () => void;
  onWatch: (resume: boolean) => void;
  onReplayIntro: () => void;
}

export default function HomePage({ state, onRetry, onWatch, onReplayIntro }: Props) {
  const reduce = useReducedMotion();
  const progress = useProgress(state.status === 'ready' ? state.episode.id : undefined);

  return (
    <>
      <Navbar />
      {state.status === 'loading' && <LoadingState />}
      {state.status === 'error' && <ErrorState kind={state.kind} onRetry={onRetry} />}
      {state.status === 'ready' && (
        <>
          <Hero episode={state.episode} progress={progress} onWatch={onWatch} />

          <motion.section
            id="episode"
            className="mx-auto max-w-7xl scroll-mt-16 px-5 py-24 sm:px-10"
            initial={reduce ? false : { opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="mb-8 font-display text-3xl font-light sm:text-4xl">Your private cinema</h2>
            <EpisodeCard episode={state.episode} onWatch={() => onWatch(false)} />
            {progress && (
              <div className="mt-6">
                <ContinueWatching episode={state.episode} progress={progress} onResume={() => onWatch(true)} />
              </div>
            )}
          </motion.section>

          <section id="about" className="mx-auto max-w-3xl scroll-mt-16 px-5 pb-28 sm:px-10">
            <h2 className="font-display text-3xl font-light sm:text-4xl">About</h2>
            <p className="mt-5 max-w-prose leading-relaxed text-bone/65">
              forja maymouna sonsen
            </p>
          </section>
        </>
      )}
      <Footer onReplayIntro={onReplayIntro} />
    </>
  );
}
