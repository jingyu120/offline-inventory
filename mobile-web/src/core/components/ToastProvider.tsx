import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';

export type ToastType = 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getEmoji = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '🚨';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container floating at bottom-right on web / bottom on mobile */}
      <View style={[styles.container, !isDesktop && { bottom: 80 }]}>
        {toasts.map((toast) => {
          const borderThemeColor =
            toast.type === 'error' ? 'danger' : toast.type;
          const bgThemeColor =
            toast.type === 'error' ? 'dangerBg' : (`${toast.type}Bg` as const);

          return (
            <TouchableOpacity
              key={toast.id}
              onPress={() => handleDismiss(toast.id)}
              activeOpacity={0.9}
            >
              <Box
                p="m"
                mb="s"
                borderRadius="m"
                borderWidth={1.5}
                borderColor={borderThemeColor}
                bg={bgThemeColor}
                flexDirection="row"
                alignItems="center"
                style={
                  {
                    ...(Platform.OS === 'web'
                      ? { boxShadow: '0px 4px 8px rgba(0,0,0,0.10)' }
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.1,
                          shadowRadius: 8,
                        }),
                    elevation: 4,
                    backdropFilter: 'blur(8px)', // Glassmorphism
                    minWidth: 280,
                    maxWidth: 400,
                  } as $Any
                }
              >
                <Text fontSize={18} style={{ marginRight: 10 }}>
                  {getEmoji(toast.type)}
                </Text>
                <Box style={{ flex: 1 }}>
                  <Text
                    variant="body"
                    fontSize={13}
                    fontWeight="semibold"
                    color="primaryText"
                  >
                    {toast.message}
                  </Text>
                </Box>
              </Box>
            </TouchableOpacity>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: Platform.OS === 'web' ? 24 : 16,
    left: Platform.OS === 'web' ? undefined : 16,
    zIndex: 9999,
  },
});
