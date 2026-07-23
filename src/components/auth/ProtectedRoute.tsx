import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0E9D3] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.isActive) {
    return (
      <div className="min-h-screen bg-[#F0E9D3] flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-[#1C1917] mb-3">Akun Nonaktif</h2>
          <p className="text-stone-600 mb-6">Akun Anda saat ini tidak aktif. Silakan hubungi admin untuk informasi lebih lanjut.</p>
          <a href="/login" className="inline-block bg-[#C23E00] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#a13300] transition-colors">
            Kembali ke Login
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
