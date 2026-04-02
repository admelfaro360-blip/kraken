import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calculator,
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreHorizontal,
  ArrowRight,
  FileText,
  Euro,
  Users,
  Briefcase,
  Truck,
  ShieldCheck,
  Package,
  Receipt,
  CreditCard,
  MapPin,
  Building2,
  UserPlus,
  TrendingDown,
  Info
} from 'lucide-react';
import { cn, formatFirebaseDate } from '../lib/utils';
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
  Pie,
  Legend
} from 'recharts';
import { Budget, WorkOrder, Payment, Client, BusinessConfig } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { 
  fetchBudgets, 
  fetchWorkOrders, 
  fetchPayments, 
  fetchClients, 
  fetchConfig 
} from '../lib/storage';
import { parseISO, getMonth, getYear, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculateBudget } from '../lib/calculator';

const COLORS = ['#FF4D00', '#2B2D42', '#8D99AE', '#FF7033', '#EDF2F4', '#4CAF50', '#2196F3', '#9C27B0'];

export default function Reports() {
  const { isDarkMode } = useTheme();
  
  // Data State
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const years = ['2024', '2025', '2026', '2027'];

  // Filter State (Persisted)
  const [period, setPeriod] = useState<'mensual' | 'anual'>(() => 
    (localStorage.getItem('reports_period') as any) || 'mensual'
  );
  const [selectedMonth, setSelectedMonth] = useState(() => 
    localStorage.getItem('reports_month') || months[new Date().getMonth()]
  );
  const [selectedYear, setSelectedYear] = useState(() => 
    localStorage.getItem('reports_year') || format(new Date(), 'yyyy')
  );

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [b, wo, p, c, cfg] = await Promise.all([
          fetchBudgets(),
          fetchWorkOrders(),
          fetchPayments(),
          fetchClients(),
          fetchConfig()
        ]);
        setBudgets(b);
        setWorkOrders(wo);
        setPayments(p);
        setClients(c);
        setConfig(cfg);
      } catch (error) {
        console.error("Error loading reports data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Persist filters
  useEffect(() => {
    localStorage.setItem('reports_period', period);
    localStorage.setItem('reports_month', selectedMonth);
    localStorage.setItem('reports_year', selectedYear);
  }, [period, selectedMonth, selectedYear]);
  const parseLocalDate = (dateString: string) => {
    if (!dateString) return new Date();
    // Si es un ISO string completo, extraemos solo la parte de la fecha
    const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Filtered Data
  const filteredData = useMemo(() => {
    const monthIdx = months.indexOf(selectedMonth);
    const yearNum = parseInt(selectedYear);

    const filterByDate = (rawDate: any) => {
      if (!rawDate) return false;
      try {
        const dateStr = formatFirebaseDate(rawDate);
        const localDate = parseLocalDate(dateStr);
        if (period === 'anual') {
          return localDate.getFullYear() === yearNum;
        } else {
          return localDate.getFullYear() === yearNum && localDate.getMonth() === monthIdx;
        }
      } catch (e) {
        return false;
      }
    };

    return {
      budgets: budgets.filter(b => filterByDate(b.date || b.startDate || b.createdAt)),
      workOrders: workOrders.filter(wo => filterByDate(wo.createdAt || wo.startDate || '')),
      payments: payments.filter(p => filterByDate(p.date || p.createdAt)),
    };
  }, [budgets, workOrders, payments, period, selectedMonth, selectedYear]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    // Only count approved/finished/cobrado budgets for financial metrics
    const relevantBudgets = filteredData.budgets.filter(b => 
      ['aprobado', 'ejecucion', 'finalizado', 'cobrado'].includes(b.status)
    );

    let moTotal = 0;
    let structureTotal = 0;
    let transportTotal = 0;
    let guarantee = 0;
    let minWithoutMargin = 0;
    let marginEur = 0;
    let materialsFactured = 0;
    let subtotal = 0;
    let iva = 0;
    let total = 0;

    relevantBudgets.forEach(b => {
      let calc = b.calculation;
      if (!calc && config) {
        const client = clients.find(c => c.id === b.clientId || c.name === b.clientId);
        calc = calculateBudget(b.phases, b.materials, config, client?.zone || 1, b.marginPct);
      }

      // Fallback a 0 para evitar NaN o undefined, asegurando conversión a número
      moTotal += Number(calc?.moTotal || 0);
      structureTotal += Number(calc?.structureTotal || 0);
      transportTotal += Number(calc?.transportTotal || 0);
      guarantee += Number(calc?.guarantee || 0);
      minWithoutMargin += Number(calc?.minWithoutMargin || 0);
      marginEur += Number(calc?.marginEur || 0);
      materialsFactured += Number(calc?.materialsFactured || 0);
      subtotal += Number(calc?.subtotal || 0);
      iva += Number(calc?.iva || 0);
      // Priorizar el total calculado, pero usar b.total como fallback si calc no existe
      total += Number(calc?.total || b.total || 0);
    });

    const totalCobrado = filteredData.payments
      .filter(p => p.status === 'cobrado')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);

    const ticketPromedio = relevantBudgets.length > 0 ? total / relevantBudgets.length : 0;

    return {
      moTotal,
      structureTotal,
      transportTotal,
      guarantee,
      minWithoutMargin,
      marginEur,
      materialsFactured,
      subtotal,
      iva,
      total,
      totalCobrado,
      ticketPromedio,
      count: relevantBudgets.length
    };
  }, [filteredData.budgets, filteredData.payments, config, clients]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    // Zonas
    const zonesMap: Record<string, number> = {};
    filteredData.budgets.forEach(b => {
      const client = clients.find(c => c.id === b.clientId || c.name === b.clientId);
      const zoneName = client ? `Zona ${client.zone}` : 'Sin Zona';
      zonesMap[zoneName] = (zonesMap[zoneName] || 0) + 1;
    });
    const zonesData = Object.entries(zonesMap).map(([name, value]) => ({ name, value }));

    // Verticals
    const verticalsMap: Record<string, number> = { Hogar: 0, Industria: 0 };
    filteredData.budgets.forEach(b => {
      const vertical = b.clientVertical || 'hogar';
      const label = vertical === 'hogar' ? 'Hogar' : 'Industria';
      verticalsMap[label]++;
    });
    const verticalsData = Object.entries(verticalsMap).map(([name, value]) => ({ name, value }));

    // Roles
    let oficiales = 0;
    let ayudantes = 0;
    filteredData.budgets.forEach(b => {
      b.phases.forEach(p => {
        p.labor.forEach(l => {
          if (l.role === 'oficial') oficiales += l.count;
          else ayudantes += l.count;
        });
      });
    });
    const rolesData = [
      { name: 'Oficiales', value: oficiales },
      { name: 'Ayudantes', value: ayudantes }
    ];

    // Volumen (OTs por mes)
    const volumeMap: Record<string, number> = {};
    months.forEach(m => volumeMap[m.substring(0, 3)] = 0);
    
    const allWorkOrders = workOrders.filter(wo => {
      try {
        const localDate = parseLocalDate(wo.createdAt || wo.startDate || '');
        return localDate.getFullYear() === parseInt(selectedYear);
      } catch (e) {
        return false;
      }
    });

    allWorkOrders.forEach(wo => {
      try {
        const localDate = parseLocalDate(wo.createdAt || wo.startDate || '');
        const monthLabel = months[localDate.getMonth()].substring(0, 3);
        volumeMap[monthLabel]++;
      } catch (e) {}
    });
    const volumeData = Object.entries(volumeMap).map(([name, value]) => ({ name, value }));

    // Rendimiento (Ranking empleados)
    const performanceMap: Record<string, number> = {};
    filteredData.workOrders.forEach(wo => {
      wo.assignedTo?.forEach(emp => {
        performanceMap[emp] = (performanceMap[emp] || 0) + 1;
      });
    });
    const performanceData = Object.entries(performanceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Finanzas (Estado cobros y Métodos de pago)
    const statusMap: Record<string, number> = { Pendiente: 0, Cobrado: 0, Parcial: 0 };
    const methodMap: Record<string, number> = { Transferencia: 0, Efectivo: 0, Tarjeta: 0 };

    filteredData.payments.forEach(p => {
      const status = p.status === 'pendiente' ? 'Pendiente' : p.status === 'cobrado' ? 'Cobrado' : 'Parcial';
      statusMap[status] += Number(p.amount || 0);
      
      if (p.method) {
        const method = p.method.charAt(0).toUpperCase() + p.method.slice(1);
        methodMap[method] = (methodMap[method] || 0) + Number(p.amount || 0);
      }
    });

    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    const methodData = Object.entries(methodMap).map(([name, value]) => ({ name, value }));

    return {
      zonesData,
      verticalsData,
      rolesData,
      volumeData,
      performanceData,
      statusData,
      methodData
    };
  }, [filteredData, clients, workOrders, selectedYear]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#FF4D00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const metricCards = [
    { label: 'Mano de Obra', value: metrics.moTotal, icon: Users, color: 'orange' },
    { label: 'Estructura', value: metrics.structureTotal, icon: Briefcase, color: 'blue', special: true },
    { label: 'Traslados', value: metrics.transportTotal, icon: Truck, color: 'blue' },
    { label: 'Garantía', value: metrics.guarantee, icon: ShieldCheck, color: 'blue' },
    { label: 'Mínimo sin margen', value: metrics.minWithoutMargin, icon: Calculator, color: 'neutral' },
    { label: 'Margen de ganancia', value: metrics.marginEur, icon: TrendingUp, color: 'green' },
    { label: 'Materiales', value: metrics.materialsFactured, icon: Package, color: 'orange' },
    { label: 'Subtotal', value: metrics.subtotal, icon: Euro, color: 'neutral' },
    { label: 'I.V.A', value: metrics.iva, icon: Receipt, color: 'neutral' },
    { label: 'Total Facturado', value: metrics.total, icon: CreditCard, color: 'green' },
    { label: 'Total Cobrado', value: metrics.totalCobrado, icon: CheckCircle2, color: 'green' },
    { label: 'Ticket Promedio', value: metrics.ticketPromedio, icon: TrendingUp, color: 'orange' },
  ];

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Dashboard de Reportes</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Análisis de rendimiento y rentabilidad en tiempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white dark:bg-neutral-900 rounded-2xl p-1 border border-neutral-100 dark:border-neutral-800 shadow-sm">
            <button 
              onClick={() => setPeriod('mensual')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                period === 'mensual' ? "bg-[#FF4D00] text-white shadow-lg shadow-[#FF4D00]/20" : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              )}
            >
              Mensual
            </button>
            <button 
              onClick={() => setPeriod('anual')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                period === 'anual' ? "bg-[#FF4D00] text-white shadow-lg shadow-[#FF4D00]/20" : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              )}
            >
              Anual
            </button>
          </div>

          {period === 'mensual' && (
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="kraken-input min-w-[140px]"
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="kraken-input min-w-[100px]"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <button className="kraken-btn flex items-center gap-2">
            <Download size={18} />
            <span>Exportar</span>
          </button>
        </div>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          const isEstructuraTarget = metric.special && metric.value >= 620;
          
          return (
            <div 
              key={index} 
              className={cn(
                "kraken-card p-6 flex flex-col gap-4 transition-all duration-500",
                isEstructuraTarget 
                  ? "bg-green-500 dark:bg-green-600 text-white border-transparent shadow-xl shadow-green-500/20" 
                  : "hover:border-[#FF4D00]/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn(
                  "p-2.5 rounded-xl",
                  isEstructuraTarget ? "bg-white/20" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                )}>
                  <Icon size={20} />
                </div>
                {metric.special && (
                  <div className={cn(
                    "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter",
                    isEstructuraTarget ? "bg-white/20 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                  )}>
                    Punto de Equilibrio: 620€
                  </div>
                )}
              </div>
              <div>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  isEstructuraTarget ? "text-white/80" : "text-neutral-400 dark:text-neutral-500"
                )}>
                  {metric.label}
                </p>
                <h3 className="text-2xl font-black mt-1 tracking-tight">
                  {metric.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analysis Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#FF4D00]/10 text-[#FF4D00] rounded-xl">
            <TrendingUp size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight dark:text-white">Estadísticas para Toma de Decisiones</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* Zonas */}
          <div className="kraken-card p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
              <MapPin size={18} className="text-[#FF4D00]" />
              Distribución por Zonas
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.zonesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.zonesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Verticals */}
          <div className="kraken-card p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
              <Building2 size={18} className="text-[#FF4D00]" />
              Hogar vs Industria
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.verticalsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#f0f0f0'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#999' : '#666', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#999' : '#666', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: isDarkMode ? '#262626' : '#f8f8f8' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                    {chartData.verticalsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#FF4D00' : '#2B2D42'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Roles */}
          <div className="kraken-card p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
              <UserPlus size={18} className="text-[#FF4D00]" />
              Oficiales vs Ayudantes
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.rolesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.rolesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#FF4D00' : '#8D99AE'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Volumen */}
          <div className="lg:col-span-2 kraken-card p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
              <BarChart3 size={18} className="text-[#FF4D00]" />
              Volumen de Órdenes de Trabajo por Mes
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.volumeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#f0f0f0'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#999' : '#666', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#999' : '#666', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: isDarkMode ? '#262626' : '#f8f8f8' }} />
                  <Bar dataKey="value" fill="#FF4D00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rendimiento */}
          <div className="kraken-card p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
              <Users size={18} className="text-[#FF4D00]" />
              Ranking de Empleados
            </h3>
            <div className="space-y-6">
              {chartData.performanceData.length > 0 ? chartData.performanceData.map((emp, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                      {i + 1}
                    </div>
                    <span className="text-sm font-bold dark:text-white">{emp.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#FF4D00]">{emp.value}</span>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">OTs</span>
                  </div>
                </div>
              )) : (
                <p className="text-center text-neutral-400 py-10">No hay datos de asignación</p>
              )}
            </div>
          </div>

          {/* Finanzas */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="kraken-card p-8">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
                <Euro size={18} className="text-[#FF4D00]" />
                Estado de Cobros (€)
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#8D99AE' : index === 1 ? '#4CAF50' : '#FFC107'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toLocaleString('de-DE')} €`} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="kraken-card p-8">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
                <CreditCard size={18} className="text-[#FF4D00]" />
                Métodos de Pago (€)
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.methodData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#333' : '#f0f0f0'} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#999' : '#666', fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#999' : '#666', fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString('de-DE')} €`} />
                    <Bar dataKey="value" fill="#FF4D00" radius={[0, 4, 4, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
