import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  FileDown, 
  Trash2, 
  Edit, 
  AlertCircle,
  Clock,
  CheckCircle,
  ArrowRight,
  Eye,
  Printer,
  X,
  User,
  Check,
  Globe
} from 'lucide-react';
import { fetchMaintenances, deleteMaintenance, saveMaintenance } from '../lib/storage';
import { MaintenanceRecord } from '../types';
import { generateMaintenancePDF } from '../lib/pdfGenerator';
import { toast } from 'sonner';

export default function MaintenanceList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Programado' | 'Completado'>('All');
  
  // PDF Actions and Language confirmation
  const [selectedRecordForPdf, setSelectedRecordForPdf] = useState<MaintenanceRecord | null>(null);
  const [pdfActionType, setPdfActionType] = useState<'download' | 'print' | null>(null);
  const [pdfLanguage, setPdfLanguage] = useState<'es' | 'pt' | 'en'>('es');

  // Preview record state
  const [previewRecord, setPreviewRecord] = useState<MaintenanceRecord | null>(null);
  
  // Get active session user
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Read local session
    const localUserStr = localStorage.getItem('kraken_user');
    if (localUserStr) {
      try {
        setCurrentUser(JSON.parse(localUserStr));
      } catch (e) {
        console.error('Error parsing user session', e);
      }
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchMaintenances();
      // Sort by date descending
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMaintenances(data);
    } catch (e) {
      toast.error('Error al cargar listado de mantenimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, clientName: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la ficha de mantenimiento de "${clientName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteMaintenance(id);
      toast.success('Ficha de mantenimiento eliminada correctamente');
      setMaintenances(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      toast.error('Error al intentar eliminar la ficha');
    }
  };

  const handleToggleStatus = async (record: MaintenanceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = record.status === 'Programado' ? 'Completado' : 'Programado';
    try {
      const updated: MaintenanceRecord = {
        ...record,
        status: newStatus
      };
      await saveMaintenance(updated);
      setMaintenances(prev => prev.map(m => m.id === record.id ? updated : m));
      toast.success(`Ficha de mantenimiento actualizada a "${newStatus}"`);
    } catch (err) {
      toast.error('Error al cambiar el estado de la ficha');
    }
  };

  const triggerPdfAction = (record: MaintenanceRecord, actionType: 'download' | 'print') => {
    setSelectedRecordForPdf(record);
    setPdfActionType(actionType);
    setPdfLanguage(record.language || 'es');
  };

  const handleConfirmPdfAction = async () => {
    if (!selectedRecordForPdf || !pdfActionType) return;
    const record = selectedRecordForPdf;
    const action = pdfActionType;
    
    // Reset selection fast so modals close
    setSelectedRecordForPdf(null);
    setPdfActionType(null);
    
    try {
      toast.info('Generando archivo PDF con traducciones...');
      const doc = await generateMaintenancePDF(record, pdfLanguage);
      
      if (action === 'download') {
        doc.save(`Ficha_Mantenimiento_${record.clientData?.name || 'Cliente'}_${record.date}.pdf`);
        toast.success(`PDF (${pdfLanguage.toUpperCase()}) generado y descargado con éxito`);
      } else {
        doc.autoPrint();
        const pdfUrl = doc.output('bloburl');
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          doc.save(`Ficha_Mantenimiento_${record.clientData?.name || 'Cliente'}_${record.date}.pdf`);
          toast.warning('Bloqueador de ventanas detectado. Se ha descargado el PDF.');
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Error al procesar el archivo PDF');
    }
  };

  // Filtered dataset
  const filteredMaintenances = maintenances.filter(record => {
    const matchesSearch = (record.clientData?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (record.clientData?.address || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="maintenance-list-container">
      {/* Upper Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-kraken-orange/10 text-kraken-orange rounded-2xl">
              <ClipboardCheck size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight dark:text-white">Mantenimiento Preventivo</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Control de fichas técnicas y revisiones programadas</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/mantenimiento/nuevo')}
          className="kraken-btn flex items-center justify-center gap-2 self-start sm:self-auto shadow-lg shadow-kraken-orange/10 hover:shadow-kraken-orange/20"
          id="btn-new-maintenance"
        >
          <Plus size={20} />
          <span>Nueva Ficha</span>
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por cliente o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="kraken-input pl-12"
              id="maintenance-search"
            />
          </div>
          <div className="flex gap-2">
            {(['All', 'Programado', 'Completado'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest border transition-all duration-300 ${
                  statusFilter === status 
                    ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900 shadow-md' 
                    : 'bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                {status === 'All' ? 'Todos' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Lists Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kraken-orange"></div>
          <p className="text-sm font-medium text-neutral-500">Cargando fichas de mantenimiento...</p>
        </div>
      ) : filteredMaintenances.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-16 text-center shadow-sm max-w-xl mx-auto">
          <AlertCircle className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" size={48} />
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">Sin Registros Encontrados</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            {searchTerm || statusFilter !== 'All' 
              ? 'Ninguna ficha coincide con los filtros establecidos actualmente.' 
              : 'Todavía no hay fichas de mantenimiento preventivo ingresadas en el sistema.'}
          </p>
          {(searchTerm || statusFilter !== 'All') ? (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('All'); }}
              className="kraken-btn-secondary px-6"
            >
              Restablecer Filtros
            </button>
          ) : (
            <button
              onClick={() => navigate('/mantenimiento/nuevo')}
              className="kraken-btn px-6"
            >
              Crear Primera Ficha
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800">
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Cliente</th>
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Dirección</th>
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Fecha Revisión</th>
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Próxima Fecha</th>
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Empleado</th>
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Estado</th>
                  <th className="px-6 py-4.5 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredMaintenances.map((record) => (
                  <tr 
                    key={record.id} 
                    className="hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-neutral-900 dark:text-white">{record.clientData?.name || 'Cliente desconocido'}</div>
                      {record.clientData?.email && (
                        <div className="text-xs text-neutral-400 dark:text-neutral-500 font-mono mt-0.5">{record.clientData.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                      {record.clientData?.address || 'Sin dirección registrada'}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm tracking-tight dark:text-neutral-300">
                      {record.date}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm tracking-tight dark:text-neutral-300">
                      {record.nextRevisionDate || 'No agendada'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {record.assignedEmployee ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-full font-medium">
                          <User size={12} />
                          <span>{record.assignedEmployee}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-600 text-xs italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => handleToggleStatus(record, e)}
                        title="Haz clic para alternar el estado de la ficha"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-[0.98] cursor-pointer border ${
                          record.status === 'Completado' 
                            ? 'bg-emerald-105 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-250 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' 
                            : 'bg-blue-105 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                        }`}
                      >
                        {record.status === 'Completado' ? (
                          <CheckCircle size={12} className="text-emerald-700 dark:text-emerald-400" />
                        ) : (
                          <Clock size={12} className="text-blue-700 dark:text-blue-400" />
                        )}
                        <span>{record.status}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewRecord(record)}
                          title="Visualizar en pantalla"
                          className="p-2 text-sky-500 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-xl transition-all"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => triggerPdfAction(record, 'download')}
                          title="Descargar PDF"
                          className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all"
                        >
                          <FileDown size={18} />
                        </button>
                        <button
                          onClick={() => triggerPdfAction(record, 'print')}
                          title="Imprimir documento"
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all"
                        >
                          <Printer size={18} />
                        </button>
                        <button
                          onClick={() => navigate(`/mantenimiento/nuevo?id=${record.id}`)}
                          title="Ver o Editar"
                          className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-all"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id, record.clientData?.name || 'Cliente')}
                          title="Eliminar registro"
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
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
 
          {/* Mobile Cards View */}
          <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredMaintenances.map((record) => (
              <div 
                key={record.id} 
                className="p-5 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-white text-lg leading-snug">{record.clientData?.name || 'Cliente desconocido'}</h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{record.clientData?.address || 'Sin dirección'}</p>
                    
                    {record.assignedEmployee && (
                      <div className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                        <User size={10} />
                        <span>Asignado: {record.assignedEmployee}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleToggleStatus(record, e)}
                    title="Haz clic para cambiar el estado"
                    className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border ${
                      record.status === 'Completado' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-250 dark:border-emerald-800' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {record.status === 'Completado' ? (
                      <CheckCircle size={11} className="text-emerald-700 dark:text-emerald-400" />
                    ) : (
                      <Clock size={11} className="text-blue-700 dark:text-blue-400" />
                    )}
                    <span>{record.status}</span>
                  </button>
                </div>
 
                <div className="grid grid-cols-2 gap-3 text-sm py-2 bg-neutral-50 dark:bg-neutral-950 rounded-2xl p-3 border border-neutral-100 dark:border-neutral-850">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Fecha Revisión</span>
                    <span className="font-mono mt-0.5 block text-neutral-800 dark:text-neutral-200">{record.date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Próxima Fecha</span>
                    <span className="font-mono mt-0.5 block text-neutral-800 dark:text-neutral-200">{record.nextRevisionDate || 'N/A'}</span>
                  </div>
                </div>
 
                <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setPreviewRecord(record)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-450 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-xs font-bold rounded-xl transition-all"
                    >
                      <Eye size={13} />
                      <span>Ver</span>
                    </button>
                    <button
                      onClick={() => triggerPdfAction(record, 'download')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-bold rounded-xl transition-all"
                    >
                      <FileDown size={13} />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => triggerPdfAction(record, 'print')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-455 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-bold rounded-xl transition-all"
                    >
                      <Printer size={13} />
                      <span>Imprimir</span>
                    </button>
                    <button
                      onClick={() => navigate(`/mantenimiento/nuevo?id=${record.id}`)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-450 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-bold rounded-xl transition-all"
                    >
                      <Edit size={13} />
                      <span>Editar</span>
                    </button>
                  </div>
 
                  <button
                    onClick={() => handleDelete(record.id, record.clientData?.name || 'Cliente')}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: PDF Language Selection Dialog */}
      {selectedRecordForPdf && pdfActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in text-neutral-800 dark:text-neutral-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4 relative">
            <button 
              onClick={() => { setSelectedRecordForPdf(null); setPdfActionType(null); }}
              className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-neutral-500 hover:bg-neutral-105 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Idioma del Documento</h3>
                <p className="text-xs text-neutral-400">Selecciona el idioma para el archivo PDF</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase font-extrabold tracking-widest text-neutral-400 block">Elige un Idioma</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { code: 'es', name: 'Español (Original)', desc: 'Impresión en Español estándar' },
                  { code: 'pt', name: 'Português', desc: 'Traducción de ficha a Portugués' },
                  { code: 'en', name: 'English', desc: 'Traducción de ficha a Inglés' }
                ].map((langOpts) => (
                  <button
                    key={langOpts.code}
                    onClick={() => setPdfLanguage(langOpts.code as any)}
                    className={`flex items-start gap-4 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      pdfLanguage === langOpts.code
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-55/20'
                        : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-55 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-350'
                    }`}
                  >
                    <div className="mt-1">
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        pdfLanguage === langOpts.code ? 'border-emerald-500 bg-emerald-500' : 'border-neutral-300 dark:border-neutral-700'
                      }`}>
                        {pdfLanguage === langOpts.code && <Check size={10} className="text-white" />}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold">{langOpts.name}</div>
                      <div className="text-[11px] text-neutral-400 dark:text-neutral-500">{langOpts.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setSelectedRecordForPdf(null); setPdfActionType(null); }}
                className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-350 rounded-2xl text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPdfAction}
                className="flex-1 kraken-btn text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                {pdfActionType === 'download' ? <FileDown size={14} /> : <Printer size={14} />}
                <span>{pdfActionType === 'download' ? 'Descargar' : 'Imprimir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Ficha de Mantenimiento (Visual Preview) */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-3xl shadow-2xl max-w-2xl w-full my-8 space-y-6 relative flex flex-col max-h-[90vh] text-neutral-800 dark:text-neutral-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 pb-0 border-b-none sticky top-0 bg-white dark:bg-neutral-900 rounded-t-3xl z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-2xl">
                  <ClipboardCheck size={26} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-neutral-400 tracking-wider">Ficha de Mantenimiento</div>
                  <h3 className="font-extrabold text-neutral-900 dark:text-white text-xl leading-tight">
                    {previewRecord.clientData?.name || 'Cliente desconocido'}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setPreviewRecord(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 pt-0 overflow-y-auto space-y-6 flex-1">
              {/* Client & Date Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-850 text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Dirección de Trabajo</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{previewRecord.clientData?.address || 'Sin dirección registrada'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Contacto</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {previewRecord.clientData?.phone && `Tel: ${previewRecord.clientData.phone}`}
                    {previewRecord.clientData?.email && ` / ${previewRecord.clientData.email}`}
                    {!previewRecord.clientData?.phone && !previewRecord.clientData?.email && 'Sin contacto registrado'}
                  </span>
                </div>
                <div className="space-y-1 pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Fecha de Revisión</span>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{previewRecord.date}</span>
                </div>
                <div className="space-y-1 pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Próxima Recomendada</span>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 text-kraken-orange">{previewRecord.nextRevisionDate || 'No planificada'}</span>
                </div>
                <div className="space-y-1 pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50 md:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Técnico Asignado</span>
                  {previewRecord.assignedEmployee ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-full font-bold text-xs mt-1">
                      <User size={12} />
                      <span>{previewRecord.assignedEmployee}</span>
                    </span>
                  ) : (
                    <span className="text-neutral-400 dark:text-neutral-500 text-xs italic">Ningún técnico asignado</span>
                  )}
                </div>
              </div>

              {/* Checklist tasks */}
              <div className="space-y-3">
                <h4 className="text-[10.5px] uppercase font-extrabold text-neutral-400 tracking-wider">Detalle del Checklist de Mantenimiento</h4>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-150 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-inner">
                  {previewRecord.checklist.map((item, idx) => (
                    <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/20 hover:bg-neutral-50 dark:hover:bg-neutral-950/20 transition-colors">
                      <div className="space-y-1">
                        <div className="text-xs text-neutral-400 dark:text-neutral-550 font-bold uppercase tracking-wider">{item.category}</div>
                        <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{item.task}</div>
                        {item.notes && (
                          <div className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-605 dark:text-neutral-400 rounded-xl px-3 py-1.5 mt-1 max-w-md italic">
                            Observación: {item.notes}
                          </div>
                        )}
                      </div>
                      
                      {/* Status colored badge */}
                      <span className={`self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        item.status === 'Ok'
                          ? 'bg-emerald-55/20 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-800'
                          : item.status === 'Reparar'
                            ? 'bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          item.status === 'Ok' ? 'bg-emerald-500' : item.status === 'Reparar' ? 'bg-rose-500' : 'bg-neutral-400'
                        }`} />
                        <span>{item.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* General observations text */}
              {previewRecord.generalObservations && (
                <div className="space-y-2">
                  <h4 className="text-[10.5px] uppercase font-extrabold text-neutral-400 tracking-wider font-mono">Observaciones Generales</h4>
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-850 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap italic">
                    {previewRecord.generalObservations}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-neutral-105 dark:border-neutral-800 flex gap-2 justify-end sticky bottom-0 bg-white dark:bg-neutral-900 rounded-b-3xl">
              <button
                onClick={() => setPreviewRecord(null)}
                className="px-5 py-2.5 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-855 transition-all uppercase tracking-wider"
              >
                Cerrar Vista
              </button>
              <button
                onClick={() => {
                  const rec = previewRecord;
                  setPreviewRecord(null);
                  triggerPdfAction(rec, 'download');
                }}
                className="kraken-btn px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <FileDown size={14} />
                <span>Bajar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
