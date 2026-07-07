import { Budget, Client, WorkOrder, Expense, AgendaNote, MaintenanceRecord, ClientAgreement } from '../types';
import { db, auth, storage } from './firebase';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
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
const AGENDA_NOTES_COLLECTION = 'agenda_notes';
const MAINTENANCE_COLLECTION = 'maintenance';
const AGREEMENTS_COLLECTION = 'agreements';

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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('🔥 FIRESTORE BLOCK:', operationType, path, 'Razón:', error);
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo));
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

export const getStoredBudgets = async (): Promise<Budget[]> => {
  return fetchBudgets();
};

export const saveBudget = async (budget: Budget) => {
  try {
    await setDoc(doc(db, BUDGETS_COLLECTION, budget.id), budget);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, BUDGETS_COLLECTION);
  }
};

export const deleteWorkOrdersByBudgetId = async (budgetId: string) => {
  try {
    const q = query(collection(db, WORK_ORDERS_COLLECTION), where('budgetId', '==', budgetId));
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(document => deleteDoc(doc(db, WORK_ORDERS_COLLECTION, document.id)));
    await Promise.all(deletePromises);
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, WORK_ORDERS_COLLECTION);
  }
};

export const deleteBudget = async (id: string) => {
  try {
    // Cascade delete work orders related to this budget
    await deleteWorkOrdersByBudgetId(id);
    
    // Delete the budget itself
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

export const getStoredClients = async (): Promise<Client[]> => {
  return fetchClients();
};

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

export const getStoredPayments = async (): Promise<any[]> => {
  return fetchPayments();
};

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

export const getStoredWorkOrders = async (): Promise<WorkOrder[]> => {
  return fetchWorkOrders();
};

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

export const fetchExpenses = async (): Promise<Expense[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, EXPENSES_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as Expense);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, EXPENSES_COLLECTION);
    return [];
  }
};

export const getStoredExpenses = async (): Promise<Expense[]> => {
  return fetchExpenses();
};

export const saveExpense = async (expense: Expense) => {
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
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
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

export const fetchAgendaNotes = async (): Promise<AgendaNote[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, AGENDA_NOTES_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as AgendaNote);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, AGENDA_NOTES_COLLECTION);
    return [];
  }
};

export const saveAgendaNote = async (note: AgendaNote) => {
  try {
    await setDoc(doc(db, AGENDA_NOTES_COLLECTION, note.id), note);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, AGENDA_NOTES_COLLECTION);
  }
};

export const deleteAgendaNote = async (id: string) => {
  try {
    await deleteDoc(doc(db, AGENDA_NOTES_COLLECTION, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, AGENDA_NOTES_COLLECTION);
  }
};

export const fetchMaintenances = async (): Promise<MaintenanceRecord[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, MAINTENANCE_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MaintenanceRecord[];
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, MAINTENANCE_COLLECTION);
    return [];
  }
};

export const saveMaintenance = async (record: MaintenanceRecord) => {
  try {
    await setDoc(doc(db, MAINTENANCE_COLLECTION, record.id), record);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, MAINTENANCE_COLLECTION);
  }
};

export const deleteMaintenance = async (id: string) => {
  try {
    await deleteDoc(doc(db, MAINTENANCE_COLLECTION, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, MAINTENANCE_COLLECTION);
  }
};

export const fetchAgreements = async (): Promise<ClientAgreement[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, AGREEMENTS_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as ClientAgreement);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, AGREEMENTS_COLLECTION);
    return [];
  }
};

export const saveAgreement = async (agreement: ClientAgreement) => {
  try {
    await setDoc(doc(db, AGREEMENTS_COLLECTION, agreement.id), agreement);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, AGREEMENTS_COLLECTION);
  }
};

export const deleteAgreement = async (id: string) => {
  try {
    await deleteDoc(doc(db, AGREEMENTS_COLLECTION, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, AGREEMENTS_COLLECTION);
  }
};


export const uploadMaintenancePhotos = async (files: File[], maintenanceId: string): Promise<string[]> => {
  try {
    const urls: string[] = [];
    for (const file of files) {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const uniqueName = `${timestamp}_${randomString}_${file.name}`;
      const fileRef = sRef(storage, `maintenance/${maintenanceId}/${uniqueName}`);
      
      const snapshot = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      urls.push(downloadUrl);
    }
    return urls;
  } catch (e) {
    console.warn("Storage failed or not configured, using base64 fallback:", e);
    const base64Promises = files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });
    });
    return Promise.all(base64Promises);
  }
};

export const resetAllData = async () => {
  // Resetting Firestore data is more complex than localStorage.
  // For simplicity, we'll just reload the page for now.
  window.location.reload();
};
