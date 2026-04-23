/**
 * Borrador de «Nuevo consolidado» en localStorage (lista de guías + guía del consolidado).
 */

export const CONSOLIDADO_DRAFT_KEY = 'mv_consolidado_draft';
export const CONSOLIDADO_DRAFT_TIMESTAMP_KEY = 'mv_consolidado_draft_ts';

/** True si hay borrador con al menos una guía de paquete o guía de consolidado guardada. */
export function hasActiveConsolidadoDraft(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(CONSOLIDADO_DRAFT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.some((g) => typeof g === 'string' && g.trim().length > 0);
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      'v' in parsed &&
      (parsed as { v: number }).v === 2 &&
      Array.isArray((parsed as { items?: unknown }).items)
    ) {
      const p = parsed as unknown as { items: { g?: string }[]; consolidadoGuia?: string };
      const hasItems = p.items.some(
        (it) => it && typeof it.g === 'string' && it.g.trim().length > 0,
      );
      const hasGuia =
        typeof p.consolidadoGuia === 'string' && p.consolidadoGuia.trim().length > 0;
      return hasItems || hasGuia;
    }

    return false;
  } catch {
    return false;
  }
}
