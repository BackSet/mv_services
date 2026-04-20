import { useCallback, useState } from 'react';
import { notify } from '@/lib/notify';

interface UseNotifyActionMessages<TResult> {
    /** Texto que se muestra en el toast mientras la acción está en curso. */
    loading: string;
    /** Texto del toast cuando la acción termina con éxito. */
    success: string | ((data: TResult) => string);
    /** Mensaje principal cuando falla. Si se omite usa un genérico. */
    error?: string | ((err: unknown) => string);
    /** Descripción opcional para el estado de éxito. */
    description?: string | ((data: TResult) => string);
}

/**
 * Envuelve una operación asíncrona ligando el spinner del botón
 * (`loading`) y el toast de Sonner (`loading → success/error`) en un
 * único flag `isLoading`.
 *
 * @example
 * const guardar = useNotifyAction(crearUsuario, {
 *   loading: 'Creando usuario…',
 *   success: (u) => `Usuario "${u.username}" creado`,
 *   description: (u) => `Identificador: ${u.id}`,
 * });
 *
 * <Button loading={guardar.isLoading} onClick={() => guardar.run(form)}>
 *   Crear
 * </Button>
 */
export function useNotifyAction<TArgs extends unknown[], TResult>(
    action: (...args: TArgs) => Promise<TResult>,
    msgs: UseNotifyActionMessages<TResult>,
) {
    const [isLoading, setIsLoading] = useState(false);

    const run = useCallback(
        async (...args: TArgs): Promise<TResult | undefined> => {
            setIsLoading(true);
            try {
                const result = await notify.promise(action(...args), {
                    loading: msgs.loading,
                    success: msgs.success,
                    error: msgs.error,
                    description: msgs.description,
                });
                return result;
            } catch {
                // El toast de error ya fue mostrado por notify.promise;
                // devolvemos undefined para no obligar al consumidor a manejar el throw.
                return undefined;
            } finally {
                setIsLoading(false);
            }
        },
        [action, msgs.loading, msgs.success, msgs.error, msgs.description],
    );

    return { run, isLoading };
}
