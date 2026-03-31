import { Navigate } from 'react-router-dom';
import { useMe } from '@/hooks/useMe';

const ProtectedRoute = ({
    children,
    allowedRoles,
}: {
    children: React.ReactNode;
    allowedRoles?: string[];
}) => {
    const { me, loading } = useMe();
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles?.length) {
        if (loading) {
            return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;
        }
        const role = me?.rol ?? null;
        if (!role || !allowedRoles.includes(role)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
