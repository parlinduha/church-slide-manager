import { Outlet, NavLink } from 'react-router-dom';
import { Music, Calendar, Radio, Book, Settings, Tv } from 'lucide-react';
import ProjectorButton from './ProjectorButton';

const navItems = [
  { to: '/', label: 'Live', icon: Radio, exact: true },
  { to: '/welcome', label: 'Welcome', icon: Tv },
  { to: '/songs', label: 'Daftar Lagu', icon: Music },
  { to: '/services', label: 'Sesi Ibadah', icon: Calendar },
  { to: '/bible', label: 'Alkitab', icon: Book },
  { to: '/settings', label: 'Pengaturan AI', icon: Settings },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      {/* Sidebar */}
      <aside className="w-16 md:w-56 flex flex-col bg-surface-800 border-r border-surface-600 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-600">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Music size={16} className="text-white" />
          </div>
          <span className="hidden md:block text-sm font-semibold text-white leading-tight">
            Church Slide<br />
            <span className="text-gray-400 font-normal">Manager</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-surface-700'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden md:block text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Tombol Proyektor — dengan Window Management API */}
        <div className="p-2 border-t border-surface-600">
          <ProjectorButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
