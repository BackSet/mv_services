// Utilidades para generación y evaluación de contraseñas para usuarios del sistema.

const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*-_=+?';

function pick(set: string): string {
  return set[Math.floor(Math.random() * set.length)];
}

function shuffle(s: string): string {
  const arr = s.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Genera una contraseña con la longitud indicada (mínimo 8) que incluye al menos
 * una mayúscula, una minúscula, un dígito y un símbolo. Excluye caracteres
 * ambiguos (0/O, 1/I/l) para reducir errores al transcribir.
 */
export function generarPassword(length = 12): string {
  const len = Math.max(8, Math.min(64, length));
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const rest: string[] = [];
  for (let i = required.length; i < len; i++) rest.push(pick(all));
  return shuffle([...required, ...rest].join(''));
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Muy débil' | 'Débil' | 'Aceptable' | 'Fuerte' | 'Muy fuerte';
  color: 'red' | 'orange' | 'amber' | 'emerald' | 'green';
};

/** Heurística simple para evaluar la fortaleza de una contraseña. */
export function evaluarPassword(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: 'Muy débil', color: 'red' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  // Cap a 4 (índice 0..4)
  const final = Math.max(0, Math.min(4, score - 1)) as 0 | 1 | 2 | 3 | 4;
  const labels: PasswordStrength['label'][] = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];
  const colors: PasswordStrength['color'][] = ['red', 'orange', 'amber', 'emerald', 'green'];
  return { score: final, label: labels[final], color: colors[final] };
}

/** Validación simple de email. */
export function esEmailValido(email: string | null | undefined): boolean {
  if (!email) return false;
  const v = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Validación de username: 3..50 chars, letras/números/._- y empieza con letra/número. */
export function esUsernameValido(username: string | null | undefined): boolean {
  if (!username) return false;
  const v = username.trim();
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,49}$/.test(v);
}
