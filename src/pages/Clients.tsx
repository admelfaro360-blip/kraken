import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  MoreHorizontal, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase,
  X,
  Save,
  AlertCircle,
  FileText,
  LayoutGrid,
  List,
  Eye
} from 'lucide-react';
import { Client, Budget } from '../types';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext';
import { fetchClients, saveClient, deleteClient, getBudgetsByClientId, deleteBudget } from '../lib/storage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const initialClients: Client[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    vertical: 'hogar',
    address: 'Calle Mayor 15, Madrid',
    phone: '+34 600 000 001',
    email: 'juan.perez@email.com',
    zone: 1,
    notes: 'Cliente recurrente para pequeñas reparaciones.'
  },
  {
    id: '2',
    name: 'Tech Corp S.A.',
    vertical: 'industria',
    address: 'Polígono Industrial Norte, Nave 4',
    phone: '+34 912 345 678',
    email: 'mantenimiento@techcorp.com',
    zone: 3,
    notes: 'Contrato de mantenimiento preventivo trimestral.'
  }
];

export default function Clients() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  
  React.useEffect(() => {
    const loadClients = async () => {
      try {
        const stored = await fetchClients();
        setClients(stored);
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };
    loadClients();
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientBudgets, setClientBudgets] = useState<Budget[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [budgetDeleteConfirmation, setBudgetDeleteConfirmation] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    address: '',
    vertical: 'hogar',
    phone: '',
    email: '',
    zone: 1,
    notes: ''
  });

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        address: '',
        vertical: 'hogar',
        phone: '',
        email: '',
        zone: 1,
        notes: ''
      });
    }
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = async (client: Client) => {
    setSelectedClient(client);
    const budgets = await getBudgetsByClientId(client.id);
    setClientBudgets(budgets);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      const updatedClient = { ...editingClient, ...formData } as Client;
      const updated = clients.map(c => c.id === editingClient.id ? updatedClient : c);
      setClients(updated);
      await saveClient(updatedClient);
    } else {
      const newClient: Client = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
      } as Client;
      const updated = [...clients, newClient];
      setClients(updated);
      await saveClient(newClient);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    const updated = clients.filter(c => c.id !== id);
    setClients(updated);
    await deleteClient(id);
    setDeleteConfirmation(null);
  };

  const handleDeleteBudget = async (id: string) => {
    await deleteBudget(id);
    setClientBudgets(prev => prev.filter(b => b.id !== id));
    setBudgetDeleteConfirmation(null);
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Gestión de Clientes</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Administra tu base de datos de clientes y contactos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-kraken-orange text-white rounded-xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20"
        >
          <Plus size={20} />
          <span>Nuevo Cliente</span>
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, email o teléfono..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-neutral-100 dark:bg-neutral-800 text-kraken-orange" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-neutral-100 dark:bg-neutral-800 text-kraken-orange" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              <List size={20} />
            </button>
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">
            <Filter size={20} />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div 
              key={client.id} 
              onClick={() => handleOpenDetailModal(client)}
              className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 hover:shadow-md transition-shadow group relative cursor-pointer"
            >
              <div className="absolute top-4 right-4 flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetailModal(client);
                  }}
                  className="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg hover:bg-kraken-orange/10 hover:text-kraken-orange transition-colors"
                  title="Ver Detalles"
                >
                  <Eye size={16} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModal(client);
                  }}
                  className="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg hover:bg-kraken-orange/10 hover:text-kraken-orange transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmation(client.id);
                  }}
                  className="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg hover:bg-kraken-orange/10 hover:text-kraken-orange transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className={cn(
                  "p-4 rounded-2xl",
                  client.vertical === 'hogar' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                )}>
                  {client.vertical === 'hogar' ? <User size={24} /> : <Briefcase size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight">{client.name}</h3>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 inline-block",
                    client.vertical === 'hogar' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  )}>
                    {client.vertical}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                  <Phone size={16} className="text-neutral-400 dark:text-neutral-500" />
                  <span className="font-medium">{client.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                  <Mail size={16} className="text-neutral-400 dark:text-neutral-500" />
                  <span className="font-medium truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                  <MapPin size={16} className="text-neutral-400 dark:text-neutral-500" />
                  <span className="font-medium">{client.address}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                  <div className="w-4 h-4 flex items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-500 dark:text-neutral-400">Z</div>
                  <span className="font-medium">Zona {client.zone}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-50 dark:border-neutral-800 flex gap-3">
                <button 
                  onClick={() => navigate(`/presupuestos?cliente=${encodeURIComponent(client.name)}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
                >
                  <FileText size={14} />
                  <span>Ver Presupuestos</span>
                </button>
                <button 
                  onClick={() => navigate(`/presupuestos/nuevo?cliente=${encodeURIComponent(client.name)}`)}
                  className="p-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl hover:bg-kraken-orange/10 hover:text-kraken-orange transition-all"
                  title="Nuevo Presupuesto"
                >
                  <Plus size={16} />
                </button>
              </div>

              {client.notes && (
                <div className="mt-6 pt-4 border-t border-neutral-50 dark:border-neutral-800">
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 italic line-clamp-2">"{client.notes}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800">
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Ubicación</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {filteredClients.map((client) => (
                <tr 
                  key={client.id} 
                  onClick={() => handleOpenDetailModal(client)}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        client.vertical === 'hogar' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                      )}>
                        {client.vertical === 'hogar' ? <User size={16} /> : <Briefcase size={16} />}
                      </div>
                      <div>
                        <div className="font-bold text-neutral-900 dark:text-white">{client.name}</div>
                        <div className="text-[10px] text-neutral-400 uppercase tracking-widest">{client.vertical}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">{client.phone}</div>
                    <div className="text-xs text-neutral-400 dark:text-neutral-500">{client.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">{client.address}</div>
                    <div className="text-xs text-neutral-400 dark:text-neutral-500">Zona {client.zone}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/presupuestos/nuevo?cliente=${encodeURIComponent(client.name)}`);
                        }}
                        className="p-2 text-neutral-400 hover:text-kraken-orange transition-colors"
                        title="Nuevo Presupuesto"
                      >
                        <Plus size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetailModal(client);
                        }}
                        className="p-2 text-neutral-400 hover:text-kraken-orange transition-colors"
                        title="Ver Detalles"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(client);
                        }}
                        className="p-2 text-neutral-400 hover:text-kraken-orange transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmation(client.id);
                        }}
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
      )}

      {/* Modal de Creación/Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-neutral-100 dark:border-neutral-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 shrink-0">
              <h2 className="text-2xl font-bold tracking-tight dark:text-white">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Nombre / Razón Social</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Vertical</label>
                  <select 
                    value={formData.vertical}
                    onChange={(e) => setFormData({ ...formData, vertical: e.target.value as any })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                  >
                    <option value="hogar">Hogar (Particular)</option>
                    <option value="industria">Industria (Corporativo)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Teléfono</label>
                  <input 
                    required
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Email</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Dirección</label>
                  <input 
                    required
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Zona de Traslado</label>
                  <select 
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                  >
                    <option value={1}>Zona 1</option>
                    <option value={2}>Zona 2</option>
                    <option value={3}>Zona 3</option>
                    <option value={4}>Zona 4</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Notas / Observaciones</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-medium dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-4 sticky bottom-0 bg-white dark:bg-neutral-900 pb-2">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all dark:text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-kraken-orange text-white rounded-2xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20"
                >
                  <Save size={20} />
                  <span>{editingClient ? 'Guardar Cambios' : 'Crear Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Cliente */}
      {isDetailModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-neutral-100 dark:border-neutral-800 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 shrink-0">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  selectedClient.vertical === 'hogar' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                )}>
                  {selectedClient.vertical === 'hogar' ? <User size={24} /> : <Briefcase size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight dark:text-white">{selectedClient.name}</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-bold">{selectedClient.vertical}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Información de Contacto</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
                      <Phone size={18} className="text-neutral-400" />
                      <span className="font-medium">{selectedClient.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
                      <Mail size={18} className="text-neutral-400" />
                      <span className="font-medium">{selectedClient.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
                      <MapPin size={18} className="text-neutral-400" />
                      <span className="font-medium">{selectedClient.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
                      <div className="w-5 h-5 flex items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-500">Z</div>
                      <span className="font-medium">Zona de Traslado {selectedClient.zone}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Notas</h3>
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <p className="text-neutral-600 dark:text-neutral-400 italic">
                      {selectedClient.notes || 'Sin notas adicionales.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Historial de Presupuestos</h3>
                  <button 
                    onClick={() => navigate(`/presupuestos/nuevo?cliente=${encodeURIComponent(selectedClient.name)}`)}
                    className="text-xs font-bold text-kraken-orange hover:underline"
                  >
                    + Nuevo Presupuesto
                  </button>
                </div>

                {clientBudgets.length > 0 ? (
                  <div className="space-y-3">
                    {clientBudgets.map((budget) => (
                      <div 
                        key={budget.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-kraken-orange/30 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-kraken-orange transition-colors">
                            <FileText size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white">{budget.id}</div>
                            <div className="text-xs text-neutral-500">{format(new Date(budget.date), 'dd MMM yyyy', { locale: es })}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xs font-bold text-neutral-900 dark:text-white">
                              {(budget.subtotal || (budget.total / 1.23)).toFixed(2)}€ + IVA = {budget.total?.toFixed(2)}€
                            </div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">{budget.status}</div>
                          </div>
                          <button 
                            onClick={() => navigate(`/presupuestos?id=${budget.id}`)}
                            className="p-2 text-neutral-400 hover:text-kraken-orange transition-colors"
                            title="Ver Presupuesto"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => setBudgetDeleteConfirmation(budget.id)}
                            className="p-2 text-neutral-400 hover:text-kraken-orange transition-colors"
                            title="Eliminar Presupuesto"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/30 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <FileText size={48} className="mx-auto text-neutral-300 mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400 font-medium">Este cliente aún no tiene presupuestos.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex flex-col md:flex-row gap-4 shrink-0">
              <button 
                onClick={() => navigate(`/presupuestos/nuevo?cliente=${encodeURIComponent(selectedClient.name)}`)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-kraken-orange text-white rounded-xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20"
              >
                <Plus size={18} />
                <span>Nuevo Presupuesto</span>
              </button>
              <button 
                onClick={() => handleOpenModal(selectedClient)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all dark:text-white"
              >
                <Edit2 size={18} />
                <span>Editar Cliente</span>
              </button>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmación de Eliminación */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 border border-neutral-100 dark:border-neutral-800">
            <div className="w-16 h-16 bg-kraken-orange/10 text-kraken-orange rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 dark:text-white">¿Eliminar Cliente?</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-center mb-8">
              Esta acción no se puede deshacer. Se eliminarán todos los datos asociados a este cliente.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirmation)}
                className="flex-1 px-6 py-3 bg-kraken-orange text-white rounded-xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmación de Eliminación de Presupuesto */}
      {budgetDeleteConfirmation && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 border border-neutral-100 dark:border-neutral-800">
            <div className="w-16 h-16 bg-kraken-orange/10 text-kraken-orange rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 dark:text-white">¿Eliminar Presupuesto?</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-center mb-8">
              Esta acción no se puede deshacer. Se eliminarán todos los datos asociados a este presupuesto.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setBudgetDeleteConfirmation(null)}
                className="flex-1 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDeleteBudget(budgetDeleteConfirmation)}
                className="flex-1 px-6 py-3 bg-kraken-orange text-white rounded-xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
