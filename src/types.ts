export interface CostItem {
  id: string;
  name: string;
  amount: number;
}

export interface ZoneItem {
  id: number;
  name: string;
  amount: number;
}

export interface BusinessConfig {
  fixedCosts: CostItem[];
  variableCosts: CostItem[];
  daysPerMonth: number;
  halfDayCostOficial: number;
  halfDayCostAyudante: number;
  guaranteePct: number;
  materialMarkup: number;
  iva: number;
  transportZones: ZoneItem[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  password?: string;
}

export interface Client {
  id: string;
  name: string;
  vertical: 'hogar' | 'industria';
  address: string;
  city?: string;
  phone: string;
  email: string;
  zone: number;
  notes?: string;
  createdAt?: string;
}

export interface LaborAssignment {
  id: string;
  role: 'oficial' | 'ayudante';
  count: number;
  assignedPerson?: string;
}

export interface Phase {
  id: string;
  name: string;
  labor: LaborAssignment[];
  halfDays: number;
  days: number;
  extraTransport: number;
  notes?: string;
}

export interface Material {
  id: string;
  name: string;
  cost: number;
  quantity: number;
}

export interface Budget {
  id: string;
  clientId: string;
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientVertical?: 'hogar' | 'industria';
  date: string;
  description: string;
  language: 'es' | 'pt' | 'en';
  status: 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'ejecucion' | 'finalizado' | 'cobrado';
  phases: Phase[];
  materials: Material[];
  internalNotes?: string;
  startDate?: string;
  marginPct: number;
  subtotal?: number;
  total?: number;
  createdAt?: string;
}

export interface CalculationResult {
  moTotal: number;
  structureTotal: number;
  transportTotal: number;
  guarantee: number;
  minWithoutMargin: number;
  marginEur: number;
  marginPct: number;
  materialsFactured: number;
  subtotal: number;
  iva: number;
  total: number;
}

export interface WorkOrder {
  id: string;
  budgetId: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  description: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  crewId?: string;
  status: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
  assignedTo?: string[];
  phases?: Phase[];
  notes?: string;
  createdAt?: string;
}

export interface Payment {
  id: string;
  budgetId: string;
  clientId: string;
  clientName: string;
  amount: number;
  date: string;
  status: 'pendiente' | 'cobrado' | 'parcial';
  method?: 'transferencia' | 'efectivo' | 'tarjeta';
  notes?: string;
  createdAt?: string;
  dueDate?: string;
}

export interface Expense {
  id: string;
  category: 'fijo' | 'mano_de_obra' | 'transporte' | 'materiales' | 'otros';
  description: string;
  amount: number;
  date: string;
  period: 'mensual' | 'anual' | 'puntual';
}
