import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, KeyRound, X, Chrome } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { fetchUsers } from '../lib/storage';
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
    setLoading(true);

    try {
      console.log('Attempting login for:', username);
      // Try Firebase Auth first
      try {
        await signInWithEmailAndPassword(auth, username, password);
        console.log('Firebase Auth success');
        toast.success('Sesión iniciada correctamente');
        navigate('/');
        return;
      } catch (authErr: any) {
        console.log('Firebase Auth failed:', authErr.code);
        // If it's not a "user not found" or "invalid email", it might be a real error
        if (authErr.code !== 'auth/user-not-found' && authErr.code !== 'auth/invalid-email' && authErr.code !== 'auth/invalid-credential') {
          throw authErr;
        }
      }

      // Manual check for users created before this update or with username
      console.log('Trying manual check...');
      const users = await fetchUsers();
      console.log('Fetched users:', users.length);
      const user = users.find(u => 
        (u.username === username || u.email === username) && 
        u.password === password
      );

      if (user) {
        console.log('Manual check success, user role:', user.role);
        // Store session in localStorage for App.tsx to pick up
        localStorage.setItem('kraken_user', JSON.stringify({
          uid: user.id,
          email: user.email,
          displayName: user.username,
          role: user.role,
          isLocal: true
        }));
        
        toast.success('Sesión iniciada correctamente');
        window.location.href = '/';
      } else {
        console.log('Manual check failed: user not found or password mismatch');
        setError('Usuario o contraseña incorrectos');
        toast.error('Error al iniciar sesión');
      }
    } catch (err: any) {
      console.error('Error during login:', err);
      if (err.code === 'auth/wrong-password') {
        setError('Contraseña incorrecta');
      } else if (err.code === 'auth/user-not-found') {
        setError('Usuario no encontrado');
      } else {
        setError('Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
    }
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
              <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-4">Email o Usuario</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="kraken-input pl-12"
                  placeholder="admin@ejemplo.com"
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
                  className="kraken-input pl-12"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-kraken-orange text-sm font-bold text-center">{error}</p>
            )}

            <div className="space-y-4">
              <button 
                type="submit"
                disabled={loading}
                className="kraken-btn w-full"
              >
                {loading ? 'Iniciando...' : 'Entrar al Sistema'}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-neutral-900 px-2 text-neutral-400 font-bold">O continuar con</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="kraken-btn-secondary w-full flex items-center justify-center gap-3"
              >
                <Chrome size={20} className="text-kraken-orange" />
                <span className="font-bold">Google Account</span>
              </button>
            </div>

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
                  className="kraken-input pl-12"
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
                  className="kraken-input pl-12"
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
              className="kraken-btn w-full"
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
