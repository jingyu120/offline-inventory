import { useState, useEffect } from 'react';

export interface SyncConflict {
  id: string;
  table: string;
  localRecord: any;
  remoteRecord: any;
  resolve: (resolvedRecord: any) => void;
}

// Simple event-emitter/subscriber pattern to avoid direct RxJS dependency if not installed
type Listener = (conflicts: SyncConflict[]) => void;
let listeners: Listener[] = [];
let activeConflicts: SyncConflict[] = [];

export const SyncConflictManager = {
  getConflicts() {
    return activeConflicts;
  },

  subscribe(listener: Listener) {
    listeners.push(listener);
    listener([...activeConflicts]);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  registerConflict(
    table: string,
    localRecord: any,
    remoteRecord: any,
  ): Promise<any> {
    return new Promise((resolve) => {
      // Use crypto.randomUUID() for collision-free IDs, with a fallback if undefined
      const conflictId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now().toString(36);

      const resolveConflict = (resolved: any) => {
        activeConflicts = activeConflicts.filter((c) => c.id !== conflictId);
        listeners.forEach((l) => l([...activeConflicts]));
        resolve(resolved);
      };

      const newConflict: SyncConflict = {
        id: conflictId,
        table,
        localRecord,
        remoteRecord,
        resolve: resolveConflict,
      };

      activeConflicts = [...activeConflicts, newConflict];
      listeners.forEach((l) => l([...activeConflicts]));
    });
  },
};

export function useSyncConflicts() {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  useEffect(() => {
    return SyncConflictManager.subscribe((current) => {
      setConflicts(current);
    });
  }, []);

  return conflicts;
}
