import { useState, useEffect, useCallback } from 'react';
import { generateQRSession, cleanExpiredSessions } from '../services/api/qr';

const REFRESH_INTERVAL = 25000;

export function useDynamicQR(officeId: string | null) {
  const [token, setToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(REFRESH_INTERVAL);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!officeId) { setToken(null); return; }
    setLoading(true);
    try {
      const session = await generateQRSession(officeId);
      setToken(session.token);
      setTimeLeft(REFRESH_INTERVAL);
      cleanExpiredSessions().catch(() => {});
    } catch {
      setToken(officeId);
      setTimeLeft(REFRESH_INTERVAL);
    }
    setLoading(false);
  }, [officeId]);

  useEffect(() => {
    if (!officeId) return;
    generate();
    const interval = setInterval(generate, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [officeId, generate]);

  useEffect(() => {
    const tick = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return { token, officeId, timeLeft, loading, refresh: generate };
}
