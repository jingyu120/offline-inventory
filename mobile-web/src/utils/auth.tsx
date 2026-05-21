import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface RepUser {
  id: string;
  name: string;
  username: string;
}

export const REPS: RepUser[] = [
  { id: 'rep-1', name: 'Ko Min', username: 'rep1' },
  { id: 'rep-2', name: 'Ko Hla', username: 'rep2' },
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
        if (Platform.OS !== 'web') {
          const saved = await SecureStore.getItemAsync('active_rep_id');
          if (saved) {
            const found = REPS.find((r) => r.id === saved);
            if (found) setActiveRepState(found);
          }
        } else {
          const saved = localStorage.getItem('active_rep_id');
          if (saved) {
            const found = REPS.find((r) => r.id === saved);
            if (found) setActiveRepState(found);
          }
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
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('active_rep_id', rep.id);
      } else {
        localStorage.setItem('active_rep_id', rep.id);
      }
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
