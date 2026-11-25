import { useEffect, useState } from 'react';

export function useCountdown(until: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until - Date.now() <= 0) {
      return;
    }
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (until - current <= 0) {
        clearInterval(id);
      }
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [until]);

  return until - now;
}
