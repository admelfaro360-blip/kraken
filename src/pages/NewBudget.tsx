import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  Euro,
  Truck,
  Users,
  Percent,
  Info
} from 'lucide-react';
import { Phase, Material, BusinessConfig, CalculationResult, Client, Budget } from '../types';
import { calculateBudget } from '../lib/calculator';
import { generateBudgetPDF } from '../lib/pdfGenerator';
import { format } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../lib/ThemeContext';
import { saveBudget, fetchBudgets, fetchClients, saveClient, fetchConfig } from '../lib/storage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function NewBudget() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const budgetId = searchParams.get('id');
  
  const [step, setStep] = useState(1);
  const [phases, setPhases] = useState<Phase[]>([
    { 
      id: '1', 
      name: 'Inicio / Arranque', 
      labor: [{ id: 'l1', role: 'oficial', count: 1 }], 
      halfDays: 1, 
      days: 1, 
      extraTransport: 0 
    }
  ]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [clientZone, setClientZone] = useState(1);
  const [marginPct, setMarginPct] = useState(30);
  const [clientInfo, setClientInfo] = useState({
    name: searchParams.get('cliente') || '',
    phone: '',
    address: '',
    vertical: 'hogar' as 'hogar' | 'industria',
    language: 'es' as 'es' | 'pt' | 'en'
  });
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [storedClients, storedConfig] = await Promise.all([
        fetchClients(),
        fetchConfig()
      ]);
      setClients(storedClients);
      if (storedConfig) {
        setConfig(storedConfig);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const clientName = searchParams.get('cliente');
    if (clientName && clients.length > 0) {
      const client = clients.find(c => c.name === clientName);
      if (client) {
        setClientInfo({
          name: client.name,
          phone: client.phone,
          address: client.address,
          vertical: client.vertical,
          language: clientInfo.language
        });
        setClientZone(client.zone);
      }
    }
  }, [clients, searchParams]);

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientInfo({
        name: client.name,
        phone: client.phone,
        address: client.address,
        vertical: client.vertical,
        language: clientInfo.language
      });
      setClientZone(client.zone);
    } else {
      setClientInfo({
        name: '',
        phone: '',
        address: '',
        vertical: 'hogar',
        language: clientInfo.language
      });
      setClientZone(1);
    }
  };

  useEffect(() => {
    if (budgetId) {
      const loadBudget = async () => {
        const budgets = await fetchBudgets();
        const budget = budgets.find(b => b.id === budgetId);
        if (budget) {
          setPhases(budget.phases);
          setMaterials(budget.materials);
          setMarginPct(budget.marginPct);
          setClientInfo({
            name: budget.clientName || budget.clientId || '',
            phone: budget.clientPhone || '',
            address: budget.clientAddress || '',
            vertical: budget.clientVertical || 'hogar',
            language: budget.language
          });
          setDescription(budget.description);
          setInternalNotes(budget.internalNotes || '');
        }
      };
      loadBudget();
    }
  }, [budgetId]);


  useEffect(() => {
    if (!config) return;
    const result = calculateBudget(phases, materials, config, clientZone, marginPct);
    setCalculation(result);
  }, [phases, materials, clientZone, marginPct, config]);

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-kraken-orange border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-500 font-bold animate-pulse">CARGANDO CONFIGURACIÓN...</p>
        </div>
      </div>
    );
  }

  const addPhase = () => {
    const newPhase: Phase = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Nueva Fase',
      labor: [{ id: Math.random().toString(36).substr(2, 9), role: 'oficial', count: 1 }],
      halfDays: 1,
      days: 1,
      extraTransport: 0
    };
    setPhases([...phases, newPhase]);
  };

  const addLabor = (phaseId: string) => {
    setPhases(phases.map(p => {
      if (p.id === phaseId) {
        return {
          ...p,
          labor: [...p.labor, { id: Math.random().toString(36).substr(2, 9), role: 'ayudante', count: 1 }]
        };
      }
      return p;
    }));
  };

  const updateLabor = (phaseId: string, laborId: string, field: 'role' | 'count', value: any) => {
    setPhases(phases.map(p => {
      if (p.id === phaseId) {
        return {
          ...p,
          labor: p.labor.map(l => l.id === laborId ? { ...l, [field]: value } : l)
        };
      }
      return p;
    }));
  };

  const removeLabor = (phaseId: string, laborId: string) => {
    setPhases(phases.map(p => {
      if (p.id === phaseId && p.labor.length > 1) {
        return {
          ...p,
          labor: p.labor.filter(l => l.id !== laborId)
        };
      }
      return p;
    }));
  };

  const updatePhase = (id: string, field: keyof Phase, value: any) => {
    setPhases(phases.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePhase = (id: string) => {
    if (phases.length > 1) {
      setPhases(phases.filter(p => p.id !== id));
    }
  };

  const addMaterial = () => {
    const newMaterial: Material = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      cost: 0,
      quantity: 1
    };
    setMaterials([...materials, newMaterial]);
  };

  const updateMaterial = (id: string, field: keyof Material, value: any) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleSave = async () => {
    if (!calculation) return;
    
    const budget: Budget = {
      id: budgetId || ('PR-' + new Date().getTime().toString().slice(-4)),
      clientId: clientInfo.name || 'Cliente',
      clientName: clientInfo.name,
      clientPhone: clientInfo.phone,
      clientAddress: clientInfo.address,
      clientVertical: clientInfo.vertical,
      date: new Date().toISOString(),
      description: description || 'Sin descripción',
      language: clientInfo.language,
      status: 'borrador',
      phases,
      materials,
      internalNotes,
      marginPct,
      subtotal: calculation.subtotal,
      total: calculation.total
    };

    // Save client if it doesn't exist
    const existingClient = clients.find(c => c.name === clientInfo.name);
    if (!existingClient && clientInfo.name) {
      const newClient: Client = {
        id: Math.random().toString(36).substr(2, 9),
        name: clientInfo.name,
        phone: clientInfo.phone,
        address: clientInfo.address,
        vertical: clientInfo.vertical,
        email: '',
        zone: clientZone
      };
      await saveClient(newClient);
    }

    await saveBudget(budget);
    navigate('/presupuestos');
  };

  const handleDownloadPDF = async () => {
    if (!calculation) return;
    const doc = await generateBudgetPDF({
      id: budgetId || ('PR-' + new Date().getTime().toString().slice(-4)),
      client: {
        name: clientInfo.name || 'Cliente sin nombre',
        phone: clientInfo.phone || 'N/A',
        address: clientInfo.address || 'N/A',
        vertical: clientInfo.vertical
      },
      date: format(new Date(), 'dd/MM/yyyy'),
      description: description || 'Sin descripción',
      calculation: calculation,
      materials: materials,
      language: clientInfo.language,
      config: config
    });
    doc.save(`Presupuesto_${clientInfo.name || 'Kraken'}.pdf`);
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Nuevo Presupuesto</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Paso {step} de 3: {step === 1 ? 'Configuración y Fases' : step === 2 ? 'Materiales' : 'Resumen y Finalizar'}</p>
        </div>
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="kraken-btn-secondary flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              <span>Anterior</span>
            </button>
          )}
          {step < 3 ? (
            <button 
              onClick={() => setStep(step + 1)}
              className="kraken-btn flex items-center gap-2"
            >
              <span>Siguiente</span>
              <ChevronRight size={20} />
            </button>
          ) : (
            <button 
              onClick={handleSave}
              className="kraken-btn flex items-center gap-2"
            >
              <Save size={20} />
              <span>Guardar Presupuesto</span>
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {step === 1 && (
            <>
              <div className="kraken-card p-8 space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 rounded-2xl bg-kraken-orange text-white">
                    <Users size={24} />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight dark:text-white">Datos del Cliente</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Seleccionar Cliente Existente (Opcional)</label>
                    <select 
                      value={clients.find(c => c.name === clientInfo.name)?.id || ''}
                      onChange={(e) => handleClientSelect(e.target.value)}
                      className="kraken-input"
                    >
                      <option value="">-- Nuevo Cliente --</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Nombre / Razón Social</label>
                    <input 
                      type="text" 
                      value={clientInfo.name}
                      onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                      placeholder="Ej: Juan Pérez o Tech Corp"
                      className="kraken-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Teléfono / Celular</label>
                    <input 
                      type="text" 
                      value={clientInfo.phone}
                      onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                      placeholder="+34 000 000 000"
                      className="kraken-input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Dirección del Trabajo</label>
                    <input 
                      type="text" 
                      value={clientInfo.address}
                      onChange={(e) => setClientInfo({ ...clientInfo, address: e.target.value })}
                      placeholder="Calle, Número, Piso, Ciudad"
                      className="kraken-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Vertical</label>
                    <select 
                      value={clientInfo.vertical}
                      onChange={(e) => setClientInfo({ ...clientInfo, vertical: e.target.value as any })}
                      className="kraken-input"
                    >
                      <option value="hogar">Hogar (Particular)</option>
                      <option value="industria">Industria (Corporativo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Idioma Presupuesto</label>
                    <select 
                      value={clientInfo.language}
                      onChange={(e) => setClientInfo({ ...clientInfo, language: e.target.value as any })}
                      className="kraken-input"
                    >
                      <option value="es">Español</option>
                      <option value="pt">Português</option>
                      <option value="en">Inglés</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Zona de Traslado</label>
                    <select 
                      value={clientZone}
                      onChange={(e) => setClientZone(Number(e.target.value))}
                      className="kraken-input"
                    >
                      <option value={1}>Zona 1 (10 €)</option>
                      <option value={2}>Zona 2 (15 €)</option>
                      <option value={3}>Zona 3 (20 €)</option>
                      <option value={4}>Zona 4 (30 €)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Margen de Ganancia (%)</label>
                    <input 
                      type="number" 
                      value={marginPct}
                      onChange={(e) => setMarginPct(Number(e.target.value))}
                      className="kraken-input"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight dark:text-white">Fases del Trabajo</h3>
                  <button 
                    onClick={addPhase}
                    className="flex items-center gap-2 text-kraken-orange font-bold text-sm hover:text-kraken-orange-hover transition-colors"
                  >
                    <Plus size={18} />
                    <span>Añadir Fase</span>
                  </button>
                </div>
                {phases.map((phase, index) => (
                  <div key={phase.id} className="kraken-card p-6 space-y-6 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-neutral-200 dark:text-neutral-700 uppercase tracking-[0.2em]">Fase {index + 1}</span>
                      <button 
                        onClick={() => removePhase(phase.id)}
                        className="text-neutral-300 dark:text-neutral-600 hover:text-kraken-orange transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="md:col-span-2 lg:col-span-1 space-y-2">
                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Nombre Fase</label>
                        <input 
                          type="text" 
                          value={phase.name}
                          onChange={(e) => updatePhase(phase.id, 'name', e.target.value)}
                          className="kraken-input h-10 px-3 text-sm"
                        />
                      </div>
                      
                      <div className="md:col-span-2 lg:col-span-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Personal Asignado</label>
                          <button 
                            onClick={() => addLabor(phase.id)}
                            className="text-[10px] font-bold text-kraken-orange hover:text-kraken-orange-hover uppercase tracking-widest"
                          >
                            + Añadir
                          </button>
                        </div>
                        <div className="space-y-2">
                          {phase.labor.map((labor) => (
                            <div key={labor.id} className="flex items-center gap-2">
                              <select 
                                value={labor.role}
                                onChange={(e) => updateLabor(phase.id, labor.id, 'role', e.target.value as any)}
                                className="kraken-input h-9 px-2 text-xs flex-1"
                              >
                                <option value="oficial">Oficial</option>
                                <option value="ayudante">Ayudante</option>
                              </select>
                              <input 
                                type="number" 
                                min="1"
                                value={labor.count}
                                onChange={(e) => updateLabor(phase.id, labor.id, 'count', Number(e.target.value))}
                                className="kraken-input h-9 px-2 text-xs w-16 text-center"
                              />
                              {phase.labor.length > 1 && (
                                <button 
                                  onClick={() => removeLabor(phase.id, labor.id)}
                                  className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 lg:col-span-1">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Medias J.</label>
                          <input 
                            type="number" 
                            value={phase.halfDays}
                            onChange={(e) => updatePhase(phase.id, 'halfDays', Number(e.target.value))}
                            className="kraken-input h-10 px-3 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Días</label>
                          <input 
                            type="number" 
                            value={phase.days}
                            onChange={(e) => updatePhase(phase.id, 'days', Number(e.target.value))}
                            className="kraken-input h-10 px-3 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="kraken-card p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight dark:text-white">Materiales</h3>
                <button 
                  onClick={addMaterial}
                  className="flex items-center gap-2 text-kraken-orange font-bold text-sm hover:text-kraken-orange-hover transition-colors"
                >
                  <Plus size={18} />
                  <span>Añadir Material</span>
                </button>
              </div>
              {materials.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-3xl">
                  <p className="text-neutral-400 dark:text-neutral-500 font-medium">No se han añadido materiales a este presupuesto.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {materials.map((material) => (
                    <div key={material.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 transition-colors">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Descripción Material</label>
                        <input 
                          type="text" 
                          value={material.name}
                          onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                          className="kraken-input h-10 px-3 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Costo Unitario (€)</label>
                        <input 
                          type="number" 
                          value={material.cost}
                          onChange={(e) => updateMaterial(material.id, 'cost', Number(e.target.value))}
                          className="kraken-input h-10 px-3 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Cantidad</label>
                          <input 
                            type="number" 
                            value={material.quantity}
                            onChange={(e) => updateMaterial(material.id, 'quantity', Number(e.target.value))}
                            className="kraken-input h-10 px-3 text-sm"
                          />
                        </div>
                        <button 
                          onClick={() => removeMaterial(material.id)}
                          className="p-2 text-neutral-300 dark:text-neutral-600 hover:text-kraken-orange transition-colors mb-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="kraken-card p-8 space-y-8">
                <h3 className="text-xl font-bold tracking-tight dark:text-white">Resumen y Notas Finales</h3>
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Descripción del Trabajo (Visible al Cliente)</label>
                  <textarea 
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="kraken-input h-auto py-3 font-medium"
                    placeholder="Describe detalladamente las tareas a realizar..."
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Observaciones Internas (Privado)</label>
                  <textarea 
                    rows={3}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="kraken-input h-auto py-3 font-medium"
                    placeholder="Notas para el equipo o recordatorios..."
                  />
                </div>
              </div>

              <div className="bg-neutral-900 dark:bg-neutral-800 text-white p-10 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 transition-colors">
                <div className="space-y-2 text-center md:text-left">
                  <h3 className="text-2xl font-bold tracking-tight">¿Todo listo para enviar?</h3>
                  <p className="text-neutral-400 font-medium">Genera el PDF profesional para enviar por WhatsApp o Email.</p>
                </div>
                <button 
                  onClick={handleDownloadPDF}
                  className="kraken-btn w-full md:w-auto justify-center py-4"
                >
                  <FileText size={24} />
                  <span>Generar PDF Profesional</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="bg-neutral-900 dark:bg-neutral-950 text-white p-8 rounded-3xl shadow-2xl sticky top-10 transition-colors">
            <h3 className="text-lg font-bold tracking-tight mb-8 border-b border-neutral-800 pb-4">Resumen de Cálculo</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400 font-medium">Mano de Obra</span>
                <span className="font-bold">{calculation?.moTotal.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400 font-medium">Estructura</span>
                <span className="font-bold">{calculation?.structureTotal.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400 font-medium">Traslado</span>
                <span className="font-bold">{calculation?.transportTotal.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400 font-medium">Garantía ({config.guaranteePct * 100}%)</span>
                <span className="font-bold">{calculation?.guarantee.toFixed(2)} €</span>
              </div>
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-sm">
                <span className="text-neutral-400 font-medium">Mínimo sin Margen</span>
                <span className="font-bold">{calculation?.minWithoutMargin.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-kraken-orange font-bold">Margen ({marginPct}%)</span>
                <span className="text-kraken-orange font-bold">+{calculation?.marginEur.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400 font-medium">Materiales Fact.</span>
                <span className="font-bold">{calculation?.materialsFactured.toFixed(2)} €</span>
              </div>
              
              <div className="pt-8 border-t border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-base">
                  <span className="text-neutral-400 font-medium">Subtotal</span>
                  <span className="font-bold text-white">{calculation?.subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="text-neutral-400 font-medium">IVA ({config.iva * 100}%)</span>
                  <span className="font-bold text-white">{calculation?.iva.toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                  <span className="text-xs font-bold tracking-tight uppercase text-neutral-400">TOTAL GENERAL</span>
                  <span className="text-xl font-black text-white">{(calculation?.subtotal + calculation?.iva).toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <span className="text-[10px] font-bold tracking-tight uppercase text-kraken-orange">VISTA CLIENTE (PDF)</span>
                  <span className="text-lg font-black text-kraken-orange">{calculation?.subtotal.toFixed(2)} € + IVA</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 flex items-start gap-4 transition-colors">
            <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              <Info size={20} />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
              Este resumen es de uso interno. El cliente solo verá el desglose comercial en el PDF final.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
