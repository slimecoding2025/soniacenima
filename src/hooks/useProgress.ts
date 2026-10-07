import { useEffect, useState } from 'react';
import { PROGRESS_EVENT, readProgress, type Progress } from '../utils/progress';

export function useProgress(episodeId: string | undefined): Progress | null {
  const [progress, setProgress] = useState<Progress | null>(() => (episodeId ? readProgress(episodeId) : null));

  useEffect(() => {
    if (!episodeId) {
      setProgress(null);
      return;
    }
    const sync = () => setProgress(readProgress(episodeId));
    sync();
    window.addEventListener(PROGRESS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [episodeId]);

  return progress;
}
