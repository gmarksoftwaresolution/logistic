import React, { createContext, useState, useEffect } from 'react';
import i18n from '../locales/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LanguageContextType {
  locale: string;
  changeLanguage: (lang: string) => Promise<void>;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLanguage = await AsyncStorage.getItem('user-language');
      if (storedLanguage) {
        i18n.changeLanguage(storedLanguage);
        setLocale(storedLanguage);
      } else {
        // Force English for first-time users
        i18n.changeLanguage('en');
        setLocale('en');
      }
    };
    loadLanguage();
  }, []);

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem('user-language', lang);
    setLocale(lang);
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t: (key: string) => i18n.t(key) }}>
      {children}
    </LanguageContext.Provider>
  );
};
