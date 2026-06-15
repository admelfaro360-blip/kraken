import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Send,
  FileText,
  ClipboardList,
  Smartphone
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  startOfToday,
  endOfToday,
  addWeeks
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  fetchBudgets, 
  fetchWorkOrders, 
  deleteWorkOrder,
  fetchAgendaNotes,
  saveAgendaNote,
  deleteAgendaNote,
  fetchMaintenances
} from '../lib/storage';
import { Budget, WorkOrder, AgendaNote, MaintenanceRecord } from '../types';
import { formatFirebaseDate } from '../lib/utils';
import { generateWeeklyAgendaPDF, WeeklyAgendaPDFData } from '../lib/pdfGenerator';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';
import { X } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to parse YYYY-MM-DD as local date to avoid timezone issues
const parseLocalDate = (rawDate: any) => {
  const dateStr = formatFirebaseDate(rawDate).split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getClientColor = (clientName: string) => {
  const colors = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  ];
  
  let hash = 0;
  const name = clientName || 'Desconocido';
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [agendaNotes, setAgendaNotes] = useState<AgendaNote[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const [isGenerating, setIsGenerating] = useState(false);
  
  // Note Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<AgendaNote | null>(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [b, o, n, m] = await Promise.all([
          fetchBudgets(),
          fetchWorkOrders(),
          fetchAgendaNotes(),
          fetchMaintenances()
        ]);
        
        setAgendaNotes(n);
        setMaintenances(m);
        // Auto-cleanup for ESPACIO FLUOR June/July 2026
        const toDelete = o.filter(wo => {
          if (!wo.clientName || !wo.startDate) return false;
          const isTargetClient = wo.clientName.toUpperCase().includes('FLUOR');
          const dateStr = formatFirebaseDate(wo.startDate);
          const date = new Date(dateStr);
          const isTargetDate = date.getFullYear() === 2026 && (date.getMonth() === 5 || date.getMonth() === 6);
          return isTargetClient && isTargetDate;
        });

        if (toDelete.length > 0) {
          console.log(`🧹 Cleaning up ${toDelete.length} work orders in Agenda...`);
          await Promise.all(toDelete.map(wo => deleteWorkOrder(wo.id)));
          const finalOrders = await fetchWorkOrders();
          setWorkOrders(finalOrders);
          toast.success(`Eliminadas ${toDelete.length} órdenes de FLUOR de la agenda.`);
        } else {
          setWorkOrders(o);
        }
        
        setBudgets(b);
      } catch (error) {
        console.error('Error loading agenda data:', error);
      }
    };
    loadData();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getEventsForDay = (day: Date) => {
    const dayBudgets = budgets.filter(b => {
      if (!b.startDate) return false;
      const start = parseLocalDate(b.startDate);
      // Calculate total days from phases
      const duration = b.phases?.reduce((acc, phase) => acc + (phase.days || 0), 0) || 1;
      const end = addDays(start, Math.max(0, duration - 1));
      
      const checkDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      return checkDay >= startDay && checkDay <= endDay;
    });
    const dayOrders = workOrders.filter(o => {
      if (!o.startDate) return false;
      const start = parseLocalDate(o.startDate);
      const duration = o.duration || 1;
      const end = addDays(start, Math.max(0, duration - 1));
      
      const checkDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      return checkDay >= startDay && checkDay <= endDay;
    });
    const dayNotes = agendaNotes.filter(n => {
      const noteDateStr = n.date.split('T')[0];
      const checkDayStr = format(day, 'yyyy-MM-dd');
      return noteDateStr === checkDayStr;
    });

    const dayMaintenances = maintenances.filter(m => {
      if (!m.date) return false;
      const mDateStr = m.date.split('T')[0];
      const checkDayStr = format(day, 'yyyy-MM-dd');
      return mDateStr === checkDayStr;
    });

    const dayNextMaintenances = maintenances.filter(m => {
      if (!m.nextRevisionDate) return false;
      const mNextStr = m.nextRevisionDate.split('T')[0];
      const checkDayStr = format(day, 'yyyy-MM-dd');
      return mNextStr === checkDayStr;
    });

    return { 
      budgets: dayBudgets, 
      orders: dayOrders, 
      notes: dayNotes,
      maintenances: dayMaintenances,
      nextMaintenances: dayNextMaintenances
    };
  };

  const handleDayDoubleClick = (day: Date) => {
    const existingNotesForDay = agendaNotes.filter(n => {
      const noteDateStr = n.date.split('T')[0];
      const checkDayStr = format(day, 'yyyy-MM-dd');
      return noteDateStr === checkDayStr;
    });

    if (existingNotesForDay.length > 0) {
      setEditingNote(existingNotesForDay[0]);
      setNoteForm({
        title: existingNotesForDay[0].title,
        content: existingNotesForDay[0].content || ''
      });
    } else {
      setEditingNote(null);
      setNoteForm({ title: '', content: '' });
    }
    setSelectedDay(day);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim() || !selectedDay) return;

    const noteToSave: AgendaNote = {
      id: editingNote?.id || `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: noteForm.title,
      content: noteForm.content,
      date: format(selectedDay, 'yyyy-MM-dd'),
      createdAt: editingNote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveAgendaNote(noteToSave);
      toast.success(editingNote ? "Nota actualizada" : "Nota guardada");
      setIsNoteModalOpen(false);
      
      const notes = await fetchAgendaNotes();
      setAgendaNotes(notes);
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Hubo un error al guardar la nota");
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteAgendaNote(id);
      toast.success("Nota eliminada");
      setIsNoteModalOpen(false);
      
      const notes = await fetchAgendaNotes();
      setAgendaNotes(notes);
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Hubo un error al eliminar la nota");
    }
  };

  const handleDownloadPDF = async (formatType: 'pc' | 'mobile') => {
    setIsGenerating(true);
    try {
      // Use the week of the selected day, or the current week if none selected
      const baseDate = selectedDay || new Date();
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      const weekOrders = workOrders.filter(o => {
        if (!o.startDate) return false;
        const start = parseLocalDate(o.startDate);
        const duration = o.duration || 1;
        const end = addDays(start, Math.max(0, duration - 1));
        return (start <= weekEnd && end >= weekStart);
      });

      const weekBudgets = budgets.filter(b => {
        if (!b.startDate || (b.status !== 'aprobado' && b.status !== 'ejecucion')) return false;
        const start = parseLocalDate(b.startDate);
        const duration = b.phases?.reduce((acc, phase) => acc + (phase.days || 0), 0) || 1;
        const end = addDays(start, Math.max(0, duration - 1));
        return (start <= weekEnd && end >= weekStart);
      });

      if (weekOrders.length === 0 && weekBudgets.length === 0) {
        toast.info("No hay trabajos programados para la semana seleccionada.");
        setIsGenerating(false);
        return false;
      }

      // Prepare data for PDF
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const agendaDays = days.map(day => {
        const dayOrders = weekOrders.filter(o => {
          const start = parseLocalDate(o.startDate!);
          const duration = o.duration || 1;
          const end = addDays(start, Math.max(0, duration - 1));
          const checkDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
          return checkDay >= start && checkDay <= end;
        });

        const dayBudgets = weekBudgets.filter(b => {
          const start = parseLocalDate(b.startDate!);
          const duration = b.phases?.reduce((acc, phase) => acc + (phase.days || 0), 0) || 1;
          const end = addDays(start, Math.max(0, duration - 1));
          const checkDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
          return checkDay >= start && checkDay <= end;
        });

        return {
          date: day,
          budgets: dayBudgets,
          orders: dayOrders
        };
      });

      const pdfData: WeeklyAgendaPDFData = {
        startDate: format(weekStart, 'dd/MM/yyyy'),
        endDate: format(weekEnd, 'dd/MM/yyyy'),
        days: agendaDays
      };

      const doc = await generateWeeklyAgendaPDF(pdfData, formatType);
      doc.save(`Agenda_Semanal_${format(weekStart, 'dd-MM')}_al_${format(weekEnd, 'dd-MM')}_${formatType}.pdf`);
      toast.success("Agenda exportada correctamente.");
      setIsGenerating(false);
      return true;
    } catch (error) {
      console.error("Error generating agenda PDF:", error);
      toast.error("Hubo un error al generar el PDF de la agenda.");
      setIsGenerating(false);
      return false;
    }
  };

  const handleSendReminder = async () => {
    const baseDate = selectedDay || new Date();
    const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const success = await handleDownloadPDF('mobile');
    if (!success) return;

    const phone = "351967873913";
    
    let message = `*Agenda Semanal - Kraken Handyman OS*%0A%0A`;
    message += `Hola Eduardo, te envío la agenda de la semana del ${format(weekStart, 'dd/MM')} al ${format(weekEnd, 'dd/MM')} en PDF (versión móvil).%0A%0A`;
    message += `Por favor, revisa el archivo adjunto que acabo de descargar.%0A%0A`;
    message += `¡Buena semana!`;
    
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : { budgets: [], orders: [], notes: [], maintenances: [], nextMaintenances: [] };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Agenda</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Organiza tus trabajos y compromisos.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => handleDownloadPDF('pc')}
            disabled={isGenerating}
            className="kraken-btn-secondary !h-11 !px-4 text-sm"
          >
            <FileText size={18} />
            <span>{isGenerating ? 'Generando...' : 'PDF Desktop'}</span>
          </button>
          <button 
            onClick={() => handleDownloadPDF('mobile')}
            disabled={isGenerating}
            className="kraken-btn-secondary !h-11 !px-4 text-sm"
          >
            <Smartphone size={18} />
            <span>{isGenerating ? 'Generando...' : 'PDF Mobile'}</span>
          </button>
          <button 
            onClick={handleSendReminder}
            disabled={isGenerating}
            className="kraken-btn !h-12 !px-6 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
          >
            <Send size={20} />
            <span>{isGenerating ? 'Generando...' : 'Enviar a Eduardo'}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="kraken-card">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-xl font-bold capitalize dark:text-white">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors dark:text-white">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors dark:text-white">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-neutral-100 dark:border-neutral-800">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const { budgets: b, orders: o, notes: n, maintenances: m, nextMaintenances: nm } = getEventsForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isCurrentMonth = isSameMonth(day, monthStart);

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    onDoubleClick={() => handleDayDoubleClick(day)}
                    className={cn(
                      "min-h-[100px] p-2 border-r border-b border-neutral-50 dark:border-neutral-800/50 flex flex-col items-start gap-1 transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800/30",
                      !isCurrentMonth && "opacity-30",
                      isSelected && "bg-kraken-orange/5 dark:bg-kraken-orange/10 ring-2 ring-inset ring-kraken-orange/20"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                      isToday(day) ? "bg-kraken-orange text-white" : "text-neutral-600 dark:text-neutral-400",
                      isSelected && !isToday(day) && "text-kraken-orange"
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    <div className="w-full space-y-1 mt-1">
                      {n.map((note, idx) => (
                        <div key={idx} className="text-[8px] px-1.5 py-0.5 rounded truncate font-bold leading-tight bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex flex-col">
                          <span>{note.title}</span>
                          <span className="text-[6px] opacity-70 uppercase tracking-tighter">NOTA</span>
                        </div>
                      ))}
                      {b.map((item, idx) => (
                        <div key={idx} className={cn(
                          "text-[8px] px-1.5 py-0.5 rounded truncate font-bold leading-tight border flex flex-col",
                          getClientColor(item.clientName || item.clientId || 'Presupuesto')
                        )}>
                          <span>{item.clientName || 'Presupuesto'}</span>
                          <span className="text-[6px] opacity-70 uppercase tracking-tighter">PRE</span>
                        </div>
                      ))}
                      {o.map((item, idx) => (
                        <div key={idx} className={cn(
                          "text-[8px] px-1.5 py-0.5 rounded truncate font-bold leading-tight border flex flex-col",
                          getClientColor(item.clientName || 'Orden')
                        )}>
                          <span>{item.clientName || 'Orden'}</span>
                          <span className="text-[6px] opacity-70 uppercase tracking-tighter">{item.crewId || 'OT'}</span>
                        </div>
                      ))}
                      {m.map((item, idx) => (
                        <div key={`m-${idx}`} className="text-[8px] px-1.5 py-0.5 rounded truncate font-bold leading-tight bg-blue-500 text-white border border-blue-600 flex flex-col">
                          <span>Mantenimiento: {item.clientData?.name || 'Mantenimiento'}</span>
                          <span className="text-[6px] opacity-80 uppercase tracking-tighter">REVISIÓN</span>
                        </div>
                      ))}
                      {nm.map((item, idx) => (
                        <div key={`nm-${idx}`} className="text-[8px] px-1.5 py-0.5 rounded truncate font-bold leading-tight bg-orange-500 text-white border border-orange-600 flex flex-col animate-pulse">
                          <span>Mantenimiento: {item.clientData?.name || 'Mantenimiento'}</span>
                          <span className="text-[6px] opacity-80 uppercase tracking-tighter">PRÓXIMO</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Details Column */}
        <div className="space-y-6">
          <div className="kraken-card p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
              <CalendarIcon size={20} className="text-kraken-orange" />
              <span>{selectedDay ? format(selectedDay, "EEEE d 'de' MMMM", { locale: es }) : 'Selecciona un día'}</span>
            </h3>

            <div className="space-y-4">
              {selectedDayEvents.budgets.length === 0 && 
               selectedDayEvents.orders.length === 0 && 
               selectedDayEvents.notes.length === 0 &&
               (!selectedDayEvents.maintenances || selectedDayEvents.maintenances.length === 0) &&
               (!selectedDayEvents.nextMaintenances || selectedDayEvents.nextMaintenances.length === 0) ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock size={24} className="text-neutral-300" />
                  </div>
                  <p className="text-sm text-neutral-500">No hay tareas programadas para este día.</p>
                  <p className="text-[10px] text-neutral-400 mt-2">Doble click para agregar una nota.</p>
                </div>
              ) : (
                <>
                  {selectedDayEvents.notes.map((n) => (
                    <div 
                      key={n.id} 
                      className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 space-y-2 shadow-sm cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                      onClick={() => {
                        setEditingNote(n);
                        setNoteForm({ title: n.title, content: n.content || '' });
                        setIsNoteModalOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <MessageSquare size={12} />
                          Nota / Recordatorio
                        </span>
                      </div>
                      <h4 className="font-bold leading-tight dark:text-white">{n.title}</h4>
                      {n.content && <p className="text-xs text-neutral-600 dark:text-neutral-400">{n.content}</p>}
                    </div>
                  ))}
                  {selectedDayEvents.maintenances?.map((m) => (
                    <div key={m.id} className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Clock size={12} />
                          Mantenimiento Realizado
                        </span>
                        <span className="text-xs font-bold opacity-80 text-blue-600 dark:text-blue-400">Completado</span>
                      </div>
                      <h4 className="font-bold leading-tight dark:text-white">Mantenimiento: {m.clientData?.name}</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Dirección: {m.clientData?.address}</p>
                      {m.assignedEmployee && (
                        <span className="text-[9px] px-2.5 py-1 bg-blue-200/50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full font-bold uppercase">
                          Tec: {m.assignedEmployee}
                        </span>
                      )}
                    </div>
                  ))}
                  {selectedDayEvents.nextMaintenances?.map((m) => (
                    <div key={`nm-${m.id}`} className="p-4 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20 space-y-2 shadow-sm animate-pulse">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 text-orange-600 dark:text-orange-400">
                          <AlertCircle size={12} />
                          Próximo Mantenimiento Recomendado
                        </span>
                        <span className="text-xs font-bold opacity-80 text-orange-500">Pendiente</span>
                      </div>
                      <h4 className="font-bold leading-tight dark:text-white">Mantenimiento: {m.clientData?.name}</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Dirección: {m.clientData?.address}</p>
                    </div>
                  ))}
                  {selectedDayEvents.budgets.map((b) => (
                    <div key={b.id} className={cn(
                      "p-4 rounded-2xl border space-y-2 shadow-sm",
                      getClientColor(b.clientName || 'Presupuesto').replace('text-', 'text-opacity-90 text-').replace('bg-', 'bg-opacity-20 bg-')
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 opacity-70">
                          <FileText size={12} />
                          Presupuesto
                        </span>
                        <span className="text-xs font-bold opacity-80">{b.id}</span>
                      </div>
                      <h4 className="font-bold leading-tight">{b.description}</h4>
                      <p className="text-xs font-medium opacity-70">{b.clientName}</p>
                    </div>
                  ))}
                  {selectedDayEvents.orders.map((o) => (
                    <div key={o.id} className={cn(
                      "p-4 rounded-2xl border space-y-2 shadow-sm",
                      getClientColor(o.clientName || 'Orden').replace('text-', 'text-opacity-90 text-').replace('bg-', 'bg-opacity-20 bg-')
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 opacity-70">
                          <ClipboardList size={12} />
                          Orden de Trabajo
                        </span>
                        <span className="text-xs font-bold opacity-80">{o.id}</span>
                      </div>
                      <h4 className="font-bold leading-tight">{o.description}</h4>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium opacity-70">{o.clientName}</p>
                        {o.crewId && (
                          <span className="text-[9px] px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full font-bold uppercase tracking-widest">
                            {o.crewId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {o.assignedTo?.map((p, i) => (
                          <span key={i} className="text-[9px] px-2 py-0.5 bg-white/50 dark:bg-black/20 rounded-full font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="bg-kraken-orange/5 dark:bg-kraken-orange/10 rounded-3xl p-6 border border-kraken-orange/10">
            <h4 className="font-bold text-kraken-orange mb-2 flex items-center gap-2">
              <AlertCircle size={18} />
              <span>Recordatorio</span>
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Recuerda que los presupuestos aprobados deben tener una fecha de inicio asignada para aparecer en la agenda y en los recordatorios semanales.
            </p>
          </div>
        </div>
      </div>

      {/* Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsNoteModalOpen(false)} />
          <div className="relative bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-neutral-100 dark:border-neutral-800 animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tighter dark:text-white">
                    {editingNote ? 'Editar Nota' : 'Nueva Nota'}
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mt-1">
                    {selectedDay && format(selectedDay, "d 'de' MMMM", { locale: es })}
                  </p>
                </div>
                <button onClick={() => setIsNoteModalOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors">
                  <X size={24} className="text-neutral-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Título</label>
                  <input
                    type="text"
                    value={noteForm.title}
                    onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                    placeholder="Ej: Comprar materiales"
                    className="kraken-input w-full"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Contenido (Opcional)</label>
                  <textarea
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                    placeholder="Detalles adicionales..."
                    className="kraken-input w-full min-h-[120px] py-4"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  {editingNote && (
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(editingNote.id)}
                      className="flex-1 kraken-btn-secondary !h-14 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Eliminar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={!noteForm.title.trim()}
                    className="flex-[2] kraken-btn !h-14 shadow-kraken-orange/20"
                  >
                    {editingNote ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
