import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  entityLabel,
  entityName,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string;
  entityName?: string | null;
  loading?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const nombre = entityName?.trim();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle>Eliminar {entityLabel}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Esta acción es permanente y no se puede deshacer.
            {nombre ? (
              <>
                {" "}
                Vas a eliminar{" "}
                <span className="font-medium text-foreground">{nombre}</span>.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            loading={loading}
            loadingText="Eliminando…"
          >
            Sí, eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

