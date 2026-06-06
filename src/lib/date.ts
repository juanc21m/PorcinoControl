import { parseISO } from 'date-fns';

/**
 * `parseISO` seguro.
 *
 * date-fns `parseISO(null | undefined)` lanza `TypeError: ... reading 'split'`,
 * lo que crashea el render si un dato de Supabase trae una fecha nula. Este
 * wrapper nunca lanza: ante valores vacíos o no-string devuelve una fecha
 * inválida (`new Date(NaN)`), de modo que los cálculos posteriores
 * (`getYear`, `differenceInDays`, etc.) den `NaN` en lugar de romper la app.
 */
export function safeParseISO(value: unknown): Date {
  if (typeof value !== 'string' || value.trim() === '') return new Date(NaN);
  try {
    return parseISO(value);
  } catch {
    return new Date(NaN);
  }
}
