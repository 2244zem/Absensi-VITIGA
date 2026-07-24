import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Camera, FileText, User, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from './NotificationBell';
import logo from '../../assets/LogoVA.jpeg';

const navItems = [
  { path: '/attendance', label: 'Absensi', icon: Camera },
  { path: '/leave', label: 'Izin', icon: FileText },
  { path: '/profile', label: 'Profil', icon: User },
];

const EmployeeLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F0E9D3] flex flex-col">
      <header className="h-14 bg-white border-b border-stone-200/80 px-4 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="w-7 h-7 object-contain" />
          <span className="font-bold text-base text-[#1C1917]">VISITIGA</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500 truncate max-w-[120px] lg:max-w-[200px]">{user?.email}</span>
          <NotificationBell />
          <button onClick={handleLogout} className="text-stone-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-stone-100">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>

      <nav className="h-16 bg-white border-t border-stone-200/80 flex justify-around items-center shrink-0 px-4 shadow-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 px-6 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-[#C23E00]' : 'text-stone-400'
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-[#C23E00]' : 'text-stone-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default EmployeeLayout;

