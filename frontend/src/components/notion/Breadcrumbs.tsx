import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Breadcrumbs() {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    const formatPath = (path: string) => {
        return path
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    if (pathnames.length === 0) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                <Home className="w-3 h-3" />
                <span className="font-medium">Dashboard</span>
            </div>
        );
    }

    return (
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground px-1 overflow-hidden whitespace-nowrap">
            <Link to="/dashboard" className="hover:text-foreground hover:bg-muted/70 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1">
                <Home className="w-3 h-3" />
            </Link>

            {pathnames.map((value, index) => {
                const last = index === pathnames.length - 1;
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;

                return (
                    <div key={to} className="flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-60" />
                        {last ? (
                            <span className="font-medium text-foreground px-1 py-0.5 cursor-default truncate max-w-[140px]">
                                {formatPath(value)}
                            </span>
                        ) : (
                            <Link
                                to={to}
                                className="hover:text-foreground hover:bg-muted/70 px-1 py-0.5 rounded transition-colors truncate max-w-[140px]"
                            >
                                {formatPath(value)}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
