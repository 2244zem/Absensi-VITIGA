import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

const REFRESH_INTERVAL = 25000;

export function useDynamicQR(officeId: string | null) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(REFRESH_INTERVAL);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateToken = useCallback(async () => {
    if (!officeId) return;
    try {
      setLoading(true);
      await supabase.from('qr_sessions')
        .update({ expires_at: new Date().toISOString() })
        .eq('office_id', officeId)
        .gt('expires_at', new Date().toISOString());
      const newToken = crypto.randomUUID();
      const expires = new Date(Date.now() + REFRESH_INTERVAL);
      const { error } = await supabase.from('qr_sessions').insert({
        office_id: officeId,
        token: newToken,
        expires_at: expires.toISOString(),
      });
      if (error) throw error;
      setToken(newToken);
      setExpiresAt(expires);
      setTimeLeft(REFRESH_INTERVAL);
    } catch (e) {
      console.error('Failed to generate QR token:', e);
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    if (!officeId) return;
    generateToken();
    intervalRef.current = setInterval(() => {
      generateToken();
    }, REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [officeId, generateToken]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return { token, expiresAt, timeLeft, loading, refresh: generateToken };
}
