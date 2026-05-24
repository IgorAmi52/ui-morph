import type { StorageAdapter } from '../types';
import { localStorageAdapter, createHttpAdapter } from './storageAdapters';

export function createAdapter(apiUrl?: string): StorageAdapter {
  return apiUrl ? createHttpAdapter(apiUrl) : localStorageAdapter;
}
