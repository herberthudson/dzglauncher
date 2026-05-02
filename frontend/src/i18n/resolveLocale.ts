export const SUPPORTED_LOCALES = ['en', 'pt-BR', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function resolveLocale(saved: string, navigatorLanguage: string): SupportedLocale {
  const s = (saved || '').trim();
  if (s && s !== 'auto' && (SUPPORTED_LOCALES as readonly string[]).includes(s)) {
    return s as SupportedLocale;
  }
  const n = (navigatorLanguage || 'en').toLowerCase();
  if (n.startsWith('pt')) {
    return 'pt-BR';
  }
  if (n.startsWith('es')) {
    return 'es';
  }
  return 'en';
}
