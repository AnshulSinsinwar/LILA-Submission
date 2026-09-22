import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook for timeline playback logic.
 * Step-through slider with auto-advance via setInterval.
 */
export function usePlayback(timeRange) {
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef(null);

  const maxTime = timeRange.max;

  // Step size: advance by ~1% of total duration per tick at 1x
  const stepSize = Math.max(1, Math.round(maxTime / 100));

  const play = useCallback(() => {
    setCursor(c => c >= maxTime ? 0 : c);
    setIsPlaying(true);
  }, [maxTime]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev) {
        setCursor(c => c >= maxTime ? 0 : c);
        return true;
      }
      return false;
    });
  }, [maxTime]);

  const seek = useCallback((value) => {
    setCursor(Math.max(0, Math.min(maxTime, value)));
  }, [maxTime]);

  const reset = useCallback(() => {
    setCursor(0);
    setIsPlaying(false);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed(prev => {
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 1;
    });
  }, []);

  // Auto-advance
  useEffect(() => {
    if (!isPlaying || maxTime === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCursor(prev => {
        const next = prev + stepSize * speed;
        if (next >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return next;
      });
    }, 50); // 20fps update rate

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, maxTime, stepSize]);

  // Reset when time range changes (new match selected)
  useEffect(() => {
    setCursor(0);
    setIsPlaying(false);
  }, [maxTime]);

  return {
    cursor,
    isPlaying,
    speed,
    play,
    pause,
    togglePlay,
    seek,
    reset,
    cycleSpeed,
    maxTime,
  };
}
