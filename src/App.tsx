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

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
