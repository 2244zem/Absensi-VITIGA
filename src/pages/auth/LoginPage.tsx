import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, AlertTriangle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../assets/LogoVA.jpeg';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !loginSuccess) {
      navigate(user.role === 'admin' ? '/admin' : '/attendance', { replace: true });
    }
  }, [user, authLoading, loginSuccess, navigate]);

  useEffect(() => {
    if (loginSuccess && user) {
      navigate(user.role === 'admin' ? '/admin' : '/attendance', { replace: true });
    }
  }, [loginSuccess, user, navigate]);

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsError(false);

    const result = await login(email, password);

    if (result.success) {
      setLoginSuccess(true);
    } else {
      setIsError(true);
      setErrorMessage(result.error || 'Login gagal');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh bg-[#F0E9D3] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm">

          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Logo" className="w-16 h-16 object-contain mb-4" />
            <h1 className="text-2xl font-bold text-[#1C1917]">VISITIGA</h1>
            <p className="text-stone-500 text-sm mt-1">Masuk ke akun Anda</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6">

            {isError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-semibold leading-relaxed">
                  Akses Ditolak: {errorMessage}
                </p>
              </div>
            ) : (
              <div className="bg-stone-50 rounded-xl p-3 mb-4 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#C23E00] shrink-0 mt-0.5" />
                <p className="text-xs text-stone-600 leading-relaxed">
                  Sistem hanya mendukung login akun dari Admin. Tidak ada registrasi publik.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-500 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isError ? 'text-red-400' : 'text-stone-400'}`} />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm outline-none transition-all ${
                      isError
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-stone-200 focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10'
                    }`}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-500 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isError ? 'text-red-400' : 'text-stone-400'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-xl text-sm outline-none transition-all ${
                      isError
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-stone-200 focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10'
                    }`}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C23E00] hover:bg-[#a13300] text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-xs text-stone-500 text-center">
            Butuh bantuan akun?{' '}
            <span className="font-semibold text-[#1C1917]">Hubungi Tim HR / Admin</span>
          </p>
        </div>
      </main>

      <footer className="py-4 text-center text-[11px] text-stone-400 border-t border-stone-300/40">
        &copy; 2026 VISITIGA
      </footer>
    </div>
  );
};

export default LoginPage;
