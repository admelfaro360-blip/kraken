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
import { fetchBudgets, fetchWorkOrders } from '../lib/storage';
import { Budget, WorkOrder } from '../types';
import { formatFirebaseDate } from '../lib/utils';
import { generateWeeklyAgendaPDF, WeeklyAgendaPDFData } from '../lib/pdfGenerator';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

import { toast } from 'sonner';

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [b, o] = await Promise.all([
          fetchBudgets(),
          fetchWorkOrders()
        ]);
        setBudgets(b);
        setWorkOrders(o);
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
    return { budgets: dayBudgets, orders: dayOrders };
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

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : { budgets: [], orders: [] };

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
            className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <FileText size={18} />
            <span>{isGenerating ? 'Generando...' : 'PDF Desktop'}</span>
          </button>
          <button 
            onClick={() => handleDownloadPDF('mobile')}
            disabled={isGenerating}
            className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <Smartphone size={18} />
            <span>{isGenerating ? 'Generando...' : 'PDF Mobile'}</span>
          </button>
          <button 
            onClick={handleSendReminder}
            disabled={isGenerating}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={20} />
            <span>{isGenerating ? 'Generando...' : 'Enviar a Eduardo'}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden">
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
                const { budgets: b, orders: o } = getEventsForDay(day);
                const hasEvents = b.length > 0 || o.length > 0;
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isCurrentMonth = isSameMonth(day, monthStart);

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(day)}
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
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Details Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
              <CalendarIcon size={20} className="text-kraken-orange" />
              <span>{selectedDay ? format(selectedDay, "EEEE d 'de' MMMM", { locale: es }) : 'Selecciona un día'}</span>
            </h3>

            <div className="space-y-4">
              {selectedDayEvents.budgets.length === 0 && selectedDayEvents.orders.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock size={24} className="text-neutral-300" />
                  </div>
                  <p className="text-sm text-neutral-500">No hay tareas programadas para este día.</p>
                </div>
              ) : (
                <>
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
    </div>
  );
}
