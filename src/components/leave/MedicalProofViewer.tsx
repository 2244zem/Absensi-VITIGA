import React, { useState, useEffect } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface MedicalProofViewerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName?: string;
  date?: string;
  type?: string;
  notes?: string;
  proofUrl?: string | null;
}

const MedicalProofViewer: React.FC<MedicalProofViewerProps> = ({
  isOpen, onClose, employeeName = 'Karyawan', date = '-', type = '-', notes = '-', proofUrl,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!proofUrl) return;
    if (proofUrl.startsWith('blob:') || proofUrl.startsWith('http')) {
      setSignedUrl(proofUrl);
      return;
    }
    supabase.storage.from('medical-documents').createSignedUrl(proofUrl, 3600).then(({ data }) => {
      if (data) setSignedUrl(data.signedUrl);
    }).catch(() => setSignedUrl(proofUrl));
  }, [proofUrl]);

  if (!isOpen) return null;

  const isImage = signedUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(signedUrl);
  const isPDF = signedUrl && /\.pdf$/i.test(signedUrl);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 shrink-0">
          <h2 className="font-bold text-base text-[#1C1917]">Detail Bukti Surat Dokter - {employeeName}</h2>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          <div className="flex-1 bg-stone-100 flex items-center justify-center p-6 border-r border-stone-100">
            <div className="w-full h-full bg-white shadow-sm border border-stone-200 rounded-xl flex items-center justify-center overflow-hidden">
              {signedUrl ? (
                isImage ? (
                  <img src={signedUrl} alt="Surat Dokter" className="object-contain h-full w-full" />
                ) : isPDF ? (
                  <div className="flex flex-col items-center gap-3 text-stone-400">
                    <FileText className="w-16 h-16" />
                    <p className="text-sm font-medium">File PDF</p>
                    <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-[#C23E00] text-xs underline">Buka file PDF</a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-stone-400">
                    <FileText className="w-16 h-16" />
                    <p className="text-sm font-medium">File tidak dapat ditampilkan</p>
                  </div>
                )
              ) : (
                proofUrl ? (
                  <div className="flex items-center justify-center text-stone-400">
                    <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-[#C23E00] rounded-full" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-stone-400">
                    <FileText className="w-16 h-16" />
                    <p className="text-sm font-medium">Tidak ada bukti surat</p>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="w-full md:w-80 p-6 flex flex-col bg-white">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-6">Informasi Pengajuan</h3>
            <div className="space-y-5 flex-1">
              <div>
                <p className="text-xs text-stone-500 mb-1">Nama Karyawan</p>
                <p className="font-semibold text-[#1C1917]">{employeeName}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-1">Tanggal Pengajuan</p>
                <p className="font-semibold text-[#1C1917]">{date}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-1">Jenis</p>
                <span className="inline-block px-3 py-1 bg-stone-100 border border-stone-200 rounded text-sm font-medium text-stone-700">{type}</span>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-1">Catatan Karyawan</p>
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 text-sm text-stone-600 italic">&ldquo;{notes}&rdquo;</div>
              </div>
            </div>
            <div className="pt-6 mt-4 border-t border-stone-100 flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">Tutup</button>
              {signedUrl && (
                <a href={signedUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-[#C23E00] border-2 border-[#C23E00] hover:bg-orange-50 rounded-xl transition-colors">
                  <Download className="w-4 h-4" /> Download
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalProofViewer;
