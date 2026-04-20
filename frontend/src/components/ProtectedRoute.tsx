import { Navigate } from 'react-router-dom';
import { useMe } from '@/hooks/useMe';
import { Skeleton } from '@/components/ui/skeleton';

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
            return (
                <div role="status" aria-label="Verificando permisos" className="p-6 space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-56" />
                </div>
            );
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
