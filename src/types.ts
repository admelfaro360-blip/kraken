// src/types.ts

// ... (otras interfaces)

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: 'Mano de Obra' | 'Materiales' | 'Combustible' | 'Herramientas' | 'Costos Fijos' | 'Varios';
  employeeId?: string; // Opcional, para saber a quién se le pagó
  budgetId?: string; // Opcional, para atar el gasto a un proyecto
  workOrderId?: string; // Opcional, para atar el gasto a una orden de trabajo específica
  method: 'Efectivo' | 'Transferencia' | 'Tarjeta de Débito' | 'Tarjeta de Crédito';
  subCategory?: string; // Para desglosar categorías como Costos Fijos
}
