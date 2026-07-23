import React, { useEffect, useRef, useState } from 'react';
import { X, Flashlight, SwitchCamera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onClose: () => void;
  onScan: (token: string) => void;
}

const QRScannerModal: React.FC<QRScannerProps> = ({ onClose, onScan }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const scanner = new Html5Qrcode('qr-reader-container');
    scannerRef.current = scanner;
    setError('');

    scanner
      .start(
        { facingMode: cameraFacing },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          if (!active) return;
          active = false;
          try { scanner.stop().catch(() => {}); scanner.clear(); } catch {}
          onScanRef.current(decodedText);
        },
        () => {},
      )
      .catch((err: any) => {
        if (active) setError(err?.message || 'Gagal mengakses kamera');
      });

    return () => {
      active = false;
      try { scanner.stop().catch(() => {}); scanner.clear(); } catch {}
      if (scannerRef.current === scanner) scannerRef.current = null;
    };
  }, [cameraFacing, attempt]);

  const toggleTorch = async () => {
    try {
      await scannerRef.current?.applyVideoConstraints({ advanced: [{ torch: !torchOn }] } as any);
      setTorchOn(!torchOn);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <h2 className="text-white font-semibold text-sm leading-tight">
          Arahkan Kamera ke QR Code Kantor
        </h2>
        <button onClick={onClose} className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-sm">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div id="qr-reader-container" className="absolute inset-0 w-full h-full" />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="bg-white rounded-2xl p-6 text-center max-w-xs mx-4">
              <p className="text-sm text-stone-700 mb-4">{error}</p>
              <button onClick={() => setAttempt(a => a + 1)}
                className="bg-[#C23E00] text-white px-6 py-2 rounded-xl font-semibold text-sm">
                Coba Lagi
              </button>
            </div>
          </div>
        )}

        <div className="relative w-64 h-64 z-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#C23E00] rounded-tl-xl"></div>
          <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#C23E00] rounded-tr-xl"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#C23E00] rounded-bl-xl"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#C23E00] rounded-br-xl"></div>
          <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-[#C23E00] shadow-[0_0_8px_#C23E00] opacity-80 animate-pulse transform -translate-y-1/2"></div>
        </div>

        <p className="absolute bottom-32 left-0 right-0 text-center text-white/70 text-sm px-10 z-10">
          Posisikan QR Code di dalam bingkai untuk melakukan presensi
        </p>
      </div>

      <div className="pb-12 pt-6 px-8 flex justify-center gap-8 bg-gradient-to-t from-black/90 to-transparent z-10">
        <button onClick={toggleTorch} className="p-4 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md">
          <Flashlight className="w-6 h-6" />
        </button>
        <button onClick={() => setCameraFacing(f => f === 'environment' ? 'user' : 'environment')}
          className="p-4 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md">
          <SwitchCamera className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default QRScannerModal;
