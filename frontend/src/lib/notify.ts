import { toast, type ExternalToast } from 'sonner';
import axios from 'axios';

export type NotifyOptions = ExternalToast;

export type ToastId = string | number;

interface PromiseMessages<T> {
    loading: string;
    success: string | ((data: T) => string);
    error?: string | ((err: unknown) => string);
    description?: string | ((data: T) => string);
}

function extractApiMessage(err: unknown): string | undefined {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as
            | { message?: string; detail?: string; error?: string }
            | undefined;
        const fromBody = data?.message || data?.detail || data?.error;
        if (fromBody && typeof fromBody === 'string') return fromBody;
        if (err.code === 'ERR_NETWORK')
            return 'No se pudo contactar al servidor. Revisa tu conexión.';
        if (err.response?.status === 401)
            return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
        if (err.response?.status === 403) return 'No tienes permisos para esta acción.';
        if (err.response?.status === 404) return 'El recurso no fue encontrado.';
        if (err.response?.status && err.response.status >= 500)
            return 'Error del servidor. Intenta nuevamente en unos segundos.';
        return err.message;
    }
    if (err instanceof Error) return err.message;
    return undefined;
}

export const notify = {
    /** Aviso de éxito. */
    success: (title: string, opts?: NotifyOptions): ToastId =>
        toast.success(title, opts),

    /** Aviso de error. Usa duración mayor para dar tiempo a leer. */
    error: (title: string, opts?: NotifyOptions): ToastId =>
        toast.error(title, { duration: 8000, ...opts }),

    /** Aviso de advertencia (no bloqueante). */
    warning: (title: string, opts?: NotifyOptions): ToastId =>
        toast.warning(title, opts),

    /** Aviso informativo neutro. */
    info: (title: string, opts?: NotifyOptions): ToastId =>
        toast.info(title, opts),

    /** Toast de carga manual. Devuelve el id para luego cerrar o actualizar. */
    loading: (title: string, opts?: NotifyOptions): ToastId =>
        toast.loading(title, opts),

    /** Cierra un toast por id, o todos si se omite. */
    dismiss: (id?: ToastId) => toast.dismiss(id),

    /**
     * Maneja una promesa con un único toast: pasa de loading → success/error
     * sobre el mismo id (sin parpadeos ni saltos visuales).
     */
    promise: <T>(p: Promise<T>, msgs: PromiseMessages<T>): Promise<T> => {
        toast.promise(p, {
            loading: msgs.loading,
            success: (data) =>
                typeof msgs.success === 'function' ? msgs.success(data) : msgs.success,
            error: (err) => {
                const fallback =
                    typeof msgs.error === 'function'
                        ? msgs.error(err)
                        : msgs.error ?? 'No se pudo completar la operación';
                const apiMsg = extractApiMessage(err);
                return apiMsg ? `${fallback} — ${apiMsg}` : fallback;
            },
            description: msgs.description
                ? (data) =>
                      typeof msgs.description === 'function'
                          ? (msgs.description as (d: T) => string)(data)
                          : (msgs.description as string)
                : undefined,
        });
        return p;
    },

    // -------------------------------------------------------------------------
    // Atajos de plantilla — mensajes claros y consistentes
    // -------------------------------------------------------------------------

    /** "Paquete creado" + descripción "Identificador: <ref>" si se pasa. */
    created: (entidad: string, ref?: string): ToastId =>
        toast.success(`${entidad} creado`, {
            description: ref ? `Identificador: ${ref}` : undefined,
        }),

    /** "Paquete actualizado" */
    updated: (entidad: string, ref?: string): ToastId =>
        toast.success(`${entidad} actualizado`, {
            description: ref ? `Identificador: ${ref}` : undefined,
        }),

    /** "Paquete eliminado" */
    deleted: (entidad: string, ref?: string): ToastId =>
        toast.success(`${entidad} eliminado`, {
            description: ref ? `Identificador: ${ref}` : undefined,
        }),

    /** "Texto copiado al portapapeles" */
    copied: (label = 'Texto'): ToastId =>
        toast.success(`${label} copiado al portapapeles`),

    /** "Revisa los campos marcados" + descripción opcional con detalle. */
    validation: (extra?: string): ToastId =>
        toast.error('Revisa los campos marcados', {
            description: extra ?? 'Hay datos pendientes o inválidos.',
        }),

    /** Error genérico mapeando errores de Axios a mensajes legibles. */
    apiError: (err: unknown, fallback = 'Ocurrió un error inesperado'): ToastId =>
        toast.error(fallback, {
            description: extractApiMessage(err),
            duration: 8000,
        }),

    // -------------------------------------------------------------------------
    // Atajos de carga (mismas plantillas que created/updated/deleted)
    // -------------------------------------------------------------------------

    saving: (entidad: string): ToastId =>
        toast.loading(`Guardando ${entidad.toLowerCase()}…`),

    creating: (entidad: string): ToastId =>
        toast.loading(`Creando ${entidad.toLowerCase()}…`),

    updating: (entidad: string): ToastId =>
        toast.loading(`Actualizando ${entidad.toLowerCase()}…`),

    deleting: (entidad: string): ToastId =>
        toast.loading(`Eliminando ${entidad.toLowerCase()}…`),

    loadingData: (entidad: string): ToastId =>
        toast.loading(`Cargando ${entidad.toLowerCase()}…`),
};

export { toast };
