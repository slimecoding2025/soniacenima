import { useCallback, useEffect, useState } from 'react';
import { EpisodeError, fetchCurrentEpisode } from '../services/episodes';
import type { Episode, EpisodeErrorKind } from '../types/episode';

export type EpisodeState =
  | { status: 'loading' }
  | { status: 'ready'; episode: Episode }
  | { status: 'error'; kind: EpisodeErrorKind };

export function useCurrentEpisode() {
  const [state, setState] = useState<EpisodeState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchCurrentEpisode()
      .then((episode) => {
        if (!cancelled) setState({ status: 'ready', episode });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const kind: EpisodeErrorKind = err instanceof EpisodeError ? err.kind : 'unknown';
        setState({ status: 'error', kind });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
