import { Toaster as Sonner } from 'sonner';
import {
    AlertTriangle,
    CheckCircle2,
    Info,
    Loader2,
    XCircle,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export function Toaster() {
    const { resolvedTheme } = useTheme();

    return (
        <Sonner
            theme={resolvedTheme}
            position="bottom-right"
            expand={false}
            closeButton
            visibleToasts={3}
            gap={8}
            offset={24}
            duration={4500}
            className="mvs-toaster"
            icons={{
                success: <CheckCircle2 className="h-4 w-4" />,
                error: <XCircle className="h-4 w-4" />,
                warning: <AlertTriangle className="h-4 w-4" />,
                info: <Info className="h-4 w-4" />,
                loading: <Loader2 className="h-4 w-4 animate-spin" />,
            }}
            toastOptions={{
                duration: 4500,
                classNames: {
                    toast: 'mvs-toast',
                    title: 'mvs-toast-title',
                    description: 'mvs-toast-description',
                    actionButton: 'mvs-toast-action',
                    cancelButton: 'mvs-toast-cancel',
                    closeButton: 'mvs-toast-close',
                    icon: 'mvs-toast-icon',
                    success: 'mvs-toast-success',
                    error: 'mvs-toast-error',
                    warning: 'mvs-toast-warning',
                    info: 'mvs-toast-info',
                    loading: 'mvs-toast-loading',
                },
            }}
        />
    );
}
