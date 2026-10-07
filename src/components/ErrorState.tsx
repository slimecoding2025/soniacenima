import { RotateCw } from 'lucide-react';
import type { EpisodeErrorKind } from '../types/episode';

const COPY: Record<EpisodeErrorKind, { title: string; body: string; retry: boolean }> = {
  none: { title: 'No episode available yet.', body: 'The next one has not been uploaded. Check back soon.', retry: true },
  config: { title: 'Something went wrong.', body: 'The app is not connected to Supabase. Add the environment variables and redeploy.', retry: false },
  network: { title: 'Connection lost.', body: 'Check your internet connection, then try again.', retry: true },
  unknown: { title: 'Unable to load the episode.', body: 'Something went wrong while loading. Try again in a moment.', retry: true },
};

interface Props {
  kind: EpisodeErrorKind;
  onRetry: () => void;
}

export default function ErrorState({ kind, onRetry }: Props) {
  const c = COPY[kind];
  return (
    <div role="alert" className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 text-center">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_45%,rgba(92,16,32,0.3),transparent_70%)]" />
      <div className="relative max-w-md">
        <h1 className="font-display text-3xl font-light sm:text-4xl">{c.title}</h1>
        <p className="mt-4 text-bone/60">{c.body}</p>
        {c.retry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-8 inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/20 px-6 text-sm transition-colors hover:bg-white/10"
          >
            <RotateCw size={16} aria-hidden /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
