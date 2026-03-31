import { Budget, Client, WorkOrder } from '../types';
import { db, auth } from './firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  where,
  getDoc
} from 'firebase/firestore';

const BUDGETS_COLLECTION = 'budgets';
const CLIENTS_COLLECTION = 'clients';
const PAYMENTS_COLLECTION = 'payments';
const WORK_ORDERS_COLLECTION = 'work_orders';
const EXPENSES_COLLECTION = 'expenses';
const CONFIG_COLLECTION = 'config';
const USERS_COLLECTION = 'users';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const fetchBudgets = async (): Promise<Budget[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, BUDGETS_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as Budget);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, BUDGETS_COLLECTION);
    return [];
  }
};

export const getStoredBudgets = fetchBudgets;

export const saveBudget = async (budget: Budget) => {
  try {
    await setDoc(doc(db, BUDGETS_COLLECTION, budget.id), budget);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, BUDGETS_COLLECTION);
  }
};

export const deleteBudget = async (id: string) => {
  try {
    await deleteDoc(doc(db, BUDGETS_COLLECTION, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, BUDGETS_COLLECTION);
  }
};

export const fetchClients = async (): Promise<Client[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, CLIENTS_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as Client);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, CLIENTS_COLLECTION);
    return [];
  }
};

export const getStoredClients = fetchClients;

export const saveClient = async (client: Client) => {
  try {
    await setDoc(doc(db, CLIENTS_COLLECTION, client.id), client);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, CLIENTS_COLLECTION);
  }
};

export const deleteClient = async (id: string) => {
  try {
    await deleteDoc(doc(db, CLIENTS_COLLECTION, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, CLIENTS_COLLECTION);
  }
};

export const getBudgetsByClientId = async (clientId: string): Promise<Budget[]> => {
  try {
    const q = query(collection(db, BUDGETS_COLLECTION), where('clientId', '==', clientId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Budget);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, BUDGETS_COLLECTION);
    return [];
  }
};

export const fetchPayments = async (): Promise<any[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, PAYMENTS_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data());
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, PAYMENTS_COLLECTION);
    return [];
  }
};

export const getStoredPayments = fetchPayments;

export const savePayment = async (payment: any) => {
  try {
    await setDoc(doc(db, PAYMENTS_COLLECTION, payment.id), payment);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, PAYMENTS_COLLECTION);
  }
};

export const deletePayment = async (id: string) => {
  try {
    await deleteDoc(doc(db, PAYMENTS_COLLECTION, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, PAYMENTS_COLLECTION);
  }
};

export const fetchWorkOrders = async (): Promise<WorkOrder[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, WORK_ORDERS_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as WorkOrder);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, WORK_ORDERS_COLLECTION);
    return [];
  }
};

export const getStoredWorkOrders = fetchWorkOrders;

export const saveWorkOrder = async (order: WorkOrder) => {
  try {
    await setDoc(doc(db, WORK_ORDERS_COLLECTION, order.id), order);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, WORK_ORDERS_COLLECTION);
  }
};

export const deleteWorkOrder = async (id: string) => {
  try {
    await deleteDoc(doc(db, WORK_ORDERS_COLLECTION, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, WORK_ORDERS_COLLECTION);
  }
};

export const fetchExpenses = async (): Promise<any[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, EXPENSES_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data());
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, EXPENSES_COLLECTION);
    return [];
  }
};

export const getStoredExpenses = fetchExpenses;

export const saveExpense = async (expense: any) => {
  try {
    await setDoc(doc(db, EXPENSES_COLLECTION, expense.id), expense);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, EXPENSES_COLLECTION);
  }
};

export const deleteExpense = async (id: string) => {
  try {
    await deleteDoc(doc(db, EXPENSES_COLLECTION, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, EXPENSES_COLLECTION);
  }
};

export const fetchConfig = async (): Promise<any> => {
  try {
    const docSnap = await getDoc(doc(db, CONFIG_COLLECTION, 'business'));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    // Return default config if none exists
    return {
      fixedCosts: [
        { id: '1', name: 'Seguro Responsabilidad Civil', amount: 5 },
        { id: '2', name: 'Seguro Accidentes Laborales', amount: 190 },
        { id: '3', name: 'Seguro Camioneta', amount: 21 },
        { id: '4', name: 'Mantenimiento Vehículo', amount: 100 },
        { id: '5', name: 'Gestión Empresa (Magency)', amount: 300 }
      ],
      variableCosts: [],
      daysPerMonth: 24,
      halfDayCostOficial: 40,
      halfDayCostAyudante: 30,
      guaranteePct: 0.08,
      materialMarkup: 0.25,
      iva: 0.23,
      transportZones: [
        { id: 1, name: 'Zona 1 (Base)', amount: 10 },
        { id: 2, name: 'Zona 2', amount: 15 },
        { id: 3, name: 'Zona 3', amount: 20 },
        { id: 4, name: 'Zona 4', amount: 30 }
      ]
    };
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, CONFIG_COLLECTION);
    return null;
  }
};

export const saveConfig = async (config: any) => {
  try {
    await setDoc(doc(db, CONFIG_COLLECTION, 'business'), config);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, CONFIG_COLLECTION);
  }
};

export const fetchUsers = async (): Promise<any[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data());
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, USERS_COLLECTION);
    return [];
  }
};

export const saveUser = async (user: any) => {
  try {
    await setDoc(doc(db, USERS_COLLECTION, user.id), user);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, USERS_COLLECTION);
  }
};

export const deleteUser = async (id: string) => {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, USERS_COLLECTION);
  }
};

export const getUserById = async (id: string): Promise<any | null> => {
  try {
    const docSnap = await getDoc(doc(db, USERS_COLLECTION, id));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, USERS_COLLECTION);
    return null;
  }
};

export const resetAllData = async () => {
  // Resetting Firestore data is more complex than localStorage.
  // For simplicity, we'll just reload the page for now.
  window.location.reload();
};
