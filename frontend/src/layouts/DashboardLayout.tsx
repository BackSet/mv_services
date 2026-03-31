import {
    LayoutDashboard,
    Package,
    Globe,
    ShoppingBag,
    UserCog,
    KeyRound,
    Shield,
    Search,
    Sun,
    Moon,
    Bell,
    Menu,
    ChevronLeft,
    Plus,
    PlusCircle,
    LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/components/theme-provider';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useMe } from '@/hooks/useMe';

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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

type SidebarIcon = React.ElementType<{ className?: string }>;

type MeResponse = {
    username: string;
    email?: string | null;
    rol: string | null;
    permisos: string[];
    shipperId: number | null;
    shipperNombre?: string | null;
};

const SidebarItem = ({
    icon: Icon,
    label,
    path,
    collapsed = false,
    onAddClick
}: {
    icon: SidebarIcon,
    label: string,
    path: string,
    collapsed?: boolean,
    onAddClick?: () => void
}) => {
    const location = useLocation();
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

    return (
        <div className="group relative">
            <Link to={path} className="block">
                <div
                    className={cn(
                        "flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-colors cursor-pointer select-none",
                        isActive
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground",
                        collapsed && "justify-center px-0"
                    )}>
                    <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive ? "opacity-100" : "opacity-70")} />
                    {!collapsed && <span className="truncate">{label}</span>}
                </div>
            </Link>
            {!collapsed && onAddClick && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onAddClick();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 p-0.5 rounded transition-all text-muted-foreground"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
};

const SidebarSectionHeader = ({ title, collapsed }: { title: string, collapsed?: boolean }) => {
    if (collapsed) return <Separator className="my-3 opacity-40 border-sidebar-border" />;
    return (
        <h4 className="px-2.5 text-[10px] font-semibold text-sidebar-muted mt-6 mb-1 uppercase tracking-[0.08em]">
            {title}
        </h4>
    );
};

const SidebarContent = ({
    collapsed = false,
    onQuickCreate,
    onSearchClick,
    canSeeAdmin,
    canSeeOps,
    shipperNombre,
}: {
    collapsed?: boolean;
    onQuickCreate?: () => void;
    onSearchClick?: () => void;
    canSeeAdmin: boolean;
    canSeeOps: boolean;
    shipperNombre?: string | null;
}) => (
    <>
        {/* Workspace Logo */}
        <div className={cn("px-3 pt-4 pb-2", collapsed && "px-2")}>
            <Link
                to="/dashboard"
                className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/60 transition-colors",
                    collapsed && "justify-center px-0"
                )}
            >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-foreground to-foreground/80 flex-shrink-0 flex items-center justify-center text-background text-xs font-bold shadow-sm">
                    M
                </div>
                {!collapsed && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                            {shipperNombre || "MV Services"}
                        </span>
                        <span className="text-[10px] text-sidebar-muted truncate mt-0.5">
                            Sistema de Gestión
                        </span>
                    </div>
                )}
            </Link>
        </div>

        {/* Search */}
        {!collapsed && onSearchClick && (
            <div className="px-3 pb-1">
                <button
                    type="button"
                    onClick={onSearchClick}
                    className="w-full flex items-center gap-2 rounded-lg border border-sidebar-border bg-background/50 px-2.5 py-1.5 text-xs text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors text-left"
                >
                    <Search className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    <span className="flex-1 truncate">Buscar</span>
                    <kbd className="hidden sm:inline-flex text-[9px] font-mono bg-sidebar-hover/80 border border-sidebar-border px-1 py-0.5 rounded text-sidebar-muted">
                        ⌘K
                    </kbd>
                </button>
            </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" collapsed={collapsed} />

            <SidebarSectionHeader title="GESTIÓN" collapsed={collapsed} />
            <SidebarItem icon={Package} label="Paquetes" path="/paquetes" collapsed={collapsed} onAddClick={onQuickCreate} />
            <SidebarItem icon={ShoppingBag} label="Consolidados" path="/consolidados" collapsed={collapsed} />

            {canSeeOps ? (
                <>
                    <SidebarSectionHeader title="OPERACIÓN" collapsed={collapsed} />
                    <SidebarItem icon={Globe} label="Shippers" path="/shippers" collapsed={collapsed} />
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
        </div>
    </>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [quickOpen, setQuickOpen] = useState(false);
    const { me } = useMe();

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const role = (me as MeResponse | null)?.rol ?? null;
    const canSeeAdmin = role === 'ADMIN';
    const canSeeOps = role === 'ADMIN' || role === 'MV_ADMIN';

    const quickActions = useMemo(() => {
        const base = [
            { label: 'Nuevo paquete', hint: '/paquetes/new', path: '/paquetes/new' },
        ];
        const opsOnly = [
            { label: 'Nuevo consolidado', hint: '/consolidados/new', path: '/consolidados/new' },
            { label: 'Nuevo shipper', hint: '/shippers/new', path: '/shippers/new' },
        ];
        return canSeeOps ? [...opsOnly, ...base] : base;
    }, [canSeeOps]);

    const searchItems = useMemo(() => {
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

    const filteredSearchItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return searchItems;
        return searchItems.filter((i) => i.label.toLowerCase().includes(q) || i.path.toLowerCase().includes(q));
    }, [searchItems, searchQuery]);

    const go = (path: string) => {
        setSearchOpen(false);
        setQuickOpen(false);
        setSearchQuery('');
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
        const onKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toLowerCase().includes('mac');
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
            if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setQuickOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <aside className={cn(
                "hidden md:flex flex-col flex-shrink-0 bg-sidebar-background border-r border-sidebar-border transition-[width] duration-200 ease-out",
                collapsed ? "w-[52px]" : "w-[240px]"
            )}>
                <SidebarContent
                    collapsed={collapsed}
                    onQuickCreate={() => setQuickOpen(true)}
                    onSearchClick={() => setSearchOpen(true)}
                    canSeeAdmin={canSeeAdmin}
                    canSeeOps={canSeeOps}
                    shipperNombre={role === 'SHIPPER' ? ((me as MeResponse | null)?.shipperNombre ?? null) : null}
                />

                {/* Sidebar Footer */}
                <div className="p-2 space-y-0.5 border-t border-sidebar-border">
                    <button
                        type="button"
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(
                            "w-full flex items-center gap-2 px-2.5 py-[7px] text-xs text-sidebar-muted cursor-pointer hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-hover transition-colors",
                            collapsed && "justify-center"
                        )}
                    >
                        <ChevronLeft className={cn("w-3.5 h-3.5 transition-transform", collapsed && "rotate-180")} />
                        {!collapsed && <span>Ocultar</span>}
                    </button>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className={cn(
                            "w-full flex items-center gap-2 px-2.5 py-[7px] text-xs text-sidebar-muted cursor-pointer hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-hover transition-colors",
                            collapsed && "justify-center"
                        )}
                    >
                        {theme === 'dark' ? <Moon className="w-4 h-4 opacity-70" /> : <Sun className="w-4 h-4 opacity-70" />}
                        {!collapsed && <span>{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
                {/* Topbar */}
                <header className="h-12 flex items-center justify-between gap-4 px-4 sticky top-0 z-40 flex-shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-xl">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Mobile Menu */}
                        <div className="md:hidden shrink-0">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-8 h-8 -ml-2">
                                        <Menu className="w-4 h-4" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-[240px] border-r border-sidebar-border bg-sidebar-background">
                                    <SheetTitle className="sr-only">Menu</SheetTitle>
                                    <SheetDescription className="sr-only">Main Navigation</SheetDescription>
                                    <div className="h-full flex flex-col">
                                        <SidebarContent
                                            onQuickCreate={() => setQuickOpen(true)}
                                            onSearchClick={() => setSearchOpen(true)}
                                            canSeeAdmin={canSeeAdmin}
                                            canSeeOps={canSeeOps}
                                            shipperNombre={role === 'SHIPPER' ? ((me as MeResponse | null)?.shipperNombre ?? null) : null}
                                        />
                                        <div className="p-3 border-t border-sidebar-border mt-auto">
                                            <button
                                                type="button"
                                                onClick={toggleTheme}
                                                className="w-full flex items-center gap-2 px-2.5 py-2 text-sm text-sidebar-muted cursor-pointer hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-hover transition-colors"
                                            >
                                                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                                <span>{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Search */}
                        <div className="flex-1 max-w-lg">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-muted-foreground transition-colors" />
                                <Input
                                    type="text"
                                    placeholder="Buscar paquetes, navegar..."
                                    className="pl-9 pr-16 h-8 text-[13px] cursor-pointer bg-muted/30 border-border/30 rounded-lg hover:bg-muted/50 hover:border-border/50 transition-all focus-visible:ring-0 focus-visible:bg-background focus-visible:border-border/60"
                                    readOnly
                                    onClick={() => setSearchOpen(true)}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded-md border border-border/40 bg-muted/50 px-1.5 font-mono text-[9px] font-medium text-muted-foreground/60 sm:flex">
                                        <span className="text-[10px]">⌘</span>K
                                    </kbd>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 ml-auto">
                        {/* Notifications */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                            aria-label="Notificaciones"
                        >
                            <Bell className="h-4 w-4" />
                        </Button>

                        {/* Quick Create */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                            onClick={() => setQuickOpen(true)}
                            aria-label="Crear"
                        >
                            <PlusCircle className="h-4 w-4" />
                        </Button>

                        {/* User Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="h-8 w-8 rounded-lg p-0 overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all ml-1"
                                    aria-label="Menú de usuario"
                                >
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground">
                                        {initials}
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 rounded-xl border-border/50 p-0 overflow-hidden">
                                {me && (
                                    <>
                                        <div className="px-4 py-4 bg-gradient-to-b from-muted/40 to-transparent">
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0 shadow-sm">
                                                    {initials}
                                                </div>
                                                <div className="overflow-hidden flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">{me.username}</p>
                                                    {(me as MeResponse).email && (
                                                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{(me as MeResponse).email}</p>
                                                    )}
                                                    {role && (
                                                        <Badge variant="role" className="mt-2">{role}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <div className="p-1">
                                    <DropdownMenuItem
                                        onClick={logout}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Cerrar sesión
                                    </DropdownMenuItem>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Search dialog */}
                <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Buscar</DialogTitle>
                            <DialogDescription>Navega rápido a cualquier sección.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            <input
                                autoFocus
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Escribe para buscar…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="max-h-[280px] overflow-y-auto rounded-md border border-border/60">
                                {filteredSearchItems.length ? (
                                    <div className="divide-y divide-border/40">
                                        {filteredSearchItems.map((i) => (
                                            <button
                                                key={i.path}
                                                type="button"
                                                onClick={() => go(i.path)}
                                                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                                            >
                                                <div className="text-sm font-medium text-foreground">{i.label}</div>
                                                <div className="text-xs text-muted-foreground">{i.path}</div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 text-sm text-muted-foreground">Sin resultados.</div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSearchOpen(false)}>Cerrar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Quick create dialog */}
                <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Crear</DialogTitle>
                            <DialogDescription>Accesos rápidos para registrar información.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            {quickActions.map((a) => (
                                <button
                                    key={a.path}
                                    type="button"
                                    onClick={() => go(a.path)}
                                    className="w-full flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent transition-colors"
                                >
                                    <span className="font-medium text-foreground">{a.label}</span>
                                    <span className="text-xs text-muted-foreground">{a.hint}</span>
                                </button>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setQuickOpen(false)}>Cerrar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
