import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  FileText, 
  Download, 
  Copy, 
  Trash2, 
  Eye,
  Edit2,
  Printer,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Euro,
  Smartphone,
  Calendar,
  User,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../lib/ThemeContext';

import { fetchBudgets, deleteBudget as deleteStoredBudget, saveBudget } from '../lib/storage';
import { generateBudgetPDF } from '../lib/pdfGenerator';

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    borrador: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
    enviado: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    aprobado: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    rechazado: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    ejecucion: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    finalizado: 'bg-neutral-900 dark:bg-neutral-950 text-white',
    cobrado: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
  };

  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm ${styles[status] || styles.borrador}`}>
      {status}
    </span>
  );
};

import { toast } from 'sonner';

export default function Budgets() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('cliente') || '');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await fetchBudgets();
        
        const formattedBudgets = stored.map((sb: any) => ({
          ...sb,
          client: sb.clientName || sb.clientId || 'Cliente',
          phone: sb.clientPhone || 'N/A',
          address: sb.clientAddress || 'N/A',
          vertical: sb.clientVertical || 'hogar',
          date: new Date(sb.date),
          total: Number(sb.total) || 0
        }));

        setBudgets(formattedBudgets);
      } catch (error) {
        console.error('Error loading budgets:', error);
      }
    };
    loadData();
  }, []);

  const handleDeleteBudget = async (id: string) => {
    await deleteStoredBudget(id);
    setBudgets(budgets.filter(b => b.id !== id));
    setDeleteConfirmation(null);
  };

  useEffect(() => {
    const clientParam = searchParams.get('cliente');
    if (clientParam) {
      setSearchTerm(clientParam);
    }
  }, [searchParams]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedBudgets = React.useMemo(() => {
    let sortableBudgets = budgets.filter(budget => 
      budget.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig !== null) {
      sortableBudgets.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableBudgets;
  }, [budgets, searchTerm, sortConfig]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const budgetToUpdate = budgets.find(b => b.id === id);
    if (!budgetToUpdate) return;

    const updatedBudget = { ...budgetToUpdate, status: newStatus };
    setBudgets(budgets.map(b => b.id === id ? updatedBudget : b));
    
    // Update in storage
    await saveBudget(updatedBudget);
  };

  const openDetail = (budget: any) => {
    setSelectedBudget(budget);
    setIsDetailModalOpen(true);
  };

  const handleLanguageChange = async (newLang: 'es' | 'pt' | 'en') => {
    if (!selectedBudget) return;
    const updatedBudget = { ...selectedBudget, language: newLang };
    setSelectedBudget(updatedBudget);
    
    // Update in storage
    await saveBudget(updatedBudget);
    setBudgets(budgets.map(b => b.id === selectedBudget.id ? { ...b, language: newLang } : b));
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Listado de Presupuestos - Kraken Handyman', 20, 10);
    
    const tableHeaders = [['N° Presupuesto', 'Cliente', 'Fecha', 'Total', 'Estado']];
    const tableData = sortedBudgets.map(b => [
      b.id,
      b.client,
      format(b.date, 'dd/MM/yyyy'),
      `${(Number(b.total) || 0).toFixed(2)} € + IVA`,
      b.status.toUpperCase()
    ]);

    (doc as any).autoTable({
      head: tableHeaders,
      body: tableData,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [255, 77, 0] }
    });

    doc.save('presupuestos_kraken.pdf');
  };

  const downloadBudgetPDF = async (budget: any, formatType: 'pc' | 'mobile' = 'pc', shouldPrint: boolean = false) => {
    try {
      const safeTotal = Number(budget.total) || 0;
      const subtotal = budget.subtotal || (safeTotal / 1.23);
      const iva = safeTotal - subtotal;
      
      const safeDate = budget.date instanceof Date ? budget.date : new Date(budget.date || Date.now());
      const formattedDate = !isNaN(safeDate.getTime()) ? format(safeDate, 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');

      const doc = await generateBudgetPDF({
        id: budget.id || 'N/A',
        client: {
          name: budget.clientName || budget.client || 'Cliente',
          phone: budget.clientPhone || budget.phone || 'N/A',
          address: budget.clientAddress || budget.address || 'N/A',
          vertical: budget.clientVertical || budget.vertical || 'hogar'
        },
        date: formattedDate,
        description: budget.description || 'Sin descripción',
        calculation: {
          subtotal: subtotal,
          total: subtotal + iva,
          iva: iva,
          moTotal: 0,
          structureTotal: 0,
          transportTotal: 0,
          guarantee: 0,
          minWithoutMargin: 0,
          marginEur: 0,
          marginPct: 0,
          materialsFactured: 0
        },
        materials: budget.materials || [],
        language: budget.language || 'es'
      }, formatType);

      if (shouldPrint) {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        doc.save(`Presupuesto_${budget.id || 'nuevo'}_${formatType}.pdf`);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Hubo un error al generar el PDF. Por favor, inténtalo de nuevo.");
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={12} className="ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="ml-1 text-kraken-orange" /> : <ArrowDown size={12} className="ml-1 text-kraken-orange" />;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Presupuestos</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Gestiona y crea propuestas comerciales profesionales.</p>
        </div>
        <Link to="/presupuestos/nuevo" className="flex items-center justify-center gap-2 px-6 py-3 bg-kraken-orange text-white rounded-xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20">
          <Plus size={20} />
          <span>Nuevo Presupuesto</span>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, número o descripción..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-kraken-orange/20 focus:border-kraken-orange outline-none transition-all dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">
            <Filter size={20} />
            <span>Filtros</span>
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 dark:bg-neutral-950 text-white rounded-xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-800 transition-all border border-transparent dark:border-neutral-800"
            title="Exportar Listado a PDF"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800">
                <th 
                  className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-kraken-orange transition-colors"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center">
                    N° Presupuesto
                    <SortIcon columnKey="id" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-kraken-orange transition-colors"
                  onClick={() => handleSort('client')}
                >
                  <div className="flex items-center">
                    Cliente
                    <SortIcon columnKey="client" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-kraken-orange transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    Fecha
                    <SortIcon columnKey="date" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Descripción</th>
                <th 
                  className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-kraken-orange transition-colors"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center">
                    Total
                    <SortIcon columnKey="total" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Estado</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Inicio Obra</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {sortedBudgets.map((budget) => (
                <tr key={budget.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 group-hover:bg-kraken-orange/10 group-hover:text-kraken-orange transition-colors">
                        <FileText size={18} />
                      </div>
                      <span className="font-bold text-neutral-900 dark:text-white">{budget.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{budget.client}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{budget.vertical}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                    {format(budget.date, 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium line-clamp-1 max-w-[200px]">{budget.description}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                      {(Number(budget.subtotal || (budget.total / 1.23)) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € + IVA
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                      budget.status === 'borrador' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400' :
                      budget.status === 'enviado' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                      budget.status === 'aprobado' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                      budget.status === 'rechazado' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                      budget.status === 'ejecucion' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                      budget.status === 'finalizado' ? 'bg-neutral-900 dark:bg-neutral-950 text-white' :
                      'bg-emerald-500 text-white shadow-emerald-500/20'
                    }`}>
                      <select 
                        value={budget.status}
                        onChange={(e) => handleStatusChange(budget.id, e.target.value)}
                        className="bg-transparent outline-none cursor-pointer border-none p-0 m-0 font-black dark:text-inherit"
                      >
                        <option value="borrador" className="dark:bg-neutral-900">Borrador</option>
                        <option value="enviado" className="dark:bg-neutral-900">Enviado</option>
                        <option value="aprobado" className="dark:bg-neutral-900">Aprobado</option>
                        <option value="rechazado" className="dark:bg-neutral-900">Rechazado</option>
                        <option value="ejecucion" className="dark:bg-neutral-900">Ejecución</option>
                        <option value="finalizado" className="dark:bg-neutral-900">Finalizado</option>
                        <option value="cobrado" className="dark:bg-neutral-900">Cobrado</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {budget.status === 'aprobado' || budget.status === 'ejecucion' ? (
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-kraken-orange" />
                        <input 
                          type="date" 
                          value={budget.startDate || ''}
                          onChange={async (e) => {
                            const newDate = e.target.value;
                            const updatedBudget = { ...budget, startDate: newDate };
                            setBudgets(budgets.map(b => b.id === budget.id ? updatedBudget : b));
                            await saveBudget(updatedBudget);
                          }}
                          className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-kraken-orange/20 dark:text-white"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 italic">No aprobado</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/presupuestos/nuevo?id=${budget.id}`)}
                        className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all" 
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => openDetail(budget)}
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" 
                        title="Ver Detalle"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => downloadBudgetPDF(budget, 'pc', true)}
                        className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all" 
                        title="Imprimir"
                      >
                        <Printer size={18} />
                      </button>
                      <button 
                        onClick={() => downloadBudgetPDF(budget)}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" 
                        title="Descargar PDF"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmation(budget.id)}
                        className="p-2 text-kraken-orange hover:bg-kraken-orange/10 rounded-lg transition-all" 
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
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Mostrando {sortedBudgets.length} de {budgets.length} presupuestos</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-bold disabled:opacity-50 dark:text-white">Anterior</button>
            <button className="px-3 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-bold dark:text-white">Siguiente</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedBudget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden transition-colors flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-900 dark:bg-neutral-950 text-white shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-kraken-orange mb-2 block">Ficha de Presupuesto</span>
                <h2 className="text-3xl font-black tracking-tighter">{selectedBudget.id}</h2>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-2xl transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Cliente</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">{selectedBudget.client}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{selectedBudget.phone}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{selectedBudget.address}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium capitalize">{selectedBudget.vertical}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Fecha de Emisión</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">{format(selectedBudget.date, 'dd MMMM yyyy', { locale: es })}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Descripción del Trabajo</p>
                <p className="text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                  {selectedBudget.description}
                </p>
              </div>

              {selectedBudget.phases && selectedBudget.phases.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Desglose de Fases</p>
                  <div className="space-y-3">
                    {selectedBudget.phases.map((phase: any) => (
                      <div key={phase.id} className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl shadow-sm">
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">{phase.name}</p>
                          <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                            {phase.employees} operarios · {phase.days} días · {phase.halfDays} medias jornadas
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBudget.materials && selectedBudget.materials.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Materiales</p>
                  <div className="space-y-3">
                    {selectedBudget.materials.map((material: any) => (
                      <div key={material.id} className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl shadow-sm">
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">{material.name}</p>
                          <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Cantidad: {material.quantity}</p>
                        </div>
                        <p className="font-bold text-neutral-900 dark:text-white">{(material.cost * material.quantity).toFixed(2)} €</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-8 bg-neutral-900 dark:bg-neutral-950 rounded-[32px] text-white space-y-6 shadow-xl shadow-neutral-900/20 transition-colors">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-kraken-orange text-white shadow-lg shadow-kraken-orange/20">
                      <Euro size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Resumen de Importes</p>
                      <h3 className="text-xl font-black tracking-tight">Cálculo Interno</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Estado</p>
                    <StatusBadge status={selectedBudget.status} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 font-medium">Subtotal</span>
                    <span className="font-bold">{(Number(selectedBudget.subtotal) || (selectedBudget.total / 1.23)).toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 font-medium">IVA (23%)</span>
                    <span className="font-bold">{(Number(selectedBudget.total - (selectedBudget.subtotal || (selectedBudget.total / 1.23)))).toFixed(2)} €</span>
                  </div>
                  <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-kraken-orange uppercase tracking-widest">Total General</span>
                    <span className="text-2xl font-black text-white">{(Number(selectedBudget.total) || 0).toFixed(2)} €</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Vista Cliente (PDF)</p>
                    <p className="text-base font-bold text-kraken-orange">
                      {(Number(selectedBudget.subtotal || (selectedBudget.total / 1.23)) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € + IVA
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Idioma PDF</p>
                    <select 
                      value={selectedBudget.language || 'es'}
                      onChange={(e) => handleLanguageChange(e.target.value as any)}
                      className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer text-white"
                    >
                      <option value="es">Español</option>
                      <option value="pt">Português</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={() => setIsHelpModalOpen(true)}
                  className="flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-kraken-orange transition-colors uppercase tracking-widest"
                >
                  <Info size={14} />
                  <span>Ver Ayuda Memoria (Fórmulas Internas)</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 sticky bottom-0 bg-white dark:bg-neutral-900 pb-2">
                <button 
                  onClick={() => downloadBudgetPDF(selectedBudget, 'pc', true)}
                  className="px-8 py-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  <span>Imprimir</span>
                </button>
                <button 
                  onClick={() => downloadBudgetPDF(selectedBudget, 'pc')}
                  className="px-8 py-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  <span>PDF Desktop</span>
                </button>
                <button 
                  onClick={() => downloadBudgetPDF(selectedBudget, 'mobile')}
                  className="px-8 py-4 bg-kraken-orange text-white rounded-2xl font-bold shadow-lg shadow-kraken-orange/20 hover:bg-kraken-orange-hover transition-all flex items-center justify-center gap-2"
                >
                  <Smartphone size={20} />
                  <span>PDF Mobile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-kraken-orange text-white">
              <div className="flex items-center gap-3">
                <Info size={24} />
                <h2 className="text-2xl font-black tracking-tighter">Ayuda Memoria: Fórmulas</h2>
              </div>
              <button onClick={() => setIsHelpModalOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <section className="space-y-3">
                <h3 className="font-bold text-kraken-orange uppercase text-xs tracking-widest">1. Mano de Obra (MO)</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Calculado por fase: <br/>
                  <code className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-bold text-neutral-900 dark:text-white">
                    Operarios × Medias Jornadas × Días × Costo Media Jornada
                  </code>
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-kraken-orange uppercase text-xs tracking-widest">2. Estructura</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Costos fijos mensuales (Seguros, Gestoría, Mantenimiento Furgón) divididos por 24 días hábiles. <br/>
                  <code className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-bold text-neutral-900 dark:text-white">
                    (Suma Costos Fijos / 24) × Días Totales
                  </code>
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-kraken-orange uppercase text-xs tracking-widest">3. Traslado</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Costo base según zona (1 a 4) multiplicado por los días de trabajo, más extras de traslado por fase.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-kraken-orange uppercase text-xs tracking-widest">4. Garantía (8%)</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Se aplica la Garantía (8% por defecto) sobre la suma de MO + Estructura + Traslado para cubrir imprevistos.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-kraken-orange uppercase text-xs tracking-widest">5. Margen y Materiales</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  <strong>Margen:</strong> Se aplica el % seleccionado sobre el costo total del servicio. <br/>
                  <strong>Materiales:</strong> Costo real + 25% de recargo comercial.
                </p>
              </section>

              <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-neutral-100 dark:border-neutral-700">
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Fórmula Final (Subtotal)</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  Subtotal = (MO + Estructura + Traslado + Garantía) + Margen + Materiales Facturados
                </p>
              </div>
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
            <h3 className="text-xl font-bold text-center mb-2 dark:text-white">¿Eliminar Presupuesto?</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-center mb-8">
              Esta acción no se puede deshacer. Se eliminarán todos los datos asociados a este presupuesto.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDeleteBudget(deleteConfirmation)}
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
