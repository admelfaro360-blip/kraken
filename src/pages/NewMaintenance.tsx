import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  UserPlus, 
  CheckCircle, 
  X,
  AlertCircle,
  Clock,
  ClipboardCheck
} from 'lucide-react';
import { 
  fetchClients, 
  saveClient, 
  saveMaintenance, 
  fetchMaintenances 
} from '../lib/storage';
import { Client, MaintenanceItem, MaintenanceRecord } from '../types';
import { toast } from 'sonner';

// The 20 preloaded base tasks of general maintenance
const BASE_TASKS: Omit<MaintenanceItem, 'id'>[] = [
  { category: 'Electricidad', task: 'Comprobación de conexiones del cuadro eléctrico', status: '', notes: '' },
  { category: 'Electricidad', task: 'Medición de tensión e intensidad por fase', status: '', notes: '' },
  { category: 'Electricidad', task: 'Prueba de funcionamiento de interruptores diferenciales', status: '', notes: '' },
  { category: 'Climatización', task: 'Limpieza de filtros de aire de splits', status: '', notes: '' },
  { category: 'Climatización', task: 'Verificación de presiones de gas refrigerante', status: '', notes: '' },
  { category: 'Climatización', task: 'Limpieza y desinfección de bandejas de condensados', status: '', notes: '' },
  { category: 'Fontanería', task: 'Inspección de fugas en tuberías visibles y uniones', status: '', notes: '' },
  { category: 'Fontanería', task: 'Limpieza de filtros deflectores de griferías', status: '', notes: '' },
  { category: 'Fontanería', task: 'Verificación de presión general de agua corriente', status: '', notes: '' },
  { category: 'Cerrajería/Accesos', task: 'Engrase de cerraduras, bisagras y cierrapuertas', status: '', notes: '' },
  { category: 'Cerrajería/Accesos', task: 'Alineación y comprobación de holguras en portones', status: '', notes: '' },
  { category: 'Cerrajería/Accesos', task: 'Inspección de estado de burletes en puertas y ventanas', status: '', notes: '' },
  { category: 'Albañilería/Pintura', task: 'Revisión de grietas estructurales o humedades visibles', status: '', notes: '' },
  { category: 'Albañilería/Pintura', task: 'Estado general de revestimientos y juntas de dilatación', status: '', notes: '' },
  { category: 'Iluminación', task: 'Inspección de luminarias defectuosas o fundidas', status: '', notes: '' },
  { category: 'Iluminación', task: 'Verificación del detector de presencia y temporizadores', status: '', notes: '' },
  { category: 'Seguridad Incendio', task: 'Control visual de estado de extintores y señalización', status: '', notes: '' },
  { category: 'Seguridad Incendio', task: 'Comprobación de luces de emergencia autónomas', status: '', notes: '' },
  { category: 'Equipamiento', task: 'Lubricación general de guías y herrajes deslizantes', status: '', notes: '' },
  { category: 'Equipamiento', task: 'Inspección visual de tomas de tierra de equipamientos', status: '', notes: '' }
];

export default function NewMaintenance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recordId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  
  // Quick Client creation modal toggle
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientType, setNewClientType] = useState<'Particular' | 'Industrial' | 'Mantenimiento'>('Industrial');

  // Maintenance sheet states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Calculate default next revision date (3 months from now)
  const getDefaultNextDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  };
  const [nextRevisionDate, setNextRevisionDate] = useState(getDefaultNextDate());
  const [generalObservations, setGeneralObservations] = useState('');
  const [status, setStatus] = useState<'Programado' | 'Completado'>('Programado');
  const [checklist, setChecklist] = useState<MaintenanceItem[]>([]);
  
  // Language & Employee assignment state variables
  const [language, setLanguage] = useState<'es' | 'pt' | 'en'>('es');
  const [assignedEmployee, setAssignedEmployee] = useState('');
  const [customEmployee, setCustomEmployee] = useState('');
  const [isCustomEmployeeActive, setIsCustomEmployeeActive] = useState(false);

  const STANDARD_TECHNICIANS = ['Carlos R.', 'Luis M.', 'Ana S.', 'Laura G.'];

  // Dynamically load client list and loaded record if exist
  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const clientsList = await fetchClients();
        setClients(clientsList);

        if (recordId) {
          // Editing existing record
          const records = await fetchMaintenances();
          const matchRecord = records.find(r => r.id === recordId);
          if (matchRecord) {
            setSelectedClientId(matchRecord.clientId);
            setDate(matchRecord.date);
            setNextRevisionDate(matchRecord.nextRevisionDate);
            setGeneralObservations(matchRecord.generalObservations || '');
            setStatus(matchRecord.status);
            setChecklist(matchRecord.checklist);
            
            // Language & Employee Assignments loader
            const savedLang = matchRecord.language || 'es';
            setLanguage(savedLang);
            
            const savedEmp = matchRecord.assignedEmployee || '';
            if (savedEmp) {
              if (STANDARD_TECHNICIANS.includes(savedEmp)) {
                setAssignedEmployee(savedEmp);
                setIsCustomEmployeeActive(false);
              } else {
                setAssignedEmployee('other');
                setCustomEmployee(savedEmp);
                setIsCustomEmployeeActive(true);
              }
            }
          } else {
            toast.error('Ficha de mantenimiento no encontrada');
            navigate('/mantenimiento');
          }
        }
      } catch (e) {
        toast.error('Error al inicializar la vista de misiones');
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [recordId, navigate]);

  // Handle client selection change to trigger checklist auto-loading
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!recordId) {
      const selectedClient = clients.find(c => c.id === clientId);
      // Auto preload base checklist tasks
      const preloaded = BASE_TASKS.map((task) => ({
        id: Math.random().toString(36).substring(2, 11),
        ...task
      }));
      setChecklist(preloaded as MaintenanceItem[]);
    }
  };

  // Add custom checklist item
  const handleAddCustomTask = () => {
    const customTask: MaintenanceItem = {
      id: Math.random().toString(36).substring(2, 11),
      category: 'Personalizado',
      task: '',
      status: '',
      notes: ''
    };
    setChecklist(prev => [...prev, customTask]);
    toast.success('Nueva tarea vacía añadida al final');
  };

  // Remove task from checklist
  const handleRemoveTask = (taskId: string) => {
    setChecklist(prev => prev.filter(item => item.id !== taskId));
  };

  // Update checklist item contents
  const handleUpdateTaskField = (taskId: string, field: keyof MaintenanceItem, value: any) => {
    setChecklist(prev => prev.map(item => {
      if (item.id === taskId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Save/Create quick client inside modal
  const handleCreateQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }

    try {
      const clientPayload: Client = {
        id: 'client_' + Math.random().toString(36).substring(2, 11),
        name: newClientName,
        address: newClientAddress,
        phone: newClientPhone,
        vertical: newClientType === 'Industrial' ? 'industria' : 'hogar',
        clientType: newClientType,
        email: '',
        zone: 1
      };

      await saveClient(clientPayload);
      toast.success('Cliente creado rápidamente exitosamente');
      
      // Update clients list
      setClients(prev => [...prev, clientPayload]);
      setSelectedClientId(clientPayload.id);

      // Auto-load preloaded items
      const preloaded = BASE_TASKS.map((task) => ({
        id: Math.random().toString(36).substring(2, 11),
        ...task
      }));
      setChecklist(preloaded as MaintenanceItem[]);

      // Reset modal values
      setIsClientModalOpen(false);
      setNewClientName('');
      setNewClientAddress('');
      setNewClientPhone('');
    } catch (err) {
      toast.error('Ocurrió un error al guardar el cliente');
    }
  };

  // Submit complete maintenance sheet
  const handleSaveSheet = async () => {
    if (!selectedClientId) {
      toast.error('Por favor, selecciona un cliente primero.');
      return;
    }

    if (checklist.length === 0) {
      toast.error('La ficha de mantenimiento no tiene elementos en el checklist.');
      return;
    }

    // Verify if any personalized task description is empty
    const hasEmptyTasks = checklist.some(p => !p.task.trim());
    if (hasEmptyTasks) {
      toast.error('Existen tareas con campos de descripción en blanco. Rellénalos o elimínalos.');
      return;
    }

    const selectedClient = clients.find(c => c.id === selectedClientId);

    try {
      const finalId = recordId || 'maint_' + Math.random().toString(36).substring(2, 11);
      const recordPayload: MaintenanceRecord = {
        id: finalId,
        clientId: selectedClientId,
        clientData: {
          name: selectedClient?.name || 'Cliente desconocido',
          address: selectedClient?.address || 'Sin dirección registrada',
          phone: selectedClient?.phone || 'Sin número registrado',
          email: selectedClient?.email || ''
        },
        date,
        nextRevisionDate,
        checklist,
        generalObservations,
        status,
        createdAt: new Date().toISOString(),
        language,
        assignedEmployee: isCustomEmployeeActive ? customEmployee : assignedEmployee
      };

      await saveMaintenance(recordPayload);
      toast.success(recordId ? 'Ficha de mantenimiento actualizada correctamente' : 'Ficha de mantenimiento guardada con éxito');
      navigate('/mantenimiento');
    } catch (e) {
      toast.error('Error al guardar la ficha técnica de revisión');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6" id="new-maintenance-root">
      {/* Back & Heading Navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/mantenimiento')}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl text-sm font-semibold text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Volver al listado</span>
        </button>

        <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
          Kraken OS Preventive Engine
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kraken-orange"></div>
          <p className="text-sm font-medium text-neutral-500">Inicializando módulo de mantenimiento...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-kraken-orange text-white rounded-2xl">
              <ClipboardCheck size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight dark:text-white">
                {recordId ? 'Editar Ficha Mantenimiento' : 'Nueva Ficha Técnica'}
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {recordId ? `Configuración del registro técnico #${recordId}` : 'Completa el checklist para las revisiones periódicas programadas'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Metadata & Client Selector */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-5">
                <h3 className="text-lg font-bold dark:text-white border-b border-neutral-100 dark:border-neutral-850 pb-2">Información del Servicio</h3>
                
                {/* Client Select & Quick insert Trigger */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Cliente</label>
                    {!recordId && (
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="flex items-center gap-1 text-[11px] font-bold text-kraken-orange hover:underline focus:outline-none"
                      >
                        <UserPlus size={12} />
                        <span>+ Nuevo Cliente</span>
                      </button>
                    )}
                  </div>
                  
                  <select
                    disabled={!!recordId}
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="kraken-input disabled:bg-neutral-50 dark:disabled:bg-neutral-950 disabled:text-neutral-400"
                  >
                    <option value="">-- Selecciona un cliente --</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.clientType ? `[${client.clientType}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Revision date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Fecha de Revisión</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="kraken-input"
                  />
                </div>

                {/* Next Revision Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Próxima Revisión Recomendada</label>
                  <input
                    type="date"
                    value={nextRevisionDate}
                    onChange={(e) => setNextRevisionDate(e.target.value)}
                    className="kraken-input"
                  />
                </div>

                {/* Status selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Estado de la Ficha</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="kraken-input"
                  >
                    <option value="Programado">Programado (Ficha Abierta)</option>
                    <option value="Completado">Completado (Trabajo Liquidado)</option>
                  </select>
                </div>

                {/* Language selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Idioma de Impresión PDF</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="kraken-input"
                  >
                    <option value="es">Español (ES)</option>
                    <option value="pt">Português (PT)</option>
                    <option value="en">English (EN)</option>
                  </select>
                </div>

                {/* Assigned Employee selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Empleado Asignado</label>
                  <select
                    value={isCustomEmployeeActive ? 'other' : assignedEmployee}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'other') {
                        setIsCustomEmployeeActive(true);
                        setAssignedEmployee('other');
                      } else {
                        setIsCustomEmployeeActive(false);
                        setAssignedEmployee(val);
                      }
                    }}
                    className="kraken-input"
                  >
                    <option value="">-- Sin asignar --</option>
                    {STANDARD_TECHNICIANS.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                    <option value="other">Otro Empleado (Escribir)</option>
                  </select>

                  {isCustomEmployeeActive && (
                    <input
                      type="text"
                      placeholder="Escribe el nombre del empleado..."
                      value={customEmployee}
                      onChange={(e) => setCustomEmployee(e.target.value)}
                      className="kraken-input mt-2"
                    />
                  )}
                </div>
              </div>

              {/* Service Observations */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Observaciones Generales</label>
                  <textarea
                    rows={6}
                    placeholder="Registra cualquier aspecto o advertencia técnica global del equipamiento verificado..."
                    value={generalObservations}
                    onChange={(e) => setGeneralObservations(e.target.value)}
                    className="kraken-input min-h-[140px] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Custom Interactive Checklist Table */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col h-full space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-100 dark:border-neutral-850 pb-4">
                  <div>
                    <h3 className="text-lg font-bold dark:text-white">Checklist de Revisión</h3>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Controla las tareas básicas de conformidad y adjunta incidencias</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCustomTask}
                    className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-350 transition-colors duration-300 self-start sm:self-auto shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Añadir Tarea</span>
                  </button>
                </div>

                {checklist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-center space-y-3">
                    <AlertCircle className="text-neutral-300 dark:text-neutral-700" size={36} />
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-300">No hay tareas cargadas</h4>
                    <p className="text-xs text-neutral-500 max-w-sm">
                      Selecciona un cliente de la barra lateral para precargar de manera automatizada las 20 tareas básicas del sistema, o añade líneas manualmente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {checklist.map((item, index) => (
                      <div 
                        key={item.id} 
                        className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-850 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:border-neutral-200 dark:hover:border-neutral-800 transition-all duration-300 group"
                      >
                        {/* Task identifier */}
                        <div className="flex-1 space-y-2 md:space-y-0 md:flex md:items-center gap-4 w-full">
                          <div className="shrink-0 flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 px-2 py-1 rounded-md font-bold">
                              #{index + 1}
                            </span>
                            
                            {item.category === 'Personalizado' ? (
                              <input
                                type="text"
                                value={item.category}
                                onChange={(e) => handleUpdateTaskField(item.id, 'category', e.target.value)}
                                placeholder="Categoría"
                                className="text-xs font-bold text-kraken-orange border-b border-light-300 dark:border-neutral-800 bg-transparent py-0.5 focus:outline-none w-24"
                              />
                            ) : (
                              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 capitalize bg-neutral-200/40 dark:bg-neutral-800/40 px-2.5 py-1 rounded-full">
                                {item.category}
                              </span>
                            )}
                          </div>

                          <div className="flex-1">
                            {item.category === 'Personalizado' ? (
                              <input
                                required
                                type="text"
                                value={item.task}
                                onChange={(e) => handleUpdateTaskField(item.id, 'task', e.target.value)}
                                placeholder="Escribe la descripción de la tarea aquí..."
                                className="w-full text-sm font-medium border-b border-dashed border-neutral-300 dark:border-neutral-800 bg-transparent focus:border-neutral-550 focus:outline-none dark:text-white"
                              />
                            ) : (
                              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-tight">
                                {item.task}
                              </p>
                            )}
                            
                            {/* Notes input inside the row */}
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => handleUpdateTaskField(item.id, 'notes', e.target.value)}
                              placeholder="Fórmula técnica de reparación o comentarios..."
                              className="w-full text-xs text-neutral-450 dark:text-neutral-500 border-none bg-transparent hover:bg-neutral-200/30 dark:hover:bg-neutral-850/50 focus:bg-transparent rounded px-1 py-0.5 mt-2 transition-colors focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        {/* Status Buttons & Actions */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                          <div className="flex gap-1.5 p-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                            {(['Ok', 'Reparar', 'N/A'] as const).map(taskStatus => (
                              <button
                                key={taskStatus}
                                type="button"
                                onClick={() => handleUpdateTaskField(item.id, 'status', taskStatus)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                                  item.status === taskStatus
                                    ? taskStatus === 'Ok' 
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                      : taskStatus === 'Reparar'
                                        ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300'
                                    : 'bg-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                                }`}
                              >
                                {taskStatus}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveTask(item.id)}
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors shrink-0"
                            title="Eliminar tarea"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions bottom submit button panel */}
                <div className="pt-6 border-t border-neutral-100 dark:border-neutral-850 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/mantenimiento')}
                    className="kraken-btn-secondary px-6 shrink-0"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSheet}
                    className="kraken-btn flex items-center justify-center gap-2 px-8 shrink-0"
                  >
                    <Save size={18} />
                    <span>Guardar Ficha</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick client modular form dialog */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-2xl p-6 animate-zoom-in space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-850 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="text-kraken-orange" size={20} />
                <h3 className="text-lg font-bold dark:text-white">Alta Rápida de Cliente</h3>
              </div>
              <button 
                onClick={() => setIsClientModalOpen(false)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuickClient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Nombre Completo</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Eduardo Martínez"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="kraken-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Dirección Comercial/Hogar</label>
                <input
                  type="text"
                  placeholder="Ej: Av. de las Américas, Nave 26"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  className="kraken-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Teléfono de Contacto</label>
                <input
                  type="text"
                  placeholder="Ej: +34 600 000 000"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="kraken-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tipo de Cliente</label>
                <select
                  value={newClientType}
                  onChange={(e) => setNewClientType(e.target.value as any)}
                  className="kraken-input"
                >
                  <option value="Particular">Particular</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="kraken-btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="kraken-btn flex-1"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
