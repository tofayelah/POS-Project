import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Language, Translations } from './types';
import { en } from './en';
import { bn } from './bn';

const translations: Record<Language, Translations> = {
  en,
  bn,
};

const STORAGE_KEY = 'retailcore_lang';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'bn' || saved === 'en') {
        return saved;
      }
    } catch {
      // LocalStorage access fallback
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // LocalStorage access fallback
    }
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>): string => {
    let fallback: string | undefined;
    let effectiveParams = params;
    if (typeof fallbackOrParams === 'object' && fallbackOrParams !== null) {
      effectiveParams = fallbackOrParams;
    } else if (typeof fallbackOrParams === 'string') {
      fallback = fallbackOrParams;
    }

    let text = translations[language]?.[key] || translations.en?.[key] || fallback || key;
    if (effectiveParams) {
      Object.entries(effectiveParams).forEach(([pKey, pVal]) => {
        text = text.replace(new RegExp(`{${pKey}}`, 'g'), String(pVal));
      });
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const useTranslation = useLanguage;
