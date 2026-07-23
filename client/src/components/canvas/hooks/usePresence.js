import { useEffect, useRef, useState } from 'react';

export function usePresence(active, exitDurationMs = 180) {
  const [mounted, setMounted] = useState(active);
  const [leaving, setLeaving] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (active) {
      clearTimeout(timeoutRef.current);
      setMounted(true);
      setLeaving(false);
    } else if (mounted) {
      setLeaving(true);
      timeoutRef.current = setTimeout(() => {
        setMounted(false);
        setLeaving(false);
      }, exitDurationMs);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [active]);

  return { mounted, leaving };
}
