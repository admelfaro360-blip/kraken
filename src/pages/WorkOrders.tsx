import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  User,
  MoreHorizontal,
  ArrowRight,
  FileText,
  X,
  Edit2,
  Eye,
  Trash2
} from 'lucide-react';
import { WorkOrder, Budget } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatFirebaseDate } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateWorkOrderPDF, WorkOrderPDFData } from '../lib/pdfGenerator';
import { fetchBudgets, fetchWorkOrders, saveWorkOrder, deleteWorkOrder } from '../lib/storage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const parseLocalDate = (rawDate: any) => {
  const dateStr = formatFirebaseDate(rawDate).split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const initialWorkOrders: WorkOrder[] = [
  {
    id: 'WO-101',
    budgetId: 'PR-1474',
    clientId: '1',
    clientName: 'Juan Pérez',
    clientPhone: '+34 600 000 001',
    clientAddress: 'Calle Mayor 1, Madrid',
    description: 'Pintura salón y pasillo - Fase 1',
    startDate: '2026-03-25',
    duration: 2,
    crewId: 'Cuadrilla A',
    status: 'pendiente',
    assignedTo: ['Carlos R.']
  },
  {
    id: 'WO-102',
    budgetId: 'PR-1473',
    clientId: '2',
    clientName: 'Tech Corp S.A.',
    clientPhone: '+34 912 345 678',
    clientAddress: 'Av. de la Castellana 100, Madrid',
    description: 'Mantenimiento preventivo AC - Piso 4',
    startDate: '2026-03-24',
    duration: 1,
    crewId: 'Cuadrilla B',
    status: 'en_progreso',
    assignedTo: ['Luis M.', 'Ana S.']
  },
  {
    id: 'WO-103',
    budgetId: 'PR-1470',
    clientId: '3',
    clientName: 'María García',
    clientPhone: '+34 600 000 003',
    clientAddress: 'Calle Serrano 20, Madrid',
    description: 'Reparación fontanería baño principal',
    startDate: '2026-03-20',
    endDate: '2026-03-21',
    duration: 2,
    crewId: 'Cuadrilla A',
    status: 'completada',
    assignedTo: ['Carlos R.']
  }
];

const AVAILABLE_CREWS = ['Cuadrilla A', 'Cuadrilla B', 'Cuadrilla C'];

const StatusBadge = ({ status }: { status: WorkOrder['status'] }) => {
  const styles = {
    pendiente: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
    en_progreso: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    completada: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    cancelada: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  };

  const labels = {
    pendiente: 'Pendiente',
    en_progreso: 'En Progreso',
    completada: 'Completada',
    cancelada: 'Cancelada',
  };

  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default function WorkOrders() {
  const { isDarkMode } = useTheme();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<WorkOrder>>({
    status: 'pendiente',
    assignedTo: []
  });
  const [availableBudgets, setAvailableBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [budgets, orders] = await Promise.all([
          fetchBudgets(),
          fetchWorkOrders()
        ]);
        setAvailableBudgets(budgets);
        setWorkOrders(orders);
      } catch (error) {
        console.error('Error loading work orders data:', error);
      }
    };
    loadData();
  }, [isModalOpen]);

  const filteredOrders = workOrders.filter(order => 
    order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadPDF = async (order: WorkOrder) => {
    // Find the associated budget to get the language
    const budget = availableBudgets.find(b => b.id === order.budgetId);
    
    const pdfData: WorkOrderPDFData = {
      id: order.id,
      client: {
        name: order.clientName,
        phone: order.clientPhone || 'N/A',
        address: order.clientAddress || 'N/A'
      },
      description: order.description,
      startDate: order.startDate,
      endDate: order.endDate,
      duration: order.duration,
      crewId: order.crewId,
      status: order.status,
      assignedTo: order.assignedTo,
      phases: order.phases,
      notes: order.notes,
      language: budget?.language || 'es'
    };

    const doc = await generateWorkOrderPDF(pdfData);
    doc.save(`Orden_Trabajo_${order.id}.pdf`);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedBudget = availableBudgets.find(b => b.id === newOrder.budgetId);
    
    if (isEditing && selectedOrder) {
      const updatedOrder: WorkOrder = {
        ...selectedOrder,
        ...newOrder,
        clientName: selectedBudget?.clientName || selectedOrder.clientName,
        clientPhone: selectedBudget?.clientPhone || selectedOrder.clientPhone,
        clientAddress: selectedBudget?.clientAddress || selectedOrder.clientAddress,
        phases: newOrder.phases || selectedOrder.phases
      } as WorkOrder;
      
      setWorkOrders(workOrders.map(wo => wo.id === selectedOrder.id ? updatedOrder : wo));
      await saveWorkOrder(updatedOrder);
    } else {
      const order: WorkOrder = {
        ...newOrder as WorkOrder,
        id: `WO-${Math.floor(Math.random() * 1000)}`,
        clientName: selectedBudget?.clientName || 'Cliente Desconocido',
        clientPhone: selectedBudget?.clientPhone,
        clientAddress: selectedBudget?.clientAddress,
        clientId: selectedBudget?.clientId || '1',
        phases: selectedBudget?.phases || [],
        createdAt: new Date().toISOString()
      };
      setWorkOrders([order, ...workOrders]);
      await saveWorkOrder(order);
    }
    
    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedOrder(null);
    setNewOrder({ status: 'pendiente', assignedTo: [] });
  };

  const handleEditOrder = (order: WorkOrder) => {
    setSelectedOrder(order);
    setNewOrder(order);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleViewOrder = (order: WorkOrder) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const handleDeleteConfirm = (order: WorkOrder) => {
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (selectedOrder) {
      setWorkOrders(workOrders.filter(wo => wo.id !== selectedOrder.id));
      await deleteWorkOrder(selectedOrder.id);
      setIsDeleteModalOpen(false);
      setSelectedOrder(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updatedOrders = workOrders.map(wo => wo.id === id ? { ...wo, status: newStatus as any } : wo);
    setWorkOrders(updatedOrders);
    const updatedOrder = updatedOrders.find(wo => wo.id === id);
    if (updatedOrder) await saveWorkOrder(updatedOrder);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Órdenes de Trabajo</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Controla la ejecución de tus proyectos en tiempo real.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="kraken-btn"
        >
          <CheckCircle2 size={20} />
          <span>Nueva Orden</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, ID o descripción..." 
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

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.map((order) => (
          <div key={order.id} className="kraken-card p-6 hover:shadow-md group flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className={cn(
                "p-4 rounded-2xl",
                order.status === 'en_progreso' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 
                order.status === 'completada' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 
                'bg-neutral-50 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
              )}>
                {order.status === 'en_progreso' ? <Clock size={24} /> : 
                 order.status === 'completada' ? <CheckCircle2 size={24} /> : 
                 <AlertCircle size={24} />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{order.id}</span>
                  <select 
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer hover:text-kraken-orange transition-colors dark:text-neutral-400"
                  >
                    <option value="pendiente" className="dark:bg-neutral-900">Pendiente</option>
                    <option value="en_progreso" className="dark:bg-neutral-900">En Progreso</option>
                    <option value="completada" className="dark:bg-neutral-900">Completada</option>
                    <option value="cancelada" className="dark:bg-neutral-900">Cancelada</option>
                  </select>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{order.description}</h3>
                <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-neutral-300 dark:text-neutral-600" />
                    <span>{order.clientName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-neutral-300 dark:text-neutral-600" />
                    <span>{order.startDate ? format(parseLocalDate(order.startDate), 'dd MMM', { locale: es }) : 'Sin fecha'}</span>
                    {order.duration && <span className="text-neutral-400">({order.duration}d)</span>}
                  </div>
                  {order.crewId && (
                    <div className="flex items-center gap-1.5">
                      <User size={14} className="text-neutral-300 dark:text-neutral-600" />
                      <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-bold uppercase tracking-widest">{order.crewId}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <FileText size={14} className="text-neutral-300 dark:text-neutral-600" />
                    <span className="text-xs font-bold">{order.budgetId}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-neutral-100 dark:border-neutral-800">
              <div className="flex -space-x-2 mr-3">
                {order.assignedTo?.map((person, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[10px] font-bold text-neutral-600 dark:text-neutral-400" title={person}>
                    {person.split(' ').map(n => n[0]).join('')}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleViewOrder(order)}
                  className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                  title="Ver Detalles"
                >
                  <Eye size={18} />
                </button>
                <button 
                  onClick={() => handleEditOrder(order)}
                  className="p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteConfirm(order)}
                  className="p-2.5 bg-kraken-orange/10 text-kraken-orange rounded-xl hover:bg-kraken-orange hover:text-white transition-all"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={() => handleDownloadPDF(order)}
                  className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                  title="Descargar PDF"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 shrink-0">
              <h2 className="text-2xl font-bold tracking-tight dark:text-white">
                {isEditing ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setIsEditing(false); setSelectedOrder(null); }} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Presupuesto Asociado</label>
                  <select 
                    required
                    value={newOrder.budgetId || ''}
                    onChange={(e) => {
                      const budget = availableBudgets.find(b => b.id === e.target.value);
                      setNewOrder({ 
                        ...newOrder, 
                        budgetId: e.target.value,
                        description: budget ? budget.description : newOrder.description
                      });
                    }}
                    className="kraken-input"
                  >
                    <option value="" className="dark:bg-neutral-900">Seleccionar presupuesto</option>
                    {availableBudgets.map(b => (
                      <option key={b.id} value={b.id} className="dark:bg-neutral-900">{b.id} - {b.clientName}</option>
                    ))}
                  </select>
                  {newOrder.budgetId && (
                    <div className="mt-2 p-3 bg-kraken-orange/5 dark:bg-kraken-orange/10 border border-kraken-orange/10 rounded-xl">
                      <p className="text-[10px] font-bold text-kraken-orange uppercase tracking-widest mb-1">Cliente Seleccionado</p>
                      <p className="text-sm font-bold dark:text-white">
                        {availableBudgets.find(b => b.id === newOrder.budgetId)?.clientName}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Descripción</label>
                  <textarea 
                    required
                    placeholder="Detalles del trabajo..."
                    value={newOrder.description || ''}
                    onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                    className="kraken-input !h-24 !py-4 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Fecha Inicio</label>
                    <input 
                      required
                      type="date" 
                      value={newOrder.startDate || ''}
                      onChange={(e) => setNewOrder({ ...newOrder, startDate: e.target.value })}
                      className="kraken-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Duración (días)</label>
                    <input 
                      required
                      type="number" 
                      min="1"
                      value={newOrder.duration || 1}
                      onChange={(e) => setNewOrder({ ...newOrder, duration: parseInt(e.target.value) })}
                      className="kraken-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Cuadrilla / Equipo</label>
                  <select 
                    required
                    value={newOrder.crewId || ''}
                    onChange={(e) => setNewOrder({ ...newOrder, crewId: e.target.value })}
                    className="kraken-input"
                  >
                    <option value="" className="dark:bg-neutral-900">Seleccionar cuadrilla</option>
                    {AVAILABLE_CREWS.map(crew => (
                      <option key={crew} value={crew} className="dark:bg-neutral-900">{crew}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Asignar a (separado por comas)</label>
                  <input 
                    type="text" 
                    placeholder="Carlos R., Luis M."
                    value={newOrder.assignedTo?.join(', ') || ''}
                    onChange={(e) => setNewOrder({ ...newOrder, assignedTo: e.target.value.split(',').map(s => s.trim()) })}
                    className="kraken-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Asignar Personal por Fase</label>
                  <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {newOrder.phases?.map((phase, pIdx) => (
                      <div key={phase.id} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold dark:text-white">{phase.name}</p>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{phase.days}d / {phase.halfDays}m.j.</span>
                        </div>
                        <div className="space-y-2">
                          {phase.labor.map((labor, lIdx) => (
                            <div key={labor.id} className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                                  {labor.role === 'oficial' ? 'Oficial' : 'Ayudante'} ({labor.count})
                                </p>
                                <input 
                                  type="text" 
                                  placeholder="Nombre del operario..."
                                  value={labor.assignedPerson || ''}
                                  onChange={(e) => {
                                    const updatedPhases = JSON.parse(JSON.stringify(newOrder.phases));
                                    updatedPhases[pIdx].labor[lIdx].assignedPerson = e.target.value;
                                    setNewOrder({ ...newOrder, phases: updatedPhases });
                                  }}
                                  className="kraken-input !h-10 !px-3 !rounded-lg text-xs"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {(!newOrder.phases || newOrder.phases.length === 0) && (
                      <p className="text-xs text-neutral-400 italic text-center py-4">Selecciona un presupuesto para ver las fases.</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 block">Notas Adicionales</label>
                  <textarea 
                    placeholder="Notas internas o instrucciones especiales..."
                    value={newOrder.notes || ''}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                    className="kraken-input !h-20 !py-4 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white dark:bg-neutral-900 pb-2">
                <button 
                  type="button"
                  onClick={() => { setIsModalOpen(false); setIsEditing(false); setSelectedOrder(null); }}
                  className="flex-1 kraken-btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 kraken-btn"
                >
                  {isEditing ? 'Guardar Cambios' : 'Crear Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="kraken-card w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 shrink-0">
              <h2 className="text-2xl font-bold tracking-tight dark:text-white">Detalles de la Orden</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">ID Orden</p>
                  <p className="font-bold dark:text-white">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Estado</p>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Cliente</p>
                  <p className="font-bold dark:text-white">{selectedOrder.clientName}</p>
                  <p className="text-sm text-neutral-500">{selectedOrder.clientPhone}</p>
                  <p className="text-sm text-neutral-500">{selectedOrder.clientAddress}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Descripción</p>
                  <p className="text-neutral-700 dark:text-neutral-300">{selectedOrder.description}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Fecha Inicio</p>
                  <p className="font-medium dark:text-white">{selectedOrder.startDate ? format(parseLocalDate(selectedOrder.startDate), 'PPP', { locale: es }) : 'N/A'}</p>
                  {selectedOrder.duration && <p className="text-xs text-neutral-500">Duración: {selectedOrder.duration} días</p>}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Cuadrilla</p>
                  <p className="font-medium dark:text-white">{selectedOrder.crewId || 'No asignada'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Asignado a</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedOrder.assignedTo?.map((person, i) => (
                      <span key={i} className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-medium dark:text-neutral-300">
                        {person}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Fases y Personal Asignado</p>
                  <div className="space-y-3 mt-2">
                    {selectedOrder.phases?.map((phase) => (
                      <div key={phase.id} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold dark:text-white">{phase.name}</p>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{phase.days}d / {phase.halfDays}m.j.</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {phase.labor.map((labor) => (
                            <div key={labor.id} className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                {labor.role === 'oficial' ? 'Oficial' : 'Ayudante'} ({labor.count})
                              </span>
                              <span className="px-2 py-1 bg-white dark:bg-neutral-900 rounded-lg text-xs font-medium dark:text-neutral-300 border border-neutral-100 dark:border-neutral-700">
                                {labor.assignedPerson || 'Sin asignar'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Notas</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">"{selectedOrder.notes}"</p>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:opacity-90 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-kraken-orange/10 text-kraken-orange rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold dark:text-white">¿Eliminar Orden?</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2">Esta acción no se puede deshacer. Se eliminará la orden <span className="font-bold">{selectedOrder.id}</span>.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteOrder}
                  className="flex-1 px-4 py-3 bg-kraken-orange text-white rounded-xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20"
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
