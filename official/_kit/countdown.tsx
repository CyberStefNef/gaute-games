// A round timer for the page. Rules have no clock, so timed games count down on
// the screen and tell the rules when time is up.
import { useEffect, useRef, useState } from 'react';

/** Seconds left while `running`; calls `onDone` once when it reaches zero. */
export function useCountdown(seconds: number, running: boolean, onDone: () => void) {
  const [left, setLeft] = useState(seconds);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (!running) {
      setLeft(seconds);
      return;
    }
    const ends = Date.now() + seconds * 1000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        done.current();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [running, seconds]);
  return left;
}

/** The time left as a bar and a number. */
export function Countdown({ left, total }: { left: number; total: number }) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-[width] duration-300 ease-linear"
          style={{ width: `${(left / total) * 100}%` }}
        />
      </div>
      <strong className="w-8 text-right tabular-nums">{left}</strong>
    </div>
  );
}
