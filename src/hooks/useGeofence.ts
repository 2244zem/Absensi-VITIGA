import { useState, useEffect, useCallback, useRef } from 'react';
import { getOffices } from '../services/api/offices';
import { calculateDistance } from '../utils/haversine';
import type { Office } from '../types/office';

interface Location {
  lat: number;
  lng: number;
  accuracy: number;
}

interface GpsReading {
  dist: number;
  accuracy: number;
  lat: number;
  lng: number;
}

const MIN_READINGS = 3;
const STABILIZE_TIMEOUT = 10000;

export function useGeofence(officeId?: string | null) {
  const [location, setLocation] = useState<Location | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stabilizing, setStabilizing] = useState(true);
  const [stabilizeProgress, setStabilizeProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [office, setOffice] = useState<Office | null>(null);

  const readingsRef = useRef<GpsReading[]>([]);
  const stabilizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processReading = useCallback((latitude: number, longitude: number, accuracy: number) => {
    if (!office) return;
    const dist = calculateDistance(latitude, longitude, office.latitude, office.longitude);
    const reading: GpsReading = { dist, accuracy, lat: latitude, lng: longitude };

    readingsRef.current = [...readingsRef.current, reading];
    setStabilizeProgress(readingsRef.current.length);

    const bestReading = readingsRef.current.reduce((best, r) =>
      r.dist < best.dist ? r : best
    );

    setLocation({ lat: bestReading.lat, lng: bestReading.lng, accuracy: bestReading.accuracy });
    setDistance(bestReading.dist);

    const accuracyBuffer = Math.min(bestReading.accuracy || 0, 200);
    const effectiveRadius = (office.radius_meters || 150) + accuracyBuffer;
    setIsWithinRadius(bestReading.dist <= effectiveRadius);
    setLoading(false);

    if (readingsRef.current.length >= MIN_READINGS) {
      setStabilizing(false);
      if (stabilizeTimerRef.current) {
        clearTimeout(stabilizeTimerRef.current);
        stabilizeTimerRef.current = null;
      }
    }
  }, [office]);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung browser ini');
      setLoading(false);
      setStabilizing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        processReading(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
      },
      (err) => {
        setError(err.message);
        setPermissionDenied(err.code === 1);
        setLoading(false);
        setStabilizing(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [processReading]);

  useEffect(() => {
    if (!officeId) {
      setLoading(false);
      setStabilizing(false);
      return;
    }
    getOffices().then(list => {
      const found = list.find(o => o.id === officeId);
      setOffice(found || null);
    }).catch(() => {});
  }, [officeId]);

  useEffect(() => {
    if (!office) return;

    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung browser ini');
      setLoading(false);
      setStabilizing(false);
      return;
    }

    readingsRef.current = [];
    setStabilizing(true);
    setStabilizeProgress(0);

    const successCallback = (position: GeolocationPosition) => {
      processReading(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
    };

    const errorCallback = (err: GeolocationPositionError) => {
      setError(err.message);
      setPermissionDenied(err.code === 1);
      setLoading(false);
      setStabilizing(false);
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
    });

    navigator.geolocation.watchPosition(successCallback, errorCallback, {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 5000,
    });

    stabilizeTimerRef.current = setTimeout(() => {
      if (readingsRef.current.length > 0) {
        setStabilizing(false);
      } else {
        setStabilizing(false);
      }
    }, STABILIZE_TIMEOUT);

    return () => {
      if (stabilizeTimerRef.current) {
        clearTimeout(stabilizeTimerRef.current);
      }
    };
  }, [office, processReading]);

  const refreshLocation = useCallback(() => {
    if (!office) return;
    readingsRef.current = [];
    setLoading(true);
    setStabilizing(true);
    setStabilizeProgress(0);

    getCurrentPosition();

    stabilizeTimerRef.current = setTimeout(() => {
      if (readingsRef.current.length > 0) {
        setStabilizing(false);
      }
    }, STABILIZE_TIMEOUT);
  }, [office, getCurrentPosition]);

  return {
    location, distance, isWithinRadius, loading, stabilizing, stabilizeProgress,
    error, permissionDenied, refreshLocation, office,
    minReadings: MIN_READINGS,
  };
}
