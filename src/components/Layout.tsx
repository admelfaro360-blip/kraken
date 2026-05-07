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
  Calendar,
  TrendingDown
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
    { name: 'Pagos', icon: TrendingDown, path: '/gastos' },
    { name: 'Reportes', icon: BarChart3, path: '/reportes' },
    { name: 'Configuración', icon: Settings, path: '/config' },
  ];

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800 transition-colors">
        <div className="p-8 border-b border-neutral-200 dark:border-neutral-800 flex flex-col items-center text-center">
          <img 
            src="/logo.png" 
            alt="Kraken Logo" 
            className="h-16 w-auto object-contain mb-3"
            referrerPolicy="no-referrer"
          />
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.4em] font-black">Handyman OS</p>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group",
                  isActive 
                    ? "bg-kraken-orange text-white shadow-xl shadow-kraken-orange/25 scale-[1.02]" 
                    : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                )
              }
            >
              <item.icon size={22} className={cn("transition-transform duration-300 group-hover:scale-110")} />
              <span className="font-bold tracking-tight">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-6 space-y-3 border-t border-neutral-200 dark:border-neutral-800">
          <button 
            onClick={toggleDarkMode}
            className="flex items-center gap-4 px-5 py-4 w-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold"
          >
            {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            <span>{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 px-5 py-4 w-full text-neutral-500 dark:text-neutral-400 hover:text-kraken-orange transition-all rounded-2xl hover:bg-kraken-orange/5 font-bold"
          >
            <LogOut size={22} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white p-4 flex items-center justify-between z-50 border-b border-neutral-200 dark:border-neutral-800 transition-colors h-20">
        <img 
          src="/logo.png" 
          alt="Kraken Logo" 
          className="h-10 w-auto object-contain"
          referrerPolicy="no-referrer"
        />
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleDarkMode}
            className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-3 rounded-xl bg-neutral-900 dark:bg-kraken-orange text-white"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white dark:bg-neutral-950 z-40 pt-24 p-6 flex flex-col transition-all duration-300 animate-in slide-in-from-top-full">
          <nav className="flex-1 space-y-3 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-5 px-6 py-5 rounded-2xl text-lg font-bold transition-all",
                    isActive 
                      ? "bg-kraken-orange text-white shadow-xl shadow-kraken-orange/25" 
                      : "text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900"
                  )
                }
              >
                <item.icon size={24} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
          <div className="pt-6 mt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLogout();
              }}
              className="flex items-center justify-center gap-4 w-full px-6 py-5 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded-2xl font-bold"
            >
              <LogOut size={24} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-20 md:pt-0 custom-scrollbar">
        <div className="max-w-7xl mx-auto p-4 md:p-10 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
