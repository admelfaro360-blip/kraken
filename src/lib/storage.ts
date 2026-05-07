import { Budget, Client, WorkOrder, Expense, Employee } from '../types';
import { db, auth } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  setDoc,
  getDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const BUDGETS_COLLECTION = 'budgets';
const CLIENTS_COLLECTION = 'clients';
const PAYMENTS_COLLECTION = 'payments';
const WORK_ORDERS_COLLECTION = 'work_orders';
const EXPENSES_COLLECTION = 'expenses';
const EMPLOYEES_COLLECTION = 'employees';
const CONFIG_COLLECTION = 'config';
const USERS_COLLECTION = 'users';

// ... (resto de funciones fetchBudgets, fetchClients, etc. se mantienen igual)

export const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, EMPLOYEES_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as Employee);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, EMPLOYEES_COLLECTION);
    return [];
  }
};

export const saveEmployee = async (employee: Employee) => {
  try {
    await setDoc(doc(db, EMPLOYEES_COLLECTION, employee.id), employee);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, EMPLOYEES_COLLECTION);
  }
};

export const deleteEmployee = async (id: string) => {
  try {
    await deleteDoc(doc(db, EMPLOYEES_COLLECTION, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, EMPLOYEES_COLLECTION);
  }
};

// ...
