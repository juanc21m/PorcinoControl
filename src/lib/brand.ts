/** Identidad de marca: Agrocomercial Moreno. */
export const APP_NAME = 'Agrocomercial Moreno';

/**
 * Logo oficial servido como asset estático desde `public/logo.svg`.
 *
 * Se sirve local a propósito: cuando el logo se cargaba desde Supabase Storage,
 * una caída del backend dejaba la marca como imagen rota en toda la app. Vite
 * copia `public/` a la raíz del build, así que `/logo.svg` funciona en dev y en
 * producción sin depender de ningún servicio externo.
 */
export const LOGO_URL = '/logo.svg';
