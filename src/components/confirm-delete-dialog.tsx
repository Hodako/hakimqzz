import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  busy?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  busy = false,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-destructive/20 shadow-2xl glass-card">
        <DialogHeader className="space-y-1">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-3 border border-destructive/20">
            <Trash2 className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center text-base font-bold tracking-tight text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row gap-2 mt-4 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-9 text-xs beveled-button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1 h-9 text-xs font-semibold shadow-inner"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
