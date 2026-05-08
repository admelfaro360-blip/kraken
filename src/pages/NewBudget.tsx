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
  Info,
  Search,
  Loader2,
  ExternalLink
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
import { GoogleGenAI, Type } from "@google/genai";

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
  const [applyIVA, setApplyIVA] = useState(true);
  const [isMonthly, setIsMonthly] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([
    'Limpieza de Piscina', 
    'Jardinería', 
    'Limpieza espacios comunes', 
    'Electricidad', 
    'Mantenimiento general'
  ]);
  const [newService, setNewService] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
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
  const [searchingMaterials, setSearchingMaterials] = useState<string[]>([]);

  const searchMaterialOnInternet = async (materialId: string, description: string) => {
    if (!description.trim()) return;
    
    setSearchingMaterials(prev => [...prev, materialId]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const prompt = `Busca el material "${description}" en 3 sitios web de confianza de España (ej: Amazon España, Leroy Merlin España, Bricomart, ManoMano). 
      Para cada uno de los 3 sitios distintos (IMPORTANTE: deben ser 3 sitios distintos), necesito:
      1. URL completa directa al producto
      2. URL de una imagen del producto que funcione
      3. El mejor precio actual con su moneda (€)
      4. El nombre del sitio web
      
      Responde SOLO el JSON con un array de objetos con las propiedades: site, price, link, image.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                site: { type: Type.STRING },
                price: { type: Type.STRING },
                link: { type: Type.STRING },
                image: { type: Type.STRING }
              },
              required: ["site", "price", "link", "image"]
            }
          },
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "[]";
      const results = JSON.parse(text);
      
      setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, searchResults: results } : m));
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearchingMaterials(prev => prev.filter(id => id !== materialId));
    }
  };

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
          setApplyIVA(budget.applyIVA !== undefined ? budget.applyIVA : true);
          setIsMonthly(budget.isMonthly || false);
          setSelectedMonths(budget.selectedMonths || []);
          setSelectedDays(budget.selectedDays || []);
          if (budget.enabledServices) {
            setSelectedServices(budget.enabledServices);
            // Also ensure availableServices contains any custom ones from the budget
            setAvailableServices(prev => {
              const unique = new Set([...prev, ...(budget.enabledServices || [])]);
              return Array.from(unique);
            });
          }
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
          <div className="w-12 h-12 border-4 border-[#FF4D00] border-t-transparent rounded-full animate-spin"></div>
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
      applyIVA,
      isMonthly,
      selectedMonths,
      selectedDays,
      enabledServices: selectedServices,
      calculation,
      subtotal: calculation.subtotal,
      total: applyIVA ? calculation.total : calculation.subtotal
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
      applyIVA: applyIVA,
      isMonthly: isMonthly,
      enabledServices: selectedServices,
      selectedDays: selectedDays,
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
          <button 
            onClick={() => navigate('/presupuestos')}
            className="kraken-btn-secondary"
          >
            <span>Cancelar</span>
          </button>
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="kraken-btn-secondary"
            >
              <ChevronLeft size={20} />
              <span>Anterior</span>
            </button>
          )}
          {step < 3 ? (
            <button 
              onClick={() => setStep(step + 1)}
              className="kraken-btn"
            >
              <span>Siguiente</span>
              <ChevronRight size={20} />
            </button>
          ) : (
            <button 
              onClick={handleSave}
              className="kraken-btn"
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
                  <div className="p-3 rounded-2xl bg-[#FF4D00] text-white">
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
                  <div className="flex flex-col gap-8 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <label htmlFor="applyIVA" className="text-[10px] font-black uppercase tracking-widest text-[#FF4D00]">Fuerza Fiscal</label>
                            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Aplicar IVA (23%)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setApplyIVA(!applyIVA)}
                            className={cn(
                              "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              applyIVA ? "bg-[#FF4D00]" : "bg-neutral-200 dark:bg-neutral-800"
                            )}
                          >
                            <span className={cn(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5",
                              applyIVA ? "translate-x-5" : "translate-x-0"
                            )} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-800">
                          <div className="flex flex-col gap-1">
                            <label htmlFor="isMonthly" className="text-[10px] font-black uppercase tracking-widest text-[#FF4D00]">Modelo de Servicio</label>
                            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Servicio Mensualizado</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsMonthly(!isMonthly)}
                            className={cn(
                              "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              isMonthly ? "bg-[#FF4D00]" : "bg-neutral-200 dark:bg-neutral-800"
                            )}
                          >
                            <span className={cn(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5",
                              isMonthly ? "translate-x-5" : "translate-x-0"
                            )} />
                          </button>
                        </div>
                      </div>

                      {isMonthly && (
                        <div className="md:row-span-2 space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                          {/* Days of the Week Selection */}
                          <div className="kraken-card p-6 space-y-5 border-[#FF4D00]/20">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                              <label className="text-xs font-black uppercase tracking-widest text-neutral-500 block">Días de Visita</label>
                            </div>
                            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    if (selectedDays.includes(day)) {
                                      setSelectedDays(selectedDays.filter(d => d !== day));
                                    } else {
                                      setSelectedDays([...selectedDays, day]);
                                    }
                                  }}
                                  className={cn(
                                    "px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2",
                                    selectedDays.includes(day)
                                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                                      : "bg-neutral-100 border-transparent dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                  )}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Contract Months Selection */}
                          <div className="kraken-card p-6 space-y-5 border-[#FF4D00]/20">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-4 bg-[#FF4D00] rounded-full" />
                              <label className="text-xs font-black uppercase tracking-widest text-neutral-500 block">Meses de Servicio</label>
                            </div>
                            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 gap-2">
                              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(month => (
                                <button
                                  key={month}
                                  type="button"
                                  onClick={() => {
                                    if (selectedMonths.includes(month)) {
                                      setSelectedMonths(selectedMonths.filter(m => m !== month));
                                    } else {
                                      setSelectedMonths([...selectedMonths, month]);
                                    }
                                  }}
                                  className={cn(
                                    "py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border",
                                    selectedMonths.includes(month)
                                      ? "bg-[#FF4D00] border-[#FF4D00] text-white shadow-lg shadow-kraken-orange/20"
                                      : "bg-neutral-100 border-transparent dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                  )}
                                >
                                  {month.substring(0, 3)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Enabled Services Selection */}
                          <div className="kraken-card p-6 space-y-6 border-[#FF4D00]/20">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Servicios Activos</h3>
                            </div>
                            <div className="space-y-3">
                              {availableServices.map(service => (
                                <div key={service} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                                  <label htmlFor={`service-${service}`} className="text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400 cursor-pointer">{service}</label>
                                  <input 
                                    type="checkbox"
                                    id={`service-${service}`}
                                    checked={selectedServices.includes(service)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedServices([...selectedServices, service]);
                                      } else {
                                        setSelectedServices(selectedServices.filter(s => s !== service));
                                      }
                                    }}
                                    className="w-5 h-5 accent-[#FF4D00] rounded-lg border-neutral-200 dark:border-neutral-700"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <input 
                                type="text"
                                value={newService}
                                onChange={(e) => setNewService(e.target.value)}
                                placeholder="Añadir..."
                                className="kraken-input h-9 text-[10px] font-bold uppercase tracking-widest bg-transparent"
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  if (newService.trim()) {
                                    setAvailableServices([...availableServices, newService.trim()]);
                                    setSelectedServices([...selectedServices, newService.trim()]);
                                    setNewService('');
                                  }
                                }}
                                className="h-9 w-9 flex items-center justify-center bg-[#FF4D00]/10 text-[#FF4D00] rounded-xl hover:bg-[#FF4D00]/20 transition-colors shrink-0"
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight dark:text-white">Fases del Trabajo</h3>
                  <button 
                    onClick={addPhase}
                    className="flex items-center gap-2 text-[#FF4D00] font-bold text-sm hover:text-[#E64500] transition-colors"
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
                        className="text-neutral-300 dark:text-neutral-600 hover:text-[#FF4D00] transition-colors"
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
                            className="text-[10px] font-bold text-[#FF4D00] hover:text-[#E64500] uppercase tracking-widest"
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
              </div>
            </>
          )}

          {step === 2 && (
            <div className="kraken-card p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight dark:text-white">Materiales</h3>
                <button 
                  onClick={addMaterial}
                  className="flex items-center gap-2 text-[#FF4D00] font-bold text-sm hover:text-[#E64500] transition-colors"
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
                <div className="space-y-6">
                  {materials.map((material) => (
                    <div key={material.id} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-800 group hover:border-[#FF4D00]/30 transition-all">
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center justify-between">
                            Descripción Material
                            <button 
                              onClick={() => searchMaterialOnInternet(material.id, material.name)}
                              disabled={searchingMaterials.includes(material.id)}
                              className="text-[#FF4D00] hover:text-[#E64500] transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              {searchingMaterials.includes(material.id) ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Search size={12} />
                              )}
                              IA Search
                            </button>
                          </label>
                          <input 
                            type="text" 
                            value={material.name}
                            onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                            className="kraken-input h-10 px-3 text-sm font-bold bg-white dark:bg-neutral-900 border-none shadow-sm"
                            placeholder="Ej: Flexible bajo mesada 1/2"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Costo Un. (€)</label>
                          <input 
                            type="number" 
                            value={material.cost}
                            onChange={(e) => updateMaterial(material.id, 'cost', Number(e.target.value))}
                            className="kraken-input h-10 px-3 text-sm font-bold bg-white dark:bg-neutral-900 border-none shadow-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Cant.</label>
                            <input 
                              type="number" 
                              value={material.quantity}
                              onChange={(e) => updateMaterial(material.id, 'quantity', Number(e.target.value))}
                              className="kraken-input h-10 px-3 text-sm font-bold bg-white dark:bg-neutral-900 border-none shadow-sm"
                            />
                          </div>
                          <button 
                            onClick={() => removeMaterial(material.id)}
                            className="p-2 text-neutral-300 dark:text-neutral-700 hover:text-red-500 transition-colors mb-0.5"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* IA Search Results */}
                      {material.searchResults && material.searchResults.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          {material.searchResults.map((result, idx) => (
                            <a 
                              key={idx} 
                              href={result.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex flex-col gap-3 p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-[#FF4D00]/50 hover:shadow-lg hover:shadow-[#FF4D00]/5 transition-all group/res"
                            >
                              <div className="aspect-square rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-800 relative">
                                <img 
                                  src={result.image} 
                                  alt={result.site} 
                                  className="w-full h-full object-cover group-hover/res:scale-110 transition-transform duration-500"
                                  onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x400?text=No+Image')}
                                />
                                <div className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-black/90 backdrop-blur rounded-lg opacity-0 group-hover/res:opacity-100 transition-opacity">
                                  <ExternalLink size={12} className="text-[#FF4D00]" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4D00]">{result.site}</p>
                                <p className="text-sm font-black text-neutral-900 dark:text-white">{result.price}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
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
                <span className="text-[#FF4D00] font-bold">Margen ({marginPct}%)</span>
                <span className="text-[#FF4D00] font-bold">+{calculation?.marginEur.toFixed(2)} €</span>
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
                  <span className="font-bold text-white">{applyIVA ? calculation?.iva.toFixed(2) : '0.00'} €</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                  <span className="text-xs font-bold tracking-tight uppercase text-neutral-400">TOTAL GENERAL</span>
                  <span className="text-xl font-black text-white">{applyIVA ? (calculation?.subtotal + calculation?.iva).toFixed(2) : calculation?.subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <span className="text-[10px] font-bold tracking-tight uppercase text-[#FF4D00]">VISTA CLIENTE (PDF)</span>
                  <span className="text-lg font-black text-[#FF4D00]">{calculation?.subtotal.toFixed(2)} € {applyIVA ? '+ IVA' : '(IVA no incl.)'}</span>
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
