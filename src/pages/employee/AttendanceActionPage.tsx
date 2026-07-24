import React, { useState, useEffect } from 'react';
import {
  MapPin, Camera, X, LogIn, LogOut, Clock, ShieldAlert, CheckCircle2
} from 'lucide-react';
import QRScannerModal from '../../components/attendance/QRScannerModal';
import { useAuth } from '../../hooks/useAuth';
import { useGeofence } from '../../hooks/useGeofence';
import { useAttendanceCooldown } from '../../hooks/useAttendanceCooldown';
import { checkIn, checkOut, getTodayAttendance } from '../../services/api/attendances';
import { parseQRData } from '../../services/api/qr';
import { getJakartaHour } from '../../utils/timezone';

type AttendanceMode = 'checkin' | 'checkout';

const AttendanceActionPage: React.FC = () => {
  const { user } = useAuth();
  const { distance, isWithinRadius, location, loading: locationLoading, error: locationError, permissionDenied } = useGeofence();
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

  const canCheckout = remainingTime <= 0;

  const handleOpenScanner = () => {
    if (permissionDenied || (!location && locationError)) {
      return;
    }
    if (mode === 'checkout' && remainingTime > 0 && !bypassCooldown) {
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
      if (!qrData) {
        alert('QR Code tidak valid.');
        setScanning(false);
        return;
      }
      if (qrData.office_id !== user.officeId) {
        alert('QR Code ini untuk kantor lain.');
        setScanning(false);
        return;
      }
      if (currentMode === 'checkin') {
        const isOvertime = getJakartaHour() >= 18;
        const inserted = await checkIn(user.id, user.officeId, lat, lng, isOvertime ? 'hadir_lembur' : 'hadir', isOvertime);
        recordCheckIn();
        setCheckedInToday(true);
        setTodayAttendance(inserted);
        setSuccessMsg('Absen Masuk Berhasil');
      } else {
        if (todayAttendance) {
          const updated = await checkOut(todayAttendance.id, lat, lng);
          setTodayAttendance(updated);
          setCheckedOutToday(true);
          clearCheckIn();
          setSuccessMsg('Absen Pulang Berhasil');
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
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
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
            <h3 className="font-bold text-[#1C1917] text-base">Status Lokasi</h3>
            <p className="text-sm text-stone-500">
              {locationLoading ? 'Mendeteksi lokasi...' : permissionDenied
                ? 'Akses lokasi ditolak'
                : isWithinRadius
                  ? `Anda berada dalam area kantor (${distance?.toFixed(0)}m)`
                  : `Anda berada ${distance?.toFixed(0)}m dari kantor`
              }
            </p>
          </div>
        </div>
        {permissionDenied && (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg font-medium border border-amber-200">
            Harap aktifkan GPS di HP Anda untuk melanjutkan presensi.
          </p>
        )}
        {!isWithinRadius && !locationLoading && !permissionDenied && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg font-medium border border-red-100">
            Anda berada di luar area kantor. Silakan mendekat ke area kantor untuk melakukan absensi.
          </p>
        )}
      </div>

      {mode === 'checkout' && !canCheckout && !bypassCooldown && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Absen Pulang Belum Tersedia</p>
            <p className="text-xs text-amber-700 mt-1">
              {cooldownEndTime
                ? `Bisa absen pulang pada pukul ${cooldownEndTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`
                : `Harap tunggu ${cooldownMinutes} menit setelah absen masuk`}
            </p>
            <p className="text-xs text-amber-600 mt-1 font-mono">
              Sisa waktu: {formatRemainingTime(remainingTime)}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleOpenScanner}
        disabled={locationLoading || submitting || checkedOutToday || !isWithinRadius || (mode === 'checkout' && !canCheckout && !bypassCooldown)}
        className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 shadow-md transition-all ${
          !locationLoading && !submitting && !checkedOutToday && isWithinRadius && (mode === 'checkin' || canCheckout || bypassCooldown)
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
