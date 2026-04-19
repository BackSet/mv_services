import { useMemo, useState } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  X,
  ShieldCheck,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Permiso } from '@/services/permisos.service';
import {
  agruparPermisos,
  accionBadgeClass,
  getAccionInfo,
} from '@/lib/permisosAgrupados';
import { cn } from '@/lib/utils';

// =============================================================================
// Tipos
// =============================================================================

export type PermisosSelectorProps = {
  permisos: Permiso[];                  // Lista completa disponible
  selectedIds: string[];                // IDs seleccionados (string)
  onChange: (next: string[]) => void;
  /** Plantilla rápida sugerida cuando no hay nada seleccionado. */
  presetReadOnly?: boolean;
};

// =============================================================================
// Componente
// =============================================================================

export function PermisosSelector({
  permisos,
  selectedIds,
  onChange,
  presetReadOnly = false,
}: PermisosSelectorProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Datos derivados
  // ---------------------------------------------------------------------------

  const grupos = useMemo(() => agruparPermisos(permisos), [permisos]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return grupos;
    return grupos
      .map((g) => ({
        ...g,
        permisos: g.permisos.filter(
          (p) =>
            p.nombre.toLowerCase().includes(q) ||
            p.descripcion?.toLowerCase().includes(q) ||
            g.modulo.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.permisos.length > 0);
  }, [grupos, query]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const totalSeleccionados = selectedIds.length;
  const totalDisponibles = permisos.length;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const togglePermiso = (id: string) => {
    if (presetReadOnly) return;
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const toggleGrupo = (moduloKey: string) => {
    const grupo = grupos.find((g) => g.moduloKey === moduloKey);
    if (!grupo) return;
    const ids = grupo.permisos.map((p) => String(p.id));
    const allSelected = ids.every((id) => selectedSet.has(id));
    const next = new Set(selectedSet);
    if (allSelected) {
      ids.forEach((id) => next.delete(id));
    } else {
      ids.forEach((id) => next.add(id));
    }
    onChange(Array.from(next));
  };

  const seleccionarTodos = () => {
    onChange(permisos.map((p) => String(p.id)));
  };

  const limpiar = () => {
    onChange([]);
  };

  const seleccionarSoloLectura = () => {
    const ids: string[] = [];
    for (const p of permisos) {
      const accion = getAccionInfo(p.nombre);
      if (accion.tone === 'read') ids.push(String(p.id));
    }
    onChange(ids);
  };

  const toggleCollapse = (moduloKey: string) => {
    const next = new Set(collapsed);
    if (next.has(moduloKey)) next.delete(moduloKey);
    else next.add(moduloKey);
    setCollapsed(next);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (totalDisponibles === 0) {
    return (
      <div className="text-center py-8 rounded-lg border border-dashed border-border/50 text-sm text-muted-foreground">
        <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-30" />
        No hay permisos disponibles en el sistema.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Barra de acciones rápidas */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar permiso o módulo…"
            className="h-9 pl-8 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1 text-xs"
            onClick={seleccionarTodos}
            disabled={presetReadOnly || totalSeleccionados === totalDisponibles}
            title="Seleccionar todos los permisos"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Todos</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1 text-xs"
            onClick={seleccionarSoloLectura}
            disabled={presetReadOnly}
            title="Seleccionar solo permisos de lectura"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Solo lectura</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1 text-xs text-muted-foreground"
            onClick={limpiar}
            disabled={presetReadOnly || totalSeleccionados === 0}
            title="Quitar todas las selecciones"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </Button>
        </div>
      </div>

      {/* Indicador de selección */}
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{totalSeleccionados}</span>
          {' de '}
          <span className="tabular-nums">{totalDisponibles}</span> permisos seleccionados
          {query && (
            <span className="ml-2 opacity-70">
              · {filtrados.reduce((acc, g) => acc + g.permisos.length, 0)} coinciden
            </span>
          )}
        </p>
        <div className="h-1 flex-1 max-w-[200px] rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${totalDisponibles ? (totalSeleccionados / totalDisponibles) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Lista de grupos */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto rounded-xl border border-border/40 bg-background/30 p-2">
        {filtrados.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Sin coincidencias para "{query}"</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setQuery('')}
            >
              Limpiar búsqueda
            </Button>
          </div>
        ) : (
          filtrados.map((g) => {
            const ids = g.permisos.map((p) => String(p.id));
            const seleccionadosGrupo = ids.filter((id) => selectedSet.has(id)).length;
            const todosSeleccionados = seleccionadosGrupo === ids.length;
            const algunosSeleccionados =
              seleccionadosGrupo > 0 && seleccionadosGrupo < ids.length;
            const isCollapsed = collapsed.has(g.moduloKey);

            return (
              <div
                key={g.moduloKey}
                className="rounded-lg border border-border/40 bg-card/50 overflow-hidden"
              >
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/10">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(g.moduloKey)}
                    className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent text-muted-foreground transition-colors"
                    aria-label={isCollapsed ? 'Expandir' : 'Contraer'}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGrupo(g.moduloKey)}
                    disabled={presetReadOnly}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left disabled:cursor-default"
                  >
                    {todosSeleccionados ? (
                      <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                    ) : algunosSeleccionados ? (
                      <span className="h-4 w-4 rounded-sm bg-primary/30 border border-primary inline-flex items-center justify-center shrink-0">
                        <span className="h-2 w-2 bg-primary rounded-sm" />
                      </span>
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider truncate">
                      {g.modulo}
                    </span>
                  </button>
                  <Badge
                    variant="outline"
                    className="text-[10px] tabular-nums shrink-0"
                  >
                    {seleccionadosGrupo}/{ids.length}
                  </Badge>
                </div>

                {!isCollapsed && (
                  <ul className="divide-y divide-border/20">
                    {g.permisos.map((p) => {
                      const id = String(p.id);
                      const checked = selectedSet.has(id);
                      const accion = getAccionInfo(p.nombre);
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => togglePermiso(id)}
                            disabled={presetReadOnly}
                            className={cn(
                              'w-full flex items-start gap-3 px-3 py-2 text-left transition-colors',
                              'hover:bg-accent/30 disabled:cursor-default',
                              checked && 'bg-primary/5',
                            )}
                          >
                            {checked ? (
                              <CheckSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-mono">{p.nombre}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] ${accionBadgeClass(accion.tone)}`}
                                >
                                  {accion.label}
                                </Badge>
                              </div>
                              {p.descripcion && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {p.descripcion}
                                </p>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
