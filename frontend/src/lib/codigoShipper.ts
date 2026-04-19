// Generación de códigos internos para shippers.
// Formato: SHP-XXXX donde X ∈ {alfanuméricos sin caracteres ambiguos}.
// Se omiten 0/O, 1/I/L para evitar confusiones al transcribir.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PREFIX = 'SHP';
const LENGTH = 4;
const MAX_ATTEMPTS = 50;

function randomChar(): string {
  return ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
}

function randomCode(): string {
  let suffix = '';
  for (let i = 0; i < LENGTH; i++) suffix += randomChar();
  return `${PREFIX}-${suffix}`;
}

/**
 * Genera un código interno único para un shipper, evitando colisiones
 * contra la lista de códigos existentes (case-insensitive).
 * - `existingCodes`: lista de códigos ya en uso (se ignoran null/undefined/vacíos).
 * - `excludeCode`: código actual del shipper en edición (no cuenta como colisión).
 */
export function generarCodigoInternoShipper(
  existingCodes: Array<string | null | undefined>,
  excludeCode?: string | null,
): string {
  const taken = new Set(
    existingCodes
      .map((c) => (c ?? '').trim().toUpperCase())
      .filter((c) => c.length > 0 && c !== (excludeCode ?? '').trim().toUpperCase()),
  );

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidato = randomCode();
    if (!taken.has(candidato.toUpperCase())) return candidato;
  }
  // Fallback extremadamente improbable: añade un sufijo numérico basado en timestamp.
  return `${randomCode()}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

/** Valida formato esperado (no obliga a usarlo, sólo informa). */
export function esCodigoInternoConFormato(value: string | null | undefined): boolean {
  const v = (value ?? '').trim().toUpperCase();
  return new RegExp(`^${PREFIX}-[${ALPHABET}]{${LENGTH}}$`).test(v);
}
