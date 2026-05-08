import { Budget, Client, WorkOrder, Expense } from '../types';
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

export const getUserById = async (id: string): Promise<any | null> => {
  try {
    const docSnap = await getDoc(doc(db, USERS_COLLECTION, id));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, USERS_COLLECTION);
    return null;
  }
};
// ... rest of the storage functions (Expenses, Config, etc) keep existing implementation
