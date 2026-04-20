import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Inbox, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSolicitudesPendientes } from '@/hooks/useSolicitudesPendientes';
import { ListRowsSkeleton } from '@/components/skeletons';

function timeAgoEs(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  if (sec < 60) return `hace ${sec} s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months === 1 ? '' : 'es'}`;
  const years = Math.floor(months / 12);
  return `hace ${years} año${years === 1 ? '' : 's'}`;
}

export default function NotificacionesBell() {
  const navigate = useNavigate();
  const { enabled, count, list, listLoading, refetch } = useSolicitudesPendientes({
    withList: true,
    notify: true,
  });

  if (!enabled) {
    // Render simple cuando el usuario no tiene permiso (mantenemos la campana por consistencia visual).
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted relative transition-colors ease-claude"
            aria-label="Notificaciones"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-0 rounded-xl overflow-hidden shadow-popover">
          <div className="px-3 py-3 border-b border-border/60 flex items-center justify-between">
            <div className="font-medium text-sm">Notificaciones</div>
            <Badge variant="outline" className="text-[10px]">
              Pronto
            </Badge>
          </div>
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            <Bell className="h-6 w-6 mx-auto mb-2 opacity-40" />
            No hay notificaciones por ahora.
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const top = list.slice(0, 5);
  const hasItems = top.length > 0;
  const badgeText = count > 99 ? '99+' : String(count);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-lg relative transition-colors ease-claude hover:bg-muted ${
            count > 0
              ? 'text-accent hover:text-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label={`Notificaciones (${count} pendientes)`}
          title={count > 0 ? `${count} solicitudes pendientes` : 'Notificaciones'}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold shadow-soft ring-2 ring-background"
              aria-hidden="true"
            >
              {badgeText}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0 rounded-xl overflow-hidden shadow-popover">
        <div className="px-3 py-3 border-b border-border/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Inbox className="h-4 w-4 text-accent shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm leading-none">Solicitudes de shipper</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {count > 0 ? `${count} pendiente${count === 1 ? '' : 's'} de revisión` : 'Todo al día'}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-muted"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void refetch();
            }}
            title="Actualizar"
            aria-label="Actualizar"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {listLoading && !hasItems ? (
          <div className="px-2 py-2">
            <ListRowsSkeleton rows={4} />
          </div>
        ) : hasItems ? (
          <div className="max-h-[320px] overflow-y-auto">
            {top.map((s) => {
              const hace = timeAgoEs(s.fechaSolicitud);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => navigate(`/solicitudes-shippers?focus=${s.id}`)}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors ease-claude flex items-start gap-3 border-b border-border/40 last:border-b-0 relative"
                >
                  <span
                    className="absolute left-1 top-3 h-1.5 w-1.5 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  <div className="h-8 w-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center shrink-0">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {s.shipperNombre || s.username}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate font-mono">
                      @{s.username} · {s.email}
                    </div>
                    {hace && (
                      <div className="text-[10px] text-muted-foreground/80 mt-0.5">{hace}</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground self-center shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            <Inbox className="h-6 w-6 mx-auto mb-2 opacity-40" />
            No hay solicitudes pendientes.
          </div>
        )}

        <div className="px-3 py-2 border-t border-border/60 bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => navigate('/solicitudes-shippers')}
          >
            Ver todas las solicitudes
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
