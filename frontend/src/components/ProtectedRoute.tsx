import { Navigate } from 'react-router-dom';
import { useMe } from '@/hooks/useMe';

const ProtectedRoute = ({
    children,
    allowedRoles,
    allowedPermissions,
}: {
    children: React.ReactNode;
    allowedRoles?: string[];
    allowedPermissions?: string[];
}) => {
    const { me, loading } = useMe();
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const needsRoleCheck = Boolean(allowedRoles?.length);
    const needsPermissionCheck = Boolean(allowedPermissions?.length);

    if (needsRoleCheck || needsPermissionCheck) {
        if (loading) {
            return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;
        }
        const role = me?.rol ?? null;
        const permisos = me?.permisos ?? [];

        if (needsRoleCheck) {
            if (!role || !allowedRoles!.includes(role)) {
                return <Navigate to="/dashboard" replace />;
            }
        }
        if (needsPermissionCheck) {
            const ok = allowedPermissions!.some((p) => permisos.includes(p));
            if (!ok) {
                return <Navigate to="/dashboard" replace />;
            }
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
