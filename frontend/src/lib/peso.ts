/**
 * Helpers de peso. La aplicación sólo almacena peso en libras (lbs);
 * los valores en kilogramos siempre se derivan al vuelo para mostrar en la UI.
 */

/** Factor de conversión libras → kilogramos (mismo valor que el backend). */
export const LBS_TO_KGS = 0.45359237;
/** Factor de conversión kilogramos → libras. */
export const KGS_TO_LBS = 2.2046226218;

/**
 * Convierte un valor en libras a kilogramos.
 * Devuelve `null` si el input no es un número válido.
 */
export function lbsToKgs(lbs: number | null | undefined): number | null {
  if (lbs == null) return null;
  const n = Number(lbs);
  if (!Number.isFinite(n)) return null;
  return n * LBS_TO_KGS;
}

/**
 * Convierte un valor en kilogramos a libras (por si llega input en kgs
 * en algún flujo legacy, lo normalizamos a la unidad canónica).
 */
export function kgsToLbs(kgs: number | null | undefined): number | null {
  if (kgs == null) return null;
  const n = Number(kgs);
  if (!Number.isFinite(n)) return null;
  return n * KGS_TO_LBS;
}

/**
 * Formatea un número con N decimales y separadores de miles en español.
 * Devuelve cadena vacía si el valor no es válido.
 */
export function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(Number(n))) return '';
  return Number(n).toLocaleString('es-EC', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formatea un peso en libras con sufijo " lbs" (vacío si no aplica). */
export function formatLbs(lbs: number | null | undefined, decimals = 2): string {
  const f = formatNumber(lbs, decimals);
  return f ? `${f} lbs` : '';
}

/** Formatea un peso en libras como kilogramos derivados con sufijo " kgs". */
export function formatKgsFromLbs(lbs: number | null | undefined, decimals = 2): string {
  const f = formatNumber(lbsToKgs(lbs), decimals);
  return f ? `${f} kgs` : '';
}
