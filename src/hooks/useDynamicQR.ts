import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 25000;

export function useDynamicQR(officeId: string | null) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(REFRESH_INTERVAL);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(() => {
    if (!officeId) { setQrData(null); return; }
    setLoading(true);
    setQrData(officeId);
    setTimeLeft(REFRESH_INTERVAL);
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

  return { token: qrData, timeLeft, loading, refresh: generate };
}
