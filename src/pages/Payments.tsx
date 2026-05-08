import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreHorizontal,
  ArrowRight,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  X,
  Eye,
  Edit2,
  Trash2,
  Plus,
  Calendar,
  History
} from 'lucide-react';
import { Payment, Client, Budget } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../lib/ThemeContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getStoredPayments, savePayment, deletePayment, getStoredClients, getStoredBudgets } from '../lib/storage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const StatusBadge = ({ status }: { status: Payment['status'] }) => {
  const styles = {
    pendiente: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    cobrado: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    parcial: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  };

  const labels = {
    pendiente: 'Pendiente',
    cobrado: 'Cobrado',
    parcial: 'Parcial',
  };

  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default function Payments() {
  const { isDarkMode } = useTheme();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [filterType, setFilterType] = useState<'mensual' | 'acumulado'>('mensual');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [paymentToEdit, setPaymentToEdit] = useState<Partial<Payment>>({
    status: 'pendiente',
    date: new Date().toISOString().split('T')[0],
    method: 'transferencia'
  });

  useEffect(() => {
    const loadData = async () => {
      const [p, c, b] = await Promise.all([
        getStoredPayments(),
        getStoredClients(),
        getStoredBudgets()
      ]);
      setPayments(p);
      setClients(c);
      setBudgets(b);
    };
    loadData();
  }, []);

  const filteredByDatePayments = payments.filter(payment => {
    const paymentDate = parseISO(payment.date);
    const start = filterType === 'mensual' 
      ? startOfMonth(new Date(selectedYear, selectedMonth))
      : startOfYear(new Date(selectedYear, 0));
    const end = filterType === 'mensual'
      ? endOfMonth(new Date(selectedYear, selectedMonth))
      : endOfYear(new Date(selectedYear, 11));

    return isWithinInterval(paymentDate, { start, end });
  });

  const filteredPayments = filteredByDatePayments.filter(payment => 
    payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateOrUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find(c => c.id === paymentToEdit.clientId);
    
    const payment: Payment = {
      ...paymentToEdit as Payment,
      id: paymentToEdit.id || `PAY-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      amount: Number(paymentToEdit.amount),
      clientName: selectedClient?.name || 'Cliente Desconocido'
    };

    await savePayment(payment);
    const updatedPayments = await getStoredPayments();
    setPayments(updatedPayments);
    setIsModalOpen(false);
    setPaymentToEdit({ status: 'pendiente', date: new Date().toISOString().split('T')[0], method: 'transferencia' });
  };

  const handleDeletePayment = async () => {
    if (selectedPayment) {
      await deletePayment(selectedPayment.id);
      const updatedPayments = await getStoredPayments();
      setPayments(updatedPayments);
      setIsDeleteModalOpen(false);
      setSelectedPayment(null);
    }
  };

  const openEditModal = (payment: Payment) => {
    setPaymentToEdit(payment);
    setIsModalOpen(true);
  };

  const openViewModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDeleteModalOpen(true);
  };

  const totalCollected = filteredByDatePayments.filter(p => p.status === 'cobrado').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalPending = filteredByDatePayments.filter(p => p.status === 'pendiente').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // Calculate previous month totals for the historical card
  const prevMonthDate = new Date(selectedYear, selectedMonth - 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();
  
  const prevMonthPending = payments.filter(payment => {
    const paymentDate = parseISO(payment.date);
    const start = startOfMonth(new Date(prevYear, prevMonth));
    const end = endOfMonth(new Date(prevYear, prevMonth));
    return isWithinInterval(paymentDate, { start, end }) && payment.status === 'pendiente';
  }).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Cobros y Facturación</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Gestiona los ingresos y el estado de tus facturas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Custom Filter Controls */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
            <button
              onClick={() => setFilterType('mensual')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                filterType === 'mensual' 
                  ? "bg-[#FF4D00] text-white shadow-lg shadow-orange-500/20" 
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              )}
            >
              Mensual
            </button>
            <button
              onClick={() => setFilterType('acumulado')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                filterType === 'acumulado' 
                  ? "bg-[#FF4D00] text-white shadow-lg shadow-orange-500/20" 
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              )}
            >
              Acumulado
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-[#FF4D00] outline-none text-neutral-900 dark:text-white"
            >
              {years.map(y => (
                <option key={y} value={y} className="dark:bg-neutral-900">{y}</option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className={cn(
                "bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-[#FF4D00] outline-none text-neutral-900 dark:text-white transition-opacity",
                filterType === 'acumulado' && "opacity-50 pointer-events-none"
              )}
            >
              {months.map((m, i) => (
                <option key={m} value={i} className="dark:bg-neutral-900">{m}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => {
              setPaymentToEdit({ status: 'pendiente', date: new Date().toISOString().split('T')[0], method: 'transferencia' });
              setIsModalOpen(true);
            }}
            className="kraken-btn"
          >
            <Plus size={20} />
            <span>Nuevo Cobro</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-neutral-900 dark:bg-neutral-950 text-white p-8 rounded-3xl shadow-xl flex items-center justify-between border border-transparent dark:border-neutral-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign size={120} />
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Total Cobrado</p>
            <h3 className="text-3xl font-black">{totalCollected.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</h3>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{filterType === 'mensual' ? `${months[selectedMonth]} ${selectedYear}` : `Año ${selectedYear}`}</p>
          </div>
          <div className="p-4 rounded-2xl bg-green-500/10 text-green-500 relative z-10">
            <TrendingUp size={32} />
          </div>
        </div>
        <div className="kraken-card p-8 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock size={120} />
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Pendiente de Cobro</p>
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white">{totalPending.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</h3>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{filterType === 'mensual' ? `Mes Actual` : `Anual`}</p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 relative z-10">
            <TrendingDown size={32} />
          </div>
        </div>

        <div className="kraken-card p-8 border-neutral-100 dark:border-neutral-800 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <History size={120} />
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Pendiente {months[prevMonth]}</p>
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white">{prevMonthPending.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</h3>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Histórico Mes Anterior</p>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 relative z-10">
            <History size={32} />
          </div>
        </div>

        <div className="bg-[#FF4D00] text-white p-8 rounded-3xl shadow-xl shadow-orange-500/20 flex items-center justify-between relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <History size={120} />
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">Total General</p>
            <h3 className="text-3xl font-black text-white">{(totalCollected + totalPending).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</h3>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Facturación {months[selectedMonth]}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/10 text-white relative z-10">
            <DollarSign size={32} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente o ID de cobro..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="kraken-input !pl-12"
          />
        </div>
        <button className="kraken-btn-secondary">
          <Filter size={20} />
          <span>Filtros</span>
        </button>
      </div>

      <div className="kraken-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">ID Cobro</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Método</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Importe</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Estado</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 group-hover:bg-kraken-orange/10 dark:group-hover:bg-kraken-orange/20 group-hover:text-kraken-orange transition-colors">
                        <DollarSign size={18} />
                      </div>
                      <span className="font-bold text-neutral-900 dark:text-white">{payment.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{payment.clientName}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{payment.budgetId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                    {format(new Date(payment.date), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-widest">{payment.method || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-bold text-neutral-900 dark:text-white">{payment.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openViewModal(payment)}
                        className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => openEditModal(payment)}
                        className="p-2 text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(payment)}
                        className="p-2 text-neutral-400 hover:text-kraken-orange transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="kraken-card w-full max-w-lg overflow-hidden">
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
              <h2 className="text-2xl font-bold tracking-tight dark:text-white">
                {paymentToEdit.id ? 'Editar Cobro' : 'Nuevo Cobro'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdatePayment} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Cliente</label>
                  <select 
                    required
                    value={paymentToEdit.clientId || ''}
                    onChange={(e) => setPaymentToEdit({ ...paymentToEdit, clientId: e.target.value })}
                    className="kraken-input"
                  >
                    <option value="" className="dark:bg-neutral-900">Seleccionar cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} className="dark:bg-neutral-900">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">ID Presupuesto</label>
                    <input 
                      type="text" 
                      placeholder="PR-XXXX"
                      value={paymentToEdit.budgetId || ''}
                      onChange={(e) => setPaymentToEdit({ ...paymentToEdit, budgetId: e.target.value })}
                      className="kraken-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Importe (€)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={paymentToEdit.amount || ''}
                      onChange={(e) => setPaymentToEdit({ ...paymentToEdit, amount: Number(e.target.value) })}
                      className="kraken-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Fecha</label>
                    <input 
                      required
                      type="date" 
                      value={paymentToEdit.date || ''}
                      onChange={(e) => setPaymentToEdit({ ...paymentToEdit, date: e.target.value })}
                      className="kraken-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Método</label>
                    <select 
                      value={paymentToEdit.method || 'transferencia'}
                      onChange={(e) => setPaymentToEdit({ ...paymentToEdit, method: e.target.value as any })}
                      className="kraken-input"
                    >
                      <option value="transferencia" className="dark:bg-neutral-900">Transferencia</option>
                      <option value="efectivo" className="dark:bg-neutral-900">Efectivo</option>
                      <option value="tarjeta" className="dark:bg-neutral-900">Tarjeta</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Estado</label>
                  <select 
                    value={paymentToEdit.status || 'pendiente'}
                    onChange={(e) => setPaymentToEdit({ ...paymentToEdit, status: e.target.value as any })}
                    className="kraken-input"
                  >
                    <option value="pendiente" className="dark:bg-neutral-900">Pendiente</option>
                    <option value="cobrado" className="dark:bg-neutral-900">Cobrado</option>
                    <option value="parcial" className="dark:bg-neutral-900">Parcial</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 kraken-btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 kraken-btn"
                >
                  {paymentToEdit.id ? 'Guardar Cambios' : 'Registrar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="kraken-card w-full max-w-lg overflow-hidden">
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
              <div>
                <h2 className="text-2xl font-bold tracking-tight dark:text-white">Detalle del Cobro</h2>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">{selectedPayment.id}</p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Cliente</p>
                  <p className="text-lg font-bold dark:text-white">{selectedPayment.clientName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Estado</p>
                  <StatusBadge status={selectedPayment.status} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Fecha</p>
                  <p className="font-bold dark:text-white">{format(new Date(selectedPayment.date), 'dd MMMM yyyy', { locale: es })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Método</p>
                  <p className="font-bold uppercase dark:text-white">{selectedPayment.method || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Presupuesto</p>
                  <p className="font-bold dark:text-white">{selectedPayment.budgetId || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Importe Total</p>
                  <p className="text-2xl font-black text-kraken-orange">{selectedPayment.amount.toFixed(2)} €</p>
                </div>
              </div>
              
              <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-full kraken-btn"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="kraken-card w-full max-w-md overflow-hidden">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-kraken-orange/10 text-kraken-orange rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight dark:text-white">¿Eliminar cobro?</h2>
                <p className="text-neutral-500 dark:text-neutral-400">
                  Esta acción no se puede deshacer. Se eliminará el registro del cobro <span className="font-bold text-neutral-900 dark:text-white">{selectedPayment.id}</span>.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 kraken-btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeletePayment}
                  className="flex-1 kraken-btn"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
