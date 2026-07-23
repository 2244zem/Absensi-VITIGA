import { useState, useEffect } from 'react';
import { getOffices } from '../services/api/offices';
import { calculateDistance } from '../utils/haversine';
import type { Office } from '../types/office';

interface Location {
  lat: number;
  lng: number;
  accuracy: number;
}

export function useGeofence(officeId?: string | null) {
  const [location, setLocation] = useState<Location | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [office, setOffice] = useState<Office | null>(null);

  useEffect(() => {
    if (!officeId) {
      setLoading(false);
      return;
    }
    getOffices().then(list => {
      const found = list.find(o => o.id === officeId);
      setOffice(found || null);
    }).catch(() => {});
  }, [officeId]);

  useEffect(() => {
    if (!office) {
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung browser ini');
      setLoading(false);
      return;
    }

    const successCallback = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      setLocation({ lat: latitude, lng: longitude, accuracy });
      const dist = calculateDistance(latitude, longitude, office.latitude, office.longitude);
      setDistance(dist);
      setIsWithinRadius(dist <= (office.radius_meters || 50));
      setLoading(false);
    };

    const errorCallback = (err: GeolocationPositionError) => {
      setError(err.message);
      setPermissionDenied(err.code === 1);
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
    });

    const watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 5000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [office]);

  const refreshLocation = () => {
    if (!office) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({ lat: latitude, lng: longitude, accuracy });
        const dist = calculateDistance(latitude, longitude, office.latitude, office.longitude);
        setDistance(dist);
        setIsWithinRadius(dist <= (office.radius_meters || 50));
        setLoading(false);
      },
      (err) => { setError(err.message); setPermissionDenied(err.code === 1); setLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return { location, distance, isWithinRadius, loading, error, permissionDenied, refreshLocation, office };
}
