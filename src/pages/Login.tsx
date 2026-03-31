import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err) {
      setError('Error al conectar con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const emailToUse = username.toLowerCase() === 'admin' ? 'admin@kraken.com' : username;

    try {
      await signInWithEmailAndPassword(auth, emailToUse, password);
      navigate('/');
    } catch (err) {
      setError('Credenciales incorrectas. Revisa tu usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 space-y-6">
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-3xl font-black tracking-tighter text-neutral-900 uppercase">Kraken OS</h1>
          <p className="text-neutral-500 font-medium">Inicia sesión para gestionar tu negocio</p>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 bg-white text-neutral-800 border-2 border-neutral-200 rounded-2xl font-bold hover:bg-neutral-50 transition-all flex items-center justify-center gap-3"
        >
          <span className="text-red-600 font-black text-xl">G</span>
          Ingresar con Google
        </button>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-neutral-200"></div>
          <span className="mx-4 text-neutral-400 text-[10px] font-bold uppercase">O usa tu cuenta</span>
          <div className="flex-grow border-t border-neutral-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl font-bold outline-none focus:border-red-600"
            placeholder="Usuario o Correo"
            required
          />
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl font-bold outline-none focus:border-red-600"
            placeholder="••••••••"
            required
          />

          {error && <p className="text-red-600 text-sm font-bold text-center bg-red-50 p-2 rounded">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all"
          >
            {loading ? 'Cargando...' : 'Entrar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
