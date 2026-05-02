import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import en from '../locales/en.json';
import es from '../locales/es.json';
import ptBR from '../locales/pt-BR.json';
import {resolveLocale} from './resolveLocale';

const resources = {
  en: {translation: en},
  'pt-BR': {translation: ptBR},
  es: {translation: es},
};

const initial = resolveLocale('', typeof navigator !== 'undefined' ? navigator.language : 'en');

void i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: 'en',
  interpolation: {escapeValue: false},
});

export {i18n};
