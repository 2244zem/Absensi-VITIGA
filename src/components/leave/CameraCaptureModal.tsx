import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, Image as ImageIcon, RotateCcw } from 'lucide-react';

interface CameraCaptureModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'gallery'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch {
      setCameraError('Kamera tidak dapat diakses. Izinkan akses kamera di browser Anda.');
    }
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) { setCapturedBlob(blob); setCapturedPreview(URL.createObjectURL(blob)); }
      }, 'image/jpeg', 0.85);
      stopCamera();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onCapture(file); handleClose(); }
  };

  const handleConfirm = () => {
    if (capturedBlob) {
      const file = new File([capturedBlob], 'surat-dokter.jpg', { type: 'image/jpeg' });
      onCapture(file); handleClose();
    }
  };

  const handleClose = () => { stopCamera(); if (capturedPreview) URL.revokeObjectURL(capturedPreview); onClose(); };

  const handleRetake = () => {
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedBlob(null); setCapturedPreview(null); setMode('camera');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center px-5 py-4 border-b border-stone-100">
          <h2 className="font-bold text-[#1C1917]">Ambil Foto Surat Dokter</h2>
          <button onClick={handleClose} className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {!capturedPreview ? (
            <>
              <div className="flex gap-2 mb-4">
                <button onClick={() => { setMode('camera'); startCamera(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${mode === 'camera' ? 'border-[#C23E00] text-[#C23E00] bg-orange-50' : 'border-stone-200 text-stone-600'}`}>
                  <Camera className="w-4 h-4" /> Kamera
                </button>
                <button onClick={() => { setMode('gallery'); stopCamera(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${mode === 'gallery' ? 'border-[#C23E00] text-[#C23E00] bg-orange-50' : 'border-stone-200 text-stone-600'}`}>
                  <ImageIcon className="w-4 h-4" /> Galeri
                </button>
              </div>

              {mode === 'camera' && (
                <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3]">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {!stream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <Camera className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm opacity-70">{cameraError || 'Klik untuk aktifkan kamera'}</p>
                      <button onClick={startCamera} className="mt-3 px-4 py-2 bg-[#C23E00] rounded-lg text-sm font-semibold">Aktifkan Kamera</button>
                    </div>
                  )}
                </div>
              )}

              {mode === 'gallery' && (
                <div onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#C23E00] transition-colors">
                  <ImageIcon className="w-10 h-10 text-stone-400 mb-3" />
                  <p className="text-sm text-stone-600 font-medium">Klik untuk pilih file</p>
                  <p className="text-xs text-stone-400 mt-1">JPG, PNG, PDF (Maks. 5MB)</p>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                </div>
              )}

              {mode === 'camera' && stream && (
                <button onClick={capturePhoto} className="w-full mt-4 py-3 bg-[#C23E00] text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5" /> Ambil Foto
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-full rounded-xl overflow-hidden border border-stone-200">
                <img src={capturedPreview} alt="Captured" className="w-full aspect-[4/3] object-contain bg-stone-100" />
              </div>
              <div className="flex gap-3 w-full mt-4">
                <button onClick={handleRetake} className="flex-1 py-3 bg-stone-100 text-stone-700 font-semibold rounded-xl flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Ambil Ulang
                </button>
                <button onClick={handleConfirm} className="flex-1 py-3 bg-[#C23E00] text-white font-bold rounded-xl">Gunakan Foto</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCaptureModal;
