import type { Permiso } from '@/services/permisos.service';

// Convención del backend: los permisos se llaman `modulo.accion` (p.ej. `paquetes.read`,
// `consolidados.add_paquete`). Mantenemos como respaldo el formato legacy `MODULO_ACCION`
// cuando no hay punto. Si tampoco hay separador, el permiso cae bajo "General".

export type GrupoPermisos = {
  modulo: string;        // Etiqueta legible para mostrar en UI (ej. "Paquetes").
  moduloKey: string;     // Clave normalizada (ej. "PAQUETE").
  permisos: Permiso[];   // Permisos del módulo, ordenados por nombre.
};

const MODULO_LABELS: Record<string, string> = {
  PAQUETE: 'Paquetes',
  PAQUETES: 'Paquetes',
  CONSOLIDADO: 'Consolidados',
  CONSOLIDADOS: 'Consolidados',
  SHIPPER: 'Shippers',
  SHIPPERS: 'Shippers',
  USUARIO: 'Usuarios',
  USUARIOS: 'Usuarios',
  ROL: 'Roles',
  ROLES: 'Roles',
  PERMISO: 'Permisos',
  PERMISOS: 'Permisos',
  REPORTE: 'Reportes',
  REPORTES: 'Reportes',
  ESTADO: 'Estados',
  ESTADOS: 'Estados',
  CONFIG: 'Configuración',
  ADMIN: 'Administración',
  AUTH: 'Autenticación',
  AUDITORIA: 'Auditoría',
  GENERAL: 'General',
};

const ACCION_LABELS: Record<string, { label: string; tone: 'create' | 'read' | 'update' | 'delete' | 'manage' | 'other' }> = {
  CREAR: { label: 'Crear', tone: 'create' },
  CREATE: { label: 'Crear', tone: 'create' },
  CREATE_MINIMO: { label: 'Crear (mínimo)', tone: 'create' },
  NUEVO: { label: 'Crear', tone: 'create' },
  AGREGAR: { label: 'Agregar', tone: 'create' },
  REGISTRAR: { label: 'Registrar', tone: 'create' },
  ADD_PAQUETE: { label: 'Agregar paquete', tone: 'create' },

  LEER: { label: 'Leer', tone: 'read' },
  LISTAR: { label: 'Listar', tone: 'read' },
  VER: { label: 'Ver', tone: 'read' },
  CONSULTAR: { label: 'Consultar', tone: 'read' },
  READ: { label: 'Leer', tone: 'read' },
  VIEW: { label: 'Ver', tone: 'read' },

  EDITAR: { label: 'Editar', tone: 'update' },
  ACTUALIZAR: { label: 'Actualizar', tone: 'update' },
  MODIFICAR: { label: 'Modificar', tone: 'update' },
  UPDATE: { label: 'Actualizar', tone: 'update' },
  EDIT: { label: 'Editar', tone: 'update' },
  CERRAR: { label: 'Cerrar', tone: 'update' },
  ABRIR: { label: 'Abrir', tone: 'update' },
  APROBAR: { label: 'Aprobar', tone: 'update' },
  RECHAZAR: { label: 'Rechazar', tone: 'update' },

  ELIMINAR: { label: 'Eliminar', tone: 'delete' },
  BORRAR: { label: 'Eliminar', tone: 'delete' },
  DELETE: { label: 'Eliminar', tone: 'delete' },
  REMOVE: { label: 'Eliminar', tone: 'delete' },

  ADMIN: { label: 'Administrar', tone: 'manage' },
  ADMINISTRAR: { label: 'Administrar', tone: 'manage' },
  GESTIONAR: { label: 'Gestionar', tone: 'manage' },
  MANAGE: { label: 'Gestionar', tone: 'manage' },
  EXPORTAR: { label: 'Exportar', tone: 'other' },
  IMPRIMIR: { label: 'Imprimir', tone: 'other' },
  IMPORTAR: { label: 'Importar', tone: 'other' },
};

export type AccionTone = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'other';

/**
 * Devuelve la clave de módulo a partir del nombre del permiso (en mayúsculas).
 * Soporta ambas convenciones:
 *  - `modulo.accion` (formato actual del backend, p.ej. `paquetes.read`).
 *  - `MODULO_ACCION` (formato legacy, p.ej. `PAQUETE_CREAR`).
 */
export function getModuloKey(nombre: string | null | undefined): string {
  const v = (nombre ?? '').trim().toUpperCase();
  if (!v) return 'GENERAL';
  const dot = v.indexOf('.');
  if (dot > 0) return v.slice(0, dot);
  const us = v.indexOf('_');
  if (us > 0) return v.slice(0, us);
  return 'GENERAL';
}

/** Devuelve la etiqueta legible del módulo. */
export function getModuloLabel(moduloKey: string): string {
  return MODULO_LABELS[moduloKey] ?? capitalize(moduloKey.toLowerCase());
}

/**
 * Devuelve la acción (parte después del primer separador `.` o `_`) y su clasificación visual.
 * Si la acción es compuesta (p.ej. `add_paquete`, `create_minimo`) primero se busca la coincidencia
 * exacta y luego se hace fallback a una etiqueta legible derivada del propio nombre.
 */
export function getAccionInfo(nombre: string | null | undefined): {
  raw: string;
  label: string;
  tone: AccionTone;
} {
  const v = (nombre ?? '').trim().toUpperCase();
  if (!v) return { raw: '', label: '', tone: 'other' };

  let idx = v.indexOf('.');
  if (idx < 0) idx = v.indexOf('_');
  if (idx < 0 || idx === v.length - 1) {
    return { raw: v, label: capitalize(v.toLowerCase()), tone: 'other' };
  }

  const accion = v.slice(idx + 1);
  const meta = ACCION_LABELS[accion];
  if (meta) return { raw: accion, label: meta.label, tone: meta.tone };

  // Para acciones compuestas (p.ej. `add_paquete`) intentamos clasificar por el primer token.
  const firstToken = accion.split('_')[0];
  const fallback = ACCION_LABELS[firstToken];
  const tone: AccionTone = fallback?.tone ?? 'other';
  return { raw: accion, label: capitalize(accion.toLowerCase().replace(/_/g, ' ')), tone };
}

/** Clases Tailwind para colorear badges según el tono de la acción. */
export function accionBadgeClass(tone: AccionTone): string {
  switch (tone) {
    case 'create': return 'bg-success/15 text-success border-success/30';
    case 'read': return 'bg-info/15 text-info border-info/30';
    case 'update': return 'bg-warning/15 text-warning border-warning/30';
    case 'delete': return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'manage': return 'bg-accent-soft text-accent-soft-foreground border-accent/30';
    default: return 'bg-muted text-muted-foreground border-border/50';
  }
}

/** Agrupa una lista de permisos por módulo y los ordena por nombre. */
export function agruparPermisos(permisos: Permiso[]): GrupoPermisos[] {
  const map = new Map<string, Permiso[]>();
  for (const p of permisos) {
    const key = getModuloKey(p.nombre);
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  const grupos: GrupoPermisos[] = [];
  for (const [moduloKey, list] of map.entries()) {
    grupos.push({
      moduloKey,
      modulo: getModuloLabel(moduloKey),
      permisos: list.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    });
  }
  // GENERAL siempre al final, el resto alfabético por etiqueta
  grupos.sort((a, b) => {
    if (a.moduloKey === 'GENERAL') return 1;
    if (b.moduloKey === 'GENERAL') return -1;
    return a.modulo.localeCompare(b.modulo);
  });
  return grupos;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
