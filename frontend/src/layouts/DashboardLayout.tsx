import {
    LayoutDashboard,
    Package,
    Globe,
    ShoppingBag,
    UserCog,
    KeyRound,
    Shield,
    Search,
    Menu,
    ChevronRight,
    Plus,
    LogOut,
    Sparkles,
    Settings,
    User as UserIcon,
    Moon,
    Sun,
    Monitor,
    HelpCircle,
    PanelLeftClose,
    PanelLeftOpen,
    Command as CommandIcon,
    Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useMe } from '@/hooks/useMe';
import { Brand } from '@/components/brand';
import { useTheme } from '@/components/theme-provider';
import { useDebounce } from '@/hooks/useDebounce';
import { listPaquetes, type Paquete } from '@/services/paquetes.service';
import { listConsolidados, type Consolidado } from '@/services/consolidados.service';
import { ListRowsSkeleton } from '@/components/skeletons';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import NotificacionesBell from '@/components/layout/NotificacionesBell';
import { useSolicitudesPendientes } from '@/hooks/useSolicitudesPendientes';
import MiPerfilDialog from '@/components/perfil/MiPerfilDialog';

type SidebarIcon = React.ElementType<{ className?: string }>;

type MeResponse = {
    username: string;
    email?: string | null;
    rol: string | null;
    permisos: string[];
    shipperId: number | null;
    shipperNombre?: string | null;
};

type NavItem = {
    label: string;
    path: string;
};

const isMacPlatform = () => {
    if (typeof navigator === 'undefined') return false;
    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } });
    const value = platform.userAgentData?.platform || navigator.platform || navigator.userAgent;
    return value.toLowerCase().includes('mac');
};

const SidebarItem = ({
    icon: Icon,
    label,
    path,
    collapsed = false,
    onAddClick,
    quickHint,
    badgeCount,
}: {
    icon: SidebarIcon;
    label: string;
    path: string;
    collapsed?: boolean;
    onAddClick?: () => void;
    quickHint?: string;
    badgeCount?: number;
}) => {
    const location = useLocation();
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

    return (
        <div className="group relative" title={collapsed ? label : undefined}>
            <Link to={path} className="block">
                <div
                    className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ease-claude cursor-pointer select-none relative",
                        isActive
                            ? "bg-white/[0.07] text-white"
                            : "text-sidebar-foreground hover:bg-white/[0.04] hover:text-white",
                        collapsed && "justify-center px-0",
                    )}
                >
                    {/* franja activa naranja a la izquierda */}
                    {isActive && (
                        <span
                            aria-hidden
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent"
                        />
                    )}
                    <div className="relative shrink-0">
                        <Icon
                            className={cn(
                                "w-[18px] h-[18px] transition-colors",
                                isActive ? "text-accent" : "text-sidebar-foreground/70 group-hover:text-white/90",
                            )}
                        />
                        {collapsed && badgeCount && badgeCount > 0 ? (
                            <span
                                className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[9px] font-bold ring-2 ring-sidebar-background"
                                aria-hidden
                            >
                                {badgeCount > 9 ? '9+' : badgeCount}
                            </span>
                        ) : null}
                    </div>
                    {!collapsed && (
                        <>
                            <span className="truncate flex-1">{label}</span>
                            {badgeCount && badgeCount > 0 ? (
                                <span
                                    className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold"
                                    aria-label={`${badgeCount} pendientes`}
                                >
                                    {badgeCount > 99 ? '99+' : badgeCount}
                                </span>
                            ) : null}
                            {quickHint && !badgeCount && (
                                <kbd className="hidden lg:inline-flex h-4 items-center rounded border border-sidebar-border bg-sidebar-hover px-1 font-mono text-[9px] font-medium text-sidebar-muted">
                                    {quickHint}
                                </kbd>
                            )}
                        </>
                    )}
                </div>
            </Link>
            {!collapsed && onAddClick && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onAddClick();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:bg-white/10 p-1 rounded-md transition-all text-sidebar-muted hover:text-white"
                    title={`Crear nuevo ${label.toLowerCase()}`}
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
};

const SidebarSectionHeader = ({ title, collapsed }: { title: string; collapsed?: boolean }) => {
    if (collapsed) return <Separator className="my-3 bg-sidebar-border" />;
    return (
        <div className="mt-6 mb-2 px-3">
            <h4 className="text-[10px] font-medium text-sidebar-muted uppercase tracking-[0.12em]">
                {title}
            </h4>
        </div>
    );
};

const SidebarContent = ({
    collapsed = false,
    onQuickCreate,
    onSearchClick,
    canSeeAdmin,
    canSeeOps,
    shipperNombre,
    canSeeSolicitudes = false,
    solicitudesPendientes = 0,
}: {
    collapsed?: boolean;
    onQuickCreate?: () => void;
    onSearchClick?: () => void;
    canSeeAdmin: boolean;
    canSeeOps: boolean;
    shipperNombre?: string | null;
    canSeeSolicitudes?: boolean;
    solicitudesPendientes?: number;
}) => (
    <>
        {/* Workspace Logo */}
        {!collapsed && (
            <div className="px-4 pt-5 pb-3">
                <Link
                    to="/dashboard"
                    className="flex items-center gap-3 rounded-xl px-1 py-1 hover:opacity-90 transition-opacity"
                    title={shipperNombre || "MV Services"}
                >
                    <div className="flex flex-col overflow-hidden leading-tight">
                        {shipperNombre ? (
                            <>
                                <span className="font-serif text-base text-white truncate">
                                    {shipperNombre}
                                </span>
                                <span className="text-[10px] text-sidebar-muted truncate mt-0.5 uppercase tracking-[0.1em]">
                                    Panel de shipper
                                </span>
                            </>
                        ) : (
                            <>
                                <Brand size="md" className="text-white" />
                                <span className="text-[10px] text-sidebar-muted truncate mt-0.5 uppercase tracking-[0.1em]">
                                    Logística
                                </span>
                            </>
                        )}
                    </div>
                </Link>
            </div>
        )}

        {/* Acciones principales: Buscar + Crear */}
        <div className={cn("px-3 pb-3 space-y-1.5", collapsed && "px-2")}>
            {!collapsed ? (
                <>
                    {onSearchClick && (
                        <button
                            type="button"
                            onClick={onSearchClick}
                            className="w-full flex items-center gap-2 rounded-lg border border-sidebar-border bg-white/[0.03] px-3 py-2 text-xs text-sidebar-muted hover:bg-white/[0.06] hover:text-white transition-colors text-left"
                        >
                            <Search className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1 truncate">Buscar…</span>
                            <kbd className="hidden sm:inline-flex text-[9px] font-mono bg-black/40 border border-sidebar-border px-1 py-0.5 rounded text-sidebar-muted">
                                ⌘K
                            </kbd>
                        </button>
                    )}
                    {onQuickCreate && (
                        <button
                            type="button"
                            onClick={onQuickCreate}
                            className="w-full flex items-center gap-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 px-3 py-2 text-xs font-medium transition-colors shadow-soft"
                        >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1 text-left">Crear</span>
                            <kbd className="hidden sm:inline-flex text-[9px] font-mono bg-black/20 border border-white/20 px-1 py-0.5 rounded">
                                C
                            </kbd>
                        </button>
                    )}
                </>
            ) : (
                <>
                    {onSearchClick && (
                        <button
                            type="button"
                            onClick={onSearchClick}
                            className="w-full flex items-center justify-center rounded-lg p-2 text-sidebar-muted hover:bg-white/[0.06] hover:text-white transition-colors"
                            title="Buscar (⌘K)"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                    )}
                    {onQuickCreate && (
                        <button
                            type="button"
                            onClick={onQuickCreate}
                            className="w-full flex items-center justify-center rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 p-2 transition-colors shadow-soft"
                            title="Crear (C)"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </>
            )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5" aria-label="Navegación principal">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" collapsed={collapsed} quickHint="G D" />

            <SidebarSectionHeader title="GESTIÓN" collapsed={collapsed} />
            <SidebarItem icon={Package} label="Paquetes" path="/paquetes" collapsed={collapsed} onAddClick={onQuickCreate} quickHint="G P" />
            <SidebarItem icon={ShoppingBag} label="Consolidados" path="/consolidados" collapsed={collapsed} quickHint="G C" />

            {canSeeOps || canSeeSolicitudes ? (
                <>
                    <SidebarSectionHeader title="OPERACIÓN" collapsed={collapsed} />
                    {canSeeOps ? (
                        <SidebarItem icon={Globe} label="Shippers" path="/shippers" collapsed={collapsed} quickHint="G S" />
                    ) : null}
                    {canSeeSolicitudes ? (
                        <SidebarItem
                            icon={Inbox}
                            label="Solicitudes shipper"
                            path="/solicitudes-shippers"
                            collapsed={collapsed}
                            badgeCount={solicitudesPendientes}
                        />
                    ) : null}
                </>
            ) : null}

            {canSeeAdmin ? (
                <>
                    <SidebarSectionHeader title="ADMIN" collapsed={collapsed} />
                    <SidebarItem icon={UserCog} label="Usuarios" path="/usuarios" collapsed={collapsed} />
                    <SidebarItem icon={Shield} label="Roles" path="/roles" collapsed={collapsed} />
                    <SidebarItem icon={KeyRound} label="Permisos" path="/permisos" collapsed={collapsed} />
                </>
            ) : null}
        </nav>
    </>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem('mv_sidebar_collapsed') === '1');
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [topSearchQuery, setTopSearchQuery] = useState('');
    const [topSearchOpen, setTopSearchOpen] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const [perfilOpen, setPerfilOpen] = useState(false);
    const { me } = useMe();
    const { theme, setTheme } = useTheme();
    const solicitudes = useSolicitudesPendientes();

    const role = (me as MeResponse | null)?.rol ?? null;
    const canSeeAdmin = role === 'ADMIN';
    const canSeeOps = role === 'ADMIN' || role === 'MV_ADMIN';
    const isMac = useMemo(() => isMacPlatform(), []);

    const quickActions = useMemo(() => {
        const base = [
            { label: 'Nuevo paquete', hint: '/paquetes/new', path: '/paquetes/new', icon: Package, color: 'bg-accent-soft text-accent-soft-foreground' },
        ];
        const opsOnly = [
            { label: 'Nuevo consolidado', hint: '/consolidados/new', path: '/consolidados/new', icon: ShoppingBag, color: 'bg-success/10 text-success' },
            { label: 'Nuevo shipper', hint: '/shippers/new', path: '/shippers/new', icon: Globe, color: 'bg-info/10 text-info' },
        ];
        return canSeeOps ? [...opsOnly, ...base] : base;
    }, [canSeeOps]);

    const searchItems = useMemo<NavItem[]>(() => {
        const base = [
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Paquetes', path: '/paquetes' },
            { label: 'Consolidados', path: '/consolidados' },
        ];
        const ops = [
            { label: 'Shippers', path: '/shippers' },
        ];
        const admin = [
            { label: 'Usuarios', path: '/usuarios' },
            { label: 'Roles', path: '/roles' },
            { label: 'Permisos', path: '/permisos' },
        ];
        return [
            ...base,
            ...(canSeeOps ? ops : []),
            ...(canSeeAdmin ? admin : []),
        ];
    }, [canSeeAdmin, canSeeOps]);

    // Cache lazy de paquetes y consolidados para búsqueda global
    const [globalPaquetes, setGlobalPaquetes] = useState<Paquete[]>([]);
    const [globalConsolidados, setGlobalConsolidados] = useState<Consolidado[]>([]);
    const [globalLoading, setGlobalLoading] = useState(false);
    const loadedRef = useRef(false);

    const loadGlobalSearchData = useCallback(() => {
        if (loadedRef.current) return;
        loadedRef.current = true;
        setGlobalLoading(true);
        Promise.allSettled([listPaquetes(), listConsolidados()])
            .then(([p, c]) => {
                if (p.status === 'fulfilled') setGlobalPaquetes(p.value);
                if (c.status === 'fulfilled') setGlobalConsolidados(c.value);
            })
            .finally(() => setGlobalLoading(false));
    }, []);

    const debouncedSearchQuery = useDebounce(searchQuery, 200);
    const debouncedTopSearchQuery = useDebounce(topSearchQuery, 200);

    type GlobalResults = {
        pages: NavItem[];
        paquetes: Paquete[];
        consolidados: Consolidado[];
        total: number;
    };

    const buildResults = useCallback(
        (rawQuery: string, pagesLimit: number, entityLimit: number): GlobalResults => {
            const q = rawQuery.trim().toLowerCase();
            if (!q) {
                return {
                    pages: searchItems.slice(0, pagesLimit),
                    paquetes: [],
                    consolidados: [],
                    total: Math.min(searchItems.length, pagesLimit),
                };
            }
            const pages = searchItems
                .filter((i) => i.label.toLowerCase().includes(q) || i.path.toLowerCase().includes(q))
                .slice(0, pagesLimit);
            const paquetes = globalPaquetes
                .filter((p) =>
                    p.numeroGuia?.toLowerCase().includes(q) ||
                    p.destinatario?.toLowerCase().includes(q) ||
                    p.ref?.toLowerCase().includes(q) ||
                    p.contenido?.toLowerCase().includes(q) ||
                    p.shipper?.nombre?.toLowerCase().includes(q),
                )
                .slice(0, entityLimit);
            const consolidados = globalConsolidados
                .filter((c) =>
                    c.numeroGuia?.toLowerCase().includes(q) ||
                    String(c.id).includes(q) ||
                    c.estado?.toLowerCase().includes(q) ||
                    c.paquetes?.some((p) => p.numeroGuia?.toLowerCase().includes(q)),
                )
                .slice(0, entityLimit);
            return {
                pages,
                paquetes,
                consolidados,
                total: pages.length + paquetes.length + consolidados.length,
            };
        },
        [searchItems, globalPaquetes, globalConsolidados],
    );

    const topResults = useMemo(
        () => buildResults(debouncedTopSearchQuery, 4, 5),
        [buildResults, debouncedTopSearchQuery],
    );
    const dialogResults = useMemo(
        () => buildResults(debouncedSearchQuery, 8, 8),
        [buildResults, debouncedSearchQuery],
    );

    const firstDialogTarget = useMemo<string | null>(() => {
        if (dialogResults.pages[0]) return dialogResults.pages[0].path;
        if (dialogResults.paquetes[0]) return `/paquetes/${dialogResults.paquetes[0].id}`;
        if (dialogResults.consolidados[0]) return `/consolidados/${dialogResults.consolidados[0].id}`;
        return null;
    }, [dialogResults]);

    const firstTopTarget = useMemo<string | null>(() => {
        if (topResults.pages[0]) return topResults.pages[0].path;
        if (topResults.paquetes[0]) return `/paquetes/${topResults.paquetes[0].id}`;
        if (topResults.consolidados[0]) return `/consolidados/${topResults.consolidados[0].id}`;
        return null;
    }, [topResults]);

    const pathToLabel = useMemo(() => {
        return new Map(searchItems.map((item) => [item.path, item.label]));
    }, [searchItems]);

    const breadcrumbs = useMemo(() => {
        const segments = location.pathname.split('/').filter(Boolean);
        if (segments.length === 0) return [{ label: 'Inicio', path: '/dashboard' }];

        const crumbs = segments.map((segment, idx) => {
            const path = `/${segments.slice(0, idx + 1).join('/')}`;
            const fallbackLabel = segment.charAt(0).toUpperCase() + segment.slice(1);
            return { path, label: pathToLabel.get(path) ?? fallbackLabel };
        });

        return crumbs;
    }, [location.pathname, pathToLabel]);

    const go = (path: string) => {
        setSearchOpen(false);
        setQuickOpen(false);
        setSearchQuery('');
        setTopSearchOpen(false);
        setTopSearchQuery('');
        navigate(path);
    };

    const logout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const initials = me?.username
        ? (me as MeResponse).username.slice(0, 2).toUpperCase()
        : '??';

    useEffect(() => {
        localStorage.setItem('mv_sidebar_collapsed', collapsed ? '1' : '0');
    }, [collapsed]);

    useEffect(() => {
        try {
            localStorage.removeItem('mv_recent_paths');
        } catch {
            // ignorar
        }
    }, []);

    // Keyboard shortcuts globales
    useEffect(() => {
        let lastG = 0;
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isTyping =
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable);

            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

            // Cmd/Ctrl+K -> abre búsqueda
            if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen(true);
                return;
            }
            // Cmd/Ctrl+B -> colapsar/expandir sidebar
            if (cmdOrCtrl && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                setCollapsed((prev) => !prev);
                return;
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setQuickOpen(false);
                setTopSearchOpen(false);
                return;
            }

            if (isTyping) return;

            // C -> abre quick create
            if (e.key.toLowerCase() === 'c' && !cmdOrCtrl && !e.altKey && !e.shiftKey) {
                e.preventDefault();
                setQuickOpen(true);
                return;
            }
            // G + (D | P | C | S) navegación tipo Linear/Notion
            if (e.key.toLowerCase() === 'g' && !cmdOrCtrl) {
                lastG = Date.now();
                return;
            }
            if (Date.now() - lastG < 1500) {
                const k = e.key.toLowerCase();
                const map: Record<string, string> = {
                    d: '/dashboard',
                    p: '/paquetes',
                    c: '/consolidados',
                    s: canSeeOps ? '/shippers' : '/dashboard',
                };
                if (map[k]) {
                    e.preventDefault();
                    navigate(map[k]);
                    lastG = 0;
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isMac, canSeeOps, navigate]);

    const meData = me as MeResponse | null;

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden md:flex flex-col flex-shrink-0 bg-sidebar-background border-r border-sidebar-border transition-[width] duration-200 ease-claude text-sidebar-foreground",
                    collapsed ? "w-[64px]" : "w-[256px]",
                )}
                aria-label="Barra lateral"
            >
                <SidebarContent
                    collapsed={collapsed}
                    onQuickCreate={() => setQuickOpen(true)}
                    onSearchClick={() => setSearchOpen(true)}
                    canSeeAdmin={canSeeAdmin}
                    canSeeOps={canSeeOps}
                    canSeeSolicitudes={solicitudes.enabled}
                    solicitudesPendientes={solicitudes.count}
                    shipperNombre={role === 'SHIPPER' ? (meData?.shipperNombre ?? null) : null}
                />

                {/* Sidebar Footer */}
                <div className="p-2 space-y-0.5 border-t border-sidebar-border">
                    <button
                        type="button"
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-xs text-sidebar-muted cursor-pointer hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors",
                            collapsed && "justify-center px-0",
                        )}
                        title={collapsed ? "Expandir (⌘B)" : "Ocultar (⌘B)"}
                    >
                        {collapsed ? (
                            <PanelLeftOpen className="w-4 h-4" />
                        ) : (
                            <PanelLeftClose className="w-4 h-4" />
                        )}
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left">Ocultar</span>
                                <kbd className="hidden sm:inline-flex text-[9px] font-mono bg-black/40 border border-sidebar-border px-1 py-0.5 rounded">
                                    ⌘B
                                </kbd>
                            </>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
                {/* Topbar */}
                <header className="h-14 flex items-center justify-between gap-3 px-5 sticky top-0 z-40 flex-shrink-0 border-b border-border/60 bg-background/85 backdrop-blur-xl">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Mobile Menu */}
                        <div className="md:hidden shrink-0">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-9 h-9 -ml-1.5">
                                        <Menu className="w-4 h-4" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    side="left"
                                    className="!p-0 w-[280px] border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground"
                                >
                                    <SheetTitle className="sr-only">Menú</SheetTitle>
                                    <SheetDescription className="sr-only">Navegación principal</SheetDescription>
                                    <div className="h-full flex flex-col">
                                        <SidebarContent
                                            onQuickCreate={() => setQuickOpen(true)}
                                            onSearchClick={() => setSearchOpen(true)}
                                            canSeeAdmin={canSeeAdmin}
                                            canSeeOps={canSeeOps}
                                            canSeeSolicitudes={solicitudes.enabled}
                                            solicitudesPendientes={solicitudes.count}
                                            shipperNombre={role === 'SHIPPER' ? (meData?.shipperNombre ?? null) : null}
                                        />
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Breadcrumbs (siempre visibles) */}
                        <nav
                            aria-label="Migas de pan"
                            className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground min-w-0 flex-shrink"
                        >
                            {breadcrumbs.map((crumb, idx) => (
                                <div key={crumb.path + idx} className="inline-flex items-center gap-1 min-w-0">
                                    {idx > 0 && <ChevronRight className="h-3 w-3 opacity-60 shrink-0" />}
                                    <button
                                        type="button"
                                        onClick={() => go(crumb.path)}
                                        className={cn(
                                            "hover:text-foreground transition-colors truncate max-w-[140px]",
                                            idx === breadcrumbs.length - 1 && "text-foreground font-medium",
                                        )}
                                    >
                                        {crumb.label}
                                    </button>
                                </div>
                            ))}
                        </nav>
                    </div>

                    {/* Search */}
                    <div className="hidden lg:block flex-1 max-w-md">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-muted-foreground transition-colors" />
                            <Input
                                type="text"
                                placeholder="Buscar páginas, paquetes o consolidados…"
                                value={topSearchQuery}
                                onChange={(e) => {
                                    setTopSearchQuery(e.target.value);
                                    setTopSearchOpen(true);
                                }}
                                onFocus={() => {
                                    setTopSearchOpen(true);
                                    loadGlobalSearchData();
                                }}
                                onBlur={() => setTimeout(() => setTopSearchOpen(false), 120)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && firstTopTarget) {
                                        e.preventDefault();
                                        go(firstTopTarget);
                                    }
                                }}
                                className="pl-9 pr-16 h-9 text-[13px] bg-muted/60 border-border/60 rounded-lg hover:bg-muted transition-all focus-visible:bg-background"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                                <kbd className="hidden h-5 select-none items-center gap-0.5 rounded-md border border-border/50 bg-muted/60 px-1.5 font-mono text-[9px] font-medium text-muted-foreground sm:flex">
                                    <span className="text-[10px]">{isMac ? '⌘' : 'Ctrl'}</span>K
                                </kbd>
                            </div>
                            {topSearchOpen ? (
                                <GlobalSearchResults
                                    results={topResults}
                                    query={debouncedTopSearchQuery}
                                    loading={globalLoading}
                                    onSelect={go}
                                    variant="top"
                                />
                            ) : null}
                        </div>
                    </div>

                    {/* Acciones derecha */}
                    <div className="flex items-center gap-1 shrink-0">
                        {/* Búsqueda mobile (icono) */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                            aria-label="Buscar"
                            onClick={() => setSearchOpen(true)}
                        >
                            <Search className="h-4 w-4" />
                        </Button>

                        {/* Notificaciones */}
                        <NotificacionesBell />

                        {/* Crear (atajo C) */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                            onClick={() => setQuickOpen(true)}
                            aria-label="Crear"
                            title="Crear (C)"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>

                        <Separator orientation="vertical" className="h-6 mx-1" />

                        {/* User Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="h-9 px-1 inline-flex items-center gap-2 rounded-lg hover:bg-muted transition-colors"
                                    aria-label="Menú de usuario"
                                >
                                    <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-semibold shadow-soft ring-2 ring-accent/20">
                                        {initials}
                                    </div>
                                    <span className="hidden xl:inline text-xs text-foreground/80 max-w-[100px] truncate font-medium">
                                        {me?.username}
                                    </span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-72 p-0 overflow-hidden"
                            >
                                {me && (
                                    <>
                                        {/* Header de cuenta */}
                                        <div className="px-4 py-4 bg-muted/40 border-b border-border/60">
                                            <div className="flex items-start gap-3">
                                                <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0 shadow-soft ring-2 ring-accent/20">
                                                    {initials}
                                                </div>
                                                <div className="overflow-hidden flex-1 min-w-0">
                                                    <p className="font-serif text-base text-foreground truncate leading-tight">
                                                        {me.username}
                                                    </p>
                                                    {meData?.email && (
                                                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                            {meData.email}
                                                        </p>
                                                    )}
                                                    {role && (
                                                        <Badge variant="brand" className="mt-2 text-[9px] uppercase tracking-wider">
                                                            <Shield className="h-2.5 w-2.5 mr-1" />
                                                            {role}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            {meData?.shipperNombre && role === 'SHIPPER' && (
                                                <div className="mt-3 rounded-lg bg-background/80 border border-border/60 px-2.5 py-1.5 flex items-center gap-2">
                                                    <Globe className="h-3.5 w-3.5 text-accent" />
                                                    <span className="text-[11px] text-foreground/80 truncate">
                                                        {meData.shipperNombre}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Sección Apariencia */}
                                <div className="p-1">
                                    <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Apariencia
                                    </DropdownMenuLabel>
                                    <div className="grid grid-cols-3 gap-1 px-1 pb-1">
                                        <ThemeOption
                                            icon={<Sun className="h-3.5 w-3.5" />}
                                            label="Claro"
                                            active={theme === 'light'}
                                            onClick={() => setTheme('light')}
                                        />
                                        <ThemeOption
                                            icon={<Moon className="h-3.5 w-3.5" />}
                                            label="Oscuro"
                                            active={theme === 'dark'}
                                            onClick={() => setTheme('dark')}
                                        />
                                        <ThemeOption
                                            icon={<Monitor className="h-3.5 w-3.5" />}
                                            label="Sistema"
                                            active={theme === 'system'}
                                            onClick={() => setTheme('system')}
                                        />
                                    </div>
                                </div>

                                <DropdownMenuSeparator className="my-0" />

                                {/* Sección acciones */}
                                <div className="p-1">
                                    <DropdownMenuItem
                                        onClick={() => setPerfilOpen(true)}
                                        className="cursor-pointer text-[13px]"
                                    >
                                        <UserIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                        Mi perfil
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => go('/dashboard')}
                                        className="cursor-pointer text-[13px]"
                                    >
                                        <LayoutDashboard className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                        Mi panel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setSearchOpen(true)}
                                        className="cursor-pointer text-[13px]"
                                    >
                                        <CommandIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                        Buscar
                                        <kbd className="ml-auto text-[9px] font-mono opacity-60">
                                            {isMac ? '⌘K' : 'Ctrl K'}
                                        </kbd>
                                    </DropdownMenuItem>
                                    {canSeeAdmin && (
                                        <DropdownMenuItem
                                            onClick={() => go('/usuarios')}
                                            className="cursor-pointer text-[13px]"
                                        >
                                            <Settings className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                            Configuración
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        onClick={() => window.open('https://github.com/BackSet/mv_services', '_blank')}
                                        className="cursor-pointer text-[13px]"
                                    >
                                        <HelpCircle className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                        Ayuda y documentación
                                    </DropdownMenuItem>
                                </div>

                                <DropdownMenuSeparator className="my-0" />

                                <div className="p-1">
                                    <DropdownMenuItem
                                        onClick={logout}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-[13px]"
                                    >
                                        <LogOut className="w-3.5 h-3.5 mr-2" />
                                        Cerrar sesión
                                    </DropdownMenuItem>
                                </div>

                                <div className="px-3 py-2 border-t border-border/60 text-[10px] text-muted-foreground/70 text-center">
                                    <span className="font-serif">MV Services</span> · v1.0
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Search dialog (cmd+k) */}
                <Dialog
                    open={searchOpen}
                    onOpenChange={(open) => {
                        setSearchOpen(open);
                        if (open) loadGlobalSearchData();
                    }}
                >
                    <DialogContent className="max-w-xl gap-3 p-0 overflow-hidden">
                        <DialogHeader className="px-6 pt-6">
                            <DialogTitle className="flex items-center gap-2.5">
                                <Search className="h-5 w-5 text-accent" />
                                Buscar y navegar
                            </DialogTitle>
                            <DialogDescription>
                                Encuentra páginas, paquetes o consolidados. Pulsa ↵ para abrir el primer resultado.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="px-6 space-y-3 pb-3">
                            <input
                                autoFocus
                                className="flex h-11 w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring transition-all"
                                placeholder="Buscar páginas, paquetes o consolidados…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && firstDialogTarget) {
                                        e.preventDefault();
                                        go(firstDialogTarget);
                                    }
                                }}
                            />
                            <div className="max-h-[360px] overflow-y-auto rounded-lg border border-border/70">
                                <GlobalSearchDialogResults
                                    results={dialogResults}
                                    query={debouncedSearchQuery}
                                    loading={globalLoading}
                                    onSelect={go}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-6 py-2.5 border-t border-border/60 bg-muted/40 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-2">
                                <kbd className="font-mono bg-background border border-border px-1 rounded">↵</kbd>
                                seleccionar
                            </span>
                            <span className="flex items-center gap-2">
                                <kbd className="font-mono bg-background border border-border px-1 rounded">esc</kbd>
                                cerrar
                            </span>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Quick create dialog */}
                <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2.5">
                                <Sparkles className="h-5 w-5 text-accent" />
                                Crear nuevo
                            </DialogTitle>
                            <DialogDescription>
                                Accesos rápidos para registrar información.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            {quickActions.map((a) => {
                                const Icon = a.icon;
                                return (
                                    <button
                                        key={a.path}
                                        type="button"
                                        onClick={() => go(a.path)}
                                        className="w-full flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 hover:bg-muted hover:border-border transition-all duration-150 ease-claude group shadow-soft"
                                    >
                                        <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", a.color)}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="text-sm font-medium text-foreground">{a.label}</div>
                                            <div className="text-[11px] text-muted-foreground font-mono truncate">{a.hint}</div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                    </button>
                                );
                            })}
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setQuickOpen(false)}>Cerrar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Mi perfil */}
                <MiPerfilDialog open={perfilOpen} onOpenChange={setPerfilOpen} />

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

type GlobalResultsShape = {
    pages: NavItem[];
    paquetes: Paquete[];
    consolidados: Consolidado[];
    total: number;
};

function GlobalSearchResults({
    results,
    query,
    loading,
    onSelect,
    variant,
}: {
    results: GlobalResultsShape;
    query: string;
    loading: boolean;
    onSelect: (path: string) => void;
    variant: 'top' | 'dialog';
}) {
    const hasQuery = query.trim().length > 0;
    const hasAny = results.total > 0;

    if (variant === 'top' && !hasAny && !hasQuery && !loading) {
        return null;
    }

    return (
        <div className="absolute left-0 right-0 top-11 z-50 rounded-xl border border-border/70 bg-popover shadow-popover overflow-hidden max-h-[420px] overflow-y-auto">
            {loading && !hasAny ? (
                <div className="px-2 py-2">
                    <ListRowsSkeleton rows={4} compact />
                </div>
            ) : !hasAny ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    {hasQuery ? `Sin resultados para "${query}"` : 'Empieza a escribir para buscar'}
                </div>
            ) : (
                <>
                    {results.pages.length > 0 && (
                        <ResultGroup
                            title="Páginas"
                            items={results.pages.map((p) => ({
                                key: `page-${p.path}`,
                                path: p.path,
                                label: p.label,
                                hint: p.path,
                                icon: <Globe className="h-3.5 w-3.5 text-muted-foreground" />,
                            }))}
                            onSelect={onSelect}
                        />
                    )}
                    {results.paquetes.length > 0 && (
                        <ResultGroup
                            title="Paquetes"
                            items={results.paquetes.map((p) => ({
                                key: `paq-${p.id}`,
                                path: `/paquetes/${p.id}`,
                                label: p.numeroGuia || `Paquete #${p.id}`,
                                hint: [p.destinatario, p.shipper?.nombre, p.contenido].filter(Boolean).join(' · '),
                                icon: <Package className="h-3.5 w-3.5 text-accent" />,
                            }))}
                            onSelect={onSelect}
                        />
                    )}
                    {results.consolidados.length > 0 && (
                        <ResultGroup
                            title="Consolidados"
                            items={results.consolidados.map((c) => ({
                                key: `con-${c.id}`,
                                path: `/consolidados/${c.id}`,
                                label: c.numeroGuia || `Consolidado #${c.id}`,
                                hint: [
                                    c.estado ? c.estado : null,
                                    c.paquetes ? `${c.paquetes.length} paquete${c.paquetes.length === 1 ? '' : 's'}` : null,
                                ].filter(Boolean).join(' · '),
                                icon: <ShoppingBag className="h-3.5 w-3.5 text-success" />,
                            }))}
                            onSelect={onSelect}
                        />
                    )}
                </>
            )}
        </div>
    );
}

function GlobalSearchDialogResults({
    results,
    query,
    loading,
    onSelect,
}: {
    results: GlobalResultsShape;
    query: string;
    loading: boolean;
    onSelect: (path: string) => void;
}) {
    const hasQuery = query.trim().length > 0;
    const hasAny = results.total > 0;

    if (loading && !hasAny) {
        return (
            <div className="p-3">
                <ListRowsSkeleton rows={6} />
            </div>
        );
    }
    if (!hasAny) {
        return (
            <div className="p-6 text-center text-sm text-muted-foreground">
                {hasQuery ? `Sin resultados para "${query}"` : 'Empieza a escribir para buscar páginas, paquetes o consolidados.'}
            </div>
        );
    }
    return (
        <div>
            {results.pages.length > 0 && (
                <ResultGroup
                    title="Páginas"
                    items={results.pages.map((p) => ({
                        key: `page-${p.path}`,
                        path: p.path,
                        label: p.label,
                        hint: p.path,
                        icon: <Globe className="h-3.5 w-3.5 text-muted-foreground" />,
                    }))}
                    onSelect={onSelect}
                />
            )}
            {results.paquetes.length > 0 && (
                <ResultGroup
                    title="Paquetes"
                    items={results.paquetes.map((p) => ({
                        key: `paq-${p.id}`,
                        path: `/paquetes/${p.id}`,
                        label: p.numeroGuia || `Paquete #${p.id}`,
                        hint: [p.destinatario, p.shipper?.nombre, p.contenido].filter(Boolean).join(' · '),
                        icon: <Package className="h-3.5 w-3.5 text-accent" />,
                    }))}
                    onSelect={onSelect}
                />
            )}
            {results.consolidados.length > 0 && (
                <ResultGroup
                    title="Consolidados"
                    items={results.consolidados.map((c) => ({
                        key: `con-${c.id}`,
                        path: `/consolidados/${c.id}`,
                        label: c.numeroGuia || `Consolidado #${c.id}`,
                        hint: [
                            c.estado ? c.estado : null,
                            c.paquetes ? `${c.paquetes.length} paquete${c.paquetes.length === 1 ? '' : 's'}` : null,
                        ].filter(Boolean).join(' · '),
                        icon: <ShoppingBag className="h-3.5 w-3.5 text-success" />,
                    }))}
                    onSelect={onSelect}
                />
            )}
        </div>
    );
}

function ResultGroup({
    title,
    items,
    onSelect,
}: {
    title: string;
    items: Array<{ key: string; path: string; label: string; hint?: string; icon?: React.ReactNode }>;
    onSelect: (path: string) => void;
}) {
    return (
        <div className="border-b border-border/40 last:border-b-0">
            <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground bg-muted/30">
                {title}
            </div>
            <div className="p-1">
                {items.map((it) => (
                    <button
                        key={it.key}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onSelect(it.path)}
                        className="w-full px-2.5 py-2 rounded-md text-left hover:bg-muted transition-colors flex items-center gap-2.5 group"
                    >
                        {it.icon}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{it.label}</div>
                            {it.hint && (
                                <div className="text-[11px] text-muted-foreground truncate">{it.hint}</div>
                            )}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                ))}
            </div>
        </div>
    );
}

function ThemeOption({
    icon,
    label,
    active,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-[10px] font-medium transition-all duration-150 ease-claude border",
                active
                    ? "bg-accent-soft text-accent-soft-foreground border-accent/40 shadow-soft"
                    : "bg-transparent text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
            )}
            aria-pressed={active}
        >
            {icon}
            {label}
        </button>
    );
}
