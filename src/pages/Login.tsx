import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, KeyRound, X, Chrome } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { toast } from 'sonner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Sesión iniciada correctamente');
      navigate('/');
    } catch (err: any) {
      console.error('Error logging in with Google:', err);
      setError('Error al iniciar sesión con Google');
      toast.error('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // For this app, we prefer Google Login as per requirements
    setError('Por favor, utiliza el inicio de sesión con Google');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    // Mock password change
    setChangeSuccess('Contraseña actualizada correctamente');
    setTimeout(() => {
      setShowChangePassword(false);
      setChangeSuccess('');
      setNewPassword('');
      setConfirmPassword('');
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-[40px] shadow-2xl border border-neutral-100 dark:border-neutral-800 p-10 space-y-8">
        <div className="text-center space-y-2">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-24 w-auto object-contain mx-auto mb-4"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-3xl font-black tracking-tighter text-neutral-900 dark:text-white uppercase">Kraken OS</h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">Inicia sesión para gestionar tu negocio</p>
        </div>

        {!showChangePassword ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-4">Usuario</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-4">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-kraken-orange text-sm font-bold text-center">{error}</p>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-kraken-orange text-white rounded-2xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20 active:scale-[0.98]"
            >
              Entrar al Sistema
            </button>

            <button 
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="w-full text-center text-xs font-bold text-neutral-400 hover:text-kraken-orange transition-colors"
            >
              ¿Olvidaste tu contraseña? Cambiar contraseña
            </button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold dark:text-white">Cambiar Contraseña</h2>
              <button onClick={() => setShowChangePassword(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-4">Nueva Contraseña</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-4">Confirmar Contraseña</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-kraken-orange text-sm font-bold text-center">{error}</p>
            )}

            {changeSuccess && (
              <p className="text-green-600 text-sm font-bold text-center">{changeSuccess}</p>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-kraken-orange text-white rounded-2xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20 active:scale-[0.98]"
            >
              Actualizar Contraseña
            </button>
          </form>
        )}

        <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800 text-center">
          <p className="text-xs text-neutral-400 font-medium">Kraken Handyman OS v1.0 • 2026</p>
        </div>
      </div>
    </div>
  );
}
