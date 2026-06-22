"use client";


import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getExpenses } from "@/lib/queries";
import type { Expense } from "@/lib/queries";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useT } from "@/lib/i18n";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { FAB } from "@/components/ui/fab";
import { toast } from "sonner";
import { createExpenseFn, deleteExpenseFn } from "@/lib/rpc";
import { setCachedData, refreshQueries } from "@/lib/optimistic-cache";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

export default function ExpensesPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const { data } = useCachedQuery(["expenses"], getExpenses);
  const [open, setOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const total = (data ?? []).reduce((a, e) => a + Number(e.amount), 0);

  async function performDelete() {
    if (!expenseToDelete) return;
    setDeleteBusy(true);
    setCachedData<Expense[]>(qc, ["expenses"], old => (old ?? []).filter(e => e.id !== expenseToDelete.id));
    try {
      await deleteExpenseFn({ data: { id: expenseToDelete.id } });
      await refreshQueries(qc, ["expenses"], ["cashbox"]);
      toast.success(t("delete"));
      setExpenseToDelete(null);
    } catch (err: unknown) {
      await refreshQueries(qc, ["expenses"], ["cashbox"]);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold">{t("expenses")}</h1>
      <Card className="p-4 bg-gradient-to-br from-muted to-secondary">
        <div className="text-xs font-medium text-muted-foreground">{t("total")}</div>
        <div className="text-2xl font-bold mt-1">{fmtMoney(total)}</div>
      </Card>
      {(!data || data.length === 0) && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t("no_activity")}</Card>
      )}
      <Card className="divide-y divide-border overflow-hidden">
        {data?.map(e => (
          <div key={e.id} className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{e.title}</div>
              <div className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)}{e.note ? ` · ${e.note}` : ""}</div>
            </div>
            <div className="font-semibold text-destructive shrink-0">−{fmtMoney(e.amount)}</div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => setExpenseToDelete(e)}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </Card>
      <FAB onClick={() => setOpen(true)} />
      <ExpenseDialog open={open} onOpenChange={setOpen} />
      <ConfirmDeleteDialog
        open={!!expenseToDelete}
        onOpenChange={(v) => { if (!v) setExpenseToDelete(null); }}
        title="Delete Expense"
        description={`Are you sure you want to delete "${expenseToDelete?.title}"? This action cannot be undone.`}
        onConfirm={performDelete}
        busy={deleteBusy}
      />
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount) || 0;
    if (amt <= 0 || !title.trim()) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: Expense = { id: tempId, title: title.trim(), amount: amt, note: note || null, created_at: new Date().toISOString() };

    setCachedData<Expense[]>(qc, ["expenses"], old => [optimistic, ...(old ?? [])]);
    setTitle(""); setAmount(""); setNote("");
    onOpenChange(false);
    toast.success(t("save"));

    setBusy(true);
    try {
      await createExpenseFn({ data: { title: title.trim(), amount: amt, note: note || null } });
      await refreshQueries(qc, ["expenses"], ["cashbox"]);
    } catch (err: unknown) {
      setCachedData<Expense[]>(qc, ["expenses"], old => (old ?? []).filter(e => e.id !== tempId));
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("add_expense")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("title")}</Label><Input required placeholder={t("title")} value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("amount")}</Label><Input required placeholder={t("amount")} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("note")}</Label><Input placeholder={t("note")} value={note} onChange={e => setNote(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={busy}>{busy ? "…" : t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
