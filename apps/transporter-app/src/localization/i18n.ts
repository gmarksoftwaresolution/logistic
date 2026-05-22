import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import hi from './hi.json';
import mr from './mr.json';

const LANGUAGE_KEY = 'user-language';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
};

// Automatic language detection
const getDeviceLanguage = () => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const code = locales[0].languageCode;
    if (code === 'hi' || code === 'mr') {
      return code;
    }
  }
  return 'en'; // default fallback
};

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }
      callback(getDeviceLanguage());
    } catch (error) {
      console.warn('Error reading language from AsyncStorage:', error);
      callback(getDeviceLanguage());
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.warn('Error saving language to AsyncStorage:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
