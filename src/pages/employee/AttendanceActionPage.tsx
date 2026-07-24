import React, { useState, useEffect } from 'react';
import {
  MapPin, Camera, X, LogIn, LogOut, Clock, ShieldAlert, CheckCircle2, RefreshCw
} from 'lucide-react';
import QRScannerModal from '../../components/attendance/QRScannerModal';
import { useAuth } from '../../hooks/useAuth';
import { useGeofence } from '../../hooks/useGeofence';
import { useAttendanceCooldown } from '../../hooks/useAttendanceCooldown';
import { checkIn, checkOut, getTodayAttendance, getServerCooldown } from '../../services/api/attendances';
import { parseQRData, validateQRToken } from '../../services/api/qr';
import { logLocation } from '../../services/api/locationLogs';
import { createNotification } from '../../services/api/notifications';
import { getJakartaHour } from '../../utils/timezone';

type AttendanceMode = 'checkin' | 'checkout';

const AttendanceActionPage: React.FC = () => {
  const { user } = useAuth();
  const { distance, isWithinRadius, location, loading: locationLoading, error: locationError, permissionDenied, stabilizing, stabilizeProgress, minReadings, refreshLocation } = useGeofence(user?.officeId);
  const { remainingTime, hasCheckedIn, recordCheckIn, clearCheckIn, formatRemainingTime, checkInTime, cooldownMinutes } = useAttendanceCooldown();

  const [mode, setMode] = useState<AttendanceMode>('checkin');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [bypassCooldown, setBypassCooldown] = useState(false);
  const [serverCooldown, setServerCooldown] = useState<{ can_checkout: boolean; remaining_seconds: number } | null>(null);
  const showDevTools = import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    getTodayAttendance(user.id).then(data => {
      if (data) {
        setTodayAttendance(data);
        setCheckedInToday(true);
        if (data.check_out) {
          setCheckedOutToday(true);
        }
      }
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (checkedOutToday) {
      setMode('checkin');
    } else if (checkedInToday) {
      setMode('checkout');
    }
  }, [checkedInToday, checkedOutToday]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (successMsg) {
      timer = setTimeout(() => setSuccessMsg(null), 4000);
    }
    return () => clearTimeout(timer);
  }, [successMsg]);

  useEffect(() => {
    if (!user || !checkedInToday || checkedOutToday) return;
    getServerCooldown(user.id).then(setServerCooldown).catch(() => {});
    const interval = setInterval(() => {
      getServerCooldown(user.id).then(setServerCooldown).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [user, checkedInToday, checkedOutToday]);

  const effectiveCooldown = serverCooldown !== null
    ? (!serverCooldown.can_checkout)
    : (remainingTime > 0);

  const effectiveRemainingSeconds = serverCooldown !== null
    ? serverCooldown.remaining_seconds
    : remainingTime;

  const canCheckout = !effectiveCooldown;

  const handleOpenScanner = () => {
    if (mode === 'checkout' && effectiveCooldown && !bypassCooldown) {
      return;
    }
    setScannerKey(k => k + 1);
    setScanning(true);
  };

  const handleScanSuccess = async (scanned: string) => {
    if (!user || submitting) return;
    const lat = location?.lat ?? 0;
    const lng = location?.lng ?? 0;
    const currentMode = mode;
    setSubmitting(true);
    try {
      const qrData = parseQRData(scanned);
      console.log('[QR] scanned:', scanned, 'parsed:', qrData);
      if (!qrData) {
        alert('QR Code tidak valid.');
        setScanning(false);
        return;
      }
      const validated = await validateQRToken(qrData.token);
      console.log('[QR] validated:', validated);
      if (!validated) {
        alert('QR Code sudah kedaluwarsa atau tidak valid. Silakan scan QR terbaru.');
        setScanning(false);
        return;
      }
      const officeId = validated.office_id;
      if (officeId !== user.officeId) {
        alert('QR Code ini untuk kantor lain.');
        setScanning(false);
        return;
      }
      if (currentMode === 'checkin') {
        const isOvertime = getJakartaHour() >= 18;
        const inserted = await checkIn(user.id, officeId, lat, lng, isOvertime ? 'hadir_lembur' : 'hadir', isOvertime);
        recordCheckIn();
        setCheckedInToday(true);
        setTodayAttendance(inserted);
        setSuccessMsg('Absen Masuk Berhasil');
        createNotification(user.id, {
          title: isOvertime ? 'Absen Lembur Berhasil' : 'Absen Masuk Berhasil',
          message: `Anda berhasil absen ${isOvertime ? 'lembur' : 'masuk'} pada ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`,
          type: isOvertime ? 'lembur' : 'masuk',
        }).catch(() => {});
        logLocation({
          userId: user.id, attendanceId: inserted?.id, officeId: user.officeId,
          action: 'checkin', latitude: lat, longitude: lng,
          accuracy: location?.accuracy, distanceToOffice: distance,
        }).catch(e => console.error('logLocation checkin gagal:', e));
      } else {
        if (todayAttendance) {
          // Validate record still exists before checkout
          const today = await getTodayAttendance(user.id);
          if (!today || today.id !== todayAttendance.id) {
            setCheckedInToday(false);
            setTodayAttendance(null);
            alert('Data absen masuk tidak valid atau sudah diproses. Silakan refresh dan absen ulang.');
            setScanning(false);
            return;
          }
          const updated = await checkOut(todayAttendance.id, lat, lng);
          setTodayAttendance(updated);
          setCheckedOutToday(true);
          clearCheckIn();
          setSuccessMsg('Absen Pulang Berhasil');
          createNotification(user.id, {
            title: 'Absen Pulang Berhasil',
            message: `Anda berhasil absen pulang pada ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`,
            type: 'pulang',
          }).catch(() => {});
          logLocation({
            userId: user.id, attendanceId: todayAttendance.id, officeId: user.officeId,
            action: 'checkout', latitude: lat, longitude: lng,
            accuracy: location?.accuracy, distanceToOffice: distance,
          }).catch(e => console.error('logLocation checkout gagal:', e));
        } else {
          alert('Data absen masuk tidak ditemukan. Silakan muat ulang halaman.');
        }
      }
    } catch (err: any) {
      console.error('Attendance error:', err);
      const msg = err?.message || 'Unknown error';
      alert('Gagal: ' + msg);
    } finally {
      setSubmitting(false);
      setScanning(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const cooldownEndTime = checkInTime
    ? new Date(checkInTime.getTime() + cooldownMinutes * 60 * 1000)
    : null;

  return (
    <div className="flex flex-col gap-6 relative">
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slideDown">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold text-sm">{successMsg} — {formatTime(currentTime)} WIB</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-2 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-[#1C1917] mb-1">
          Halo, {user?.fullName || 'Karyawan'}
        </h1>
        <p className="text-sm text-stone-500">{formatDate(currentTime)}</p>
        <p className="text-lg font-semibold text-[#C23E00]">{formatTime(currentTime)} WIB</p>
      </div>

      {showDevTools && (
        <div className="space-y-2">
          <label className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer select-none">
            <span className="text-xs font-semibold text-amber-800">
              Mode Uji Coba: lewati cooldown 20 menit
            </span>
            <input
              type="checkbox"
              checked={bypassCooldown}
              onChange={(e) => setBypassCooldown(e.target.checked)}
              className="w-4 h-4 accent-[#C23E00]"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-bold text-stone-700">
          <MapPin className="w-3.5 h-3.5 text-[#C23E00]" />
          {user?.officeId || 'Kantor'}
        </span>
        {checkedInToday && !checkedOutToday && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-bold text-emerald-700">
            <CheckCircle2 className="w-3 h-3" /> Sudah Absen Masuk
          </span>
        )}
        {checkedOutToday && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-[10px] font-bold text-blue-700">
            <CheckCircle2 className="w-3 h-3" /> Selesai
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl p-1 flex border border-stone-200/80 shadow-sm">
        <button
          onClick={() => setMode('checkin')}
          disabled={checkedInToday}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
            mode === 'checkin'
              ? 'bg-[#C23E00] text-white shadow-sm'
              : 'text-stone-600'
          } ${checkedInToday ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <LogIn className="w-5 h-5" />
          Absen Masuk
        </button>
        <button
          onClick={() => setMode('checkout')}
          disabled={!checkedInToday || checkedOutToday}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
            mode === 'checkout'
              ? 'bg-[#C23E00] text-white shadow-sm'
              : 'text-stone-600'
          } ${(!checkedInToday || checkedOutToday) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <LogOut className="w-5 h-5" />
          Absen Pulang
        </button>
      </div>

      <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              permissionDenied ? 'bg-amber-50' : isWithinRadius ? 'bg-emerald-50' : 'bg-red-50'
            }`}>
              {permissionDenied ? (
                <X className="w-5 h-5 text-amber-500" />
              ) : isWithinRadius ? (
                <MapPin className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-[#1C1917] text-base">Lokasi</h3>
              <p className="text-sm text-stone-500">
                {stabilizing ? 'Memantapkan sinyal GPS...' : permissionDenied
                  ? 'Akses lokasi ditolak'
                  : isWithinRadius
                    ? `Dalam area (${distance?.toFixed(0)}m)`
                    : `${distance?.toFixed(0)}m dari kantor`
                }
              </p>
            </div>
          </div>
          <button
            onClick={refreshLocation}
            disabled={locationLoading}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-[#C23E00] transition-all"
            title="Refresh GPS"
          >
            <RefreshCw className={`w-5 h-5 ${locationLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {stabilizing && !permissionDenied && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
              <span>Memantapkan sinyal GPS ({stabilizeProgress}/{minReadings})</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-1.5">
              <div
                className="bg-[#C23E00] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((stabilizeProgress / minReadings) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {location && !stabilizing && !permissionDenied && (
          <p className="text-[10px] text-stone-400 mb-3">
            Akurasi GPS: ±{location.accuracy.toFixed(0)}m
          </p>
        )}

        {permissionDenied && (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg font-medium border border-amber-200">
            Izin lokasi tidak diaktifkan. Lokasi tidak terekam dalam absensi.
          </p>
        )}
        {!isWithinRadius && !locationLoading && !permissionDenied && !stabilizing && location && (
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg font-medium border border-amber-200">
            Jarak Anda {distance?.toFixed(0)}m dari kantor (di luar area). Lokasi tetap dicatat.
          </p>
        )}
      </div>

      {mode === 'checkout' && effectiveCooldown && !bypassCooldown && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Absen Pulang Belum Tersedia</p>
            <p className="text-xs text-amber-700 mt-1">
              {serverCooldown
                ? `Harap tunggu ${Math.ceil(effectiveRemainingSeconds / 60)} menit setelah absen masuk`
                : cooldownEndTime
                  ? `Bisa absen pulang pada pukul ${cooldownEndTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`
                  : `Harap tunggu ${cooldownMinutes} menit setelah absen masuk`}
            </p>
            <p className="text-xs text-amber-600 mt-1 font-mono">
              Sisa waktu: {formatRemainingTime(effectiveRemainingSeconds)}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleOpenScanner}
        disabled={submitting || checkedOutToday || (mode === 'checkout' && effectiveCooldown && !bypassCooldown)}
        className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 shadow-md transition-all ${
          !submitting && !checkedOutToday && (mode === 'checkin' || canCheckout || bypassCooldown)
            ? 'bg-[#C23E00] hover:bg-[#a13300] active:scale-[0.98]'
            : 'bg-stone-300 cursor-not-allowed'
        }`}
      >
        <Camera className="w-6 h-6" />
        {submitting ? 'Memproses...' : checkedOutToday ? 'Absensi Selesai Hari Ini' : 'Buka Kamera & Scan QR'}
      </button>

      {!checkedOutToday && (
        <p className="text-sm text-stone-500 text-center">
          Scan QR Code yang ditampilkan di layar TV kantor untuk {mode === 'checkin' ? 'Absen Masuk' : 'Absen Pulang'}
        </p>
      )}

      {scanning && (
        <QRScannerModal
          key={scannerKey}
          onClose={() => setScanning(false)}
          onScan={handleScanSuccess}
        />
      )}
    </div>
  );
};

export default AttendanceActionPage;
