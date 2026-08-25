import i18next, { type i18n as I18nInstance } from 'i18next';
import { resources } from './translations';

export const i18n: I18nInstance = i18next.createInstance();
i18n.init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  nsSeparator: false,
});

export const I18N_OPTIONS: { i18n: I18nInstance } = { i18n };
