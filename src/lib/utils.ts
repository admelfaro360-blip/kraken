import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFirebaseDate(date: any): string {
  if (!date) return new Date().toISOString();
  
  // Handle Firebase Timestamp
  if (date && typeof date === 'object' && 'seconds' in date) {
    return new Date(date.seconds * 1000).toISOString();
  }
  
  // Handle toDate() method if exists
  if (date && typeof date.toDate === 'function') {
    return date.toDate().toISOString();
  }

  // Handle already ISO string or Date object
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }

  return new Date().toISOString();
}
