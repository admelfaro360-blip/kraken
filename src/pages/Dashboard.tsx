import React from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  FileCheck, 
  Clock, 
  Euro, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Wallet,
  Settings2,
  Layout,
  Eye,
  EyeOff,
  X,
  Wrench
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useTheme } from '../lib/ThemeContext';
import { Link } from 'react-router-dom';
import { formatFirebaseDate } from '../lib/utils';
import { 
  getStoredBudgets, 
  getStoredClients, 
  getStoredPayments, 
  getStoredWorkOrders, 
  getStoredExpenses,
  fetchConfig,
  fetchMaintenances
} from '../lib/storage';
import { calculateBudget } from '../lib/calculator';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const data = [
  { name: 'Ene', total: 4000, aprobado: 2400 },
  { name: 'Feb', total: 3000, aprobado: 1398 },
  { name: 'Mar', total: 2000, aprobado: 9800 },
  { name: 'Abr', total: 2780, aprobado: 3908 },
  { name: 'May', total: 1890, aprobado: 4800 },
  { name: 'Jun', total: 2390, aprobado: 3800 },
];

const pieData = [
  { name: 'Hogar', value: 400 },
  { name: 'Industria', value: 300 },
];

const COLORS = ['#FF4D00', '#2B2D42'];

const StatCard = ({ title, value, icon: Icon, trend, color = 'orange' }: any) => {
  const colorClasses: Record<string, string> = {
    orange: 'bg-kraken-orange/10 text-kraken-orange',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    neutral: 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
  };

  return (
    <div className="kraken-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className={cn("p-3 rounded-2xl", colorClasses[color] || colorClasses.orange)}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-kraken-orange/10 text-kraken-orange'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.15em]">{title}</p>
        <h3 className="text-3xl font-black mt-1 tracking-tight text-neutral-900 dark:text-white">{value}</h3>
      </div>
    </div>
  );
};

function Dashboard() {
  const { isDarkMode } = useTheme();
  const monthsList = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const currentMonthName = monthsList[new Date().getMonth()];
  const currentYear = format(new Date(), 'yyyy');

  const [period, setPeriod] = React.useState(currentMonthName);
  const [year, setYear] = React.useState(currentYear);
  const [isAccumulated, setIsAccumulated] = React.useState(false);
  const [isCustomizing, setIsCustomizing] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  
  // Real data state
  const [budgets, setBudgets] = React.useState<any[]>([]);
  const [clients, setClients] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [workOrders, setWorkOrders] = React.useState<any[]>([]);
  const [expenses, setExpenses] = React.useState<any[]>([]);
  const [maintenances, setMaintenances] = React.useState<any[]>([]);
  const [config, setConfig] = React.useState<any>(null);

  const [metrics, setMetrics] = React.useState({
    totalFacturadoConIVA: 0,
    totalFacturadoSinIVA: 0,
    totalBudgets: 0,
    approvalRate: 0,
    uniqueClients: 0,
    totalIVA: 0,
    netProfit: 0,
    structureExpenses: 0,
    laborExpenses: 0,
    totalExpenses: 0
  });

  React.useEffect(() => {
    setIsMounted(true);
    const loadData = async () => {
      setLoading(true);
      try {
        const [b, c, p, wo, e, conf, m] = await Promise.all([
          getStoredBudgets(),
          getStoredClients(),
          getStoredPayments(),
          getStoredWorkOrders(),
          getStoredExpenses(),
          fetchConfig(),
          fetchMaintenances()
        ]);
        setBudgets(b);
        setClients(c);
        setPayments(p);
        setWorkOrders(wo);
        setExpenses(e);
        setConfig(conf);
        setMaintenances(m || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const alertMaintenances = React.useMemo(() => {
    const today = new Date();
    const endOfThisMonth = endOfMonth(today);

    return maintenances.filter(m => {
      if (m.status === 'Completado' || m.status === 'Realizado' || m.status === 'realizado' || m.status === 'completado') return false;
      if (!m.nextRevisionDate) return false;
      
      try {
        const [year, month, day] = m.nextRevisionDate.split('-').map(Number);
        const revisionDate = new Date(year, month - 1, day || 15);
        return revisionDate <= endOfThisMonth;
      } catch (e) {
        return false;
      }
    });
  }, [maintenances]);

  // Chart variable selection
  const [barChartVariable, setBarChartVariable] = React.useState<'total' | 'aprobado' | 'profit'>('total');
  const [pieChartVariable, setPieChartVariable] = React.useState<'vertical' | 'status'>('vertical');

  // Widget visibility state
  const [visibleWidgets, setVisibleWidgets] = React.useState({
    facturado_con_iva: true,
    facturado_sin_iva: true,
    presupuestos: true,
    aprobacion: true,
    clientes: true,
    iva: true,
    ganancia: true,
    gastos_estructura: true,
    gastos_mo: true,
    ventas_chart: true,
    verticales_chart: true,
    ordenes_recientes: true,
    cobros_proximos: true
  });

  // Card slot assignments
  const [cardSlots, setCardSlots] = React.useState([
    'facturado_con_iva', 'facturado_sin_iva', 'presupuestos', 'aprobacion', 
    'clientes', 'iva', 'ganancia', 'gastos_estructura'
  ]);

  const allMetrics = [
    { id: 'facturado_con_iva', label: 'Total Facturado con IVA', icon: Euro, color: 'orange' },
    { id: 'facturado_sin_iva', label: 'Total Facturado sin IVA', icon: Euro, color: 'orange' },
    { id: 'presupuestos', label: 'Presupuestos', icon: FileCheck, color: 'orange' },
    { id: 'aprobacion', label: 'Tasa Aprobación', icon: TrendingUp, color: 'orange' },
    { id: 'clientes', label: 'Clientes Únicos', icon: Users, color: 'orange' },
    { id: 'iva', label: 'Total IVA', icon: Euro, color: 'blue' },
    { id: 'ganancia', label: 'Ganancia Neta', icon: TrendingUp, color: 'green' },
    { id: 'gastos_estructura', label: 'Gastos Estructura', icon: Wallet, color: 'amber' },
    { id: 'gastos_mo', label: 'Gastos Mano de Obra', icon: Users, color: 'neutral' },
    { id: 'gastos_totales', label: 'Gastos Totales', icon: TrendingDown, color: 'neutral' },
    { id: 'margen_promedio', label: 'Margen Promedio', icon: BarChart3, color: 'green' },
  ];

  const allWidgets = [
    { id: 'ventas_chart', label: 'Gráfico de Ventas', category: 'Gráfico' },
    { id: 'verticales_chart', label: 'Gráfico de Verticales', category: 'Gráfico' },
    { id: 'ordenes_recientes', label: 'Órdenes Recientes', category: 'Lista' },
    { id: 'cobros_proximos', label: 'Próximos Cobros', category: 'Lista' },
  ];

  // Helper to get month index from name
  const getMonthIndex = React.useCallback((monthName: string) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months.indexOf(monthName);
  }, []);

  // Filter data based on period
  const filterByPeriod = React.useCallback((items: any[]) => {
    if (isAccumulated) return items;
    const monthIdx = getMonthIndex(period);
    const targetYear = parseInt(year);
    
    return items.filter(item => {
      const rawDate = item.date || item.createdAt;
      if (!rawDate) return false;
      const dateStr = formatFirebaseDate(rawDate);
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      return d.getUTCFullYear() === targetYear && d.getUTCMonth() === monthIdx;
    });
  }, [isAccumulated, period, year, getMonthIndex]);

  const filteredBudgets = React.useMemo(() => filterByPeriod(budgets), [filterByPeriod, budgets]);
  const filteredWorkOrders = React.useMemo(() => filterByPeriod(workOrders), [filterByPeriod, workOrders]);
  const filteredPayments = React.useMemo(() => filterByPeriod(payments), [filterByPeriod, payments]);
  const filteredExpenses = React.useMemo(() => filterByPeriod(expenses), [filterByPeriod, expenses]);

  React.useEffect(() => {
    if (loading || !config) return;

    const approvedBudgets = filteredBudgets.filter(b => 
      ['aprobado', 'ejecucion', 'finalizado', 'cobrado'].includes(b.status)
    );

    // Calculate all totals from approved budgets
    let totalRevenueConIVA = 0;
    let totalRevenueSinIVA = 0;
    let totalCalculatedIVA = 0;
    let totalEstimatedMargin = 0;
    let totalEstimatedStructureCost = 0;
    let totalEstimatedLaborCost = 0;

    approvedBudgets.forEach(b => {
      const client = clients.find(c => c.id === b.clientId || c.name === b.clientId);
      const zone = client ? client.zone : 1;
      // Prefer stored calculation if available to maintain historical consistency
      const calc = b.calculation || calculateBudget(b.phases, b.materials, config, zone, b.marginPct);
      
      const hasIVA = b.applyIVA !== false;
      
      // Use stored values if they exist, otherwise use calculation results
      const subtotal = Number(b.subtotal || calc.subtotal || 0);
      const iva = hasIVA ? Number(b.iva || calc.iva || (subtotal * config.iva)) : 0;
      const margin = Number(b.margin || calc.marginEur || 0);

      if (hasIVA) {
        totalRevenueConIVA += subtotal;
        totalCalculatedIVA += iva;
      } else {
        totalRevenueSinIVA += subtotal;
      }

      totalEstimatedMargin += margin;
      totalEstimatedStructureCost += calc.structureTotal;
      totalEstimatedLaborCost += calc.moTotal;
    });

    // Final Metrics
    setMetrics({
      totalFacturadoConIVA: totalRevenueConIVA,
      totalFacturadoSinIVA: totalRevenueSinIVA,
      totalBudgets: filteredBudgets.length,
      approvalRate: filteredBudgets.length > 0 ? (approvedBudgets.length / filteredBudgets.length) * 100 : 0,
      uniqueClients: new Set([...filteredBudgets.map(b => b.clientId), ...filteredPayments.map(p => p.clientId)]).size,
      totalIVA: totalCalculatedIVA,
      netProfit: totalEstimatedMargin,
      structureExpenses: totalEstimatedStructureCost,
      laborExpenses: totalEstimatedLaborCost,
      totalExpenses: filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0)
    });
  }, [filteredBudgets, filteredPayments, filteredExpenses, config, clients, loading]);

  const getMetricValue = (id: string) => {
    switch (id) {
      case 'facturado_con_iva': return metrics.totalFacturadoConIVA.toLocaleString('de-DE') + ' €';
      case 'facturado_sin_iva': return metrics.totalFacturadoSinIVA.toLocaleString('de-DE') + ' €';
      case 'presupuestos': return metrics.totalBudgets.toString();
      case 'aprobacion': return Math.round(metrics.approvalRate) + '%';
      case 'clientes': return metrics.uniqueClients.toString();
      case 'iva': return metrics.totalIVA.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' €';
      case 'ganancia': return metrics.netProfit.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' €';
      case 'gastos_estructura': return metrics.structureExpenses.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' €';
      case 'gastos_mo': return metrics.laborExpenses.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' €';
      case 'gastos_totales': return metrics.totalExpenses.toLocaleString('de-DE') + ' €';
      case 'margen_promedio': return metrics.totalFacturadoConIVA > 0 ? Math.round((metrics.netProfit / metrics.totalFacturadoConIVA) * 100) + '%' : '0%';
      default: return '0';
    }
  };

  // Chart Data Calculation
  const chartData = React.useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months.map((month, idx) => {
      const monthStart = startOfMonth(new Date(parseInt(year), idx));
      const monthEnd = endOfMonth(new Date(parseInt(year), idx));
      
      const mBudgets = budgets.filter(b => {
        const rawDate = b.date || b.startDate || b.createdAt;
        if (!rawDate) return false;
        const dateStr = formatFirebaseDate(rawDate);
        return isWithinInterval(parseISO(dateStr), { start: monthStart, end: monthEnd });
      });

      const mPayments = payments.filter(p => {
        const rawDate = p.date || p.createdAt;
        if (!rawDate) return false;
        const dateStr = formatFirebaseDate(rawDate);
        return isWithinInterval(parseISO(dateStr), { start: monthStart, end: monthEnd });
      });

      const total = mBudgets.reduce((acc, b) => acc + (b.total || 0), 0);
      const aprobado = mBudgets.filter(b => b.status === 'aprobado' || b.status === 'ejecucion' || b.status === 'finalizado').reduce((acc, b) => acc + (b.total || 0), 0);
      const profit = mPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

      return { name: month, total, aprobado, profit };
    });
  }, [budgets, payments, year]);

  const pieData = React.useMemo(() => [
    { name: 'Hogar', value: filteredBudgets.filter(b => b.vertical === 'hogar').length },
    { name: 'Industria', value: filteredBudgets.filter(b => b.vertical === 'industria').length },
  ], [filteredBudgets]);

  const statusPieData = React.useMemo(() => [
    { name: 'Pendientes', value: filteredBudgets.filter(b => b.status === 'pendiente').length },
    { name: 'En Ejecución', value: filteredBudgets.filter(b => b.status === 'ejecucion').length },
    { name: 'Finalizados', value: filteredBudgets.filter(b => b.status === 'finalizado').length },
  ], [filteredBudgets]);

  const recentOrders = React.useMemo(() => [...workOrders].sort((a, b) => {
    const dateA = new Date(formatFirebaseDate(a.createdAt || '')).getTime();
    const dateB = new Date(formatFirebaseDate(b.createdAt || '')).getTime();
    return dateB - dateA;
  }).slice(0, 3), [workOrders]);
  
  const upcomingPayments = React.useMemo(() => [...payments].filter(p => p.status === 'pendiente').sort((a, b) => {
    const dateA = new Date(formatFirebaseDate(a.dueDate || '')).getTime();
    const dateB = new Date(formatFirebaseDate(b.dueDate || '')).getTime();
    return dateA - dateB;
  }).slice(0, 3), [payments]);

  const getMetricTrend = (id: string) => {
    switch (id) {
      case 'facturado_con_iva': return 0;
      case 'facturado_sin_iva': return 0;
      case 'presupuestos': return 0;
      case 'aprobacion': return 0;
      case 'clientes': return 0;
      default: return undefined;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-kraken-orange border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-500 font-bold animate-pulse uppercase tracking-widest">Cargando Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Dashboard Operativo</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium tracking-tight">Bienvenido de nuevo, Administrador Kraken.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <button 
              onClick={() => setIsAccumulated(false)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                !isAccumulated ? "bg-kraken-orange text-white shadow-lg shadow-kraken-orange/20" : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              )}
            >
              Mensual
            </button>
            <button 
              onClick={() => setIsAccumulated(true)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                isAccumulated ? "bg-kraken-orange text-white shadow-lg shadow-kraken-orange/20" : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              )}
            >
              Acumulado
            </button>
          </div>

          <select 
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="kraken-input !h-12 !px-4 !w-auto text-sm"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          {!isAccumulated && (
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="kraken-input !h-12 !px-4 !w-auto text-sm"
            >
              <option value="Diciembre">Diciembre</option>
              <option value="Noviembre">Noviembre</option>
              <option value="Octubre">Octubre</option>
              <option value="Septiembre">Septiembre</option>
              <option value="Agosto">Agosto</option>
              <option value="Julio">Julio</option>
              <option value="Junio">Junio</option>
              <option value="Mayo">Mayo</option>
              <option value="Abril">Abril</option>
              <option value="Marzo">Marzo</option>
              <option value="Febrero">Febrero</option>
              <option value="Enero">Enero</option>
            </select>
          )}

          <button 
            onClick={() => setIsCustomizing(true)}
            className="h-12 w-12 flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-kraken-orange transition-all"
            title="Personalizar Tablero"
          >
            <Settings2 size={20} />
          </button>

          <Link to="/presupuestos/nuevo" className="kraken-btn !h-12 !px-6 text-sm">
            Nuevo Presupuesto
          </Link>
        </div>
      </header>

      {/* Mantenimiento Preventivo Alerts Card */}
      <div className={cn(
        "kraken-card p-6 border-l-4 transition-all shadow-sm",
        alertMaintenances.length > 0 
          ? "border-l-orange-500 border-neutral-200 dark:border-neutral-800 bg-orange-50/10 dark:bg-orange-950/5" 
          : "border-l-emerald-500 border-neutral-200 dark:border-neutral-800 bg-emerald-50/10 dark:bg-emerald-950/5"
      )}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl",
              alertMaintenances.length > 0 ? "bg-orange-500/10 text-orange-605 animate-pulse" : "bg-emerald-500/10 text-emerald-600"
            )}>
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white text-base">Mantenimiento Preventivo</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Alertas de revisiones periódicas planificadas</p>
            </div>
          </div>
          <span className={cn(
            "text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-1 rounded-full",
            alertMaintenances.length > 0 ? "bg-orange-100 text-orange-850 dark:bg-orange-900/45 dark:text-orange-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/45 dark:text-emerald-300"
          )}>
            {alertMaintenances.length > 0 ? `${alertMaintenances.length} REQUERIDOS` : "AL DÍA"}
          </span>
        </div>

        {alertMaintenances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {alertMaintenances.map((m) => {
              const formattedNextDate = m.nextRevisionDate ? format(parseISO(m.nextRevisionDate), "dd MMM, yyyy", { locale: es }) : 'No definida';
              return (
                <div key={m.id} className="bg-white dark:bg-neutral-900/50 border border-neutral-150 dark:border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-orange-200 dark:hover:border-orange-800/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-xs text-neutral-900 dark:text-white truncate max-w-[150px]">{m.clientData?.name}</span>
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded uppercase tracking-wider">Vence: {formattedNextDate}</span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 lines-clamp-1">{m.clientData?.address || 'Sin dirección'}</p>
                    {m.generalObservations && (
                      <p className="text-[10px] text-neutral-400 italic mt-1.5 truncate">" {m.generalObservations} "</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-50 dark:border-neutral-850 pt-2">
                    <span className="text-[10px] text-neutral-450 uppercase font-bold">Estado: {m.status || 'Pendiente'}</span>
                    <Link
                      to={`/mantenimiento/nuevo?id=${m.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-extrabold text-white bg-kraken-orange hover:bg-orange-600 transition-colors px-3 py-1.5 rounded-xl shadow-sm"
                    >
                      <Wrench size={12} />
                      <span>Iniciar Revisión</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/5 p-3 rounded-2xl">
            <CheckCircle2 size={16} />
            <span>Mantenimientos al día. Excelente trabajo coordinando preventivos.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardSlots.slice(0, 4).map((metricId, index) => {
          const metric = allMetrics.find(m => m.id === metricId);
          if (!metric || !visibleWidgets[metricId as keyof typeof visibleWidgets]) return null;
          return (
            <StatCard 
              key={`slot-${index}`}
              title={metric.label} 
              value={getMetricValue(metricId)} 
              icon={metric.icon} 
              trend={getMetricTrend(metricId)} 
              color={metric.color}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardSlots.slice(4, 8).map((metricId, index) => {
          const metric = allMetrics.find(m => m.id === metricId);
          if (!metric || !visibleWidgets[metricId as keyof typeof visibleWidgets]) return null;
          return (
            <StatCard 
              key={`slot-${index + 4}`}
              title={metric.label} 
              value={getMetricValue(metricId)} 
              icon={metric.icon} 
              trend={getMetricTrend(metricId)} 
              color={metric.color}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {visibleWidgets.ventas_chart && (
          <div className="lg:col-span-2 kraken-card p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight dark:text-white">Análisis Temporal</h3>
                <select 
                  value={barChartVariable}
                  onChange={(e) => setBarChartVariable(e.target.value as any)}
                  className="mt-1 bg-transparent text-xs font-bold text-kraken-orange uppercase tracking-widest outline-none"
                >
                  <option value="total">Variable: Presupuestado</option>
                  <option value="aprobado">Variable: Aprobado</option>
                  <option value="profit">Variable: Margen Estimado</option>
                </select>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-kraken-orange rounded-full" />
                  <span>{barChartVariable === 'total' ? 'Presupuestado' : barChartVariable === 'aprobado' ? 'Aprobado' : 'Margen'}</span>
                </div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#f0f0f0'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        backgroundColor: isDarkMode ? '#171717' : '#fff',
                        color: isDarkMode ? '#fff' : '#000'
                      }}
                      itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                      cursor={{ fill: isDarkMode ? '#262626' : '#f8f8f8' }}
                    />
                    <Bar dataKey={barChartVariable} fill="#FF4D00" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {visibleWidgets.verticales_chart && (
          <div className="kraken-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold tracking-tight dark:text-white">Distribución</h3>
              <select 
                value={pieChartVariable}
                onChange={(e) => setPieChartVariable(e.target.value as any)}
                className="bg-transparent text-[10px] font-bold text-kraken-orange uppercase tracking-widest outline-none"
              >
                <option value="vertical">Verticales</option>
                <option value="status">Estados</option>
              </select>
            </div>
            <div className="h-[250px] w-full">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartVariable === 'vertical' ? pieData : statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(pieChartVariable === 'vertical' ? pieData : statusPieData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 1 && isDarkMode ? '#fff' : COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        backgroundColor: isDarkMode ? '#171717' : '#fff',
                        color: isDarkMode ? '#fff' : '#000'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-4 mt-6">
              {(pieChartVariable === 'vertical' ? pieData : statusPieData).map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: i === 1 && isDarkMode ? '#fff' : COLORS[i] }} />
                    <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {visibleWidgets.ordenes_recientes && (
          <div className="kraken-card p-8">
            <h3 className="text-xl font-bold tracking-tight mb-6 dark:text-white">Órdenes de Trabajo Recientes</h3>
            <div className="space-y-4">
              {recentOrders.length > 0 ? recentOrders.map((ot) => (
                <div key={ot.id} className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold dark:text-white">{ot.task}</h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">{ot.clientName} • {ot.id}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {ot.status}
                  </span>
                </div>
              )) : (
                <p className="text-center text-neutral-500 py-4">No hay órdenes recientes</p>
              )}
            </div>
          </div>
        )}

        {visibleWidgets.cobros_proximos && (
          <div className="kraken-card p-8">
            <h3 className="text-xl font-bold tracking-tight mb-6 dark:text-white">Próximos Cobros</h3>
            <div className="space-y-4">
              {upcomingPayments.length > 0 ? upcomingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold dark:text-white">{payment.clientName}</h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">{payment.budgetId} • Vence {format(new Date(formatFirebaseDate(payment.dueDate)), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold dark:text-white">{payment.amount.toLocaleString('de-DE')} €</p>
                    <p className="text-[10px] font-bold text-kraken-orange uppercase tracking-widest">{payment.status}</p>
                  </div>
                </div>
              )) : (
                <p className="text-center text-neutral-500 py-4">No hay cobros pendientes</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customization Modal */}
      {isCustomizing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800">
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-kraken-orange/10 text-kraken-orange rounded-xl">
                  <Layout size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight dark:text-white">Configurar Tablero</h2>
                  <p className="text-xs font-medium text-neutral-500">Activa o desactiva los módulos que deseas ver.</p>
                </div>
              </div>
              <button onClick={() => setIsCustomizing(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Visibilidad de Módulos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allWidgets.map((widget) => (
                    <button
                      key={widget.id}
                      onClick={() => setVisibleWidgets(prev => ({ ...prev, [widget.id]: !prev[widget.id as keyof typeof prev] }))}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                        visibleWidgets[widget.id as keyof typeof visibleWidgets]
                          ? "bg-kraken-orange/5 border-kraken-orange/30 text-neutral-900 dark:text-white"
                          : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-700 text-neutral-400"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">{widget.category}</span>
                        <span className="text-sm font-bold">{widget.label}</span>
                      </div>
                      {visibleWidgets[widget.id as keyof typeof visibleWidgets] ? (
                        <Eye size={20} className="text-kraken-orange" />
                      ) : (
                        <EyeOff size={20} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Configuración de Tarjetas (Slots)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {cardSlots.map((slot, index) => (
                    <div key={index} className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Slot {index + 1}</label>
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
            </div>

            <div className="p-8 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
              <button 
                onClick={() => setIsCustomizing(false)}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:opacity-90 transition-all"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
