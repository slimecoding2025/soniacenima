import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WelcomeIntro from './components/WelcomeIntro';
import { INTRO_SEEN_KEY } from './content';
import { useCurrentEpisode } from './hooks/useCurrentEpisode';
import HomePage from './pages/HomePage';
import { readProgress } from './utils/progress';

// The player (and its icons) is only downloaded when someone presses play.
const WatchPage = lazy(() => import('./pages/WatchPage'));

function introAlreadySeen(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [intro, setIntro] = useState(() => !introAlreadySeen());
  const [watch, setWatch] = useState<{ startAt: number } | null>(null);
  const { state, retry } = useCurrentEpisode();

  const finishIntro = useCallback(() => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setIntro(false);
  }, []);

  const openWatch = useCallback(
    (resume: boolean) => {
      if (state.status !== 'ready') return;
      const saved = resume ? readProgress(state.episode.id) : null;
      window.history.pushState({ watch: true }, '');
      setWatch({ startAt: saved?.globalTime ?? saved?.time ?? 0 });
    },
    [state],
  );

  // Close the player through history so the phone's Back gesture works.
  const closeWatch = useCallback(() => {
    if ((window.history.state as { watch?: boolean } | null)?.watch) window.history.back();
    else setWatch(null);
  }, []);

  useEffect(() => {
    const onPop = () => setWatch(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <>
      <AnimatePresence>{intro && <WelcomeIntro key="intro" onDone={finishIntro} />}</AnimatePresence>

      {!intro && (
        <AnimatePresence mode="wait">
          {watch && state.status === 'ready' ? (
            <Suspense key="watch" fallback={<div className="fixed inset-0 z-50 bg-black" />}>
              <WatchPage episode={state.episode} startAt={watch.startAt} onClose={closeWatch} />
            </Suspense>
          ) : (
            <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <HomePage state={state} onRetry={retry} onWatch={openWatch} onReplayIntro={() => setIntro(true)} />
            </motion.main>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
