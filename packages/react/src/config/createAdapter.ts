import type { StorageAdapter } from '../types';
import { transientStorageAdapter, createHttpAdapter } from './storageAdapters';

export function createAdapter(apiUrl?: string): StorageAdapter {
  return apiUrl ? createHttpAdapter(apiUrl) : transientStorageAdapter;
}
