import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Budgets from './pages/Budgets';
import NewBudget from './pages/NewBudget';
import WorkOrders from './pages/WorkOrders';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Agenda from './pages/Agenda';
import Config from './pages/Config';
import Login from './pages/Login';
import { ThemeProvider } from './lib/ThemeContext';
import { Toaster } from 'sonner';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import ErrorBoundary from './components/ErrorBoundary';
import { getUserById, saveUser } from './lib/storage';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Seed admin user if needed
    const seedAdmin = async () => {
      try {
        const adminEmail = 'admelfaro360@gmail.com';
        const adminDoc = await getUserById(adminEmail);
        if (!adminDoc) {
          console.log('Seeding admin user...');
          await saveUser({
            id: adminEmail,
            username: 'admin',
            email: adminEmail,
            role: 'admin',
            password: 'admin123' // Default password for manual login
          });
        }
      } catch (e) {
        console.error('Error seeding admin:', e);
      }
    };
    seedAdmin();

    // Check for local user session first
    const localUser = localStorage.getItem('kraken_user');
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        setUser(parsed);
        // If we have a local user, we're already "ready" to show the UI
        setLoading(false);
      } catch (e) {
        console.error('Error parsing local user:', e);
        localStorage.removeItem('kraken_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional user data from Firestore (like role)
        try {
          const userData = await getUserById(firebaseUser.uid);
          let finalUser = { 
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            ...userData 
          };

          // Default admin check for the owner
          if (firebaseUser.email === 'admelfaro360@gmail.com') {
            finalUser.role = 'admin';
          } else if (!finalUser.role) {
            finalUser.role = 'user';
          }

          setUser(finalUser);
        } catch (err) {
          console.error('Error fetching user data from Firestore:', err);
          setUser(firebaseUser);
        }
      } else if (!localStorage.getItem('kraken_user')) {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('kraken_user');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kraken-orange"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route 
              path="/login" 
              element={!user ? <Login /> : <Navigate to="/" />} 
            />
            
            <Route 
              path="/" 
              element={
                user ? (
                  <Layout onLogout={handleLogout} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="clientes" element={<Clients />} />
              <Route path="presupuestos" element={<Budgets />} />
              <Route path="presupuestos/nuevo" element={<NewBudget />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="ordenes" element={<WorkOrders />} />
              <Route path="cobros" element={<Payments />} />
              <Route path="reportes" element={<Reports />} />
              <Route path="config" element={<Config />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
