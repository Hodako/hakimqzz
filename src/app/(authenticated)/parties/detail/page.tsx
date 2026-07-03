"use client";


import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowDownToLine, Trash2, Pencil, Plus } from "lucide-react";
import {
  getPaymentsForParty, getSalesForParty, getParty,
  getPartyReceivables, getPartyPayables, getPayableSettlements,
} from "@/lib/queries";
import type { Party, PartyLedger, Payment, Sale } from "@/lib/queries";
import { useT } from "@/lib/i18n";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SpeedLoader } from "@/components/speed-loader";
import { toast } from "sonner";
import {
  createPaymentFn, deletePaymentFn, deleteSaleFn,
  createPartyReceivableFn, createPartyPayableFn, createPayableSettlementFn,
  deletePartyReceivableFn, deletePartyPayableFn, updatePartyFn, deletePartyFn,
  deletePayableSettlementFn,
} from "@/lib/rpc";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { setCachedData, refreshQueries } from "@/lib/optimistic-cache";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

export default function PartyDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { lang, t } = useT();
  const router = useRouter();
  const qc = useQueryClient();

  const partyQuery = useCachedQuery(["party", id], () => getParty(id));
  const sales = useCachedQuery(["party-detail", "sales", id], () => getSalesForParty(id));
  const payments = useCachedQuery(["payments", id], () => getPaymentsForParty(id));
  const receivables = useCachedQuery(["party-receivables", id], () => getPartyReceivables(id));
  const payables = useCachedQuery(["party-payables", id], () => getPartyPayables(id));
  const settlements = useCachedQuery(["party-settlements", id], () => getPayableSettlements(id));

  const [addKind, setAddKind] = useState<"receivable" | "payable" | null>(null);

  const [backPath, setBackPath] = useState("/parties");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ref = document.referrer;
      if (ref.includes("/dues")) {
        setBackPath("/dues");
      }
    }
  }, []);

  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);
  const [isDeletingParty, setIsDeletingParty] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const party = partyQuery.data;
  const isLoading = partyQuery.isLoading && !party;

  const saleDue = (sales.data ?? []).filter(s => !s.returned).reduce((a, s) => a + Number(s.due_amount), 0);
  const extraReceivable = (receivables.data ?? []).reduce((a, r) => a + Number(r.amount), 0);
  const paidTotal = (payments.data ?? []).reduce((a, p) => a + Number(p.amount), 0);
  const outstanding = Math.max(saleDue + extraReceivable - paidTotal, 0);

  const payableTotal = (payables.data ?? []).reduce((a, p) => a + Number(p.amount), 0);
  const settledTotal = (settlements.data ?? []).reduce((a, s) => a + Number(s.amount), 0);
  const payableOutstanding = Math.max(payableTotal - settledTotal, 0);

  type Entry = {
    id: string; date: string; label: string; amount: number;
    kind: "sale" | "payment" | "receivable" | "payable" | "settlement";
    deletable: boolean; rawId: string;
  };

  const hasReceivableHistory = outstanding > 0 || saleDue > 0 || extraReceivable > 0 || paidTotal > 0;
  const hasPayableHistory = payableOutstanding > 0 || payableTotal > 0 || settledTotal > 0;

  const showReceivable = hasReceivableHistory || (!hasReceivableHistory && !hasPayableHistory);
  const showPayable = hasPayableHistory || (!hasReceivableHistory && !hasPayableHistory);

  const entries: Entry[] = [
    ...(showReceivable ? (sales.data ?? []).filter(s => Number(s.due_amount) > 0 && !s.returned).map(s => ({
      id: "s" + s.id, rawId: s.id, date: s.created_at,
      label: s.product_id ? `${s.product_name} ×${s.qty}` : s.product_name,
      amount: Number(s.due_amount), kind: "sale" as const, deletable: !s.product_id,
    })) : []),
    ...(showReceivable ? (receivables.data ?? []).map(r => ({
      id: "r" + r.id, rawId: r.id, date: r.created_at,
      label: r.note || t("money_owed"), amount: Number(r.amount),
      kind: "receivable" as const, deletable: true,
    })) : []),
    ...(showReceivable ? (payments.data ?? []).map(p => ({
      id: "p" + p.id, rawId: p.id, date: p.created_at,
      label: p.note || t("collect_payment"), amount: -Number(p.amount),
      kind: "payment" as const, deletable: true,
    })) : []),
    ...(showPayable ? (payables.data ?? []).map(p => ({
      id: "pb" + p.id, rawId: p.id, date: p.created_at,
      label: p.note || t("money_payable"), amount: Number(p.amount),
      kind: "payable" as const, deletable: true,
    })) : []),
    ...(showPayable ? (settlements.data ?? []).map(s => ({
      id: "st" + s.id, rawId: s.id, date: s.created_at,
      label: s.note || t("pay_party"), amount: -Number(s.amount),
      kind: "settlement" as const, deletable: true,
    })) : []),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  async function performDeleteEntry() {
    if (!entryToDelete) return;
    setIsDeletingEntry(true);
    const prevPayments = qc.getQueryData<Payment[]>(["payments", id]);
    const prevSales = qc.getQueryData<Sale[]>(["party-detail", "sales", id]);
    const prevReceivables = qc.getQueryData<PartyLedger[]>(["party-receivables", id]);
    const prevPayables = qc.getQueryData<PartyLedger[]>(["party-payables", id]);
    const prevSettlements = qc.getQueryData<PartyLedger[]>(["party-settlements", id]);

    try {
      if (entryToDelete.kind === "payment") {
        setCachedData<Payment[]>(qc, ["payments", id], old =>
          (old ?? []).filter(p => p.id !== entryToDelete.rawId),
        );
        await deletePaymentFn({ data: { id: entryToDelete.rawId } });
      } else if (entryToDelete.kind === "sale") {
        setCachedData<Sale[]>(qc, ["party-detail", "sales", id], old =>
          (old ?? []).filter(s => s.id !== entryToDelete.rawId),
        );
        const res = await deleteSaleFn({ data: { id: entryToDelete.rawId } });
        if (res && !res.success && 'error' in res) {
          throw new Error(res.error as string);
        }
      } else if (entryToDelete.kind === "receivable") {
        setCachedData<PartyLedger[]>(qc, ["party-receivables", id], old =>
          (old ?? []).filter(r => r.id !== entryToDelete.rawId),
        );
        await deletePartyReceivableFn({ data: { id: entryToDelete.rawId } });
      } else if (entryToDelete.kind === "payable") {
        setCachedData<PartyLedger[]>(qc, ["party-payables", id], old =>
          (old ?? []).filter(p => p.id !== entryToDelete.rawId),
        );
        await deletePartyPayableFn({ data: { id: entryToDelete.rawId } });
      } else if (entryToDelete.kind === "settlement") {
        setCachedData<PartyLedger[]>(qc, ["party-settlements", id], old =>
          (old ?? []).filter(s => s.id !== entryToDelete.rawId),
        );
        await deletePayableSettlementFn({ data: { id: entryToDelete.rawId } });
      }
      await refreshQueries(qc, ["all-payments"], ["sales"], ["all-party-receivables"], ["all-party-payables"], ["party-settlements", id], ["all-payable-settlements"]);
      toast.success(t("delete"));
      setEntryToDelete(null);
    } catch (err: unknown) {
      if (entryToDelete.kind === "payment" && prevPayments) setCachedData(qc, ["payments", id], prevPayments);
      if (entryToDelete.kind === "sale" && prevSales) setCachedData(qc, ["party-detail", "sales", id], prevSales);
      if (entryToDelete.kind === "receivable" && prevReceivables) setCachedData(qc, ["party-receivables", id], prevReceivables);
      if (entryToDelete.kind === "payable" && prevPayables) setCachedData(qc, ["party-payables", id], prevPayables);
      if (entryToDelete.kind === "settlement" && prevSettlements) setCachedData(qc, ["party-settlements", id], prevSettlements);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeletingEntry(false);
    }
  }

  async function performDeleteParty() {
    if (!partyToDelete) return;
    setIsDeletingParty(true);
    const prevParties = qc.getQueryData<Party[]>(["parties"]);
    try {
      setCachedData<Party[]>(qc, ["parties"], old => (old ?? []).filter(p => p.id !== id));
      await deletePartyFn({ data: { id } });
      qc.removeQueries({ queryKey: ["party", id] });
      qc.removeQueries({ queryKey: ["party-detail", "sales", id] });
      qc.removeQueries({ queryKey: ["payments", id] });
      qc.removeQueries({ queryKey: ["party-receivables", id] });
      qc.removeQueries({ queryKey: ["party-payables", id] });
      qc.removeQueries({ queryKey: ["party-settlements", id] });
      await refreshQueries(qc, ["parties"]);
      toast.success(t("delete"));
      setPartyToDelete(null);
      router.push(backPath);
    } catch (err: unknown) {
      if (prevParties) setCachedData<Party[]>(qc, ["parties"], prevParties);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeletingParty(false);
    }
  }

  if (isLoading) return <SpeedLoader fullScreen={false} />;

  if (!party) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-muted-foreground">{t("no_results")}</p>
        <Link href="/parties">
          <Button variant="outline">
            <ArrowLeft className="size-4 mr-1" />{t("parties")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <Link href={backPath}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="size-4 mr-1" />
          {backPath === "/dues" ? (lang === "bn" ? "বাকী" : "Dues") : t("parties")}
        </Button>
      </Link>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{party.name || "Unnamed"}</h1>
          <div className="text-sm text-muted-foreground space-y-0.5">
            {party.phone && <p>{party.phone}</p>}
            {party.address && <p>{party.address}</p>}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5 mr-1" />{t("edit")}
          </Button>
          <Button size="sm" variant="destructive" className="beveled-button" onClick={() => setPartyToDelete(party)}>
            <Trash2 className="size-3.5 mr-1" />{lang === "bn" ? "মুছুন" : "Delete"}
          </Button>
        </div>
      </div>

      {(sales.isFetching || payments.isFetching) && (
        <div className="h-1 rounded-full bg-primary/20 overflow-hidden">
          <div className="h-full w-1/3 bg-primary animate-pulse rounded-full" />
        </div>
      )}

      {/* Decoupled balances, netting card removed */}

      <div className="max-w-md mx-auto w-full space-y-4">
        {/* Receivable (They owe me) */}
        {showReceivable && (
          <>
            <Card className="p-5 glass-card border-amber-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">{t("borrowed_from_me")} (জমা / তারা দেবে)</div>
              <div className="text-3xl font-extrabold text-amber-600 mt-2 font-serif">{fmtMoney(outstanding)}</div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-normal border-t border-dashed border-border/80 pt-2">
                হিসাব: বাকী ও অন্যান্য ({fmtMoney(saleDue + extraReceivable)}) − আদায় ({fmtMoney(paidTotal)}) = বাকি দেবে {fmtMoney(outstanding)}
              </p>
              <Button className="mt-4 w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium beveled-button" size="sm" onClick={() => setCollectOpen(true)}>
                <Plus className="size-3.5 mr-1.5" /> {t("collect_payment")} (টাকা আদায় করুন)
              </Button>
            </Card>

            <Button size="sm" variant="outline" className="w-full h-9 text-xs beveled-button" onClick={() => setAddKind("receivable")}>
              <Plus className="size-3.5 mr-1" /> {t("add_money_owed")} (জমা/বাকী যোগ করুন)
            </Button>
          </>
        )}

        {/* Payable (I owe them) */}
        {showPayable && (
          <>
            <Card className="p-5 glass-card border-rose-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">{t("borrowed_from_him")} (বকেয়া)</div>
              <div className="text-3xl font-extrabold text-rose-600 mt-2 font-serif">{fmtMoney(payableOutstanding)}</div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-normal border-t border-dashed border-border/80 pt-2">
                হিসাব: বকেয়া ({fmtMoney(payableTotal)}) − জমা ({fmtMoney(settledTotal)}) = বাকি পাবে {fmtMoney(payableOutstanding)}
              </p>
              <Button className="mt-4 w-full h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium beveled-button" size="sm" onClick={() => setPayOpen(true)}>
                <ArrowDownToLine className="size-3.5 mr-1.5 rotate-180" /> {t("pay_party")} (জমা দিন)
              </Button>
            </Card>

            <Button size="sm" variant="outline" className="w-full h-9 text-xs beveled-button" onClick={() => setAddKind("payable")}>
              <Plus className="size-3.5 mr-1" /> {t("add_payable")} (বকেয়া যোগ করুন)
            </Button>
          </>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("history")}</h2>
        <Card className="divide-y divide-border overflow-hidden">
          {entries.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">{t("no_activity")}</div>}
          {entries.map(e => (
            <div key={e.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate text-sm">{e.label}</div>
                <div className="text-xs text-muted-foreground">{fmtDateTime(e.date)}</div>
              </div>
              <div className={`text-sm font-semibold shrink-0 ${e.amount < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {e.amount < 0 ? "−" : "+"}{fmtMoney(Math.abs(e.amount))}
              </div>
              {e.deletable && (
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => setEntryToDelete(e)}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </Card>
      </div>

      <CollectDialog partyId={id} open={collectOpen} onOpenChange={setCollectOpen} />
      <PayPartyDialog partyId={id} open={payOpen} onOpenChange={setPayOpen} />
      <EditPartyDialog party={party} open={editOpen} onOpenChange={setEditOpen} />
      {addKind && (
        <AddLedgerDialog partyId={id} kind={addKind} open={!!addKind} onOpenChange={v => { if (!v) setAddKind(null); }} />
      )}

      <ConfirmDeleteDialog
        open={entryToDelete !== null}
        onOpenChange={(v) => { if (!v) setEntryToDelete(null); }}
        title="Delete Transaction"
        description={`Are you sure you want to delete this ${entryToDelete?.kind || "transaction"}? This action is permanent and cannot be undone.`}
        onConfirm={performDeleteEntry}
        busy={isDeletingEntry}
      />

      <ConfirmDeleteDialog
        open={partyToDelete !== null}
        onOpenChange={(v) => { if (!v) setPartyToDelete(null); }}
        title="Delete Party"
        description={`Are you sure you want to delete party "${partyToDelete?.name || "Unnamed"}"? All associated transaction history will be permanently deleted.`}
        onConfirm={performDeleteParty}
        busy={isDeletingParty}
      />
    </div>
  );
}

function EditPartyDialog({ party, open, onOpenChange }: { party: Party | undefined; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && party) {
      setName(party.name || "");
      setPhone(party.phone ?? "");
      setAddress(party.address ?? "");
    }
  }, [open, party]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!party) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const phoneVal = phone.trim() || null;
    const addressVal = address.trim() || null;
    const prevParty = qc.getQueryData<Party>(["party", party.id]);
    const prevParties = qc.getQueryData<Party[]>(["parties"]);

    setCachedData<Party>(qc, ["party", party.id], { ...party, name: trimmedName, phone: phoneVal, address: addressVal });
    setCachedData<Party[]>(qc, ["parties"], old =>
      (old ?? []).map(p => (p.id === party.id ? { ...p, name: trimmedName, phone: phoneVal, address: addressVal } : p)),
    );
    onOpenChange(false);
    toast.success(t("save"));

    setBusy(true);
    try {
      await updatePartyFn({ data: { id: party.id, name: trimmedName, phone: phoneVal, address: addressVal } });
      await refreshQueries(qc, ["parties"], ["party", party.id]);
    } catch (err: unknown) {
      if (prevParty) setCachedData(qc, ["party", party.id], prevParty);
      if (prevParties) setCachedData(qc, ["parties"], prevParties);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("edit_party")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("party_name")}</Label><Input required value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("phone")}</Label><Input inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Address (ঠিকানা)</Label>
            <Input placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={busy}>{busy ? "…" : t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddLedgerDialog({ partyId, kind, open, onOpenChange }: { partyId: string; kind: "receivable" | "payable"; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const queryKey = kind === "receivable" ? ["party-receivables", partyId] : ["party-payables", partyId];

  useEffect(() => {
    if (!open) { setAmount(""); setNote(""); }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return;
    const tempId = `temp-${Date.now()}`;
    const entry: PartyLedger = { id: tempId, party_id: partyId, amount: amt, note: note || null, created_at: new Date().toISOString() };

    setCachedData<PartyLedger[]>(qc, queryKey, old => [entry, ...(old ?? [])]);
    onOpenChange(false);
    toast.success(t("save"));

    setBusy(true);
    try {
      const saved = kind === "receivable"
        ? await createPartyReceivableFn({ data: { party_id: partyId, amount: amt, note: note || null } })
        : await createPartyPayableFn({ data: { party_id: partyId, amount: amt, note: note || null } });
      setCachedData<PartyLedger[]>(qc, queryKey, old =>
        (old ?? []).map(r => (r.id === tempId ? { ...saved, id: saved.id } : r)),
      );
      await refreshQueries(qc, queryKey, ["all-party-receivables"]);
    } catch (err: unknown) {
      setCachedData<PartyLedger[]>(qc, queryKey, old => (old ?? []).filter(r => r.id !== tempId));
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{kind === "receivable" ? t("add_money_owed") : t("add_payable")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("amount")}</Label><Input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("note")}</Label><Input value={note} onChange={e => setNote(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={busy}>{busy ? "…" : t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CollectDialog({ partyId, open, onOpenChange }: { partyId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setAmount(""); setNote(""); }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount) || 0;
    if (amt <= 0) return;
    const tempId = `temp-${Date.now()}`;
    const entry: Payment = { id: tempId, party_id: partyId, amount: amt, note: note || null, created_at: new Date().toISOString() };

    setCachedData<Payment[]>(qc, ["payments", partyId], old => [entry, ...(old ?? [])]);
    onOpenChange(false);
    toast.success(t("save"));

    setBusy(true);
    try {
      const saved = await createPaymentFn({ data: { party_id: partyId, amount: amt, note: note || null } });
      setCachedData<Payment[]>(qc, ["payments", partyId], old =>
        (old ?? []).map(p => (p.id === tempId ? { ...saved, id: saved.id } as any : p)),
      );
      await refreshQueries(qc, ["all-payments"]);
    } catch (err: unknown) {
      setCachedData<Payment[]>(qc, ["payments", partyId], old => (old ?? []).filter(p => p.id !== tempId));
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("collect_payment")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("amount")}</Label><Input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("note")}</Label><Input value={note} onChange={e => setNote(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={busy}>{busy ? "…" : t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PayPartyDialog({ partyId, open, onOpenChange }: { partyId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setAmount(""); setNote(""); }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount) || 0;
    if (amt <= 0) return;
    const tempId = `temp-${Date.now()}`;
    const entry: PartyLedger = { id: tempId, party_id: partyId, amount: amt, note: note || null, created_at: new Date().toISOString() };

    setCachedData<PartyLedger[]>(qc, ["party-settlements", partyId], old => [entry, ...(old ?? [])]);
    onOpenChange(false);
    toast.success(t("save"));

    setBusy(true);
    try {
      const saved = await createPayableSettlementFn({ data: { party_id: partyId, amount: amt, note: note || null } });
      setCachedData<PartyLedger[]>(qc, ["party-settlements", partyId], old =>
        (old ?? []).map(s => (s.id === tempId ? { ...saved, id: saved.id } : s)),
      );
      await refreshQueries(qc, ["party-settlements", partyId]);
    } catch (err: unknown) {
      setCachedData<PartyLedger[]>(qc, ["party-settlements", partyId], old => (old ?? []).filter(s => s.id !== tempId));
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("pay_party")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("amount")}</Label><Input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("note")}</Label><Input value={note} onChange={e => setNote(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={busy}>{busy ? "…" : t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}