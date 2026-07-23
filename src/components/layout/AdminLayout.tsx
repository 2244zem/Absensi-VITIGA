import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, LogOut, Shield, Menu, X, ClipboardList, Building2, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from './NotificationBell';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/manage-users', label: 'Kelola Akun', icon: Users },
  { path: '/admin/reports', label: 'Laporan', icon: BarChart3 },
  { path: '/admin/daily-audit', label: 'Audit Harian', icon: ClipboardList },
  { path: '/admin/offices', label: 'Lokasi Kantor', icon: Building2 },
  { path: '/admin/shifts', label: 'Waktu Shift', icon: Clock },
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F0E9D3] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-30 h-screen w-64 bg-white border-r border-stone-200/80 flex flex-col shrink-0 transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-stone-100">
          <div className="w-9 h-9 rounded-lg bg-[#C23E00] flex items-center justify-center shadow-sm">
            <Shield className="text-white w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight text-[#1C1917]">VISITIGA</div>
            <div className="text-[10px] text-stone-400 font-medium">Admin Panel</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden p-1 text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#C23E00] text-white shadow-sm'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-stone-100">
          <div className="mb-2 px-2.5">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Akun</p>
            <p className="text-xs font-medium text-stone-600 truncate mt-0.5">{user?.email || '-'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 bg-white border-b border-stone-200/80 px-4 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-[#1C1917]">VISITIGA</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2 bg-[#F0E9D3] px-3 py-1.5 rounded-lg">
              <span className="text-[11px] font-mono font-bold text-stone-600">
                {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })} WIB
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

