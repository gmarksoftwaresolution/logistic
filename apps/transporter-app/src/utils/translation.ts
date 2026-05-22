import i18n from '../localization/i18n';

/**
 * A reusable translation helper function to fetch translated strings outside of React components.
 * 
 * @param key The translation key path (e.g. 'common.save')
 * @param options Interpolation options or configuration
 * @returns The translated string or key if not found
 */
export const translate = (key: string, options?: any): string => {
  return i18n.t(key, options) as string;
};

/**
 * Get the current active language code.
 * 
 * @returns 'en' | 'hi' | 'mr'
 */
export const getActiveLanguage = (): string => {
  return i18n.language;
};
