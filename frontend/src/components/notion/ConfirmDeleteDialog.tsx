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
      <DialogContent className="max-w-md rounded-2xl border-border/50">
        <DialogHeader>
          <DialogTitle>Eliminar {entityLabel}</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer.
            {nombre ? (
              <>
                {" "}
                Estás por eliminar: <span className="font-medium text-foreground">{nombre}</span>.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

