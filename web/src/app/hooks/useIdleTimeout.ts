"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 2 * 60 * 1000; // warn 2 min before
const TICK_INTERVAL = 1000;
const STORAGE_KEY = "forigen_last_activity";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
const THROTTLE_MS = 30000; // only reset timer every 30s of activity

interface UseIdleTimeoutOptions {
  onTimeout: () => void;
  enabled?: boolean;
}

export function useIdleTimeout({ onTimeout, enabled = true }: UseIdleTimeoutOptions) {
  const [isWarning, setIsWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const deadline = useRef(Date.now() + IDLE_TIMEOUT);
  const lastReset = useRef(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCheckedStorage = useRef(false);

  const persistActivity = () => {
    try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch {}
  };

  const resetTimer = useCallback(() => {
    deadline.current = Date.now() + IDLE_TIMEOUT;
    lastReset.current = Date.now();
    persistActivity();
    setIsWarning(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // On mount: check if last activity was more than IDLE_TIMEOUT ago
    if (!hasCheckedStorage.current) {
      hasCheckedStorage.current = true;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const elapsed = Date.now() - parseInt(stored, 10);
          if (elapsed > IDLE_TIMEOUT) {
            onTimeout();
            return;
          }
          // Resume from stored time
          deadline.current = parseInt(stored, 10) + IDLE_TIMEOUT;
        }
      } catch {}
    }

    persistActivity();

    const onActivity = () => {
      if (Date.now() - lastReset.current > THROTTLE_MS) {
        resetTimer();
      }
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    tickRef.current = setInterval(() => {
      const remaining = deadline.current - Date.now();
      if (remaining <= 0) {
        onTimeout();
        if (tickRef.current) clearInterval(tickRef.current);
      } else if (remaining <= WARNING_BEFORE) {
        setIsWarning(true);
        setRemainingSeconds(Math.ceil(remaining / 1000));
      } else {
        setIsWarning(false);
      }
    }, TICK_INTERVAL);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [enabled, onTimeout, resetTimer]);

  return { isWarning, remainingSeconds, resetTimer };
}
