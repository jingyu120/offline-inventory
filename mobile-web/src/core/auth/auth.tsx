import React, { createContext, useContext, useState, useEffect } from 'react';
import { getActiveRepId, saveActiveRepId } from '../storage/platformStorage';

export interface RepUser {
  id: string;
  name: string;
  username: string;
  role: 'sales' | 'manager' | 'admin' | 'intake';
  regionId?: string | null;
  regionName?: string | null;
}

export const REPS: RepUser[] = [
  {
    id: 'rep-1',
    name: 'Ko Min',
    username: 'rep1',
    role: 'sales',
    regionId: 'region-yangon',
    regionName: 'Yangon',
  },
  {
    id: 'rep-2',
    name: 'Ko Hla',
    username: 'rep2',
    role: 'sales',
    regionId: 'region-mandalay',
    regionName: 'Mandalay',
  },
  {
    id: 'rep-3',
    name: 'Ma Thida',
    username: 'rep3',
    role: 'manager',
    regionId: null,
    regionName: 'All Regions',
  },
  {
    id: 'rep-4',
    name: 'U Hlaing',
    username: 'rep4',
    role: 'admin',
    regionId: null,
    regionName: 'All Access',
  },
  {
    id: 'rep-5',
    name: 'Daw Khin',
    username: 'rep5',
    role: 'intake',
    regionId: null,
    regionName: 'Warehouse',
  },
];

interface AuthContextType {
  activeRep: RepUser;
  setActiveRep: (rep: RepUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeRep, setActiveRepState] = useState<RepUser>(REPS[0]);

  useEffect(() => {
    const loadRep = async () => {
      try {
        const saved = await getActiveRepId();
        if (saved) {
          const found = REPS.find((r) => r.id === saved);
          if (found) setActiveRepState(found);
        }
      } catch (e) {
        console.error('Failed to load active rep:', e);
      }
    };
    loadRep();
  }, []);

  const setActiveRep = async (rep: RepUser) => {
    setActiveRepState(rep);
    try {
      await saveActiveRepId(rep.id);
    } catch (e) {
      console.error('Failed to save active rep:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ activeRep, setActiveRep }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
