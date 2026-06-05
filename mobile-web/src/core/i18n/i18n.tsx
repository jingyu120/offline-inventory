import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../../utils/translations';

export type Language = 'en' | 'my';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (
    key: keyof (typeof translations)['en'],
    options?: Record<string, string | number>,
  ) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>('my');

  // Load language preference from local storage if available in web
  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_lang');
      if (saved === 'en' || saved === 'my') {
        setLanguageState(saved as Language);
      } else {
        setLanguageState('my');
      }
    } catch {
      setLanguageState('my');
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('app_lang', lang);
    } catch {
      // Ignore for native platforms
    }
  };

  const t = (
    key: keyof (typeof translations)['en'],
    options?: Record<string, string | number>,
  ) => {
    const dict = translations[language] as Record<string, string>;
    let val =
      dict[key] ||
      (translations['en'] as Record<string, string>)[key] ||
      String(key);
    if (options) {
      Object.entries(options).forEach(([k, v]) => {
        val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return val;
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
