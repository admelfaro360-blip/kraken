import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  ClipboardList, 
  Wallet, 
  BarChart3,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Calendar
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../lib/ThemeContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  onLogout: () => void;
}

export default function Layout({ onLogout }: LayoutProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Clientes', icon: Users, path: '/clientes' },
    { name: 'Presupuestos', icon: FileText, path: '/presupuestos' },
    { name: 'Agenda', icon: Calendar, path: '/agenda' },
    { name: 'Órdenes de Trabajo', icon: ClipboardList, path: '/ordenes' },
    { name: 'Cobros', icon: Wallet, path: '/cobros' },
    { name: 'Reportes', icon: BarChart3, path: '/reportes' },
    { name: 'Configuración', icon: Settings, path: '/config' },
  ];

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800 transition-colors">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col items-center text-center">
          <img 
            src="/logo.png" 
            alt="Kraken Logo" 
            className="h-12 w-auto object-contain mb-2"
            referrerPolicy="no-referrer"
          />
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.3em] font-black">Handyman OS</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-kraken-orange text-white shadow-lg shadow-kraken-orange/20" 
                    : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                )
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 space-y-2 border-t border-neutral-200 dark:border-neutral-800">
          <button 
            onClick={toggleDarkMode}
            className="flex items-center gap-3 px-4 py-3 w-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span className="font-medium">{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white p-4 flex items-center justify-between z-50 border-b border-neutral-200 dark:border-neutral-800 transition-colors">
        <img 
          src="/logo.png" 
          alt="Kraken Logo" 
          className="h-8 w-auto object-contain"
          referrerPolicy="no-referrer"
        />
        <div className="flex items-center gap-4">
          <button onClick={toggleDarkMode}>
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white dark:bg-neutral-900 z-40 pt-20 p-6 flex flex-col transition-colors overflow-y-auto">
          <nav className="flex-1 space-y-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-6 py-4 rounded-xl text-lg font-semibold transition-all",
                    isActive 
                      ? "bg-kraken-orange text-white shadow-lg shadow-kraken-orange/20" 
                      : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  )
                }
              >
                <item.icon size={24} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
          <button 
            onClick={() => {
              setIsMobileMenuOpen(false);
              onLogout();
            }}
            className="flex items-center gap-4 px-6 py-8 text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800"
          >
            <LogOut size={24} />
            <span className="text-lg font-semibold">Cerrar Sesión</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
