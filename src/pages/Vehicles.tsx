import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Wrench, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Fuel, 
  Gauge, 
  Eye, 
  X, 
  Save, 
  PlusCircle, 
  Car, 
  DollarSign, 
  Activity,
  Sparkles,
  Info
} from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { Vehicle, FuelPurchase, MaintenanceAction, MaintenanceServiceState } from '../types';
import { fetchVehicles, saveVehicle, deleteVehicle } from '../lib/storage';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// Helper to calculate days until a date
const getDaysUntil = (dateStr: string): number => {
  if (!dateStr) return 9999;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return 9999;
  }
};

// Helper to add months to a date string
const addMonthsToDate = (dateStr: string, months: number): string => {
  try {
    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) return '';
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

// Seed two default company vans if database is empty
const defaultVehicles: Vehicle[] = [
  {
    id: 'van-1',
    brand: 'Toyota',
    model: 'Hilux 4x4',
    plate: 'AA 123 BCD',
    year: 2021,
    initialKm: 50000,
    currentKm: 62450,
    kmPerMonth: 1200,
    createdAt: new Date().toISOString(),
    oilChange: {
      lastDoneKm: 60000,
      lastDoneDate: '2026-05-15',
      intervalKm: 10000,
      intervalMonths: 12,
      nextDueKm: 70000,
      nextDueDate: '2027-05-15'
    },
    airFilter: {
      lastDoneKm: 55000,
      lastDoneDate: '2026-02-10',
      intervalKm: 15000,
      intervalMonths: 12,
      nextDueKm: 70000,
      nextDueDate: '2027-02-10'
    },
    oilFilter: {
      lastDoneKm: 60000,
      lastDoneDate: '2026-05-15',
      intervalKm: 10000,
      intervalMonths: 12,
      nextDueKm: 70000,
      nextDueDate: '2027-05-15'
    },
    technicalRevision: {
      lastDoneDate: '2025-07-20',
      nextDueDate: '2026-07-20' // 15-day alert trigger test (depends on current system year 2026)
    },
    fuelHistory: [
      { id: 'fuel-1', date: '2026-06-10', km: 61500, liters: 65, pricePerLiter: 1.85, totalCost: 120.25, notes: 'Carga completa' },
      { id: 'fuel-2', date: '2026-06-28', km: 62400, liters: 70, pricePerLiter: 1.88, totalCost: 131.60, notes: 'YPF' }
    ],
    maintenanceHistory: [
      { id: 'maint-1', date: '2026-05-15', km: 60000, type: 'Cambio de Aceite', description: 'Cambio de aceite sintético 5W30 y filtro de aceite', cost: 180, notes: 'Taller central' }
    ]
  },
  {
    id: 'van-2',
    brand: 'Ford',
    model: 'Ranger Raptor',
    plate: 'AD 987 XYZ',
    year: 2022,
    initialKm: 30000,
    currentKm: 41200,
    kmPerMonth: 1500,
    createdAt: new Date().toISOString(),
    oilChange: {
      lastDoneKm: 35000,
      lastDoneDate: '2025-12-05',
      intervalKm: 10000,
      intervalMonths: 12,
      nextDueKm: 45000,
      nextDueDate: '2026-12-05'
    },
    airFilter: {
      lastDoneKm: 35000,
      lastDoneDate: '2025-12-05',
      intervalKm: 15000,
      intervalMonths: 12,
      nextDueKm: 50000,
      nextDueDate: '2026-12-05'
    },
    oilFilter: {
      lastDoneKm: 35000,
      lastDoneDate: '2025-12-05',
      intervalKm: 10000,
      intervalMonths: 12,
      nextDueKm: 45000,
      nextDueDate: '2026-12-05'
    },
    technicalRevision: {
      lastDoneDate: '2025-11-10',
      nextDueDate: '2026-11-10'
    },
    fuelHistory: [
      { id: 'fuel-3', date: '2026-06-15', km: 40500, liters: 75, pricePerLiter: 1.90, totalCost: 142.50, notes: 'Carga Shell' }
    ],
    maintenanceHistory: []
  }
];

// Alert generation helper
const getMaintenanceAlerts = (vehicle: Vehicle) => {
  const alerts: { type: string; serviceName: string; message: string; severity: 'error' | 'warning' }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkService = (service: MaintenanceServiceState, name: string) => {
    // 1. Date check (15 days before)
    if (service.nextDueDate) {
      const daysLeft = getDaysUntil(service.nextDueDate);
      if (daysLeft < 0) {
        alerts.push({
          type: 'date_overdue',
          serviceName: name,
          message: `${name} venció hace ${Math.abs(daysLeft)} días (Vencimiento: ${service.nextDueDate})`,
          severity: 'error'
        });
      } else if (daysLeft <= 15) {
        alerts.push({
          type: 'date_warning',
          serviceName: name,
          message: `${name} vence en ${daysLeft} días (Vencimiento: ${service.nextDueDate})`,
          severity: 'warning'
        });
      }
    }

    // 2. Kilometers check
    if (service.nextDueKm) {
      const kmRemaining = service.nextDueKm - vehicle.currentKm;
      const dailyKm = vehicle.kmPerMonth / 30;
      const kmIn15Days = dailyKm * 15;

      if (kmRemaining < 0) {
        alerts.push({
          type: 'km_overdue',
          serviceName: name,
          message: `${name} venció por kilómetros hace ${Math.abs(kmRemaining)} km (Límite: ${service.nextDueKm} km)`,
          severity: 'error'
        });
      } else if (kmRemaining <= 500 || (dailyKm > 0 && kmRemaining <= kmIn15Days)) {
        const daysToKm = dailyKm > 0 ? Math.round(kmRemaining / dailyKm) : 999;
        alerts.push({
          type: 'km_warning',
          serviceName: name,
          message: `${name} vencerá por km en ${kmRemaining} km (estimado en ${daysToKm} días)`,
          severity: 'warning'
        });
      }
    }
  };

  if (vehicle.oilChange) checkService(vehicle.oilChange, 'Cambio de Aceite');
  if (vehicle.airFilter) checkService(vehicle.airFilter, 'Filtro de Aire');
  if (vehicle.oilFilter) checkService(vehicle.oilFilter, 'Filtro de Aceite');

  // Technical revision (ITV) - date based only
  if (vehicle.technicalRevision?.nextDueDate) {
    const daysLeft = getDaysUntil(vehicle.technicalRevision.nextDueDate);
    if (daysLeft < 0) {
      alerts.push({
        type: 'date_overdue',
        serviceName: 'Revisión Técnica',
        message: `Revisión Técnica venció hace ${Math.abs(daysLeft)} días (Vence: ${vehicle.technicalRevision.nextDueDate})`,
        severity: 'error'
      });
    } else if (daysLeft <= 15) {
      alerts.push({
        type: 'date_warning',
        serviceName: 'Revisión Técnica',
        message: `Revisión Técnica vence en ${daysLeft} días (Vence: ${vehicle.technicalRevision.nextDueDate})`,
        severity: 'warning'
      });
    }
  }

  return alerts;
};

// Fuel expenditures aggregate helper
const getFuelExpensesTotal = (vehicle: Vehicle) => {
  if (!vehicle.fuelHistory) return 0;
  return vehicle.fuelHistory.reduce((acc, current) => acc + (current.totalCost || 0), 0);
};

export default function Vehicles() {
  const { isDarkMode } = useTheme();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Detail panel tabs
  const [detailTab, setDetailTab] = useState<'status' | 'maintenance' | 'fuel'>('status');

  // Sub-forms for logging fuel and maintenance
  const [isLogFuelOpen, setIsLogFuelOpen] = useState(false);
  const [isLogMaintOpen, setIsLogMaintOpen] = useState(false);

  const [fuelForm, setFuelForm] = useState({
    date: new Date().toISOString().split('T')[0],
    km: '',
    liters: '',
    pricePerLiter: '',
    totalCost: '',
    notes: ''
  });

  const [maintForm, setMaintForm] = useState({
    date: new Date().toISOString().split('T')[0],
    km: '',
    type: 'Cambio de Aceite' as MaintenanceAction['type'],
    description: '',
    cost: '',
    notes: '',
    updateMilestones: true // Auto updates next service due date/km
  });

  // Vehicle main form state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    plate: '',
    year: new Date().getFullYear(),
    initialKm: 0,
    currentKm: 0,
    kmPerMonth: 1000,
    oilChangeIntervalKm: 10000,
    oilChangeIntervalMonths: 12,
    airFilterIntervalKm: 15000,
    airFilterIntervalMonths: 12,
    oilFilterIntervalKm: 10000,
    oilFilterIntervalMonths: 12,
    lastOilChangeKm: 0,
    lastOilChangeDate: '',
    lastAirFilterKm: 0,
    lastAirFilterDate: '',
    lastOilFilterKm: 0,
    lastOilFilterDate: '',
    lastTechnicalRevisionDate: '',
    nextTechnicalRevisionDate: ''
  });

  // Load vehicles from Firestore
  useEffect(() => {
    const loadVehicles = async () => {
      setLoading(true);
      try {
        let stored = await fetchVehicles();
        if (stored.length === 0) {
          // Seed initial vehicles
          for (const v of defaultVehicles) {
            await saveVehicle(v);
          }
          stored = await fetchVehicles();
        }
        setVehicles(stored);
      } catch (error) {
        console.error('Error loading vehicles:', error);
        toast.error('Error al cargar la flota de vehículos.');
      } finally {
        setLoading(false);
      }
    };
    loadVehicles();
  }, []);

  // Compute active alerts for all vehicles
  const allAlerts = useMemo(() => {
    const alertsList: { vehiclePlate: string; vehicleName: string; serviceName: string; message: string; severity: 'error' | 'warning' }[] = [];
    
    vehicles.forEach(vehicle => {
      const vAlerts = getMaintenanceAlerts(vehicle);
      vAlerts.forEach(a => {
        alertsList.push({
          vehiclePlate: vehicle.plate,
          vehicleName: `${vehicle.brand} ${vehicle.model}`,
          serviceName: a.serviceName,
          message: a.message,
          severity: a.severity
        });
      });
    });

    return alertsList;
  }, [vehicles]);



  // Open A.B.M Form Modal
  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        plate: vehicle.plate || '',
        year: vehicle.year || new Date().getFullYear(),
        initialKm: vehicle.initialKm || 0,
        currentKm: vehicle.currentKm || 0,
        kmPerMonth: vehicle.kmPerMonth || 1000,
        oilChangeIntervalKm: vehicle.oilChange?.intervalKm || 10000,
        oilChangeIntervalMonths: vehicle.oilChange?.intervalMonths || 12,
        airFilterIntervalKm: vehicle.airFilter?.intervalKm || 15000,
        airFilterIntervalMonths: vehicle.airFilter?.intervalMonths || 12,
        oilFilterIntervalKm: vehicle.oilFilter?.intervalKm || 10000,
        oilFilterIntervalMonths: vehicle.oilFilter?.intervalMonths || 12,
        lastOilChangeKm: vehicle.oilChange?.lastDoneKm || 0,
        lastOilChangeDate: vehicle.oilChange?.lastDoneDate || '',
        lastAirFilterKm: vehicle.airFilter?.lastDoneKm || 0,
        lastAirFilterDate: vehicle.airFilter?.lastDoneDate || '',
        lastOilFilterKm: vehicle.oilFilter?.lastDoneKm || 0,
        lastOilFilterDate: vehicle.oilFilter?.lastDoneDate || '',
        lastTechnicalRevisionDate: vehicle.technicalRevision?.lastDoneDate || '',
        nextTechnicalRevisionDate: vehicle.technicalRevision?.nextDueDate || ''
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        brand: '',
        model: '',
        plate: '',
        year: new Date().getFullYear(),
        initialKm: 0,
        currentKm: 0,
        kmPerMonth: 1200,
        oilChangeIntervalKm: 10000,
        oilChangeIntervalMonths: 12,
        airFilterIntervalKm: 15000,
        airFilterIntervalMonths: 12,
        oilFilterIntervalKm: 10000,
        oilFilterIntervalMonths: 12,
        lastOilChangeKm: 0,
        lastOilChangeDate: '',
        lastAirFilterKm: 0,
        lastAirFilterDate: '',
        lastOilFilterKm: 0,
        lastOilFilterDate: '',
        lastTechnicalRevisionDate: '',
        nextTechnicalRevisionDate: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  // Submit Vehicle ABM Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand || !formData.model || !formData.plate) {
      toast.error('Por favor, rellene todos los campos obligatorios.');
      return;
    }

    try {
      const parsedCurrentKm = Number(formData.currentKm);
      const parsedInitialKm = Number(formData.initialKm);

      const computedOilChange: MaintenanceServiceState = {
        lastDoneKm: Number(formData.lastOilChangeKm),
        lastDoneDate: formData.lastOilChangeDate,
        intervalKm: Number(formData.oilChangeIntervalKm),
        intervalMonths: Number(formData.oilChangeIntervalMonths),
        nextDueKm: Number(formData.lastOilChangeKm) + Number(formData.oilChangeIntervalKm),
        nextDueDate: addMonthsToDate(formData.lastOilChangeDate, Number(formData.oilChangeIntervalMonths))
      };

      const computedAirFilter: MaintenanceServiceState = {
        lastDoneKm: Number(formData.lastAirFilterKm),
        lastDoneDate: formData.lastAirFilterDate,
        intervalKm: Number(formData.airFilterIntervalKm),
        intervalMonths: Number(formData.airFilterIntervalMonths),
        nextDueKm: Number(formData.lastAirFilterKm) + Number(formData.airFilterIntervalKm),
        nextDueDate: addMonthsToDate(formData.lastAirFilterDate, Number(formData.airFilterIntervalMonths))
      };

      const computedOilFilter: MaintenanceServiceState = {
        lastDoneKm: Number(formData.lastOilFilterKm),
        lastDoneDate: formData.lastOilFilterDate,
        intervalKm: Number(formData.oilFilterIntervalKm),
        intervalMonths: Number(formData.oilFilterIntervalMonths),
        nextDueKm: Number(formData.lastOilFilterKm) + Number(formData.oilFilterIntervalKm),
        nextDueDate: addMonthsToDate(formData.lastOilFilterDate, Number(formData.oilFilterIntervalMonths))
      };

      const computedTechnicalRevision = {
        lastDoneDate: formData.lastTechnicalRevisionDate,
        nextDueDate: formData.nextTechnicalRevisionDate || addMonthsToDate(formData.lastTechnicalRevisionDate, 12)
      };

      if (editingVehicle) {
        // Update existing vehicle
        const updatedVehicle: Vehicle = {
          ...editingVehicle,
          brand: formData.brand,
          model: formData.model,
          plate: formData.plate.toUpperCase(),
          year: Number(formData.year),
          initialKm: parsedInitialKm,
          currentKm: Math.max(parsedCurrentKm, parsedInitialKm, editingVehicle.currentKm),
          kmPerMonth: Number(formData.kmPerMonth),
          oilChange: computedOilChange,
          airFilter: computedAirFilter,
          oilFilter: computedOilFilter,
          technicalRevision: computedTechnicalRevision
        };

        await saveVehicle(updatedVehicle);
        setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? updatedVehicle : v));
        if (selectedVehicle?.id === editingVehicle.id) {
          setSelectedVehicle(updatedVehicle);
        }
        toast.success('Vehículo actualizado con éxito.');
      } else {
        // Create new vehicle
        const newVehicleId = 'veh-' + Math.random().toString(36).substring(2, 9);
        const newVehicle: Vehicle = {
          id: newVehicleId,
          brand: formData.brand,
          model: formData.model,
          plate: formData.plate.toUpperCase(),
          year: Number(formData.year),
          initialKm: parsedInitialKm,
          currentKm: Math.max(parsedCurrentKm, parsedInitialKm),
          kmPerMonth: Number(formData.kmPerMonth),
          oilChange: computedOilChange,
          airFilter: computedAirFilter,
          oilFilter: computedOilFilter,
          technicalRevision: computedTechnicalRevision,
          fuelHistory: [],
          maintenanceHistory: [],
          createdAt: new Date().toISOString()
        };

        await saveVehicle(newVehicle);
        setVehicles(prev => [...prev, newVehicle]);
        toast.success('Nuevo vehículo registrado en la flota.');
      }
      handleCloseModal();
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar los cambios.');
    }
  };

  // Delete Vehicle
  const handleDelete = async (id: string) => {
    try {
      await deleteVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
      if (selectedVehicle?.id === id) {
        setSelectedVehicle(null);
        setIsDetailModalOpen(false);
      }
      setDeleteConfirmation(null);
      toast.success('Vehículo removido de la flota con éxito.');
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar el vehículo.');
    }
  };

  // Log Fuel Purchase
  const handleLogFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const parsedKm = Number(fuelForm.km);
    const parsedLiters = Number(fuelForm.liters);
    const parsedCost = Number(fuelForm.totalCost) || (parsedLiters * Number(fuelForm.pricePerLiter));

    if (!parsedKm || !parsedLiters || !parsedCost) {
      toast.error('Por favor complete kilómetros, litros y costo total.');
      return;
    }

    if (parsedKm < selectedVehicle.currentKm) {
      toast.error(`Los kilómetros cargados (${parsedKm}) no pueden ser inferiores al kilometraje actual del vehículo (${selectedVehicle.currentKm} km).`);
      return;
    }

    try {
      const newPurchase: FuelPurchase = {
        id: 'fuel-' + Math.random().toString(36).substring(2, 9),
        date: fuelForm.date,
        km: parsedKm,
        liters: parsedLiters,
        pricePerLiter: Number(fuelForm.pricePerLiter) || (parsedCost / parsedLiters),
        totalCost: parsedCost,
        notes: fuelForm.notes
      };

      const updatedHistory = [...(selectedVehicle.fuelHistory || []), newPurchase].sort((a, b) => b.date.localeCompare(a.date));
      const updatedVehicle: Vehicle = {
        ...selectedVehicle,
        currentKm: parsedKm, // updates mileage of vehicle
        fuelHistory: updatedHistory
      };

      await saveVehicle(updatedVehicle);
      setVehicles(prev => prev.map(v => v.id === selectedVehicle.id ? updatedVehicle : v));
      setSelectedVehicle(updatedVehicle);
      
      // Reset form
      setFuelForm({
        date: new Date().toISOString().split('T')[0],
        km: '',
        liters: '',
        pricePerLiter: '',
        totalCost: '',
        notes: ''
      });
      setIsLogFuelOpen(false);
      toast.success('Carga de combustible registrada.');
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar carga de combustible.');
    }
  };

  // Log Maintenance Action Completed
  const handleLogMaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const parsedKm = Number(maintForm.km);
    const parsedCost = Number(maintForm.cost) || 0;

    if (!parsedKm || !maintForm.description) {
      toast.error('Por favor complete el kilometraje y una descripción del servicio.');
      return;
    }

    try {
      const newAction: MaintenanceAction = {
        id: 'maint-' + Math.random().toString(36).substring(2, 9),
        date: maintForm.date,
        km: parsedKm,
        type: maintForm.type,
        description: maintForm.description,
        cost: parsedCost,
        notes: maintForm.notes
      };

      const updatedHistory = [...(selectedVehicle.maintenanceHistory || []), newAction].sort((a, b) => b.date.localeCompare(a.date));
      
      let updatedVehicle: Vehicle = {
        ...selectedVehicle,
        currentKm: Math.max(selectedVehicle.currentKm, parsedKm),
        maintenanceHistory: updatedHistory
      };

      // Auto update next milestones if user requested
      if (maintForm.updateMilestones) {
        const todayStr = maintForm.date;
        if (maintForm.type === 'Cambio de Aceite') {
          updatedVehicle.oilChange = {
            ...updatedVehicle.oilChange,
            lastDoneKm: parsedKm,
            lastDoneDate: todayStr,
            nextDueKm: parsedKm + updatedVehicle.oilChange.intervalKm,
            nextDueDate: addMonthsToDate(todayStr, updatedVehicle.oilChange.intervalMonths)
          };
        } else if (maintForm.type === 'Filtro Aire') {
          updatedVehicle.airFilter = {
            ...updatedVehicle.airFilter,
            lastDoneKm: parsedKm,
            lastDoneDate: todayStr,
            nextDueKm: parsedKm + updatedVehicle.airFilter.intervalKm,
            nextDueDate: addMonthsToDate(todayStr, updatedVehicle.airFilter.intervalMonths)
          };
        } else if (maintForm.type === 'Filtro Aceite') {
          updatedVehicle.oilFilter = {
            ...updatedVehicle.oilFilter,
            lastDoneKm: parsedKm,
            lastDoneDate: todayStr,
            nextDueKm: parsedKm + updatedVehicle.oilFilter.intervalKm,
            nextDueDate: addMonthsToDate(todayStr, updatedVehicle.oilFilter.intervalMonths)
          };
        } else if (maintForm.type === 'Revisión Técnica') {
          updatedVehicle.technicalRevision = {
            lastDoneDate: todayStr,
            nextDueDate: addMonthsToDate(todayStr, 12) // defaults to 1 year
          };
        }
      }

      await saveVehicle(updatedVehicle);
      setVehicles(prev => prev.map(v => v.id === selectedVehicle.id ? updatedVehicle : v));
      setSelectedVehicle(updatedVehicle);

      // Reset form
      setMaintForm({
        date: new Date().toISOString().split('T')[0],
        km: '',
        type: 'Cambio de Aceite',
        description: '',
        cost: '',
        notes: '',
        updateMilestones: true
      });
      setIsLogMaintOpen(false);
      toast.success('Servicio de mantenimiento registrado correctamente.');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el mantenimiento.');
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">Flota de Vehículos</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Control preventivo, kilometraje, gastos de combustible y ficha técnica de camionetas.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="kraken-btn"
        >
          <Plus size={20} />
          <span>Añadir Vehículo</span>
        </button>
      </header>

      {/* Alerts Panel Section */}
      {allAlerts.length > 0 && (
        <div className="bg-orange-500/10 border-l-4 border-orange-500 dark:border-orange-500 border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl animate-bounce">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">Alertas de Servicio Pendientes (15 días de margen)</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Atención urgente sugerida para evitar desperfectos mecánicos o multas.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAlerts.map((alert, i) => (
              <div 
                key={i} 
                className={`p-4 border rounded-2xl flex flex-col justify-between bg-white dark:bg-neutral-900 ${
                  alert.severity === 'error' ? 'border-red-200 dark:border-red-900/30' : 'border-orange-200 dark:border-orange-900/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-extrabold text-xs tracking-wider uppercase text-kraken-orange bg-kraken-orange/5 px-2 py-0.5 rounded-lg">{alert.vehiclePlate}</span>
                    <span className="text-[10px] font-bold text-neutral-400">{alert.serviceName}</span>
                  </div>
                  <h4 className="font-black text-sm text-neutral-900 dark:text-white mt-1">{alert.vehicleName}</h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 font-medium">{alert.message}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                  <button 
                    onClick={() => {
                      const veh = vehicles.find(v => v.plate === alert.vehiclePlate);
                      if (veh) {
                        setSelectedVehicle(veh);
                        setDetailTab('maintenance');
                        setMaintForm(prev => ({
                          ...prev,
                          type: alert.serviceName === 'Revisión Técnica' ? 'Revisión Técnica' : 
                                alert.serviceName === 'Filtro de Aire' ? 'Filtro Aire' : 
                                alert.serviceName === 'Filtro de Aceite' ? 'Filtro Aceite' : 'Cambio de Aceite',
                          km: String(veh.currentKm)
                        }));
                        setIsDetailModalOpen(true);
                        setIsLogMaintOpen(true);
                      }
                    }}
                    className="text-xs font-black text-kraken-orange hover:underline inline-flex items-center gap-1"
                  >
                    <Wrench size={12} />
                    <span>Registrar Solución</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Fleet */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar vehículo por marca, modelo o patente..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="kraken-input pl-12"
        />
      </div>

      {/* Fleet Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-kraken-orange border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredVehicles.map(vehicle => {
            const vehicleAlerts = getMaintenanceAlerts(vehicle);
            const totalFuelExp = getFuelExpensesTotal(vehicle);
            return (
              <div 
                key={vehicle.id} 
                onClick={() => {
                  setSelectedVehicle(vehicle);
                  setDetailTab('status');
                  setIsDetailModalOpen(true);
                }}
                className="kraken-card p-6 group cursor-pointer relative hover:border-kraken-orange/40 transition-all flex flex-col justify-between"
              >
                {/* Header info */}
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl">
                        <Car size={26} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold dark:text-white leading-tight">{vehicle.brand} {vehicle.model}</h3>
                        <p className="text-xs text-neutral-500 font-medium">Patente: <span className="font-extrabold uppercase text-neutral-800 dark:text-neutral-200">{vehicle.plate}</span> {vehicle.year ? `• Año ${vehicle.year}` : ''}</p>
                      </div>
                    </div>
                    {vehicleAlerts.length > 0 ? (
                      <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                        <AlertTriangle size={12} />
                        {vehicleAlerts.length} Alerta{vehicleAlerts.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Al día
                      </span>
                    )}
                  </div>

                  {/* Mileage & usage metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-2xl mb-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-neutral-400 dark:text-neutral-500 mb-1">
                        <Gauge size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Kilómetros</span>
                      </div>
                      <span className="text-sm font-black dark:text-white">{vehicle.currentKm?.toLocaleString('de-DE')} km</span>
                    </div>
                    <div className="text-center border-l border-neutral-150 dark:border-neutral-800">
                      <div className="flex items-center justify-center gap-1 text-neutral-400 dark:text-neutral-500 mb-1">
                        <Activity size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">KM / Mes</span>
                      </div>
                      <span className="text-sm font-black dark:text-white">{vehicle.kmPerMonth?.toLocaleString('de-DE')} km</span>
                    </div>
                    <div className="text-center border-l border-neutral-150 dark:border-neutral-800">
                      <div className="flex items-center justify-center gap-1 text-neutral-400 dark:text-neutral-500 mb-1">
                        <Activity size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">KM / Año</span>
                      </div>
                      <span className="text-sm font-black dark:text-white">{((vehicle.kmPerMonth || 0) * 12).toLocaleString('de-DE')} km</span>
                    </div>
                  </div>

                  {/* Core Services indicators */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Próximos Servicios</h4>
                    
                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-50 dark:border-neutral-800/40">
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">Cambio de Aceite</span>
                      <div className="text-right">
                        <span className="font-bold dark:text-white text-xs">{vehicle.oilChange?.nextDueKm?.toLocaleString('de-DE')} km</span>
                        <span className="text-[10px] text-neutral-400 block">{vehicle.oilChange?.nextDueDate || 'No definida'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-50 dark:border-neutral-800/40">
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">Filtro de Aire</span>
                      <div className="text-right">
                        <span className="font-bold dark:text-white text-xs">{vehicle.airFilter?.nextDueKm?.toLocaleString('de-DE')} km</span>
                        <span className="text-[10px] text-neutral-400 block">{vehicle.airFilter?.nextDueDate || 'No definida'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-50 dark:border-neutral-800/40">
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">Filtro de Aceite</span>
                      <div className="text-right">
                        <span className="font-bold dark:text-white text-xs">{vehicle.oilFilter?.nextDueKm?.toLocaleString('de-DE')} km</span>
                        <span className="text-[10px] text-neutral-400 block">{vehicle.oilFilter?.nextDueDate || 'No definida'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-50 dark:border-neutral-800/40">
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">Revisión Técnica / ITV</span>
                      <div className="text-right font-bold text-xs dark:text-white">
                        <span>{vehicle.technicalRevision?.nextDueDate || 'No definida'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer specs */}
                <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold">
                    <Fuel size={14} className="text-neutral-400" />
                    <span>Cargas: {vehicle.fuelHistory?.length || 0} • Gasto Total: <span className="font-extrabold text-neutral-800 dark:text-neutral-200">{totalFuelExp.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span></span>
                  </div>
                  
                  <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(vehicle);
                      }}
                      className="p-2 text-neutral-500 hover:text-kraken-orange hover:bg-kraken-orange/5 rounded-xl transition-all"
                      title="Editar Ficha Técnica"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmation(vehicle.id);
                      }}
                      className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                      title="Eliminar de la Flota"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
          <Car size={64} className="mx-auto text-neutral-300 mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">No se encontraron vehículos. Añade tu primer camioneta para comenzar.</p>
        </div>
      )}

      {/* A.B.M. CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden border border-neutral-150 dark:border-neutral-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
              <div>
                <h2 className="text-2xl font-bold tracking-tight dark:text-white">
                  {editingVehicle ? 'Editar Ficha del Vehículo' : 'Registrar Nuevo Vehículo'}
                </h2>
                <p className="text-xs text-neutral-400 mt-1 font-medium">Complete los datos generales y los intervalos recomendados de mantenimiento.</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              {/* Seccion 1: Datos Generales */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-kraken-orange uppercase tracking-[0.2em] border-b border-neutral-100 dark:border-neutral-800 pb-2">1. Datos Identificatorios</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Marca *</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ej. Toyota, Ford"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="kraken-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Modelo *</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ej. Hilux SRV, Ranger 4x4"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="kraken-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Patente / Matrícula *</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ej. AA123BC"
                      value={formData.plate}
                      onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                      className="kraken-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Año</label>
                    <input 
                      type="number" 
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                      className="kraken-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Kilómetros Iniciales</label>
                    <input 
                      type="number" 
                      value={formData.initialKm}
                      disabled={!!editingVehicle}
                      onChange={(e) => setFormData({ ...formData, initialKm: Number(e.target.value), currentKm: Number(e.target.value) })}
                      className="kraken-input disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Kilómetros Actuales</label>
                    <input 
                      type="number" 
                      value={formData.currentKm}
                      onChange={(e) => setFormData({ ...formData, currentKm: Number(e.target.value) })}
                      className="kraken-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Uso Estimado (KM / Mes) *</label>
                    <input 
                      required
                      type="number" 
                      value={formData.kmPerMonth}
                      onChange={(e) => setFormData({ ...formData, kmPerMonth: Number(e.target.value) })}
                      className="kraken-input"
                    />
                  </div>
                </div>
              </div>

              {/* Seccion 2: Hitos de Mantenimiento e Intervalos */}
              <div className="space-y-6">
                <h3 className="text-xs font-extrabold text-kraken-orange uppercase tracking-[0.2em] border-b border-neutral-100 dark:border-neutral-800 pb-2">2. Pautas e Historial de Mantenimiento</h3>
                
                {/* Cambio de Aceite */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl space-y-4 border border-neutral-150 dark:border-neutral-800">
                  <h4 className="font-black text-sm text-neutral-800 dark:text-white">Cambio de Aceite</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Último cambio (KM)</label>
                      <input 
                        type="number" 
                        value={formData.lastOilChangeKm}
                        onChange={(e) => setFormData({ ...formData, lastOilChangeKm: Number(e.target.value) })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Último cambio (Fecha)</label>
                      <input 
                        type="date" 
                        value={formData.lastOilChangeDate}
                        onChange={(e) => setFormData({ ...formData, lastOilChangeDate: e.target.value })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Frecuencia recomendada (KM)</label>
                      <input 
                        type="number" 
                        value={formData.oilChangeIntervalKm}
                        onChange={(e) => setFormData({ ...formData, oilChangeIntervalKm: Number(e.target.value) })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Frecuencia recomendada (Meses)</label>
                      <input 
                        type="number" 
                        value={formData.oilChangeIntervalMonths}
                        onChange={(e) => setFormData({ ...formData, oilChangeIntervalMonths: Number(e.target.value) })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtro Aire */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl space-y-4 border border-neutral-150 dark:border-neutral-800">
                  <h4 className="font-black text-sm text-neutral-800 dark:text-white">Filtro de Aire</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Último cambio (KM)</label>
                      <input 
                        type="number" 
                        value={formData.lastAirFilterKm}
                        onChange={(e) => setFormData({ ...formData, lastAirFilterKm: Number(e.target.value) })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Último cambio (Fecha)</label>
                      <input 
                        type="date" 
                        value={formData.lastAirFilterDate}
                        onChange={(e) => setFormData({ ...formData, lastAirFilterDate: e.target.value })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Frecuencia (KM)</label>
                      <input 
                        type="number" 
                        value={formData.airFilterIntervalKm}
                        onChange={(e) => setFormData({ ...formData, airFilterIntervalKm: Number(e.target.value) })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Frecuencia (Meses)</label>
                      <input 
                        type="number" 
                        value={formData.airFilterIntervalMonths}
                        onChange={(e) => setFormData({ ...formData, airFilterIntervalMonths: Number(e.target.value) })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtro Aceite */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl space-y-4 border border-neutral-150 dark:border-neutral-800">
                  <h4 className="font-black text-sm text-neutral-800 dark:text-white">Filtro de Aceite</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Último cambio (KM)</label>
                      <input 
                        type="number" 
                        value={formData.lastOilFilterKm}
                        onChange={(e) => setFormData({ ...formData, lastOilFilterKm: Number(e.target.value) })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Último cambio (Fecha)</label>
                      <input 
                        type="date" 
                        value={formData.lastOilFilterDate}
                        onChange={(e) => setFormData({ ...formData, lastOilFilterDate: e.target.value })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Frecuencia (KM)</label>
                      <input 
                        type="number" 
                        value={formData.oilFilterIntervalKm}
                        onChange={(e) => setFormData({ ...formData, oilFilterIntervalKm: Number(e.target.value) })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Frecuencia (Meses)</label>
                      <input 
                        type="number" 
                        value={formData.oilFilterIntervalMonths}
                        onChange={(e) => setFormData({ ...formData, oilFilterIntervalMonths: Number(e.target.value) })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Revision Tecnica */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl space-y-4 border border-neutral-150 dark:border-neutral-800">
                  <h4 className="font-black text-sm text-neutral-800 dark:text-white">Revisión Técnica / ITV</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Fecha última revisión</label>
                      <input 
                        type="date" 
                        value={formData.lastTechnicalRevisionDate}
                        onChange={(e) => setFormData({ ...formData, lastTechnicalRevisionDate: e.target.value })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Próximo Vencimiento (Margen Alerta)</label>
                      <input 
                        type="date" 
                        value={formData.nextTechnicalRevisionDate}
                        onChange={(e) => setFormData({ ...formData, nextTechnicalRevisionDate: e.target.value })}
                        className="kraken-input !h-10 !px-3 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky bottom-0 z-10 pb-2">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="kraken-btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="kraken-btn flex-1"
                >
                  <Save size={18} />
                  <span>{editingVehicle ? 'Guardar Cambios' : 'Registrar Vehículo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (FICHA TÉCNICA, COMBUSTIBLE, HISTORIAL) */}
      {isDetailModalOpen && selectedVehicle && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl rounded-[32px] shadow-2xl border border-neutral-150 dark:border-neutral-800 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-kraken-orange/15 text-kraken-orange rounded-2xl">
                  <Car size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{selectedVehicle.brand} {selectedVehicle.model}</h2>
                  <p className="text-xs text-neutral-500 font-bold mt-1.5 uppercase tracking-wider">Patente: <span className="text-neutral-800 dark:text-neutral-200">{selectedVehicle.plate}</span> • {selectedVehicle.currentKm?.toLocaleString('de-DE')} km actuales</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsLogFuelOpen(false);
                  setIsLogMaintOpen(false);
                }} 
                className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Navigation Tabs inside Details */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-8 shrink-0">
              <button 
                onClick={() => { setDetailTab('status'); setIsLogFuelOpen(false); setIsLogMaintOpen(false); }}
                className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
                  detailTab === 'status' ? 'border-kraken-orange text-kraken-orange' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Estado de Servicios
              </button>
              <button 
                onClick={() => { setDetailTab('maintenance'); setIsLogFuelOpen(false); setIsLogMaintOpen(false); }}
                className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
                  detailTab === 'maintenance' ? 'border-kraken-orange text-kraken-orange' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Historial de Mantenimientos ({selectedVehicle.maintenanceHistory?.length || 0})
              </button>
              <button 
                onClick={() => { setDetailTab('fuel'); setIsLogFuelOpen(false); setIsLogMaintOpen(false); }}
                className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
                  detailTab === 'fuel' ? 'border-kraken-orange text-kraken-orange' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Gasto de Combustible ({selectedVehicle.fuelHistory?.length || 0})
              </button>
            </div>

            {/* Scrollable Content Pane */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

              {/* TAB 1: STATUS DE SERVICIOS */}
              {detailTab === 'status' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  
                  {/* Kilometers Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-neutral-50 dark:bg-neutral-800/20 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center gap-4">
                      <div className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl">
                        <Gauge size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">Odómetro Actual</span>
                        <h4 className="text-xl font-black dark:text-white mt-0.5">{selectedVehicle.currentKm?.toLocaleString('de-DE')} km</h4>
                      </div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/20 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center gap-4">
                      <div className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl">
                        <Activity size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">Uso Promedio Mensual</span>
                        <h4 className="text-xl font-black dark:text-white mt-0.5">{selectedVehicle.kmPerMonth?.toLocaleString('de-DE')} km / mes</h4>
                      </div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/20 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center gap-4">
                      <div className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl">
                        <DollarSign size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">Gasto en Combustible</span>
                        <h4 className="text-xl font-black dark:text-white mt-0.5">{getFuelExpensesTotal(selectedVehicle).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</h4>
                      </div>
                    </div>
                  </div>

                  {/* Visual Status Grid */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Estado Detallado de Mantenimiento Preventivo</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Oil Change Card */}
                      <div className="p-5 border border-neutral-150 dark:border-neutral-800/80 rounded-2xl bg-white dark:bg-neutral-900 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm dark:text-white">Cambio de Aceite</span>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase">Cada {selectedVehicle.oilChange?.intervalKm?.toLocaleString('de-DE')} km o {selectedVehicle.oilChange?.intervalMonths} meses</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-neutral-450 block">Último realizado</span>
                            <span className="font-bold dark:text-white">{selectedVehicle.oilChange?.lastDoneKm?.toLocaleString('de-DE')} km</span>
                            <span className="text-[10px] text-neutral-400 block">{selectedVehicle.oilChange?.lastDoneDate || 'Sin registro'}</span>
                          </div>
                          <div className="border-l border-neutral-100 dark:border-neutral-800 pl-4">
                            <span className="text-neutral-450 block">Límite de vencimiento</span>
                            <span className="font-extrabold text-kraken-orange">{selectedVehicle.oilChange?.nextDueKm?.toLocaleString('de-DE')} km</span>
                            <span className="text-[10px] font-bold text-neutral-400 block">Vence: {selectedVehicle.oilChange?.nextDueDate || 'Sin registro'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Air Filter Card */}
                      <div className="p-5 border border-neutral-150 dark:border-neutral-800/80 rounded-2xl bg-white dark:bg-neutral-900 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm dark:text-white">Filtro de Aire</span>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase">Cada {selectedVehicle.airFilter?.intervalKm?.toLocaleString('de-DE')} km o {selectedVehicle.airFilter?.intervalMonths} meses</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-neutral-450 block">Último realizado</span>
                            <span className="font-bold dark:text-white">{selectedVehicle.airFilter?.lastDoneKm?.toLocaleString('de-DE')} km</span>
                            <span className="text-[10px] text-neutral-400 block">{selectedVehicle.airFilter?.lastDoneDate || 'Sin registro'}</span>
                          </div>
                          <div className="border-l border-neutral-100 dark:border-neutral-800 pl-4">
                            <span className="text-neutral-450 block">Límite de vencimiento</span>
                            <span className="font-extrabold text-kraken-orange">{selectedVehicle.airFilter?.nextDueKm?.toLocaleString('de-DE')} km</span>
                            <span className="text-[10px] font-bold text-neutral-400 block">Vence: {selectedVehicle.airFilter?.nextDueDate || 'Sin registro'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Oil Filter Card */}
                      <div className="p-5 border border-neutral-150 dark:border-neutral-800/80 rounded-2xl bg-white dark:bg-neutral-900 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm dark:text-white">Filtro de Aceite</span>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase">Cada {selectedVehicle.oilFilter?.intervalKm?.toLocaleString('de-DE')} km o {selectedVehicle.oilFilter?.intervalMonths} meses</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-neutral-450 block">Último realizado</span>
                            <span className="font-bold dark:text-white">{selectedVehicle.oilFilter?.lastDoneKm?.toLocaleString('de-DE')} km</span>
                            <span className="text-[10px] text-neutral-400 block">{selectedVehicle.oilFilter?.lastDoneDate || 'Sin registro'}</span>
                          </div>
                          <div className="border-l border-neutral-100 dark:border-neutral-800 pl-4">
                            <span className="text-neutral-450 block">Límite de vencimiento</span>
                            <span className="font-extrabold text-kraken-orange">{selectedVehicle.oilFilter?.nextDueKm?.toLocaleString('de-DE')} km</span>
                            <span className="text-[10px] font-bold text-neutral-400 block">Vence: {selectedVehicle.oilFilter?.nextDueDate || 'Sin registro'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Technical Revision Card */}
                      <div className="p-5 border border-neutral-150 dark:border-neutral-800/80 rounded-2xl bg-white dark:bg-neutral-900 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm dark:text-white">Revisión Técnica / Inspección</span>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase">Frecuencia Anual</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-neutral-450 block">Última revisión</span>
                            <span className="font-bold dark:text-white">{selectedVehicle.technicalRevision?.lastDoneDate || 'Sin registro'}</span>
                          </div>
                          <div className="border-l border-neutral-100 dark:border-neutral-800 pl-4">
                            <span className="text-neutral-450 block">Fecha Vencimiento</span>
                            <span className="font-extrabold text-kraken-orange">{selectedVehicle.technicalRevision?.nextDueDate || 'No definida'}</span>
                            <span className="text-[10px] font-semibold text-neutral-400 block">Días restantes: {selectedVehicle.technicalRevision?.nextDueDate ? getDaysUntil(selectedVehicle.technicalRevision.nextDueDate) : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HISTORIAL DE MANTENIMIENTO */}
              {detailTab === 'maintenance' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Historial de Trabajos Mecánicos</h3>
                      <p className="text-xs text-neutral-500">Reparaciones, revisiones e hitos técnicos del vehículo.</p>
                    </div>
                    {!isLogMaintOpen && (
                      <button 
                        onClick={() => {
                          setMaintForm(prev => ({ ...prev, km: String(selectedVehicle.currentKm) }));
                          setIsLogMaintOpen(true);
                        }}
                        className="kraken-btn !py-2.5 !px-4 text-xs"
                      >
                        <PlusCircle size={16} />
                        <span>Registrar Trabajo Realizado</span>
                      </button>
                    )}
                  </div>

                  {/* Register Maintenance Form Drawer */}
                  {isLogMaintOpen && (
                    <form onSubmit={handleLogMaintSubmit} className="bg-neutral-50 dark:bg-neutral-900/40 p-6 rounded-2xl border border-kraken-orange/20 animate-in slide-in-from-top duration-300 space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-150 dark:border-neutral-800 pb-2">
                        <span className="text-xs font-black text-kraken-orange uppercase tracking-wider">Cargar Trabajo Realizado</span>
                        <button type="button" onClick={() => setIsLogMaintOpen(false)} className="text-neutral-400 hover:text-neutral-600"><X size={16} /></button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Fecha del servicio</label>
                          <input 
                            required
                            type="date"
                            value={maintForm.date}
                            onChange={(e) => setMaintForm({ ...maintForm, date: e.target.value })}
                            className="kraken-input !h-10 !px-3 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Kilometraje del Servicio</label>
                          <input 
                            required
                            type="number"
                            placeholder="Ej. 65000"
                            value={maintForm.km}
                            onChange={(e) => setMaintForm({ ...maintForm, km: e.target.value })}
                            className="kraken-input !h-10 !px-3 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Tipo de Trabajo</label>
                          <select 
                            value={maintForm.type}
                            onChange={(e) => setMaintForm({ ...maintForm, type: e.target.value as any })}
                            className="kraken-input !h-10 !px-3 text-xs"
                          >
                            <option value="Cambio de Aceite">Cambio de Aceite</option>
                            <option value="Filtro Aire">Filtro de Aire</option>
                            <option value="Filtro Aceite">Filtro de Aceite</option>
                            <option value="Revisión Técnica">Revisión Técnica (ITV)</option>
                            <option value="Otro">Otro (Reparación / Repuesto)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Descripción de la Tarea Realizada *</label>
                          <input 
                            required
                            type="text"
                            placeholder="Ej. Cambio de bujías, cambio de aceite sintético 5W30"
                            value={maintForm.description}
                            onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
                            className="kraken-input !h-10 !px-3 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Costo Total (€)</label>
                          <input 
                            type="number"
                            placeholder="Ej. 150"
                            value={maintForm.cost}
                            onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })}
                            className="kraken-input !h-10 !px-3 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Notas adicionales</label>
                        <input 
                          type="text"
                          placeholder="Ej. Realizado en Taller Autorizado"
                          value={maintForm.notes}
                          onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })}
                          className="kraken-input !h-10 !px-3 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2 py-1">
                        <input 
                          type="checkbox"
                          id="updateMilestones"
                          checked={maintForm.updateMilestones}
                          onChange={(e) => setMaintForm({ ...maintForm, updateMilestones: e.target.checked })}
                          className="rounded text-kraken-orange focus:ring-kraken-orange/35 h-4 w-4"
                        />
                        <label htmlFor="updateMilestones" className="text-xs font-bold text-neutral-600 dark:text-neutral-400 select-none cursor-pointer">
                          Actualizar de forma automática el kilometraje actual y proyectar el próximo vencimiento
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button type="submit" className="kraken-btn !py-2 !px-4 text-xs flex-1">Registrar Mantenimiento</button>
                        <button type="button" onClick={() => setIsLogMaintOpen(false)} className="kraken-btn-secondary !py-2 !px-4 text-xs">Cancelar</button>
                      </div>
                    </form>
                  )}

                  {/* History Logs Table */}
                  {selectedVehicle.maintenanceHistory && selectedVehicle.maintenanceHistory.length > 0 ? (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-2xl overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-950 text-[10px] font-extrabold uppercase tracking-widest border-b border-neutral-150 dark:border-neutral-800 text-neutral-500">
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Kilometraje</th>
                            <th className="px-6 py-3">Servicio</th>
                            <th className="px-6 py-3">Detalle</th>
                            <th className="px-6 py-3 text-right">Costo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800 text-xs">
                          {selectedVehicle.maintenanceHistory.map((item, index) => (
                            <tr key={item.id || index} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                              <td className="px-6 py-4 font-bold text-neutral-600 dark:text-neutral-400">{item.date}</td>
                              <td className="px-6 py-4 font-extrabold dark:text-white">{item.km?.toLocaleString('de-DE')} km</td>
                              <td className="px-6 py-4">
                                <span className="bg-kraken-orange/5 text-kraken-orange font-bold px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">{item.type}</span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-bold dark:text-white">{item.description}</p>
                                {item.notes && <p className="text-[10px] text-neutral-400 italic mt-0.5">{item.notes}</p>}
                              </td>
                              <td className="px-6 py-4 text-right font-bold dark:text-white">{item.cost ? `${item.cost.toLocaleString('de-DE')} €` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/20 rounded-2xl border border-dashed border-neutral-250 dark:border-neutral-800">
                      <Wrench size={32} className="mx-auto text-neutral-300 mb-2" />
                      <p className="text-neutral-500 dark:text-neutral-400 font-medium">Aún no hay servicios registrados en el historial de este vehículo.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: GASTO EN COMBUSTIBLE */}
              {detailTab === 'fuel' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Registros de Carga de Combustible</h3>
                      <p className="text-xs text-neutral-500">Historial de gastos en nafta/diésel de la camioneta.</p>
                    </div>
                    {!isLogFuelOpen && (
                      <button 
                        onClick={() => {
                          setFuelForm(prev => ({ ...prev, km: String(selectedVehicle.currentKm) }));
                          setIsLogFuelOpen(true);
                        }}
                        className="kraken-btn !py-2.5 !px-4 text-xs"
                      >
                        <Fuel size={16} />
                        <span>Nueva Carga de Combustible</span>
                      </button>
                    )}
                  </div>

                  {/* Register Fuel purchase Drawer */}
                  {isLogFuelOpen && (
                    <form onSubmit={handleLogFuelSubmit} className="bg-neutral-50 dark:bg-neutral-900/40 p-6 rounded-2xl border border-kraken-orange/20 animate-in slide-in-from-top duration-300 space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-150 dark:border-neutral-800 pb-2">
                        <span className="text-xs font-black text-kraken-orange uppercase tracking-wider">Cargar Ticket de Combustible</span>
                        <button type="button" onClick={() => setIsLogFuelOpen(false)} className="text-neutral-400 hover:text-neutral-600"><X size={16} /></button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Fecha de carga</label>
                          <input 
                            required
                            type="date"
                            value={fuelForm.date}
                            onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                            className="kraken-input !h-10 !px-3 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Kilometraje Actual</label>
                          <input 
                            required
                            type="number"
                            placeholder="Ej. 62500"
                            value={fuelForm.km}
                            onChange={(e) => setFuelForm({ ...fuelForm, km: e.target.value })}
                            className="kraken-input !h-10 !px-3 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Litros cargados</label>
                          <input 
                            required
                            type="number"
                            step="any"
                            placeholder="Ej. 60"
                            value={fuelForm.liters}
                            onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })}
                            className="kraken-input !h-10 !px-3 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Precio por Litro (€)</label>
                          <input 
                            type="number"
                            step="0.001"
                            placeholder="Ej. 1.859"
                            value={fuelForm.pricePerLiter}
                            onChange={(e) => setFuelForm({ ...fuelForm, pricePerLiter: e.target.value })}
                            className="kraken-input !h-10 !px-3 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Costo Total de la Carga (€) *</label>
                          <input 
                            required
                            type="number"
                            step="any"
                            placeholder="Ej. 115"
                            value={fuelForm.totalCost}
                            onChange={(e) => setFuelForm({ ...fuelForm, totalCost: e.target.value })}
                            className="kraken-input !h-10 !px-3 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Notas / Estación de Servicio</label>
                        <input 
                          type="text"
                          placeholder="Ej. Estación Shell Polígono Industrial"
                          value={fuelForm.notes}
                          onChange={(e) => setFuelForm({ ...fuelForm, notes: e.target.value })}
                          className="kraken-input !h-10 !px-3 text-xs"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button type="submit" className="kraken-btn !py-2 !px-4 text-xs flex-1">Registrar Gasto de Combustible</button>
                        <button type="button" onClick={() => setIsLogFuelOpen(false)} className="kraken-btn-secondary !py-2 !px-4 text-xs">Cancelar</button>
                      </div>
                    </form>
                  )}

                  {/* Fuel Table */}
                  {selectedVehicle.fuelHistory && selectedVehicle.fuelHistory.length > 0 ? (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-2xl overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-950 text-[10px] font-extrabold uppercase tracking-widest border-b border-neutral-150 dark:border-neutral-800 text-neutral-500">
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">KM del odómetro</th>
                            <th className="px-6 py-3">Litros</th>
                            <th className="px-6 py-3">Precio/L</th>
                            <th className="px-6 py-3">Estación / Notas</th>
                            <th className="px-6 py-3 text-right">Gasto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800 text-xs">
                          {selectedVehicle.fuelHistory.map((item, index) => (
                            <tr key={item.id || index} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                              <td className="px-6 py-4 font-bold text-neutral-600 dark:text-neutral-400">{item.date}</td>
                              <td className="px-6 py-4 font-extrabold dark:text-white">{item.km?.toLocaleString('de-DE')} km</td>
                              <td className="px-6 py-4 dark:text-white">{item.liters} L</td>
                              <td className="px-6 py-4 dark:text-white">{item.pricePerLiter ? `${item.pricePerLiter.toFixed(3)} €` : '-'}</td>
                              <td className="px-6 py-4 text-neutral-500 italic">{item.notes || 'Sin notas'}</td>
                              <td className="px-6 py-4 text-right font-black dark:text-white">{item.totalCost?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/20 rounded-2xl border border-dashed border-neutral-250 dark:border-neutral-800">
                      <Fuel size={32} className="mx-auto text-neutral-300 mb-2" />
                      <p className="text-neutral-500 dark:text-neutral-400 font-medium">Aún no hay cargas de combustible registradas.</p>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="p-6 border-t border-neutral-150 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 shrink-0 flex gap-4">
              <button 
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenModal(selectedVehicle);
                }}
                className="kraken-btn-secondary flex-1"
              >
                <Edit2 size={16} />
                <span>Editar Ficha Técnica</span>
              </button>
              <button 
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsLogFuelOpen(false);
                  setIsLogMaintOpen(false);
                }}
                className="kraken-btn flex-1"
              >
                Cerrar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl p-8 border border-neutral-150 dark:border-neutral-800 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 dark:text-white">¿Dar de baja vehículo?</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-center mb-8 text-sm">
              Esta acción eliminará de forma irreversible el vehículo y todos sus historiales de mantenimiento y gastos en combustible de la base de datos de la empresa.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="kraken-btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirmation)}
                className="kraken-btn !bg-red-500 hover:!bg-red-600 flex-1"
              >
                Confirmar Baja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
