import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

export type Language = 'en' | 'my';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof (typeof translations)['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language preference from local storage if available in web
  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_lang');
      if (saved === 'en' || saved === 'my') {
        setLanguageState(saved as Language);
      }
    } catch (_) {
      // Ignore for native platforms
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('app_lang', lang);
    } catch (_) {
      // Ignore for native platforms
    }
  };

  const t = (key: keyof (typeof translations)['en']) => {
    const dict = translations[language];
    return dict[key] || translations['en'][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
