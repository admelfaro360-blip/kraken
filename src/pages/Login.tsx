import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, KeyRound, X, Chrome, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, firebaseConfig } from '../lib/firebase';
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

  useEffect(() => {
    console.log('Login component mounted');
    console.log('Firebase Project ID:', firebaseConfig.projectId);
    console.log('Current Domain:', window.location.hostname);
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      console.log('Initiating Google Login...');
      const result = await signInWithPopup(auth, provider);
      console.log('Google Login success:', result.user.email);
      toast.success('Sesión iniciada correctamente');
      navigate('/');
    } catch (err: any) {
      console.error('Google Login error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setError(`Error de dominio: Debes autorizar "${currentDomain}" en la consola de Firebase.`);
        toast.error('Dominio no autorizado');
      } else {
        setError('Error al iniciar sesión con Google');
        toast.error('Error al iniciar sesión');
      }
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
        // If it's an email, try it directly
        if (username.includes('@')) {
          console.log('Attempting Firebase Auth with email:', username);
          await signInWithEmailAndPassword(auth, username, password);
          console.log('Firebase Auth success');
          toast.success('Sesión iniciada correctamente');
          navigate('/');
          return;
        }
      } catch (authErr: any) {
        console.warn('Firebase Auth failed:', authErr.code, authErr.message);
        // If it's a wrong password, we should stop here
        if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
          console.log('Wrong password in Firebase Auth, but continuing to manual check just in case');
        }
      }

      // Manual check for users created before this update or with username
      console.log('Trying manual check against Firestore users collection...');
      const users = await fetchUsers();
      console.log('Fetched users count:', users.length);
      
      const user = users.find(u => {
        const matchUsername = u.username?.toLowerCase() === username.toLowerCase();
        const matchEmail = u.email?.toLowerCase() === username.toLowerCase();
        const matchPassword = u.password === password;
        return (matchUsername || matchEmail) && matchPassword;
      });

      if (user) {
        console.log('Manual check success! User found:', user.username || user.email);
        console.log('User role:', user.role);
        // Store session in localStorage for App.tsx to pick up
        localStorage.setItem('kraken_user', JSON.stringify({
          uid: user.id || user.email || 'local-user',
          email: user.email,
          displayName: user.username || user.email,
          role: user.role || 'user',
          isLocal: true
        }));
        
        toast.success('Sesión iniciada correctamente (Acceso Local)');
        // Use window.location to force a full app state refresh
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        console.log('Manual check failed: No matching user/password found in Firestore');
        setError('Usuario o contraseña incorrectos');
        toast.error('Error al iniciar sesión');
      }
    } catch (err: any) {
      console.error('Error during login process:', err);
      setError('Error al conectar con el servidor');
      toast.error('Error de conexión');
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
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden font-sans">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-kraken-orange/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-kraken-orange/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img 
              src="/logo.png" 
              alt="Kraken Logo" 
              className="h-24 w-auto mx-auto mb-4 drop-shadow-[0_0_15px_rgba(255,77,0,0.3)]"
              referrerPolicy="no-referrer"
            />
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.6em] font-black mt-2">Handyman Operating System</p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-10 rounded-[40px] shadow-2xl relative overflow-hidden"
        >
          {/* Subtle inner glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-kraken-orange/20 to-transparent" />

          {!showChangePassword ? (
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Usuario o Email</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-kraken-orange transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-14 bg-black border border-neutral-800 rounded-2xl pl-12 pr-4 text-white placeholder:text-neutral-700 focus:border-kraken-orange focus:ring-4 focus:ring-kraken-orange/10 transition-all outline-none font-bold"
                    placeholder="admin@kraken.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Contraseña</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-kraken-orange transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 bg-black border border-neutral-800 rounded-2xl pl-12 pr-4 text-white placeholder:text-neutral-700 focus:border-kraken-orange focus:ring-4 focus:ring-kraken-orange/10 transition-all outline-none font-bold"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-kraken-orange text-xs font-bold text-center bg-kraken-orange/10 py-3 rounded-xl border border-kraken-orange/20 animate-in fade-in slide-in-from-top-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-kraken-orange hover:bg-kraken-orange/90 text-white rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-lg shadow-kraken-orange/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>

              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-800"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black">
                  <span className="bg-neutral-900 px-4 text-neutral-600">O continuar con</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full h-14 bg-white hover:bg-neutral-100 text-black rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-4 active:scale-[0.98] shadow-xl"
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google" 
                  className="w-6 h-6"
                />
                <span>Google Account</span>
              </button>

              <button 
                type="button"
                onClick={() => setShowChangePassword(true)}
                className="w-full text-center text-[10px] font-bold text-neutral-500 hover:text-kraken-orange transition-colors uppercase tracking-widest"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Recuperar</h2>
                <button type="button" onClick={() => setShowChangePassword(false)} className="text-neutral-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Nueva Contraseña</label>
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-kraken-orange transition-colors" size={18} />
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-14 bg-black border border-neutral-800 rounded-2xl pl-12 pr-4 text-white placeholder:text-neutral-700 focus:border-kraken-orange focus:ring-4 focus:ring-kraken-orange/10 transition-all outline-none font-bold"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Confirmar Contraseña</label>
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-kraken-orange transition-colors" size={18} />
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-14 bg-black border border-neutral-800 rounded-2xl pl-12 pr-4 text-white placeholder:text-neutral-700 focus:border-kraken-orange focus:ring-4 focus:ring-kraken-orange/10 transition-all outline-none font-bold"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-kraken-orange text-xs font-bold text-center bg-kraken-orange/10 py-3 rounded-xl border border-kraken-orange/20">{error}</p>
              )}

              {changeSuccess && (
                <p className="text-green-500 text-xs font-bold text-center bg-green-500/10 py-3 rounded-xl border border-green-500/20">{changeSuccess}</p>
              )}

              <button 
                type="submit"
                className="w-full h-14 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-neutral-100 transition-all"
              >
                Actualizar Contraseña
              </button>
            </form>
          )}

          <p className="mt-10 text-center text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
            © 2026 Kraken Handyman OS • v2.4.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}
