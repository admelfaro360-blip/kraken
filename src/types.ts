// src/lib/storage.ts
import { Expense } from '../types';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';

const EXPENSES_COLLECTION = 'expenses';

// ... (Otras funciones de storage)

export const fetchExpenses = async (): Promise<Expense[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, EXPENSES_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as Expense);
  } catch (e) {
    console.error("Error fetching expenses", e);
    return [];
  }
};

export const saveExpense = async (expense: Expense) => {
  try {
    await setDoc(doc(db, EXPENSES_COLLECTION, expense.id), expense);
  } catch (e) {
    console.error("Error saving expense", e);
  }
};

export const deleteExpense = async (id: string) => {
  try {
    await deleteDoc(doc(db, EXPENSES_COLLECTION, id));
  } catch (e) {
    console.error("Error deleting expense", e);
  }
};
