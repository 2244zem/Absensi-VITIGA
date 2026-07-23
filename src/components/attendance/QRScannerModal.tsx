import React, { useEffect, useRef, useState } from 'react';
import { X, Flashlight, SwitchCamera, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onClose: () => void;
  onScan: (token: string) => void;
}

function stopCamera(scanner: Html5Qrcode) {
  try { scanner.stop().catch(() => {}); } catch {}
  try { scanner.clear(); } catch {}
  const el = document.getElementById('qr-reader-container');
  if (el) {
    el.querySelectorAll('video').forEach(v => {
      if (v.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        v.srcObject = null;
      }
    });
  }
}

const QRScannerModal: React.FC<QRScannerProps> = ({ onClose, onScan }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [attempt, setAttempt] = useState(0);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (scanning) return;
    let active = true;
    const scanner = new Html5Qrcode('qr-reader-container');
    scannerRef.current = scanner;
    setError('');

    scanner
      .start(
        { facingMode: cameraFacing },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.777,
        },
        (decodedText: string) => {
          if (!active || scanning) return;
          active = false;
          setScanning(true);
          onScanRef.current(decodedText);
        },
        () => {},
      )
      .catch((err: any) => {
        if (active) setError(err?.message || 'Gagal mengakses kamera');
      });

    return () => {
      active = false;
      stopCamera(scanner);
      if (scannerRef.current === scanner) scannerRef.current = null;
    };
  }, [cameraFacing, attempt, scanning]);

  useEffect(() => {
    const id = 'qr-scanner-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      #qr-reader-container {
        overflow: hidden !important;
      }
      #qr-reader-container video {
        object-fit: cover !important;
        width: 100% !important;
        height: 100% !important;
      }
    `;
    document.head.appendChild(style);
    return () => { const s = document.getElementById(id); if (s) s.remove(); };
  }, []);

  const toggleTorch = async () => {
    try {
      await scannerRef.current?.applyVideoConstraints({ advanced: [{ torch: !torchOn }] } as any);
      setTorchOn(!torchOn);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10 shrink-0">
        <h2 className="text-white font-semibold text-sm leading-tight">
          {scanning ? 'Memproses...' : 'Arahkan Kamera ke QR Code Kantor'}
        </h2>
        <button onClick={onClose} className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-sm">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black min-h-0">
        <div id="qr-reader-container" className="absolute inset-0" />

        {!scanning && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
            <div className="bg-white rounded-2xl p-6 text-center max-w-xs mx-4">
              <p className="text-sm text-stone-700 mb-4">{error}</p>
              <button onClick={() => setAttempt(a => a + 1)}
                className="bg-[#C23E00] text-white px-6 py-2 rounded-xl font-semibold text-sm">
                Coba Lagi
              </button>
            </div>
          </div>
        )}

        {scanning && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70">
            <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
            <p className="text-white text-sm font-semibold">Memproses absensi...</p>
          </div>
        )}

        {!scanning && !error && (
          <p className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm px-10 z-10">
            Posisikan QR Code di dalam bingkai untuk presensi
          </p>
        )}
      </div>

      {!scanning && (
        <div className="pb-12 pt-6 px-8 flex justify-center gap-8 bg-gradient-to-t from-black/90 to-transparent z-10 shrink-0">
          <button onClick={toggleTorch} className="p-4 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md">
            <Flashlight className="w-6 h-6" />
          </button>
          <button onClick={() => setCameraFacing(f => f === 'environment' ? 'user' : 'environment')}
            className="p-4 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md">
            <SwitchCamera className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScannerModal;
