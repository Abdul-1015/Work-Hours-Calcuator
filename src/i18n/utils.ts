import en from './en.json';
import es from './es.json';
import pt from './pt.json';
import fr from './fr.json';
import de from './de.json';
import hi from './hi.json';
import ar from './ar.json';
import ja from './ja.json';
import zh from './zh.json';
import ru from './ru.json';

export type Locale = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'hi' | 'ar' | 'ja' | 'zh' | 'ru';

export const locales: Locale[] = ['en', 'es', 'pt', 'fr', 'de', 'hi', 'ar', 'ja', 'zh', 'ru'];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  hi: 'हिन्दी',
  ar: 'العربية',
  ja: '日本語',
  zh: '中文',
  ru: 'Русский',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇧🇷',
  fr: '🇫🇷',
  de: '🇩🇪',
  hi: '🇮🇳',
  ar: '🇸🇦',
  ja: '🇯🇵',
  zh: '🇨🇳',
  ru: '🇷🇺',
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  es: 'ltr',
  pt: 'ltr',
  fr: 'ltr',
  de: 'ltr',
  hi: 'ltr',
  ar: 'rtl',
  ja: 'ltr',
  zh: 'ltr',
  ru: 'ltr',
};

const translations: Record<Locale, typeof en> = {
  en, es, pt, fr, de, hi, ar, ja, zh, ru,
};

export function getTranslations(locale: Locale): typeof en {
  return translations[locale] || translations.en;
}

export function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0] as Locale;
  if (locales.includes(firstSegment)) {
    return firstSegment;
  }
  return 'en';
}

export function getLocalizedPath(locale: Locale, path: string): string {
  if (locale === 'en') {
    return path;
  }
  return `/${locale}${path}`;
}

export function getAlternateLanguageLinks(currentLocale: Locale, currentPath: string): { locale: Locale; url: string; label: string }[] {
  const basePath = currentLocale === 'en'
    ? currentPath
    : currentPath.replace(`/${currentLocale}`, '') || '/';

  return locales.map(locale => ({
    locale,
    url: locale === 'en' ? basePath : `/${locale}${basePath}`,
    label: localeNames[locale],
  }));
}
