import DashboardLayout from '@/layouts/DashboardLayout';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertCircle,
  Truck,
  Boxes,
  ArrowRight,
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Users,
} from 'lucide-react';
import { useMe } from '@/hooks/useMe';
import { usePaquetesList } from '@/hooks/usePaquetes';
import { useShippersList } from '@/hooks/useShippers';
import { useConsolidadosList } from '@/hooks/useConsolidados';
import { cn } from '@/lib/utils';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { Button } from '@/components/ui/button';
import { PageContent } from '@/components/layout/PageContent';

const PANEL_CLASS = 'rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5';

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 flex flex-col gap-3 transition-colors',
        highlight
          ? 'border-orange-400/60 bg-orange-50/40 dark:bg-orange-950/20 dark:border-orange-500/40'
          : ''
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Icon className={cn('w-3.5 h-3.5', highlight && 'text-orange-500')} />
        {label}
      </div>
      <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
        {loading ? '—' : value.toLocaleString('es-EC')}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  linkLabel,
  onLink,
}: {
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
  linkLabel?: string;
  onLink?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {linkLabel && onLink && (
        <button
          type="button"
          onClick={onLink}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {linkLabel}
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function PipelineRow({
  icon,
  label,
  count,
  loading,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  loading: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs', color || 'bg-muted text-muted-foreground')}>
          {icon}
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full tabular-nums">
        {loading ? '—' : count}
      </span>
    </div>
  );
}

function ListRow({
  title,
  subtitle,
  trailing,
  onClick,
}: {
  title: string;
  subtitle?: string;
  trailing?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>}
      </div>
      {trailing && (
        <span className="text-[11px] text-muted-foreground shrink-0 group-hover:text-foreground transition-colors">
          {trailing}
        </span>
      )}
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
    </div>
  );
}

function DashboardOps() {
  const navigate = useNavigate();

  const { data: paquetes, loading: loadingPaquetes } = usePaquetesList();
  const { data: shippers, loading: loadingShippers } = useShippersList();
  const { data: consolidados, loading: loadingConsolidados } = useConsolidadosList();

  const totalPaquetes = paquetes.length;
  const totalShippers = shippers.length;
  const consolidadosAbiertos = useMemo(
    () => consolidados.filter((c) => (c.estado || '').toUpperCase() === 'ABIERTO').length,
    [consolidados]
  );

  const paquetesSinShipper = useMemo(() => paquetes.filter((p) => !p.shipper).length, [paquetes]);
  const paquetesSinConsolidado = useMemo(() => paquetes.filter((p) => !p.consolidado).length, [paquetes]);

  const atencionesPendientes = useMemo(() => {
    return paquetes.filter((p) => {
      const faltaPeso = p.pesoLbs == null;
      const faltaContenido = !p.contenido;
      const faltaShipper = !p.shipper;
      return faltaPeso || faltaContenido || faltaShipper;
    });
  }, [paquetes]);

  const paquetesRecientes = useMemo(() => {
    return [...paquetes].sort((a, b) => b.id - a.id).slice(0, 5);
  }, [paquetes]);

  const consolidadosRecientes = useMemo(() => {
    return [...consolidados].sort((a, b) => b.id - a.id).slice(0, 5);
  }, [consolidados]);

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Dashboard"
        subtitle="Resumen de operaciones en tiempo real"
        icon={<LayoutDashboard className="w-4 h-4" />}
        actions={
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => navigate('/paquetes/new')}>
            <PlusCircle className="h-3.5 w-3.5" />
            Nuevo paquete
          </Button>
        }
      >
        <PageContent>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Package} label="Total Paquetes" value={totalPaquetes} loading={loadingPaquetes} />
            <StatCard icon={AlertCircle} label="Atenciones Pendientes" value={atencionesPendientes.length} loading={loadingPaquetes} highlight />
            <StatCard icon={Truck} label="Consolidados Abiertos" value={consolidadosAbiertos} loading={loadingConsolidados} />
            <StatCard icon={Boxes} label="Shippers" value={totalShippers} loading={loadingShippers} />
          </div>

          <div className={PANEL_CLASS}>
            <SectionHeader title="Acciones rápidas" subtitle="Flujos frecuentes para el equipo operativo" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => navigate('/paquetes/new')}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <PlusCircle className="h-4 w-4 text-primary" />
                Nuevo paquete
              </button>
              <button
                type="button"
                onClick={() => navigate('/consolidados/new')}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <ClipboardList className="h-4 w-4 text-primary" />
                Nuevo consolidado
              </button>
              <button
                type="button"
                onClick={() => navigate('/shippers')}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <Users className="h-4 w-4 text-primary" />
                Gestionar shippers
              </button>
            </div>
          </div>

          {/* Three columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Pipeline de Paquetes */}
            <div className={PANEL_CLASS}>
              <SectionHeader
                icon={Package}
                title="Pipeline de Paquetes"
                linkLabel="Ver todo"
                onLink={() => navigate('/paquetes')}
              />
              <div className="space-y-0.5">
                <PipelineRow
                  icon="📦"
                  label="Total"
                  count={totalPaquetes}
                  loading={loadingPaquetes}
                  color="bg-blue-100 dark:bg-blue-900/30"
                />
                <PipelineRow
                  icon="🔗"
                  label="Con consolidado"
                  count={totalPaquetes - paquetesSinConsolidado}
                  loading={loadingPaquetes}
                  color="bg-emerald-100 dark:bg-emerald-900/30"
                />
                <PipelineRow
                  icon="📭"
                  label="Sin consolidado"
                  count={paquetesSinConsolidado}
                  loading={loadingPaquetes}
                  color="bg-amber-100 dark:bg-amber-900/30"
                />
                <PipelineRow
                  icon="⚠️"
                  label="Sin shipper"
                  count={paquetesSinShipper}
                  loading={loadingPaquetes}
                  color="bg-red-100 dark:bg-red-900/30"
                />
              </div>
            </div>

            {/* Column 2: Atenciones Pendientes */}
            <div className={PANEL_CLASS}>
              <SectionHeader
                icon={AlertCircle}
                title="Atenciones Pendientes"
                subtitle={loadingPaquetes ? '' : `${atencionesPendientes.length} pendientes`}
                linkLabel="Ver todo"
                onLink={() => navigate('/paquetes')}
              />
              {loadingPaquetes ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Cargando...</div>
              ) : atencionesPendientes.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Sin atenciones pendientes</div>
              ) : (
                <div className="space-y-0.5">
                  {atencionesPendientes
                    .slice()
                    .sort((a, b) => b.id - a.id)
                    .slice(0, 6)
                    .map((p) => {
                      const faltas = [
                        !p.shipper ? 'sin shipper' : null,
                        p.pesoLbs == null ? 'sin peso' : null,
                        !p.contenido ? 'sin contenido' : null,
                      ].filter(Boolean).join(' · ');
                      return (
                        <ListRow
                          key={p.id}
                          title={p.numeroGuia}
                          subtitle={faltas || '—'}
                          onClick={() => navigate(`/paquetes/${p.id}`)}
                        />
                      );
                    })}
                </div>
              )}
            </div>

            {/* Column 3: Consolidados Recientes + Paquetes Recientes */}
            <div className="space-y-6">
              <div className={PANEL_CLASS}>
                <SectionHeader
                  icon={Truck}
                  title="Consolidados Recientes"
                  linkLabel="Ver todo"
                  onLink={() => navigate('/consolidados')}
                />
                {loadingConsolidados ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">Cargando...</div>
                ) : consolidadosRecientes.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">Sin consolidados</div>
                ) : (
                  <div className="space-y-0.5">
                    {consolidadosRecientes.map((c) => (
                      <ListRow
                        key={c.id}
                        title={c.numeroGuia || `#${c.id}`}
                        subtitle={(c.estado || '').toUpperCase()}
                        onClick={() => navigate(`/consolidados/${c.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className={PANEL_CLASS}>
                <SectionHeader
                  icon={Package}
                  title="Paquetes Recientes"
                  linkLabel="Ver todo"
                  onLink={() => navigate('/paquetes')}
                />
                {loadingPaquetes ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">Cargando...</div>
                ) : paquetesRecientes.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">Sin paquetes</div>
                ) : (
                  <div className="space-y-0.5">
                    {paquetesRecientes.map((p) => (
                      <ListRow
                        key={p.id}
                        title={p.numeroGuia}
                        subtitle={p.shipper?.nombre || p.destinatario || '—'}
                        onClick={() => navigate(`/paquetes/${p.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </PageContent>
      </StandardPageLayout>
    </DashboardLayout>
  );
}

function DashboardShipper() {
  const navigate = useNavigate();
  const { data: paquetes, loading: loadingPaquetes } = usePaquetesList();

  const totalPaquetes = paquetes.length;
  const paquetesSinConsolidado = useMemo(() => paquetes.filter((p) => !p.consolidado).length, [paquetes]);

  const atencionesPendientes = useMemo(() => {
    return paquetes.filter((p) => {
      const faltaPeso = p.pesoLbs == null;
      const faltaContenido = !p.contenido;
      const faltaShipper = !p.shipper;
      return faltaPeso || faltaContenido || faltaShipper;
    });
  }, [paquetes]);

  const paquetesRecientes = useMemo(() => {
    return [...paquetes].sort((a, b) => b.id - a.id).slice(0, 5);
  }, [paquetes]);

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Dashboard"
        subtitle="Resumen de tu operación"
        icon={<LayoutDashboard className="w-4 h-4" />}
        actions={
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => navigate('/paquetes/new')}>
            <PlusCircle className="h-3.5 w-3.5" />
            Registrar paquete
          </Button>
        }
      >
        <PageContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard icon={Package} label="Total Paquetes" value={totalPaquetes} loading={loadingPaquetes} />
            <StatCard icon={AlertCircle} label="Pendientes" value={atencionesPendientes.length} loading={loadingPaquetes} highlight />
            <StatCard icon={Boxes} label="Sin Consolidado" value={paquetesSinConsolidado} loading={loadingPaquetes} />
          </div>

          <div className={PANEL_CLASS}>
            <SectionHeader title="Acciones rápidas" subtitle="Accede a tareas frecuentes de shipper" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate('/paquetes/new')}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <PlusCircle className="h-4 w-4 text-primary" />
                Registrar paquete
              </button>
              <button
                type="button"
                onClick={() => navigate('/paquetes')}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <ClipboardList className="h-4 w-4 text-primary" />
                Ver mis paquetes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={PANEL_CLASS}>
              <SectionHeader
                icon={AlertCircle}
                title="Atenciones Pendientes"
                subtitle={loadingPaquetes ? '' : `${atencionesPendientes.length} pendientes`}
                linkLabel="Ver paquetes"
                onLink={() => navigate('/paquetes')}
              />
              {loadingPaquetes ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Cargando...</div>
              ) : atencionesPendientes.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Sin atenciones pendientes</div>
              ) : (
                <div className="space-y-0.5">
                  {atencionesPendientes
                    .slice()
                    .sort((a, b) => b.id - a.id)
                    .slice(0, 5)
                    .map((p) => {
                      const faltas = [
                        !p.shipper ? 'sin shipper' : null,
                        p.pesoLbs == null ? 'sin peso' : null,
                        !p.contenido ? 'sin contenido' : null,
                      ].filter(Boolean).join(' · ');
                      return (
                        <ListRow
                          key={p.id}
                          title={p.numeroGuia}
                          subtitle={faltas || '—'}
                          onClick={() => navigate(`/paquetes/${p.id}`)}
                        />
                      );
                    })}
                </div>
              )}
            </div>

            <div className={PANEL_CLASS}>
              <SectionHeader
                icon={Package}
                title="Paquetes Recientes"
                linkLabel="Ver todos"
                onLink={() => navigate('/paquetes')}
              />
              {loadingPaquetes ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Cargando...</div>
              ) : paquetesRecientes.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Sin paquetes</div>
              ) : (
                <div className="space-y-0.5">
                  {paquetesRecientes.map((p) => (
                    <ListRow
                      key={p.id}
                      title={p.numeroGuia}
                      subtitle={p.shipper?.nombre || p.destinatario || '—'}
                      onClick={() => navigate(`/paquetes/${p.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </PageContent>
      </StandardPageLayout>
    </DashboardLayout>
  );
}

export default function Dashboard() {
  const { me } = useMe();
  const role = me?.rol ?? null;
  const canSeeOps = role === 'ADMIN' || role === 'MV_ADMIN';
  return canSeeOps ? <DashboardOps /> : <DashboardShipper />;
}
