import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar,
  Filter,
  PieChart as PieChartIcon,
  Calculator,
  Euro,
  Settings2,
  X,
  Check,
  Users,
  RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Expense } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { formatFirebaseDate } from '../lib/utils';
import { getStoredExpenses, resetAllData } from '../lib/storage';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const COLORS = ['#FF4D00', '#2B2D42', '#8D99AE', '#FF7033', '#EDF2F4'];

export default function Reports() {
  const { isDarkMode } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [period, setPeriod] = useState<'mensual' | 'anual'>('mensual');
  const [selectedMonth, setSelectedMonth] = useState('Marzo');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const loadExpenses = async () => {
      const stored = await getStoredExpenses();
      setExpenses(stored);
    };
    loadExpenses();
  }, []);
  
  // Report variables
  const [mainVariable, setMainVariable] = useState<'gastos' | 'iva' | 'mano_de_obra'>('gastos');
  const [chartType, setChartType] = useState<'category' | 'time'>('category');

  // Card slot assignments
  const [cardSlots, setCardSlots] = useState(['gastos', 'fijos', 'eficiencia']);

  const allMetrics = [
    { id: 'gastos', label: 'Total Gastos', icon: TrendingDown, color: 'orange' },
    { id: 'iva', label: 'Total IVA', icon: Euro, color: 'blue' },
    { id: 'mano_de_obra', label: 'Mano de Obra', icon: Users, color: 'orange' },
    { id: 'fijos', label: 'Gastos Fijos', icon: BarChart3, color: 'blue' },
    { id: 'eficiencia', label: 'Eficiencia', icon: TrendingUp, color: 'green' },
    { id: 'margen', label: 'Margen Real', icon: Euro, color: 'green' },
  ];

  // IVA Calculator State
  const [ivaInput, setIvaInput] = useState({ amount: '', rate: '23' });
  const [ivaResult, setIvaResult] = useState<{ subtotal: number, iva: number, total: number } | null>(null);

  const timeData = [
    { name: 'Ene', value: 2400 },
    { name: 'Feb', value: 1800 },
    { name: 'Mar', value: 3200 },
    { name: 'Abr', value: 2100 },
    { name: 'May', value: 2800 },
    { name: 'Jun', value: 3500 },
  ];

  const calculateIVA = () => {
    const amount = parseFloat(ivaInput.amount);
    const rate = parseFloat(ivaInput.rate) / 100;
    if (isNaN(amount)) return;

    setIvaResult({
      subtotal: amount,
      iva: amount * rate,
      total: amount * (1 + rate)
    });
  };

  const getMonthIndex = (monthName: string) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months.indexOf(monthName);
  };

  const filteredExpenses = React.useMemo(() => {
    if (period === 'anual') return expenses;
    const monthIdx = getMonthIndex(selectedMonth);
    const start = startOfMonth(new Date(parseInt(selectedYear), monthIdx));
    const end = endOfMonth(new Date(parseInt(selectedYear), monthIdx));
    
    return expenses.filter(item => {
      if (!item.date) return false;
      const dateStr = formatFirebaseDate(item.date);
      return isWithinInterval(parseISO(dateStr), { start, end });
    });
  }, [expenses, period, selectedMonth, selectedYear]);

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const getMetricValue = (id: string) => {
    switch (id) {
      case 'gastos': return totalExpenses.toLocaleString('de-DE') + ' €';
      case 'iva': return (totalExpenses * 0.23).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' €';
      case 'mano_de_obra': return filteredExpenses.filter(e => e.category === 'mano_de_obra').reduce((a, b) => a + b.amount, 0).toLocaleString('de-DE') + ' €';
      case 'fijos': return filteredExpenses.filter(e => e.category === 'fijo').reduce((a, b) => a + b.amount, 0).toLocaleString('de-DE') + ' €';
      case 'eficiencia': return '0%';
      case 'margen': return '0,00 €';
      default: return '0';
    }
  };

  const getMetricIcon = (id: string) => {
    const metric = allMetrics.find(m => m.id === id);
    return metric ? metric.icon : TrendingDown;
  };

  const getMetricColor = (id: string) => {
    const metric = allMetrics.find(m => m.id === id);
    return metric ? metric.color : 'orange';
  };

  const expensesByCategory = filteredExpenses.reduce((acc: any, curr) => {
    const existing = acc.find((item: any) => item.name === curr.category);
    if (existing) {
      existing.value += curr.amount;
    } else {
      acc.push({ name: curr.category, value: curr.amount });
    }
    return acc;
  }, []).map((item: any) => ({
    ...item,
    percentage: totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-[24px] shadow-2xl border border-neutral-100 dark:border-neutral-800 transition-colors backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
          <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">{data.name.replace('_', ' ')}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-8">
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Importe:</span>
              <span className="text-lg font-black text-neutral-900 dark:text-white">{data.value.toLocaleString('de-DE')} €</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Porcentaje:</span>
              <span className="text-sm font-black text-kraken-orange dark:text-kraken-orange-light">{data.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Categoría', 'Descripción', 'Importe', 'Fecha', 'Periodo'];
    const rows = filteredExpenses.map(e => [e.id, e.category, e.description, e.amount, e.date, e.period]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_gastos_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    resetAllData();
    setShowResetConfirm(false);
    // Refresh page to clear state
    window.location.reload();
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Reportes de Gastos</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Análisis detallado de la estructura de costos y rentabilidad.</p>
        </div>
        <div className="flex items-center gap-3">
          {period === 'mensual' && (
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold text-sm outline-none focus:ring-2 focus:ring-kraken-orange/20 dark:text-white"
            >
              <option value="Enero">Enero 2026</option>
              <option value="Febrero">Febrero 2026</option>
              <option value="Marzo">Marzo 2026</option>
            </select>
          )}
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold text-sm outline-none focus:ring-2 focus:ring-kraken-orange/20 dark:text-white"
          >
            <option value="mensual">Vista Mensual</option>
            <option value="anual">Vista Acumulada (Anual)</option>
          </select>
          <button 
            onClick={() => setShowResetConfirm(true)}
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-red-500 transition-all"
            title="Resetear todos los datos"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={() => setIsCustomizing(true)}
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-kraken-orange transition-all"
            title="Configurar Reporte"
          >
            <Settings2 size={20} />
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-kraken-orange text-white rounded-xl font-semibold text-sm hover:bg-kraken-orange-hover transition-all"
          >
            <Download size={18} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cardSlots.map((slotId, index) => {
          const metric = allMetrics.find(m => m.id === slotId);
          if (!metric) return null;
          const Icon = metric.icon;
          const colorClasses: Record<string, string> = {
            orange: 'bg-kraken-orange/10 text-kraken-orange',
            blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
            green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
          };

          return (
            <div key={index} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 flex flex-col gap-4 transition-colors">
              <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-2xl", colorClasses[metric.color])}>
                  <Icon size={24} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                  {metric.label} ({period === 'mensual' ? selectedMonth : 'Acumulado'})
                </p>
                <h3 className="text-3xl font-black mt-1 tracking-tight text-neutral-900 dark:text-white">
                  {getMetricValue(slotId)}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 transition-colors">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold tracking-tight dark:text-white">
              {chartType === 'category' ? 'Distribución por Categoría' : 'Evolución Temporal'}
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setChartType('category')}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  chartType === 'category' ? "bg-kraken-orange text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                )}
              >
                Categoría
              </button>
              <button 
                onClick={() => setChartType('time')}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  chartType === 'time' ? "bg-kraken-orange text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                )}
              >
                Tiempo
              </button>
            </div>
          </div>
          <div className="h-[350px] w-full">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartType === 'category' ? expensesByCategory : timeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#f0f0f0'} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: isDarkMode ? '#999' : '#666', fontSize: 10, fontWeight: 700 }} 
                    tickFormatter={(val) => val.replace('_', ' ').toUpperCase()}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#999' : '#666', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? '#262626' : '#f8f8f8' }} />
                  <Bar dataKey={chartType === 'category' ? 'value' : 'value'} fill="#FF4D00" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 flex flex-col transition-colors">
          <h3 className="text-xl font-bold tracking-tight mb-8 dark:text-white">Análisis de {mainVariable === 'gastos' ? 'Gastos' : mainVariable === 'iva' ? 'IVA' : 'Mano de Obra'}</h3>
          <div className="h-[250px] w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke={isDarkMode ? '#171717' : '#fff'}
                  strokeWidth={2}
                >
                  {expensesByCategory.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === 1 && isDarkMode ? '#fff' : COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-4 flex-1">
            <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Desglose Detallado</p>
            {expensesByCategory.map((item: any, i: number) => (
              <div key={item.name} className="p-5 rounded-[24px] bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700 hover:border-kraken-orange/30 dark:hover:border-kraken-orange/50 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: i === 1 && isDarkMode ? '#fff' : COLORS[i] }} />
                    <span className="text-sm font-black text-neutral-900 dark:text-white capitalize tracking-tight">{item.name.replace('_', ' ')}</span>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-kraken-orange/10">
                    <span className="text-[10px] font-black text-kraken-orange">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Importe Total</span>
                    <span className="text-base font-black text-neutral-700 dark:text-neutral-200">{item.value.toLocaleString('de-DE')} €</span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Participación</span>
                    <span className="text-base font-black text-neutral-400 dark:text-neutral-500">{item.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                
                {/* Progress bar for visual context */}
                <div className="mt-4 h-2 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm" 
                    style={{ backgroundColor: i === 1 && isDarkMode ? '#fff' : COLORS[i], width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customization Modal */}
      {isCustomizing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800">
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-kraken-orange/10 text-kraken-orange rounded-xl">
                  <Settings2 size={24} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight dark:text-white">Configurar Reporte</h2>
              </div>
              <button onClick={() => setIsCustomizing(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 block">Variable Principal de Análisis</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'gastos', label: 'Gastos Totales', icon: TrendingDown },
                    { id: 'iva', label: 'Impuestos (IVA)', icon: Euro },
                    { id: 'mano_de_obra', label: 'Mano de Obra', icon: Users }
                  ].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setMainVariable(v.id as any)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                        mainVariable === v.id 
                          ? "bg-kraken-orange/5 border-kraken-orange/30 text-kraken-orange" 
                          : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-700 text-neutral-500"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <v.icon size={20} />
                        <span className="font-bold">{v.label}</span>
                      </div>
                      {mainVariable === v.id && <Check size={20} />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 block">Configuración de Tarjetas (Slots)</label>
                <div className="grid grid-cols-1 gap-4">
                  {cardSlots.map((slot, index) => (
                    <div key={index} className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Tarjeta {index + 1}</label>
                      <select 
                        value={slot}
                        onChange={(e) => {
                          const newSlots = [...cardSlots];
                          newSlots[index] = e.target.value;
                          setCardSlots(newSlots);
                        }}
                        className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-kraken-orange/20 dark:text-white"
                      >
                        {allMetrics.map(m => (
                          <option key={m.id} value={m.id} className="dark:bg-neutral-900">{m.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 block">Visualización Predeterminada</label>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setChartType('category')}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
                      chartType === 'category' ? "bg-neutral-900 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                    )}
                  >
                    Por Categoría
                  </button>
                  <button 
                    onClick={() => setChartType('time')}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
                      chartType === 'time' ? "bg-neutral-900 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                    )}
                  >
                    Por Tiempo
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
              <button 
                onClick={() => setIsCustomizing(false)}
                className="w-full py-4 bg-kraken-orange text-white rounded-2xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20"
              >
                Aplicar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IVA Calculator Section */}
      <div className="bg-neutral-900 dark:bg-neutral-950 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Calculator size={200} />
        </div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kraken-orange/20 text-kraken-orange text-[10px] font-bold uppercase tracking-widest">
              Herramientas Kraken
            </div>
            <h2 className="text-4xl font-black tracking-tighter">Calculadora de IVA</h2>
            <p className="text-neutral-400 font-medium max-w-md">
              Calcula rápidamente el desglose de IVA para tus facturas y presupuestos externos.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Base Imponible (€)</label>
                <input 
                  type="number" 
                  value={ivaInput.amount}
                  onChange={(e) => setIvaInput({ ...ivaInput, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-neutral-800 dark:bg-neutral-900 border border-neutral-700 dark:border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-kraken-orange transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Tipo de IVA (%)</label>
                <select 
                  value={ivaInput.rate}
                  onChange={(e) => setIvaInput({ ...ivaInput, rate: e.target.value })}
                  className="w-full bg-neutral-800 dark:bg-neutral-900 border border-neutral-700 dark:border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-kraken-orange transition-all"
                >
                  <option value="23">23% (Portugal)</option>
                  <option value="21">21% (España)</option>
                  <option value="10">10% (Reducido)</option>
                  <option value="6">6% (PT Reducido)</option>
                </select>
              </div>
            </div>
            
            <button 
              onClick={calculateIVA}
              className="w-full sm:w-auto px-8 py-4 bg-kraken-orange text-white rounded-2xl font-bold hover:bg-kraken-orange-hover transition-all shadow-lg shadow-kraken-orange/20"
            >
              Calcular Desglose
            </button>
          </div>

          <div className="bg-neutral-800/50 dark:bg-neutral-900/50 backdrop-blur-sm p-8 rounded-3xl border border-neutral-700 dark:border-neutral-800 space-y-6">
            {ivaResult ? (
              <>
                <div className="flex justify-between items-center pb-4 border-b border-neutral-700 dark:border-neutral-800">
                  <span className="text-neutral-400 font-medium">Subtotal</span>
                  <span className="text-xl font-bold">{ivaResult.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-neutral-700 dark:border-neutral-800">
                  <span className="text-neutral-400 font-medium">IVA ({ivaInput.rate}%)</span>
                  <span className="text-xl font-bold text-kraken-orange">+{ivaResult.iva.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold">Total Final</span>
                  <span className="text-4xl font-black text-white">{ivaResult.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="p-4 rounded-full bg-neutral-700/50 dark:bg-neutral-800/50 text-neutral-500">
                  <Calculator size={40} />
                </div>
                <p className="text-neutral-500 font-medium">Introduce un importe para ver el desglose</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 border border-neutral-100 dark:border-neutral-800">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <RotateCcw size={32} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 dark:text-white">¿Resetear Datos?</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-center mb-8">
              Esta acción eliminará todos los clientes, presupuestos, órdenes y gastos. No se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleReset}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Resetear Todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
