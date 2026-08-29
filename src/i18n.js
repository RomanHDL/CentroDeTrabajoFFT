// Andamiaje i18n (MI Stack Reference, sección 10, HARD RULE) -- Fase 4 de
// la migración de compliance. Trilingüe: en (fallback técnico), es-MX
// (idioma real del personal de piso), zh-CN. namespaces: common,
// navigation, auth -- por ahora. Ninguna página se tradujo todavía a
// propósito (eso pasa página por página cuando se migre a Tailwind, ver
// plan de migración) -- esto solo prueba el framework end-to-end con el
// menú de navegación y el login.
//
// Idioma por defecto = es-MX, NO el que detecte el navegador: el personal
// de piso habla español, y la mayoría de los dispositivos en producción
// nunca cambiaron su idioma del sistema -- dejar que el navegador decida
// arriesgaba mostrar inglés/otro idioma a alguien que nunca lo pidió.
// `order: ['localStorage']` (sin 'navigator') es justo por eso: la ÚNICA
// forma de salir de es-MX es que alguien lo cambie explícitamente con el
// selector (persiste en localStorage) -- nunca automático.
//
// fallbackLng también es 'es-MX' (no 'en'): si algún día una traducción
// queda incompleta en otro idioma, es más útil que el texto faltante
// aparezca en español (el idioma real de la mayoría) que en inglés.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'es-MX',
    supportedLngs: ['es-MX', 'en', 'zh-CN'],
    ns: ['common', 'navigation', 'auth'],
    defaultNS: 'common',
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'fft_language',
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export default i18n
