/**
 * Procesa una lista de elementos con un número limitado de tareas concurrentes
 * y devuelve los resultados en el mismo orden de entrada.
 *
 * Útil para llamadas en paralelo a APIs sin saturar el backend ni el navegador.
 */
export async function processPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  if (items.length === 0) return results;
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) return;
        results[idx] = await fn(items[idx], idx);
      }
    },
  );
  await Promise.all(workers);
  return results;
}
