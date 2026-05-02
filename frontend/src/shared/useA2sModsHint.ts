import {useEffect, useState} from 'react';

export type A2sModsHint = {level: 'info' | 'warn'; text: string};

export function useA2sModsHint(clearMs = 9000) {
  const [hint, setHint] = useState<A2sModsHint | null>(null);
  useEffect(() => {
    if (!hint) {
      return;
    }
    const id = window.setTimeout(() => setHint(null), clearMs);
    return () => window.clearTimeout(id);
  }, [hint, clearMs]);
  return [hint, setHint] as const;
}
