export default function LoadingState() {
  return (
    <div role="status" aria-label="Loading the episode" className="relative min-h-[100dvh] overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_30%,rgba(92,16,32,0.35),transparent_70%)]" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-end gap-5 px-5 pb-32 sm:px-10 sm:pb-24">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-16 w-4/5 max-w-xl rounded sm:h-20" />
        <div className="skeleton h-4 w-2/3 max-w-md rounded" />
        <div className="mt-4 flex gap-3">
          <div className="skeleton h-12 w-44 rounded-full" />
          <div className="skeleton h-12 w-36 rounded-full" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
