import { SITE_NAME } from '../content';

export default function Footer({ onReplayIntro }: { onReplayIntro: () => void }) {
  return (
    <footer className="border-t border-white/5 px-5 pb-28 pt-10 text-sm text-bone/50 sm:px-10 md:pb-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p>
          {SITE_NAME}. Just us.
        </p>
        <button type="button" onClick={onReplayIntro} className="min-h-[44px] text-left transition-colors hover:text-bone">
          Replay intro
        </button>
      </div>
    </footer>
  );
}
