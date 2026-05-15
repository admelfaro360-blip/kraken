import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Wrench, 
  Users as UsersIcon, 
  Package, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  X,
  AlertCircle,
  CreditCard,
  Briefcase,
  Trophy,
  Target,
  Zap
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO, 
  startOfWeek, 
  endOfWeek,
  startOfYear,
  endOfYear,
  endOfDay,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameWeek
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { toast } from 'sonner';
import { Expense, Budget, WorkOrder } from '../types';
import { 
  fetchExpenses, 
  saveExpense, 
  deleteExpense, 
  fetchBudgets, 
  fetchUsers,
  fetchWorkOrders
} from '../lib/storage';
import { formatFirebaseDate } from '../lib/utils';

const CATEGORIES = ['Mano de Obra', 'Materiales', 'Combustible', 'Herramientas', 'Costos Fijos', 'Varios'] as const;
const FIXED_COST_SUB_CATEGORIES = [
  'Seguro de Accidentes',
  'Seguro de Vehículo',
  'Seguro Responsabilidad Civil',
  'Alquiler Local',
  'Suministros (Luz/Agua)',
  'Telefonía/Internet',
  'Asesoría/Gestoría',
  'Gestión',
  'Mantenimiento',
  'Mantenimiento Vehículo',
  'Otros'
] as const;
const METHODS = ['Efectivo', 'Transferencia', 'Tarjeta de Débito', 'Tarjeta de Crédito'] as const;

const COLORS = ['#FF4D00', '#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8884d8'];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [employeeFilter, setEmployeeFilter] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<'mensual' | 'acumulado'>('mensual');
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Expense>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'Varios',
    method: 'Efectivo',
    amount: 0,
    description: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [expData, budData, empData, woData] = await Promise.all([
          fetchExpenses(),
          fetchBudgets(),
          fetchUsers(),
          fetchWorkOrders()
        ]);
        setExpenses(expData);
        setBudgets(budData);
        setEmployees(empData);
        setWorkOrders(woData);
      } catch (error) {
        console.error("Error loading expenses data:", error);
        toast.error("Error al cargar los datos");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const yearsList = useMemo(() => {
    const currentYear = parseInt(format(new Date(), 'yyyy'));
    const years = new Set<string>();
    years.add(currentYear.toString());
    expenses.forEach(exp => {
      const year = format(parseISO(formatFirebaseDate(exp.date)), 'yyyy');
      years.add(year);
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [expenses]);

  const timeFilteredExpenses = useMemo(() => {
    const year = parseInt(selectedYear);
    const month = selectedMonth;

    let start: Date;
    let end: Date;

    if (viewMode === 'mensual') {
      start = new Date(year, month, 1);
      end = endOfMonth(start);
    } else {
      // Acumulado: from Jan 1st of selected year to end of selected month
      start = startOfYear(new Date(year, month, 1));
      end = endOfMonth(new Date(year, month, 1));
    }

    return expenses.filter(exp => {
      const date = parseISO(formatFirebaseDate(exp.date));
      return isWithinInterval(date, { start, end });
    });
  }, [expenses, viewMode, selectedYear, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    return timeFilteredExpenses.filter(exp => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
                           exp.description.toLowerCase().includes(searchLower) ||
                           exp.category.toLowerCase().includes(searchLower);
      const matchesCategory = categoryFilter === 'Todas' || exp.category === categoryFilter;
      
      // Robust employee matching
      let matchesEmployee = employeeFilter === 'Todos';
      if (!matchesEmployee && exp.employeeId) {
        const selectedEmp = employees.find(e => e.id === employeeFilter);
        matchesEmployee = exp.employeeId === employeeFilter || 
                         (selectedEmp && (exp.employeeId === selectedEmp.username || exp.employeeId === selectedEmp.email));
      }

      return matchesSearch && matchesCategory && matchesEmployee;
    });
  }, [timeFilteredExpenses, searchTerm, categoryFilter, employeeFilter, employees]);

  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const mo = filteredExpenses.filter(exp => exp.category === 'Mano de Obra').reduce((sum, exp) => sum + Number(exp.amount), 0);
    const materials = filteredExpenses.filter(exp => exp.category === 'Materiales').reduce((sum, exp) => sum + Number(exp.amount), 0);
    const fixed = filteredExpenses.filter(exp => exp.category === 'Costos Fijos').reduce((sum, exp) => sum + Number(exp.amount), 0);
    
    return { total, mo, materials, fixed };
  }, [filteredExpenses]);

  const weeklyData = useMemo(() => {
    const now = new Date(parseInt(selectedYear), selectedMonth, 1);
    let start: Date;
    let end: Date;

    if (viewMode === 'acumulado') {
      start = startOfYear(now);
      end = endOfMonth(now);
      const months = eachMonthOfInterval({ start, end });
      
      return months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const monthExpensesValue = expenses.filter(exp => {
          const date = parseISO(formatFirebaseDate(exp.date));
          return isWithinInterval(date, { start: monthStart, end: monthEnd });
        });
        
        return {
          name: format(monthStart, 'MMM', { locale: es }),
          monto: monthExpensesValue.reduce((sum, exp) => sum + Number(exp.amount), 0)
        };
      });
    }

    start = startOfMonth(now);
    end = endOfMonth(now);

    const weeks = eachWeekOfInterval({ start, end }, { locale: es });
    
    return weeks.map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart, { locale: es });
      const weekExpenses = filteredExpenses.filter(exp => {
        const date = parseISO(formatFirebaseDate(exp.date));
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
      });
      
      return {
        name: `Sem. ${index + 1}`,
        monto: weekExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
      };
    });
  }, [filteredExpenses, viewMode, selectedYear, selectedMonth]);

  const categoryData = useMemo(() => {
    if (categoryFilter === 'Costos Fijos') {
      return FIXED_COST_SUB_CATEGORIES.map(sub => ({
        name: sub,
        value: filteredExpenses.filter(exp => exp.category === 'Costos Fijos' && exp.subCategory === sub).reduce((sum, exp) => sum + Number(exp.amount), 0)
      })).filter(item => item.value > 0);
    }
    return CATEGORIES.map(cat => ({
      name: cat,
      value: filteredExpenses.filter(exp => exp.category === cat).reduce((sum, exp) => sum + Number(exp.amount), 0)
    })).filter(item => item.value > 0);
  }, [filteredExpenses, categoryFilter]);

  const employeePaymentData = useMemo(() => {
    return employees.map(emp => ({
      name: emp.username || emp.email,
      value: filteredExpenses.filter(exp => 
        exp.employeeId === emp.id || 
        exp.employeeId === emp.username || 
        exp.employeeId === emp.email
      ).reduce((sum, exp) => sum + Number(exp.amount), 0)
    })).filter(item => item.value > 0);
  }, [filteredExpenses, employees]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.date) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    const expenseData: any = {
      id: editingExpense?.id || `EXP-${Date.now()}`,
      description: formData.description || '',
      amount: Number(formData.amount),
      date: formData.date || format(new Date(), 'yyyy-MM-dd'),
      category: formData.category as any,
      method: formData.method as any,
    };

    // Only add optional fields if they have values to avoid Firestore 'undefined' errors
    if (formData.category === 'Costos Fijos' && formData.subCategory) {
      expenseData.subCategory = formData.subCategory;
    }
    if (formData.employeeId && formData.employeeId !== '') {
      expenseData.employeeId = formData.employeeId;
    }
    if (formData.budgetId && formData.budgetId !== '') {
      expenseData.budgetId = formData.budgetId;
    }
    if (formData.workOrderId && formData.workOrderId !== '') {
      expenseData.workOrderId = formData.workOrderId;
    }

    try {
      await saveExpense(expenseData);
      if (editingExpense) {
        setExpenses(expenses.map(exp => exp.id === expenseData.id ? expenseData : exp));
        toast.success("Gasto actualizado");
      } else {
        setExpenses([expenseData, ...expenses]);
        toast.success("Gasto registrado");
      }
      setIsModalOpen(false);
      setEditingExpense(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        category: 'Varios',
        method: 'Efectivo',
        amount: 0,
        description: ''
      });
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Error al guardar el gasto");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      setExpenses(expenses.filter(exp => exp.id !== id));
      setDeleteConfirmation(null);
      toast.success("Gasto eliminado");
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Error al eliminar el gasto");
    }
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    
    const localDate = new Date(expense.date);
    const formattedDate = isNaN(localDate.getTime()) 
      ? format(new Date(), 'yyyy-MM-dd') 
      : format(new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000), 'yyyy-MM-dd');

    setFormData({
      ...expense,
      date: formattedDate,
      workOrderId: expense.workOrderId || ''
    });
    setIsModalOpen(true);
  };

  const performanceRanking = useMemo(() => {
    if (employees.length === 0) return [];

    const year = parseInt(selectedYear);
    const month = selectedMonth;

    let timeStart: Date;
    let timeEnd: Date;

    if (viewMode === 'mensual') {
      timeStart = new Date(year, month, 1);
      timeEnd = endOfMonth(timeStart);
    } else {
      timeStart = startOfYear(new Date(year, month, 1));
      timeEnd = endOfMonth(new Date(year, month, 1));
    }

    return employees.map(emp => {
      // Cost: Expenses for this employee in the selected time period
      const empTerms = [emp.id, emp.username, emp.email, emp.displayName].filter(Boolean).map(s => s.toLowerCase().trim());
      const cost = timeFilteredExpenses
        .filter(exp => {
          const expEmpId = (exp.employeeId || '').toLowerCase().trim();
          return empTerms.includes(expEmpId);
        })
        .reduce((sum, exp) => sum + Number(exp.amount), 0);

      // Production: Value generated from budgets based on Work Orders
      const production = budgets
        .filter(b => {
          // Status check
          const isValidStatus = ['finalizado', 'cobrado', 'aprobado', 'ejecucion'].includes(b.status);
          return isValidStatus;
        })
        .reduce((sum, b) => {
          // Get all active Work Orders for this budget
          const budgetWOs = workOrders.filter(wo => wo.budgetId === b.id && wo.status !== 'cancelada');
          
          // Find WOs where this employee is assigned
          const employeeWOs = budgetWOs.filter(wo => {
            const isAssignedInMain = wo.assignedTo?.some(person => 
              empTerms.includes((person || '').toLowerCase().trim())
            );

            const isAssignedInPhases = wo.phases?.some(phase => 
              phase.labor.some(labor => 
                labor.assignedPerson && empTerms.includes(labor.assignedPerson.toLowerCase().trim())
              )
            );

            return isAssignedInMain || isAssignedInPhases;
          });

          if (employeeWOs.length === 0) return sum;

          // Check if any of these WOs fall within the time period
          // This ensures production aligns with work/payment timing
          const isInPeriod = employeeWOs.some(wo => {
            if (!timeStart || !timeEnd) return true;
            // Use WO start date if available, otherwise fallback to budget date
            const woDateStr = wo.startDate || formatFirebaseDate(b.date);
            const woDate = parseISO(woDateStr);
            return isWithinInterval(woDate, { start: timeStart, end: timeEnd });
          });

          if (!isInPeriod) return sum;
          
          // Split value among all unique workers involved in the budget's work orders
          const uniqueWorkers = new Set();
          budgetWOs.forEach(w => {
            // Add from main assigned list
            w.assignedTo?.forEach(person => uniqueWorkers.add(person.toLowerCase().trim()));
            // Add from phases
            w.phases?.forEach(phase => {
              phase.labor.forEach(labor => {
                if (labor.assignedPerson) uniqueWorkers.add(labor.assignedPerson.toLowerCase().trim());
              });
            });
          });
          
          const workerCount = uniqueWorkers.size || 1;
          const budgetValue = Number((b.calculation?.subtotal || b.subtotal || 0) - (b.calculation?.materialsFactured || 0));
          return sum + (budgetValue / workerCount);
        }, 0);

      const efficiency = cost > 0 ? (production / cost) : (production > 0 ? 10 : 0);

      return {
        id: emp.id,
        name: emp.username || emp.email,
        cost,
        production,
        efficiency,
        status: efficiency >= 2.6 ? 'Excelente' : efficiency >= 1.6 ? 'Bueno' : efficiency >= 1.3 ? 'Regular' : efficiency > 0 ? 'Bajo' : 'Sin Datos'
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  }, [employees, timeFilteredExpenses, budgets, expenses, workOrders, viewMode, selectedYear, selectedMonth]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Gastos y Pagos Operativos</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Control total de egresos, compras y pagos a personal.</p>
        </div>
        <button 
          onClick={() => {
            setEditingExpense(null);
            setFormData({
              date: format(new Date(), 'yyyy-MM-dd'),
              category: 'Varios',
              method: 'Efectivo',
              amount: 0,
              description: '',
              workOrderId: ''
            });
            setIsModalOpen(true);
          }}
          className="kraken-btn h-14"
        >
          <Plus size={20} />
          <span>Nuevo Gasto</span>
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="kraken-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-kraken-orange/10 text-kraken-orange">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Total Gastado ({viewMode === 'mensual' ? monthsList[selectedMonth] : 'Acumulado'})</p>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">{stats.total.toLocaleString('de-DE')} €</h3>
            </div>
          </div>
        </div>
        <div className="kraken-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
              <UsersIcon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Mano de Obra ({viewMode === 'mensual' ? monthsList[selectedMonth] : 'Acumulado'})</p>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">{stats.mo.toLocaleString('de-DE')} €</h3>
            </div>
          </div>
        </div>
        <div className="kraken-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Package size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Materiales ({viewMode === 'mensual' ? monthsList[selectedMonth] : 'Acumulado'})</p>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">{stats.materials.toLocaleString('de-DE')} €</h3>
            </div>
          </div>
        </div>
        <div className="kraken-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Gastos Fijos ({viewMode === 'mensual' ? monthsList[selectedMonth] : 'Acumulado'})</p>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">{stats.fixed.toLocaleString('de-DE')} €</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <button
            onClick={() => setViewMode('mensual')}
            className={`px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              viewMode === 'mensual' 
                ? 'bg-kraken-orange text-white shadow-lg shadow-kraken-orange/20' 
                : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setViewMode('acumulado')}
            className={`px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              viewMode === 'acumulado' 
                ? 'bg-kraken-orange text-white shadow-lg shadow-kraken-orange/20' 
                : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Acumulado
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="kraken-input h-12 min-w-[120px] font-bold text-sm bg-neutral-100 dark:bg-neutral-800 border-none"
          >
            {yearsList.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="kraken-input h-12 min-w-[140px] font-bold text-sm bg-neutral-100 dark:bg-neutral-800 border-none"
          >
            {monthsList.map((month, idx) => (
              <option key={month} value={idx}>{month}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <UsersIcon size={18} className="text-neutral-400" />
          <select 
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="kraken-input min-w-[200px] h-11"
          >
            <option value="Todos">Todos los Empleados</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.username || emp.email}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Filter size={18} className="text-neutral-400" />
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="kraken-input min-w-[200px] h-11"
          >
            <option value="Todas">Todas las Categorías</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Performance Ranking Section */}
      <div className="kraken-card p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black flex items-center gap-2">
              <Trophy size={24} className="text-amber-500" />
              Ranking de Desempeño y Producción
              <button 
                onClick={() => setIsInfoModalOpen(true)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-kraken-orange"
                title="Ver fórmulas y metodología"
              >
                <AlertCircle size={18} />
              </button>
            </h3>
            <p className="text-sm text-neutral-500 font-medium mt-1">Comparativa de Costo vs Producción Real (Basado en presupuestos aprobados/finalizados)</p>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Excelente (&gt;= 2.6x)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Bueno (1.6x - 2.5x)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Regular (1.3x - 1.5x)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Bajo (&lt; 1.2x)</span>
              </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Periodo: {viewMode === 'mensual' ? monthsList[selectedMonth] : 'Acumulado'} - {selectedYear}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {performanceRanking.map((rank, index) => (
            <div key={rank.id} className="relative p-6 rounded-[32px] border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 group hover:border-kraken-orange/30 transition-all duration-300">
              <div className="absolute top-4 right-4 text-4xl font-black text-neutral-200 dark:text-neutral-800 italic group-hover:text-kraken-orange/10 transition-colors">
                #{index + 1}
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-kraken-orange text-white flex items-center justify-center font-black text-xl">
                  {rank.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white">{rank.name}</h4>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    rank.status === 'Excelente' ? 'text-emerald-500' :
                    rank.status === 'Bueno' ? 'text-blue-500' :
                    rank.status === 'Regular' ? 'text-amber-500' :
                    rank.status === 'Bajo' ? 'text-red-500' : 'text-neutral-400'
                  }`}>
                    {rank.status}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Costo (Pagos)</p>
                    <p className="font-black text-neutral-900 dark:text-white">{rank.cost.toLocaleString('de-DE')} €</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Producción</p>
                    <p className="font-black text-emerald-500">{rank.production.toLocaleString('de-DE')} €</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Eficiencia (ROI)</span>
                    <span className="font-black text-kraken-orange">{rank.efficiency.toFixed(2)}x</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        rank.efficiency >= 2.6 ? 'bg-emerald-500' :
                        rank.efficiency >= 1.6 ? 'bg-blue-500' :
                        rank.efficiency >= 1.3 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(rank.efficiency * 50, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="kraken-card p-8">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-kraken-orange" />
            {viewMode === 'mensual' ? 'Evolución Semanal' : 'Evolución Mensual'}
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600}} />
                <Tooltip 
                  cursor={{fill: 'rgba(255, 77, 0, 0.05)'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="monto" fill="#FF4D00" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="kraken-card p-8">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Filter size={20} className="text-kraken-orange" />
            Gastos por Categoría
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="kraken-card p-8">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <UsersIcon size={20} className="text-kraken-orange" />
            Pagos por Empleado
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={employeePaymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {employeePaymentData.map((entry, index) => (
                    <Cell key={`cell-emp-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="kraken-card overflow-hidden">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar gastos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="kraken-input w-full pl-12"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Descripción</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Categoría</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Método</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Monto</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-5 text-sm font-bold text-neutral-900 dark:text-white">
                    {format(parseISO(formatFirebaseDate(expense.date)), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">{expense.description}</p>
                    {expense.employeeId && (
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                        Pagado a: {employees.find(e => e.id === expense.employeeId)?.username || 'Empleado'}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
                      {expense.category}
                      {expense.subCategory && <span className="ml-1 text-kraken-orange opacity-70">/ {expense.subCategory}</span>}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    {expense.method}
                  </td>
                  <td className="px-6 py-5 text-sm font-black text-neutral-900 dark:text-white">
                    {Number(expense.amount).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEdit(expense)}
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmation(expense.id)}
                        className="p-2 text-kraken-orange hover:bg-kraken-orange/10 rounded-lg transition-all"
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
      </div>

      {/* Performance Info Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-kraken-orange rounded-xl">
                  <Target size={24} />
                </div>
                <h2 className="text-2xl font-black tracking-tighter">Metodología de Desempeño</h2>
              </div>
              <button onClick={() => setIsInfoModalOpen(false)} className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-2xl transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-kraken-orange">
                  <Zap size={20} />
                  <h3 className="font-black uppercase tracking-widest text-sm">1. Eficiencia Financiera (ROI)</h3>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[32px] border border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                    Es la métrica reina: ¿Cuánto dinero genera el empleado por cada euro que le pago?
                  </p>
                  <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-xs font-bold text-neutral-400 uppercase">Fórmula:</span>
                    <code className="font-black text-kraken-orange">Producción / Costo</code>
                  </div>
                  <p className="text-xs text-neutral-500 mt-4 italic">
                    * Vital para saber si el empleado es rentable o genera pérdidas operativas.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-kraken-orange">
                  <Target size={20} />
                  <h3 className="font-black uppercase tracking-widest text-sm">Escala de Eficiencia</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1">Excelente</p>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">≥ 2.6x</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Bueno</p>
                    <p className="text-lg font-black text-blue-700 dark:text-blue-300">1.6x - 2.5x</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase mb-1">Regular</p>
                    <p className="text-lg font-black text-amber-700 dark:text-amber-300">1.3x - 1.5x</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/50">
                    <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase mb-1">Bajo</p>
                    <p className="text-lg font-black text-red-700 dark:text-red-300">&lt; 1.2x</p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-blue-500">
                  <Calendar size={20} />
                  <h3 className="font-black uppercase tracking-widest text-sm">2. Tasa de Utilización</h3>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[32px] border border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                    Mide cuánto tiempo del que pagas se traduce en trabajo real para clientes.
                  </p>
                  <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-xs font-bold text-neutral-400 uppercase">Fórmula:</span>
                    <code className="font-black text-blue-500">(Horas en OT) / (Horas Totales Pagadas)</code>
                  </div>
                  <p className="text-xs text-neutral-500 mt-4">
                    Ayuda a identificar "tiempos muertos" o mala planificación de rutas/logística.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-amber-500">
                  <Target size={20} />
                  <h3 className="font-black uppercase tracking-widest text-sm">3. Desviación de Estimación</h3>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[32px] border border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                    Mide si el empleado cumple con los tiempos que tú presupuestaste.
                  </p>
                  <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-xs font-bold text-neutral-400 uppercase">Fórmula:</span>
                    <code className="font-black text-amber-500">Días Presupuesto vs Días Reales OT</code>
                  </div>
                  <p className="text-xs text-neutral-500 mt-4">
                    Indica si un empleado es lento o si los presupuestos son muy optimistas.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-emerald-500">
                  <DollarSign size={20} />
                  <h3 className="font-black uppercase tracking-widest text-sm">4. Rentabilidad por Proyecto</h3>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[32px] border border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                    No todos los euros valen lo mismo. Un empleado puede producir mucho, pero si gasta demasiado material, la rentabilidad baja.
                  </p>
                  <p className="text-xs text-neutral-500 italic">
                    * Actualmente Eduardo (dueño) o el cliente gestionan materiales, por lo que esta variable se mantiene centralizada.
                  </p>
                </div>
              </section>

              <div className="p-6 bg-kraken-orange/5 rounded-[32px] border border-kraken-orange/10">
                <p className="text-sm font-bold text-kraken-orange leading-relaxed">
                  Conclusión: Al agregar la Orden de Trabajo, hemos pasado de un ranking "teórico" a uno "operativo". Si un presupuesto no tiene una OT activa, no suma a la producción, protegiendo la veracidad de tus datos.
                </p>
              </div>
            </div>

            <div className="p-8 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
              <button 
                onClick={() => setIsInfoModalOpen(false)}
                className="kraken-btn w-full h-14"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-900 dark:bg-neutral-950 text-white">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-kraken-orange mb-2 block">
                  {editingExpense ? 'Editar Registro' : 'Nuevo Registro'}
                </span>
                <h2 className="text-3xl font-black tracking-tighter">Gasto Operativo</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-2xl transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="kraken-input w-full pl-12"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Monto (€)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                      className="kraken-input w-full pl-12"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Descripción</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="kraken-input w-full min-h-[100px] py-4"
                  placeholder="Ej: Compra de materiales para obra PR-1234..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Categoría</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as any, subCategory: undefined})}
                    className="kraken-input w-full"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                {formData.category === 'Costos Fijos' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Sub-categoría Fija</label>
                    <select 
                      value={formData.subCategory || ''}
                      onChange={(e) => setFormData({...formData, subCategory: e.target.value})}
                      className="kraken-input w-full"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {FIXED_COST_SUB_CATEGORIES.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Método de Pago</label>
                  <select 
                    value={formData.method}
                    onChange={(e) => setFormData({...formData, method: e.target.value as any})}
                    className="kraken-input w-full"
                  >
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Empleado (Opcional)</label>
                  <div className="relative">
                    <UsersIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <select 
                      value={formData.employeeId || ''}
                      onChange={(e) => {
                        const newEmpId = e.target.value;
                        setFormData({
                          ...formData, 
                          employeeId: newEmpId,
                          workOrderId: '', // Reset WO when employee changes
                          budgetId: '',
                          amount: 0
                        });
                      }}
                      className="kraken-input w-full pl-12"
                    >
                      <option value="">Ninguno</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.username || emp.email}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Orden de Trabajo (Opcional)</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <select 
                      value={formData.workOrderId || ''}
                      onChange={(e) => {
                        const woId = e.target.value;
                        const wo = workOrders.find(w => w.id === woId);
                        const budget = budgets.find(b => b.id === wo?.budgetId);
                        
                        if (wo && budget && formData.employeeId) {
                          const emp = employees.find(e => e.id === formData.employeeId);
                          const budgetWOs = workOrders.filter(w => w.budgetId === budget.id && w.status !== 'cancelada');
                          
                          const uniqueWorkers = new Set();
                          budgetWOs.forEach(w => {
                            // Add from main assigned list
                            w.assignedTo?.forEach(person => uniqueWorkers.add(person.toLowerCase().trim()));
                            // Add from phases
                            w.phases?.forEach(phase => {
                              phase.labor.forEach(labor => {
                                if (labor.assignedPerson) uniqueWorkers.add(labor.assignedPerson.toLowerCase().trim());
                              });
                            });
                          });
                          
                          const workerCount = uniqueWorkers.size || 1;
                          const budgetValue = Number((budget.calculation?.subtotal || budget.subtotal || 0) - (budget.calculation?.materialsFactured || 0));
                          const productionValue = budgetValue / workerCount;
                          
                          setFormData({
                            ...formData, 
                            workOrderId: woId, 
                            budgetId: budget.id,
                            amount: Number(productionValue.toFixed(2))
                          });
                        } else {
                          setFormData({...formData, workOrderId: woId, budgetId: wo?.budgetId || ''});
                        }
                      }}
                      className="kraken-input w-full pl-12"
                    >
                      <option value="">Ninguna</option>
                      {workOrders
                        .filter(wo => {
                          if (!formData.employeeId) return true;
                          const emp = employees.find(e => e.id === formData.employeeId);
                          if (!emp) return true;
                          
                          const empTerms = [emp.id, emp.username, emp.email, emp.displayName].filter(Boolean).map(s => s.toLowerCase().trim());

                          const isAssignedInMain = wo.assignedTo?.some(person => 
                            empTerms.includes((person || '').toLowerCase().trim())
                          );

                          const isAssignedInPhases = wo.phases?.some(phase => 
                            phase.labor.some(labor => 
                              labor.assignedPerson && empTerms.includes(labor.assignedPerson.toLowerCase().trim())
                            )
                          );
                          
                          return wo.status !== 'cancelada' && (isAssignedInMain || isAssignedInPhases);
                        })
                        .map(wo => {
                          const budget = budgets.find(b => b.id === wo.budgetId);
                          return (
                            <option key={wo.id} value={wo.id}>
                              {wo.id} - {budget?.clientName || 'Cliente'} - {wo.description.substring(0, 30)}...
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="kraken-btn-secondary flex-1 h-14"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="kraken-btn flex-1 h-14"
                >
                  {editingExpense ? 'Actualizar Gasto' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 border border-neutral-100 dark:border-neutral-800">
            <div className="w-16 h-16 bg-kraken-orange/10 text-kraken-orange rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 dark:text-white">¿Eliminar Gasto?</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-center mb-8">
              Esta acción no se puede deshacer. El registro se eliminará permanentemente.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="kraken-btn-secondary flex-1 py-3"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirmation)}
                className="kraken-btn flex-1 py-3"
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
