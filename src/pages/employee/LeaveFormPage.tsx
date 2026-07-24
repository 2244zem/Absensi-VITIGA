import React, { useState } from 'react';
import { Calendar, CheckCircle2, UploadCloud, Camera, Image as ImageIcon, X, ArrowLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUploadProof } from '../../hooks/useUploadProof';
import { submitLeave } from '../../services/api/attendances';

const LeaveFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { upload, uploading } = useUploadProof();

  const [leaveType, setLeaveType] = useState<'sakit' | 'izin'>('sakit');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) {
      setError('File maksimal 5MB');
      return;
    }
    setFile(selected);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setError(null);
    if (!startDate || !endDate) { setError('Pilih tanggal mulai dan selesai'); return; }
    if (!startTime) { setError('Pilih jam mulai'); return; }
    if (!endTime) { setError('Pilih jam selesai'); return; }
    if (!notes.trim()) { setError('Tuliskan alasan pengajuan'); return; }
    if (leaveType === 'sakit' && !file) { setError('Lampirkan surat dokter untuk izin sakit'); return; }

    setSubmitting(true);
    try {
      let proofUrl: string | null = null;
      if (file) proofUrl = await upload(user.id, file);

      await submitLeave({
        userId: user.id,
        officeId: user.officeId,
        status: leaveType,
        startDate,
        endDate,
        startTime,
        endTime,
        notes: notes.trim(),
        proofUrl,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim pengajuan');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white rounded-2xl p-8 border border-stone-200/80 shadow-sm w-full flex flex-col items-center">
          <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-black text-[#1C1917] mb-2">Pengajuan Terkirim</h2>
          <p className="text-sm text-stone-500 text-center mb-6 leading-relaxed">
            Pengajuan {leaveType === 'sakit' ? 'sakit' : 'izin'} Anda telah berhasil dikirim
            <br />
            <span className="font-semibold text-stone-700">
              {new Date(startDate + 'T' + startTime).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} {startTime} WIB
              {' — '}
              {new Date(endDate + 'T' + endTime).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} {endTime} WIB
            </span>
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-[#C23E00] hover:bg-[#a13300] text-white font-bold py-3.5 rounded-xl transition-all shadow-md"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-xl text-[#1C1917]">Form Pengajuan Izin / Sakit</h2>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm flex flex-col gap-6">
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Pilih Tipe Pengajuan</label>
          <div className="space-y-3">
            <button
              onClick={() => setLeaveType('sakit')}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 transition-all font-bold text-sm ${
                leaveType === 'sakit' ? 'border-[#C23E00] text-[#C23E00] bg-orange-50/50' : 'border-stone-200 text-stone-600 bg-white hover:border-stone-300'
              }`}
            >
              {leaveType === 'sakit' && <CheckCircle2 className="w-4 h-4 fill-[#C23E00] text-white" />}
              Sakit (Wajib Surat Dokter)
            </button>
            <button
              onClick={() => setLeaveType('izin')}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 transition-all font-bold text-sm ${
                leaveType === 'izin' ? 'border-[#C23E00] text-[#C23E00] bg-orange-50/50' : 'border-stone-200 text-stone-600 bg-white hover:border-stone-300'
              }`}
            >
              {leaveType === 'izin' && <CheckCircle2 className="w-4 h-4 fill-[#C23E00] text-white" />}
              <Calendar className="w-4 h-4" /> Izin Khusus
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Tanggal & Jam Pengajuan</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 mb-1">TANGGAL MULAI</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#C23E00] text-sm text-[#1C1917]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 mb-1">JAM MULAI</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#C23E00] text-sm text-[#1C1917]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 mb-1">TANGGAL SELESAI</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#C23E00] text-sm text-[#1C1917]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 mb-1">JAM SELESAI</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#C23E00] text-sm text-[#1C1917]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Alasan / Catatan Izin</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tuliskan alasan pengajuan Anda..."
            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#C23E00] text-sm text-[#1C1917] resize-none"
          ></textarea>
        </div>

        {leaveType === 'sakit' && (
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Lampiran Surat Dokter / Bukti</label>
            {!preview ? (
              <label className="border-2 border-dashed border-stone-300 hover:border-[#C23E00] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-stone-50/50">
                <UploadCloud className="w-8 h-8 text-stone-600 mb-3" />
                <p className="text-sm text-stone-700 font-medium mb-1">Klik untuk unggah atau tarik file ke sini</p>
                <p className="text-[10px] text-stone-400">Format didukung: JPG, PNG, PDF (Maks. 5MB)</p>
                <div className="flex gap-2 mt-4 w-full">
                  <span className="flex-1 flex items-center justify-center gap-2 bg-white border border-stone-200 text-xs font-semibold py-2.5 rounded-lg text-stone-700 shadow-sm">
                    <Camera className="w-3.5 h-3.5" /> Kamera
                  </span>
                  <span className="flex-1 flex items-center justify-center gap-2 bg-white border border-stone-200 text-xs font-semibold py-2.5 rounded-lg text-stone-700 shadow-sm">
                    <ImageIcon className="w-3.5 h-3.5" /> Galeri
                  </span>
                </div>
                <input type="file" accept="image/*,application/pdf" onChange={handleFileSelect} className="hidden" />
              </label>
            ) : (
              <div className="relative border border-stone-200 rounded-xl overflow-hidden bg-stone-50 p-2">
                {file?.type === 'application/pdf' ? (
                  <div className="w-full h-40 flex items-center justify-center bg-stone-100 rounded-lg">
                    <p className="text-sm text-stone-500 font-medium">PDF: {file.name}</p>
                  </div>
                ) : (
                  <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-stone-200 shadow-sm" />
                )}
                <button onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-4 right-4 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="mt-2 text-xs font-semibold text-stone-600 text-center">{file?.name || 'File terupload'}</div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="w-full bg-[#C23E00] hover:bg-[#a13300] active:scale-[0.98] text-white font-bold py-4 rounded-xl shadow-md transition-all text-base disabled:bg-stone-300 disabled:cursor-not-allowed"
        >
          {submitting || uploading ? 'Mengirim...' : 'Kirim Pengajuan'}
        </button>
      </div>
    </div>
  );
};

export default LeaveFormPage;
