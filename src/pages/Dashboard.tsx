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
  Wrench,
  Calculator
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

const StatCard = ({ title, value, icon: Icon, trend, color = 'orange', subtitle }: any) => {
  const colorClasses: Record<string, string> = {
    orange: 'bg-kraken-orange/10 text-kraken-orange',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    neutral: 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };

  return (
    <div className="kraken-card p-6 flex flex-col justify-between h-full min-h-[175px] gap-2">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className={cn("p-2.5 rounded-xl", colorClasses[color] || colorClasses.orange)}>
            <Icon size={20} />
          </div>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-kraken-orange/10 text-kraken-orange'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.15em] truncate" title={title}>{title}</p>
        <h3 className="text-lg sm:text-xl xl:text-2xl font-black mt-1 tracking-tight text-neutral-900 dark:text-white truncate" title={value}>{value}</h3>
      </div>
      {subtitle ? (
        <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-1 leading-normal border-t border-neutral-100 dark:border-neutral-800/60 pt-2 min-h-[36px] line-clamp-2">
          {subtitle}
        </p>
      ) : (
        <div className="h-[36px] mt-1 border-t border-transparent pt-2" />
      )}
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
    totalFacturado: 0,
    totalBudgets: 0,
    totalBudgetsAmount: 0,
    approvedBudgetsCount: 0,
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

  // Simulator states
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [calcTotalInput, setCalcTotalInput] = React.useState<string>('1480');
  const [calcMargin, setCalcMargin] = React.useState<number>(30);
  const [calcIva, setCalcIva] = React.useState<number>(23);
  const [calcGuarantee, setCalcGuarantee] = React.useState<number>(8);
  
  // Weights for splitting service cost
  const [calcMoSplit, setCalcMoSplit] = React.useState<number>(53);
  const [calcStructureSplit, setCalcStructureSplit] = React.useState<number>(34);
  const [calcTransportSplit, setCalcTransportSplit] = React.useState<number>(13);

  React.useEffect(() => {
    if (config) {
      if (config.iva !== undefined) setCalcIva(Math.round(config.iva * 100));
      if (config.guaranteePct !== undefined) setCalcGuarantee(Math.round(config.guaranteePct * 100));
    }
  }, [config]);

  const simulationResult = React.useMemo(() => {
    const totalInput = parseFloat(calcTotalInput) || 0;
    if (totalInput <= 0) return null;

    // 1. IVA
    const ivaPct = calcIva / 100;
    const subtotal = totalInput / (1 + ivaPct);
    const ivaVal = totalInput - subtotal;

    // 2. Margen (Markup)
    const marginPct = calcMargin / 100;
    const minWithoutMargin = subtotal / (1 + marginPct);
    const marginVal = subtotal - minWithoutMargin;

    // 3. Garantía
    const guaranteePct = calcGuarantee / 100;
    const costBeforeGuarantee = minWithoutMargin / (1 + guaranteePct);
    const guaranteeVal = minWithoutMargin - costBeforeGuarantee;

    // 4. Split Costo Servicio (MO, Estructura, Traslado)
    const totalSplitWeights = calcMoSplit + calcStructureSplit + calcTransportSplit;
    const moWeight = totalSplitWeights > 0 ? (calcMoSplit / totalSplitWeights) : 0;
    const structureWeight = totalSplitWeights > 0 ? (calcStructureSplit / totalSplitWeights) : 0;
    const transportWeight = totalSplitWeights > 0 ? (calcTransportSplit / totalSplitWeights) : 0;

    const moVal = costBeforeGuarantee * moWeight;
    const structureVal = costBeforeGuarantee * structureWeight;
    const transportVal = costBeforeGuarantee * transportWeight;

    return {
      total: totalInput,
      subtotal,
      iva: ivaVal,
      margin: marginVal,
      minWithoutMargin,
      guarantee: guaranteeVal,
      costBeforeGuarantee,
      mo: moVal,
      structure: structureVal,
      transport: transportVal
    };
  }, [calcTotalInput, calcMargin, calcIva, calcGuarantee, calcMoSplit, calcStructureSplit, calcTransportSplit]);

  // Chart variable selection
  const [barChartVariable, setBarChartVariable] = React.useState<'total' | 'aprobado' | 'profit'>('total');
  const [pieChartVariable, setPieChartVariable] = React.useState<'vertical' | 'status'>('vertical');

  // Widget visibility state
  const [visibleWidgets, setVisibleWidgets] = React.useState<Record<string, boolean>>({
    total_facturado: true,
    facturado_con_iva: true,
    facturado_sin_iva: true,
    presupuestos_cargados: true,
    presupuestos: true,
    aprobacion: true,
    clientes: true,
    iva: true,
    ganancia: true,
    gastos_estructura: true,
    gastos_mo: true,
    presupuestos_enviados: true,
    presupuestos_finalizados: true,
    presupuestos_borradores: true,
    presupuestos_rechazados: true,
    presupuestos_ejecucion: true,
    presupuestos_cobrados: true,
    porcentaje_ganancia_neta: true,
    ventas_chart: true,
    verticales_chart: true,
    ordenes_recientes: true,
    cobros_proximos: true
  });

  // Card slot assignments
  const [cardSlots, setCardSlots] = React.useState([
    'total_facturado', 'facturado_con_iva', 'facturado_sin_iva', 'presupuestos_cargados', 
    'presupuestos', 'aprobacion', 'clientes', 'iva', 'ganancia', 'porcentaje_ganancia_neta',
    'presupuestos_borradores', 'presupuestos_enviados', 'presupuestos_ejecucion', 
    'presupuestos_finalizados', 'presupuestos_cobrados', 'presupuestos_rechazados', 
    'gastos_estructura'
  ]);

  const allMetrics = [
    { id: 'total_facturado', label: 'Total Facturado', icon: Euro, color: 'green' },
    { id: 'facturado_con_iva', label: 'Total Facturado con IVA', icon: Euro, color: 'orange' },
    { id: 'facturado_sin_iva', label: 'Total Facturado sin IVA', icon: Euro, color: 'orange' },
    { id: 'presupuestos_cargados', label: 'Presupuestos Cargados', icon: FileCheck, color: 'orange' },
    { id: 'presupuestos', label: 'Presupuestos Aprobados', icon: FileCheck, color: 'orange' },
    { id: 'aprobacion', label: 'Tasa Aprobación', icon: TrendingUp, color: 'orange' },
    { id: 'clientes', label: 'Clientes Únicos', icon: Users, color: 'orange' },
    { id: 'iva', label: 'Total IVA', icon: Euro, color: 'blue' },
    { id: 'ganancia', label: 'Ganancia Neta', icon: TrendingUp, color: 'green' },
    { id: 'porcentaje_ganancia_neta', label: 'Porcentaje Ganancia Neta', icon: TrendingUp, color: 'green' },
    { id: 'presupuestos_borradores', label: 'Presupuestos Borrador', icon: FileCheck, color: 'neutral' },
    { id: 'presupuestos_enviados', label: 'Presupuestos Enviados', icon: Clock, color: 'blue' },
    { id: 'presupuestos_ejecucion', label: 'Presupuestos en Ejecución', icon: Wrench, color: 'orange' },
    { id: 'presupuestos_finalizados', label: 'Presupuestos Finalizados', icon: CheckCircle2, color: 'green' },
    { id: 'presupuestos_cobrados', label: 'Presupuestos Cobrados', icon: Euro, color: 'green' },
    { id: 'presupuestos_rechazados', label: 'Presupuestos Rechazados', icon: AlertCircle, color: 'red' },
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

  const budgetStatusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      borrador: 0,
      enviado: 0,
      aprobado: 0,
      ejecucion: 0,
      finalizado: 0,
      cobrado: 0,
      rechazado: 0
    };
    
    filteredBudgets.forEach(b => {
      const status = (b.status || 'borrador').toLowerCase();
      if (counts[status] !== undefined) {
        counts[status]++;
      } else {
        counts[status] = (counts[status] || 0) + 1;
      }
    });
    
    return counts;
  }, [filteredBudgets]);

  const budgetStatusText = React.useMemo(() => {
    const parts: string[] = [];
    const statusNames: Record<string, string> = {
      borrador: 'borrador',
      enviado: 'enviados',
      aprobado: 'aprobados',
      ejecucion: 'en ejecución',
      finalizado: 'en finalizado',
      cobrado: 'cobrados',
      rechazado: 'rechazados'
    };

    const displayOrder = ['aprobado', 'enviado', 'finalizado', 'borrador', 'ejecucion', 'cobrado', 'rechazado'];
    
    displayOrder.forEach(status => {
      const count = budgetStatusCounts[status] || 0;
      if (count > 0) {
        parts.push(`${count} ${statusNames[status] || status}`);
      }
    });

    if (parts.length === 0) return 'Sin presupuestos';
    
    let text = '';
    if (parts.length === 1) {
      text = parts[0];
    } else if (parts.length === 2) {
      text = `${parts[0]} y ${parts[1]}`;
    } else {
      text = `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
    }

    return `De los cuales: ${text}`;
  }, [budgetStatusCounts]);

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
      totalFacturado: totalRevenueConIVA + totalRevenueSinIVA,
      totalBudgets: filteredBudgets.length,
      totalBudgetsAmount: filteredBudgets.reduce((acc, b) => acc + (Number(b.total || b.calculation?.total || 0)), 0),
      approvedBudgetsCount: approvedBudgets.length,
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
      case 'total_facturado': return metrics.totalFacturado.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      case 'facturado_con_iva': return metrics.totalFacturadoConIVA.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      case 'facturado_sin_iva': return metrics.totalFacturadoSinIVA.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      case 'presupuestos_cargados': return metrics.totalBudgets.toString();
      case 'presupuestos': return metrics.approvedBudgetsCount.toString();
      case 'aprobacion': return metrics.approvalRate.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
      case 'clientes': return metrics.uniqueClients.toString();
      case 'iva': return metrics.totalIVA.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      case 'ganancia': return metrics.netProfit.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      case 'gastos_estructura': return metrics.structureExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      case 'gastos_mo': return metrics.laborExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      case 'gastos_totales': return metrics.totalExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      case 'margen_promedio': return (metrics.totalFacturadoConIVA > 0 ? (metrics.netProfit / metrics.totalFacturadoConIVA) * 100 : 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
      case 'presupuestos_enviados': return (budgetStatusCounts.enviado || 0).toString();
      case 'presupuestos_finalizados': return (budgetStatusCounts.finalizado || 0).toString();
      case 'presupuestos_borradores': return (budgetStatusCounts.borrador || 0).toString();
      case 'presupuestos_rechazados': return (budgetStatusCounts.rechazado || 0).toString();
      case 'presupuestos_ejecucion': return (budgetStatusCounts.ejecucion || 0).toString();
      case 'presupuestos_cobrados': return (budgetStatusCounts.cobrado || 0).toString();
      case 'porcentaje_ganancia_neta': {
        const pct = metrics.totalFacturado > 0 ? (metrics.netProfit / metrics.totalFacturado) * 100 : 0;
        return pct.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
      }
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
            onClick={() => setIsCalculatorOpen(true)}
            className="h-12 w-12 flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-kraken-orange transition-all"
            title="Simulador de Presupuesto Invertido"
          >
            <Calculator size={20} />
          </button>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {cardSlots.map((metricId, index) => {
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
              subtitle={metricId === 'presupuestos_cargados' ? budgetStatusText : undefined}
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

      {/* Simulator Modal */}
      {isCalculatorOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800 my-8">
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-kraken-orange/10 text-kraken-orange rounded-xl">
                  <Calculator size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight dark:text-white">Simulador de Presupuesto Invertido</h2>
                  <p className="text-xs font-medium text-neutral-500">Desglosa un cobro total recibido en sus componentes operativos.</p>
                </div>
              </div>
              <button onClick={() => setIsCalculatorOpen(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
              {/* Left Column: Inputs & Controls */}
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-2">Importe Total Cobrado (€)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-neutral-400">€</span>
                    <input 
                      type="number" 
                      value={calcTotalInput}
                      onChange={(e) => setCalcTotalInput(e.target.value)}
                      placeholder="Ej: 1480"
                      className="kraken-input w-full pl-10 pr-4 !h-14 text-lg font-black"
                    />
                  </div>
                </div>

                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Ajustes de Distribución</h4>
                  
                  {/* Margin Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-neutral-500">Margen de Ganancia</span>
                      <span className="text-kraken-orange">{calcMargin}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={calcMargin}
                      onChange={(e) => setCalcMargin(parseInt(e.target.value))}
                      className="w-full accent-kraken-orange h-1.5 bg-neutral-100 dark:bg-neutral-850 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* IVA Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-neutral-500">IVA</span>
                      <span className="text-blue-500">{calcIva}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="30" 
                      value={calcIva}
                      onChange={(e) => setCalcIva(parseInt(e.target.value))}
                      className="w-full accent-blue-500 h-1.5 bg-neutral-100 dark:bg-neutral-850 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Guarantee Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-neutral-500">Garantía</span>
                      <span className="text-amber-500">{calcGuarantee}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="20" 
                      value={calcGuarantee}
                      onChange={(e) => setCalcGuarantee(parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-neutral-100 dark:bg-neutral-850 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Peso Costos Operativos (Fórmula)</h4>
                  
                  {/* Labor Split */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-neutral-500">Mano de Obra</span>
                      <span className="text-neutral-800 dark:text-neutral-200">{calcMoSplit}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="80" 
                      value={calcMoSplit}
                      onChange={(e) => setCalcMoSplit(parseInt(e.target.value))}
                      className="w-full accent-neutral-800 dark:accent-neutral-200 h-1.5 bg-neutral-100 dark:bg-neutral-850 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Structure Split */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-neutral-500">Estructura</span>
                      <span className="text-neutral-800 dark:text-neutral-200">{calcStructureSplit}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="80" 
                      value={calcStructureSplit}
                      onChange={(e) => setCalcStructureSplit(parseInt(e.target.value))}
                      className="w-full accent-neutral-800 dark:accent-neutral-200 h-1.5 bg-neutral-100 dark:bg-neutral-850 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Transport Split */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-neutral-500">Traslado</span>
                      <span className="text-neutral-800 dark:text-neutral-200">{calcTransportSplit}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="50" 
                      value={calcTransportSplit}
                      onChange={(e) => setCalcTransportSplit(parseInt(e.target.value))}
                      className="w-full accent-neutral-800 dark:accent-neutral-200 h-1.5 bg-neutral-100 dark:bg-neutral-850 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Breakdown & Charts */}
              <div className="bg-neutral-50 dark:bg-neutral-950 rounded-[24px] p-6 border border-neutral-150 dark:border-neutral-850 flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white mb-4 uppercase tracking-wider">Resumen de Distribución</h3>
                  
                  {simulationResult ? (
                    <div className="space-y-4">
                      {/* Operational Costs */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 font-medium">Mano de Obra</span>
                          <span className="font-bold dark:text-white">{simulationResult.mo.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 font-medium">Estructura</span>
                          <span className="font-bold dark:text-white">{simulationResult.structure.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 font-medium">Traslado</span>
                          <span className="font-bold dark:text-white">{simulationResult.transport.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </div>
                        <div className="flex justify-between text-xs border-b border-dashed border-neutral-200 dark:border-neutral-800 pb-2">
                          <span className="text-neutral-500 font-medium">Garantía ({calcGuarantee}%)</span>
                          <span className="font-bold dark:text-white">{simulationResult.guarantee.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </div>
                      </div>

                      {/* Min without margin */}
                      <div className="flex justify-between text-xs font-bold border-b border-dashed border-neutral-200 dark:border-neutral-800 pb-2">
                        <span className="text-neutral-500 uppercase tracking-wider">Mínimo sin Margen</span>
                        <span className="dark:text-white">{simulationResult.minWithoutMargin.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                      </div>

                      {/* Margin */}
                      <div className="flex justify-between text-xs font-bold text-kraken-orange border-b border-dashed border-neutral-200 dark:border-neutral-800 pb-2">
                        <span className="uppercase tracking-wider">Margen ({calcMargin}%)</span>
                        <span>+{simulationResult.margin.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                      </div>

                      {/* Subtotal */}
                      <div className="flex justify-between text-xs font-bold border-b border-neutral-200 dark:border-neutral-800 pb-2">
                        <span className="text-neutral-500">Subtotal</span>
                        <span className="dark:text-white">{simulationResult.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                      </div>

                      {/* IVA */}
                      <div className="flex justify-between text-xs font-bold border-b border-neutral-200 dark:border-neutral-800 pb-2">
                        <span className="text-neutral-500">IVA ({calcIva}%)</span>
                        <span className="dark:text-white">{simulationResult.iva.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                      </div>

                      {/* Total General */}
                      <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 mt-4">
                        <span className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">Total General</span>
                        <span className="text-xl font-black text-kraken-orange">{simulationResult.total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-center text-neutral-400 text-xs">
                      Ingresa un importe mayor a cero para ver el desglose simulado.
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 italic mt-6 border-t border-neutral-100 dark:border-neutral-850 pt-4 leading-relaxed font-sans">
                  * Cálculos simulados de forma invertida sobre la base de costos proporcionales. Los valores son estimativos para la distribución interna del dinero.
                </div>
              </div>
            </div>

            <div className="p-8 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
              <button 
                onClick={() => setIsCalculatorOpen(false)}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:opacity-90 transition-all"
              >
                Cerrar Simulador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
