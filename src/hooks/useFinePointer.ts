import { useEffect, useState } from 'react';

const QUERY = '(hover: hover) and (pointer: fine)';

/** True on devices with a mouse/trackpad. Used to enable tilt and cursor light. */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setFine(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return fine;
}
