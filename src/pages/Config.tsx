import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Settings, 
  Truck, 
  Users, 
  Percent, 
  Euro, 
  Info,
  ShieldCheck,
  Briefcase,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Mail,
  Lock,
  Shield,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { BusinessConfig, User, CostItem, ZoneItem } from '../types';
import { cn } from '../lib/utils';

const ConfigSection = ({ title, icon: Icon, children }: any) => (
  <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 transition-colors">
    <div className="flex items-center gap-4 mb-8">
      <div className="p-3 rounded-2xl bg-neutral-900 dark:bg-kraken-orange text-white">
        <Icon size={24} />
      </div>
      <div>
        <h3 className="text-xl font-bold tracking-tight dark:text-white">{title}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Configura los parámetros base para el cálculo.</p>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {children}
    </div>
  </div>
);

const InputField = ({ label, value, unit, type = 'number', onChange, onRemove }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{label}</label>
      {onRemove && (
        <button 
          onClick={onRemove}
          className="text-kraken-orange hover:text-kraken-orange-hover p-1 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
    <div className="relative">
      <input 
        type={type} 
        value={value}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full pl-4 pr-12 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400 dark:text-neutral-500">{unit}</span>
    </div>
  </div>
);

const ZoneMap = () => {
  const zones = [
    { id: 1, radius: 40, color: 'rgba(239, 68, 68, 0.15)', stroke: '#ef4444', label: 'Zona 1', cities: 'Faro, Loulé, Olhão' },
    { id: 2, radius: 80, color: 'rgba(245, 158, 11, 0.1)', stroke: '#f59e0b', label: 'Zona 2', cities: 'Albufeira, Tavira' },
    { id: 3, radius: 120, color: 'rgba(59, 130, 246, 0.08)', stroke: '#3b82f6', label: 'Zona 3', cities: 'Portimão, VRSA' },
    { id: 4, radius: 160, color: 'rgba(139, 92, 246, 0.05)', stroke: '#8b5cf6', label: 'Zona 4', cities: 'Lagos, Sagres, Aljezur' },
  ];

  return (
    <div className="col-span-full mt-8 p-8 bg-neutral-50 dark:bg-neutral-800/50 rounded-[40px] border border-neutral-200 dark:border-neutral-700 overflow-hidden relative transition-colors">
      <div className="flex flex-col lg:flex-row gap-12 items-center">
        <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center bg-white dark:bg-neutral-900 rounded-[32px] shadow-inner border border-neutral-100 dark:border-neutral-800">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Simplified Portugal/Algarve Shape */}
            <path 
              d="M50,300 Q100,280 150,290 T250,310 T350,300 L350,350 Q200,380 50,350 Z" 
              fill="currentColor" 
              className="text-neutral-100 dark:text-neutral-800"
              stroke="currentColor" 
              strokeWidth="2"
            />
            
            {/* Concentric Circles from Faro (Epicenter) */}
            <g transform="translate(200, 320)">
              {zones.reverse().map((zone) => (
                <circle 
                  key={zone.id}
                  r={zone.radius}
                  fill={zone.color}
                  stroke={zone.stroke}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}
              {/* Epicenter Dot */}
              <circle r="4" fill="#FF4D00" />
              <text y="-10" textAnchor="middle" className="text-[10px] font-bold fill-kraken-orange uppercase tracking-widest">Algarve (Faro)</text>
            </g>

            {/* City Markers */}
            <g className="text-[8px] font-bold fill-neutral-400 dark:fill-neutral-500 uppercase tracking-tighter">
              <text x="200" y="310" textAnchor="middle">Faro</text>
              <text x="170" y="315" textAnchor="middle">Loulé</text>
              <text x="230" y="315" textAnchor="middle">Olhão</text>
              <text x="140" y="305" textAnchor="middle">Albufeira</text>
              <text x="270" y="305" textAnchor="middle">Tavira</text>
              <text x="100" y="295" textAnchor="middle">Portimão</text>
              <text x="310" y="295" textAnchor="middle">VRSA</text>
              <text x="60" y="285" textAnchor="middle">Lagos</text>
              <text x="30" y="310" textAnchor="middle">Sagres</text>
            </g>
          </svg>
        </div>

        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kraken-orange/10 text-kraken-orange text-[10px] font-bold uppercase tracking-widest">
            Referencia de Cobertura
          </div>
          <h4 className="text-2xl font-black tracking-tighter text-neutral-900 dark:text-white">Mapa de Zonas de Traslado</h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
            Visualiza el alcance de cada zona tarifaria con epicentro en el Algarve (Faro). 
            Los círculos concéntricos determinan el costo base de desplazamiento según la distancia.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {zones.reverse().map((zone) => (
              <div key={zone.id} className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-start gap-3 transition-colors">
                <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: zone.stroke }} />
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{zone.label}</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{zone.cities}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import { 
  fetchConfig, 
  saveConfig, 
  fetchUsers, 
  saveUser, 
  deleteUser,
  fetchClients,
  fetchBudgets,
  fetchWorkOrders,
  fetchExpenses
} from '../lib/storage';
import { secondaryAuth } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function Config() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configData, usersData] = await Promise.all([
          fetchConfig(),
          fetchUsers()
        ]);
        setConfig(configData);
        setUsers(usersData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await saveConfig(config);
      toast.success('Configuración guardada correctamente.');
    } catch (err) {
      console.error('Error saving config:', err);
      toast.error('Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    if (!config) return;
    const newConfig = { ...config };
    const keys = path.split('.');
    let current: any = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
  };

  const addItem = (listName: 'fixedCosts' | 'variableCosts' | 'transportZones') => {
    if (!config) return;
    const newItem = listName === 'transportZones' 
      ? { id: config.transportZones.length + 1, name: `Nueva Zona ${config.transportZones.length + 1}`, amount: 0 }
      : { id: Math.random().toString(36).substr(2, 9), name: 'Nuevo Gasto', amount: 0 };
    
    setConfig({
      ...config,
      [listName]: [...(config[listName] as any), newItem]
    });
  };

  const removeItem = (listName: 'fixedCosts' | 'variableCosts' | 'transportZones', id: string | number) => {
    if (!config) return;
    setConfig({
      ...config,
      [listName]: (config[listName] as any).filter((item: any) => item.id !== id)
    });
  };

  const updateItem = (listName: 'fixedCosts' | 'variableCosts' | 'transportZones', id: string | number, field: string, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      [listName]: (config[listName] as any).map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      )
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSaving(true);
      
      let userId = editingUser.id;
      
      // If it's a new user, create them in Firebase Auth first
      if (!userId && editingUser.email && editingUser.password) {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth, 
            editingUser.email, 
            editingUser.password
          );
          userId = userCredential.user.uid;
        } catch (authErr: any) {
          console.error('Error creating auth user:', authErr);
          if (authErr.code === 'auth/email-already-in-use') {
            toast.error('El email ya está en uso');
          } else if (authErr.code === 'auth/weak-password') {
            toast.error('La contraseña es muy débil');
          } else {
            toast.error('Error al crear el acceso del usuario');
          }
          return;
        }
      }

      const userToSave = { 
        ...editingUser, 
        id: userId || Math.random().toString(36).substr(2, 9) 
      };

      await saveUser(userToSave);
      
      if (editingUser.id) {
        setUsers(users.map(u => u.id === editingUser.id ? userToSave as User : u));
        toast.success('Usuario actualizado');
      } else {
        setUsers([...users, userToSave as User]);
        toast.success('Usuario creado');
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Error saving user:', err);
      toast.error('Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      setSaving(true);
      await deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      setUserToDelete(null);
      toast.success('Usuario eliminado');
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Error al eliminar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setSaving(true);
      const [clients, budgets, workOrders, expenses] = await Promise.all([
        fetchClients(),
        fetchBudgets(),
        fetchWorkOrders(),
        fetchExpenses()
      ]);

      const wb = XLSX.utils.book_new();

      // Clients Sheet
      const wsClients = XLSX.utils.json_to_sheet(clients.map(c => ({
        ID: c.id,
        Nombre: c.name,
        Email: c.email,
        Teléfono: c.phone,
        Dirección: c.address,
        Ciudad: c.city,
        'Fecha Registro': c.createdAt
      })));
      XLSX.utils.book_append_sheet(wb, wsClients, "Clientes");

      // Budgets Sheet
      const wsBudgets = XLSX.utils.json_to_sheet(budgets.map((b: any) => ({
        ID: b.id,
        Cliente: b.clientName,
        Fecha: b.date,
        Total: b.total,
        Estado: b.status,
        IVA: b.ivaAmount,
        Subtotal: b.subtotal
      })));
      XLSX.utils.book_append_sheet(wb, wsBudgets, "Presupuestos");

      // Work Orders Sheet
      const wsWorkOrders = XLSX.utils.json_to_sheet(workOrders.map((wo: any) => ({
        ID: wo.id,
        PresupuestoID: wo.budgetId,
        Cliente: wo.clientName,
        Fecha_Inicio: wo.startDate,
        Duracion: wo.duration,
        Estado: wo.status,
        Total: wo.total
      })));
      XLSX.utils.book_append_sheet(wb, wsWorkOrders, "Ordenes de Trabajo");

      // Expenses Sheet
      const wsExpenses = XLSX.utils.json_to_sheet(expenses.map(e => ({
        ID: e.id,
        Descripción: e.description,
        Categoría: e.category,
        Monto: e.amount,
        Fecha: e.date
      })));
      XLSX.utils.book_append_sheet(wb, wsExpenses, "Gastos");

      // Config Sheet
      const wsConfig = XLSX.utils.json_to_sheet([
        { Parametro: 'Días por Mes', Valor: config?.daysPerMonth },
        { Parametro: 'Costo Media Jornada Oficial', Valor: config?.halfDayCostOficial },
        { Parametro: 'Costo Media Jornada Ayudante', Valor: config?.halfDayCostAyudante },
        { Parametro: 'Markup Materiales', Valor: config?.materialMarkup },
        { Parametro: 'IVA', Valor: config?.iva }
      ]);
      XLSX.utils.book_append_sheet(wb, wsConfig, "Configuracion");

      XLSX.writeFile(wb, `Kraken_Handyman_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Base de datos exportada correctamente.');
    } catch (err) {
      console.error('Error exporting data:', err);
      toast.error('Error al exportar la base de datos.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-kraken-orange" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Configuración</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Ajusta los parámetros financieros y operativos de Kraken Handyman.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button 
            onClick={handleExportData}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 rounded-xl font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <FileSpreadsheet size={20} className="text-green-600" />}
            <span>Exportar Base (.xlsx)</span>
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-kraken-orange text-white rounded-xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <ConfigSection title="Gastos Fijos Mensuales" icon={ShieldCheck}>
          {config.fixedCosts.map((cost) => (
            <div key={cost.id} className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Descripción</label>
                  <input 
                    type="text"
                    value={cost.name}
                    onChange={(e) => updateItem('fixedCosts', cost.id, 'name', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none font-bold dark:text-white"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Monto (€)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={cost.amount}
                      onChange={(e) => updateItem('fixedCosts', cost.id, 'amount', Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none font-bold dark:text-white"
                    />
                    <button 
                      onClick={() => removeItem('fixedCosts', cost.id)}
                      className="absolute -right-2 -top-2 bg-kraken-orange text-white p-1 rounded-full hover:bg-kraken-orange-hover transition-colors shadow-sm"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => addItem('fixedCosts')}
            className="col-span-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-400 hover:text-kraken-orange hover:border-kraken-orange/50 transition-all font-bold"
          >
            <Plus size={20} />
            <span>Añadir Gasto Fijo</span>
          </button>
          <InputField label="Días Laborales al Mes" value={config.daysPerMonth} unit="días" onChange={(v: number) => updateConfig('daysPerMonth', v)} />
        </ConfigSection>

        <ConfigSection title="Gastos Variables y Márgenes" icon={Percent}>
          <InputField label="Costo Media Jornada Oficial" value={config.halfDayCostOficial} unit="€" onChange={(v: number) => updateConfig('halfDayCostOficial', v)} />
          <InputField label="Costo Media Jornada Ayudante" value={config.halfDayCostAyudante} unit="€" onChange={(v: number) => updateConfig('halfDayCostAyudante', v)} />
          {config.variableCosts.map((cost) => (
            <div key={cost.id} className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Gasto Variable</label>
                  <input 
                    type="text"
                    value={cost.name}
                    onChange={(e) => updateItem('variableCosts', cost.id, 'name', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none font-bold dark:text-white"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Monto (€)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={cost.amount}
                      onChange={(e) => updateItem('variableCosts', cost.id, 'amount', Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none font-bold dark:text-white"
                    />
                    <button 
                      onClick={() => removeItem('variableCosts', cost.id)}
                      className="absolute -right-2 -top-2 bg-kraken-orange text-white p-1 rounded-full hover:bg-kraken-orange-hover transition-colors shadow-sm"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => addItem('variableCosts')}
            className="col-span-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-400 hover:text-kraken-orange hover:border-kraken-orange/50 transition-all font-bold"
          >
            <Plus size={20} />
            <span>Añadir Gasto Variable</span>
          </button>
          <InputField label="Garantía (8%) Estándar" value={config.guaranteePct * 100} unit="%" onChange={(v: number) => updateConfig('guaranteePct', v / 100)} />
          <InputField label="Markup Materiales" value={config.materialMarkup * 100} unit="%" onChange={(v: number) => updateConfig('materialMarkup', v / 100)} />
          <InputField label="IVA" value={config.iva * 100} unit="%" onChange={(v: number) => updateConfig('iva', v / 100)} />
        </ConfigSection>

        <ConfigSection title="Traslado por Zona" icon={Truck}>
          {config.transportZones.map((zone) => (
            <div key={zone.id} className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Nombre Zona</label>
                  <input 
                    type="text"
                    value={zone.name}
                    onChange={(e) => updateItem('transportZones', zone.id, 'name', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none font-bold dark:text-white"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Costo (€)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={zone.amount}
                      onChange={(e) => updateItem('transportZones', zone.id, 'amount', Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none font-bold dark:text-white"
                    />
                    <button 
                      onClick={() => removeItem('transportZones', zone.id)}
                      className="absolute -right-2 -top-2 bg-kraken-orange text-white p-1 rounded-full hover:bg-kraken-orange-hover transition-colors shadow-sm"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => addItem('transportZones')}
            className="col-span-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-400 hover:text-kraken-orange hover:border-kraken-orange/50 transition-all font-bold"
          >
            <Plus size={20} />
            <span>Añadir Zona</span>
          </button>
          <ZoneMap />
        </ConfigSection>

        <ConfigSection title="Gestión de Usuarios" icon={Users}>
          <div className="col-span-full space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <div key={user.id} className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      <Users size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-white truncate">{user.username}</p>
                      <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      user.role === 'admin' ? "bg-kraken-orange/10 text-kraken-orange" : "bg-blue-100 text-blue-600"
                    )}>
                      {user.role}
                    </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingUser(user);
                      setIsUserModalOpen(true);
                    }}
                    className="p-2 text-neutral-400 hover:text-kraken-orange transition-colors"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={() => setUserToDelete(user.id)}
                    className="p-2 text-neutral-400 hover:text-kraken-orange transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => {
                  setEditingUser({ username: '', email: '', role: 'user', password: '' });
                  setIsUserModalOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-400 hover:text-kraken-orange hover:border-kraken-orange/50 transition-all font-bold"
              >
                <UserPlus size={32} />
                <span>Añadir Usuario</span>
              </button>
            </div>
          </div>
        </ConfigSection>

        <ConfigSection title="Parámetros del Sistema" icon={Settings}>
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Idioma por Defecto</label>
            <select className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white">
              <option value="es">Español</option>
              <option value="pt">Portugués</option>
              <option value="en">Inglés</option>
            </select>
          </div>
          <InputField label="Número Inicial Presupuesto" value={1473} unit="#" />
        </ConfigSection>
      </div>

      {/* Modal de Usuario */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-neutral-100 dark:border-neutral-800">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
              <h2 className="text-xl font-bold tracking-tight dark:text-white">
                {editingUser.id ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Nombre de Usuario</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                      <input 
                        required
                        type="text" 
                        value={editingUser.username}
                        onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                      />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Email (Para iniciar sesión)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input 
                      required
                      type="email" 
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input 
                      required={!editingUser.id}
                      type="password" 
                      value={editingUser.password}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      placeholder={editingUser.id ? "Dejar en blanco para no cambiar" : ""}
                      className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Rol</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <select 
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'user' })}
                      className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all font-bold dark:text-white"
                    >
                      <option value="user">Usuario Común</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all dark:text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-kraken-orange text-white rounded-2xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20"
                >
                  <Save size={20} />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Usuario */}
      {userToDelete && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 border border-neutral-100 dark:border-neutral-800">
            <div className="w-16 h-16 bg-kraken-orange/10 text-kraken-orange rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 dark:text-white">¿Eliminar Usuario?</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-center mb-8">
              Esta acción no se puede deshacer. El usuario perderá el acceso al sistema.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setUserToDelete(null)}
                className="flex-1 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDeleteUser(userToDelete)}
                className="flex-1 px-6 py-3 bg-kraken-orange text-white rounded-xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-kraken-orange/10 dark:bg-kraken-orange/20 p-6 rounded-3xl border border-kraken-orange/20 dark:border-kraken-orange/30 flex items-start gap-4 transition-colors">
        <div className="p-2 rounded-lg bg-kraken-orange/20 dark:bg-kraken-orange/40 text-kraken-orange dark:text-kraken-orange-light">
          <Info size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-kraken-orange dark:text-kraken-orange-light">Nota de Seguridad</h4>
          <p className="text-xs text-kraken-orange/80 dark:text-kraken-orange-light/80 mt-1 font-medium leading-relaxed">
            Los cambios en los costos fijos y variables afectarán a todos los presupuestos nuevos que se generen a partir de este momento. 
            Los presupuestos existentes mantendrán los valores con los que fueron creados originalmente.
          </p>
        </div>
      </div>
    </div>
  );
}
