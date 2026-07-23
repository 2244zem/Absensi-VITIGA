import { useState, useEffect, useCallback } from 'react';

const COOLDOWN_MINUTES = 20;
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
const STORAGE_KEY = 'attendance_last_checkin';

interface CooldownState {
  remainingTime: number;
  hasCheckedIn: boolean;
  checkInTime: Date | null;
}

export function useAttendanceCooldown() {
  const [state, setState] = useState<CooldownState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const checkInTimestamp = parseInt(stored, 10);
      const elapsed = Date.now() - checkInTimestamp;
      if (elapsed < COOLDOWN_MS) {
        return {
          remainingTime: COOLDOWN_MS - elapsed,
          hasCheckedIn: true,
          checkInTime: new Date(checkInTimestamp),
        };
      }
    }
    return {
      remainingTime: 0,
      hasCheckedIn: false,
      checkInTime: null,
    };
  });

  useEffect(() => {
    if (!state.hasCheckedIn || state.remainingTime <= 0) return;

    const interval = setInterval(() => {
      setState((prev) => {
        const newRemaining = prev.remainingTime - 1000;
        if (newRemaining <= 0) {
          localStorage.removeItem(STORAGE_KEY);
          return {
            remainingTime: 0,
            hasCheckedIn: false,
            checkInTime: null,
          };
        }
        return { ...prev, remainingTime: newRemaining };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.hasCheckedIn, state.remainingTime]);

  const recordCheckIn = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, now.toString());
    setState({
      remainingTime: COOLDOWN_MS,
      hasCheckedIn: true,
      checkInTime: new Date(now),
    });
  }, []);

  const clearCheckIn = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      remainingTime: 0,
      hasCheckedIn: false,
      checkInTime: null,
    });
  }, []);

  const formatRemainingTime = useCallback((ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    ...state,
    recordCheckIn,
    clearCheckIn,
    formatRemainingTime,
    cooldownMinutes: COOLDOWN_MINUTES,
  };
}
