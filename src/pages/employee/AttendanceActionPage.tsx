import React, { useState, useEffect } from 'react';
import {
  MapPin, Camera,
  CheckCircle2, X, LogIn, LogOut
} from 'lucide-react';
import QRScannerModal from '../../components/attendance/QRScannerModal';
import CooldownLockMessage from '../../components/attendance/CooldownLockMessage';
import LocationStatusCard from '../../components/attendance/LocationStatusCard';
import { useAuth } from '../../hooks/useAuth';
import { useGeofence } from '../../hooks/useGeofence';
import { useAttendanceCooldown } from '../../hooks/useAttendanceCooldown';
import { checkIn, checkOut, getTodayAttendance } from '../../services/api/attendances';
import { parseQRData } from '../../services/api/qr';
import { getJakartaHour } from '../../utils/timezone';

type AttendanceMode = 'checkin' | 'checkout';
type AppState = 'main' | 'scanner' | 'location_error' | 'cooldown' | 'success';
type AttendanceAction = 'checkin' | 'checkout';

const AttendanceActionPage: React.FC = () => {
  const { user } = useAuth();
  const { distance, location, loading: locationLoading, error: locationError, permissionDenied, refreshLocation } = useGeofence();
  const { remainingTime, hasCheckedIn, recordCheckIn, clearCheckIn } = useAttendanceCooldown();

  const [mode, setMode] = useState<AttendanceMode>('checkin');
  const [appState, setAppState] = useState<AppState>('main');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);
  const [bypassCooldown, setBypassCooldown] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [successAction, setSuccessAction] = useState<AttendanceAction | null>(null);
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
    if (mode === 'checkout' && remainingTime > 0 && !bypassCooldown) {
      setAppState('cooldown');
    }
  }, [checkedInToday, hasCheckedIn, mode, remainingTime, checkedOutToday, bypassCooldown]);

  useEffect(() => {
    if (checkedOutToday) {
      setMode('checkin');
    } else if (checkedInToday) {
      setMode('checkout');
    }
  }, [checkedInToday, checkedOutToday]);

  const handleOpenScanner = () => {
    if (permissionDenied || (!location && locationError)) {
      setAppState('location_error');
      return;
    }
    if (mode === 'checkout' && remainingTime > 0 && !bypassCooldown) {
      setAppState('cooldown');
      return;
    }
    setScannerKey(k => k + 1);
    setAppState('scanner');
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
        setAppState('main');
        return;
      }
      if (qrData.office_id !== user.officeId) {
        alert('QR Code ini untuk kantor lain.');
        setAppState('main');
        return;
      }
      if (currentMode === 'checkin') {
        const isOvertime = getJakartaHour() >= 18;
        const inserted = await checkIn(user.id, user.officeId, lat, lng, isOvertime ? 'hadir_lembur' : 'hadir', isOvertime);
        recordCheckIn();
        setCheckedInToday(true);
        setTodayAttendance(inserted);
        setSuccessAction('checkin');
        setAppState('success');
      } else {
        if (todayAttendance) {
          const updated = await checkOut(todayAttendance.id, lat, lng);
          setTodayAttendance(updated);
          setCheckedOutToday(true);
          clearCheckIn();
          setSuccessAction('checkout');
          setAppState('success');
        } else {
          alert('Data absen masuk tidak ditemukan. Silakan muat ulang halaman.');
          setAppState('main');
        }
      }
    } catch (err: any) {
      console.error('Attendance error:', err);
      const msg = err?.message || 'Unknown error';
      alert('Gagal: ' + msg);
      setAppState('main');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackFromCooldown = () => setAppState('main');
  const handleBackFromLocation = () => setAppState('main');
  const handleCloseScanner = () => setAppState('main');
  const handleBackFromSuccess = () => { setAppState('main'); };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  if (appState !== 'main') {
    return (
      <>
        {appState === 'scanner' && <QRScannerModal key={scannerKey} onClose={handleCloseScanner} onScan={handleScanSuccess} />}
        {appState === 'cooldown' && <CooldownLockMessage onBack={handleBackFromCooldown} remainingMs={remainingTime} />}
        {appState === 'location_error' && (
          <LocationStatusCard
            onBack={handleBackFromLocation}
            onRetry={refreshLocation}
            distance={distance || 0}
            officeName="Kantor"
            errorType={permissionDenied ? 'permission' : 'out_of_range'}
          />
        )}
        {appState === 'success' && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center border border-stone-200/80">
              <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={3} />
              </div>
              <h2 className="text-xl font-black text-[#1C1917] mb-2">
                {successAction === 'checkin' ? 'Absen Masuk Berhasil' : 'Absen Pulang Berhasil'}
              </h2>
              <p className="text-sm text-stone-500 mb-8">{formatTime(currentTime)} WIB</p>
              <button
                onClick={handleBackFromSuccess}
                className="w-full bg-[#C23E00] hover:bg-[#a13300] text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-base"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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
            permissionDenied ? 'bg-amber-50' : 'bg-emerald-50'
          }`}>
            {permissionDenied ? (
              <X className="w-5 h-5 text-amber-500" />
            ) : (
              <MapPin className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-[#1C1917] text-base">Status Lokasi</h3>
            <p className="text-sm text-stone-500">
              {locationLoading ? 'Mendeteksi...' : permissionDenied
                ? 'Akses lokasi ditolak'
                : location
                  ? `Lokasi terdeteksi (${distance?.toFixed(0)}m dari kantor)`
                  : 'Menunggu lokasi...'
              }
            </p>
          </div>
        </div>
        {permissionDenied && (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg font-medium border border-amber-200">
            Harap aktifkan GPS di HP Anda untuk melanjutkan presensi.
          </p>
        )}
      </div>

      <button
        onClick={handleOpenScanner}
        disabled={locationLoading || submitting || checkedOutToday}
        className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 shadow-md transition-all ${
          !locationLoading && !submitting && !checkedOutToday
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
    </div>
  );
};

export default AttendanceActionPage;
