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
import { KpiCard, type KpiAccent } from '@/components/layout/KpiCard';
import { ListRowsSkeleton } from '@/components/skeletons';

const PANEL_CLASS = 'rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 shadow-soft';

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  accent = 'primary',
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
  accent?: KpiAccent;
}) {
  return (
    <KpiCard
      icon={<Icon className="h-4 w-4" />}
      label={label}
      accent={accent}
      value={loading ? '—' : value.toLocaleString('es-EC')}
    />
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
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted transition-colors ease-claude">
      <div className="flex items-center gap-3">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs', color || 'bg-muted text-muted-foreground')}>
          {icon}
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full tabular-nums min-w-[28px] inline-flex justify-center">
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
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted transition-colors ease-claude cursor-pointer group"
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
            <StatCard icon={Package} label="Total Paquetes" value={totalPaquetes} loading={loadingPaquetes} accent="primary" />
            <StatCard icon={AlertCircle} label="Atenciones Pendientes" value={atencionesPendientes.length} loading={loadingPaquetes} accent="warning" />
            <StatCard icon={Truck} label="Consolidados Abiertos" value={consolidadosAbiertos} loading={loadingConsolidados} accent="info" />
            <StatCard icon={Boxes} label="Shippers" value={totalShippers} loading={loadingShippers} accent="brand" />
          </div>

          <div className={PANEL_CLASS}>
            <SectionHeader title="Acciones rápidas" subtitle="Flujos frecuentes para el equipo operativo" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => navigate('/paquetes/new')}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted hover:border-foreground/20 transition-colors ease-claude text-left"
              >
                <PlusCircle className="h-4 w-4 text-accent" />
                Nuevo paquete
              </button>
              <button
                type="button"
                onClick={() => navigate('/consolidados/new')}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted hover:border-foreground/20 transition-colors ease-claude text-left"
              >
                <ClipboardList className="h-4 w-4 text-accent" />
                Nuevo consolidado
              </button>
              <button
                type="button"
                onClick={() => navigate('/shippers')}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted hover:border-foreground/20 transition-colors ease-claude text-left"
              >
                <Users className="h-4 w-4 text-accent" />
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
                  color="bg-info/15 text-info"
                />
                <PipelineRow
                  icon="🔗"
                  label="Con consolidado"
                  count={totalPaquetes - paquetesSinConsolidado}
                  loading={loadingPaquetes}
                  color="bg-success/15 text-success"
                />
                <PipelineRow
                  icon="📭"
                  label="Sin consolidado"
                  count={paquetesSinConsolidado}
                  loading={loadingPaquetes}
                  color="bg-warning/15 text-warning"
                />
                <PipelineRow
                  icon="⚠️"
                  label="Sin shipper"
                  count={paquetesSinShipper}
                  loading={loadingPaquetes}
                  color="bg-destructive/15 text-destructive"
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
                <ListRowsSkeleton rows={4} />
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
                  <ListRowsSkeleton rows={4} />
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
                  <ListRowsSkeleton rows={4} />
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
            <StatCard icon={Package} label="Total Paquetes" value={totalPaquetes} loading={loadingPaquetes} accent="primary" />
            <StatCard icon={AlertCircle} label="Pendientes" value={atencionesPendientes.length} loading={loadingPaquetes} accent="warning" />
            <StatCard icon={Boxes} label="Sin Consolidado" value={paquetesSinConsolidado} loading={loadingPaquetes} accent="info" />
          </div>

          <div className={PANEL_CLASS}>
            <SectionHeader title="Acciones rápidas" subtitle="Accede a tareas frecuentes de shipper" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate('/paquetes/new')}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted hover:border-foreground/20 transition-colors ease-claude text-left"
              >
                <PlusCircle className="h-4 w-4 text-accent" />
                Registrar paquete
              </button>
              <button
                type="button"
                onClick={() => navigate('/paquetes')}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted hover:border-foreground/20 transition-colors ease-claude text-left"
              >
                <ClipboardList className="h-4 w-4 text-accent" />
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
                <ListRowsSkeleton rows={5} />
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
                <ListRowsSkeleton rows={5} />
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
