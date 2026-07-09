"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Pencil, Plus } from "lucide-react";
import {
  getPaymentsForParty, getSalesForParty, getCustomer,
  getPartyReceivables,
} from "@/lib/queries";
import type { Customer, PartyLedger, Payment, Sale } from "@/lib/queries";
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
  createPartyReceivableFn, deletePartyReceivableFn,
  updateCustomerFn, deleteCustomerFn,
} from "@/lib/rpc";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { setCachedData, refreshQueries } from "@/lib/optimistic-cache";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PartyReturnDialog } from "@/components/party-return-dialog";

export default function CustomerDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { lang, t } = useT();
  const router = useRouter();
  const qc = useQueryClient();

  const partyQuery = useCachedQuery(["customer", id], () => getCustomer(id));
  const sales = useCachedQuery(["party-detail", "sales", id], () => getSalesForParty(id));
  const payments = useCachedQuery(["payments", id], () => getPaymentsForParty(id));
  const receivables = useCachedQuery(["party-receivables", id], () => getPartyReceivables(id));

  const [collectOpen, setCollectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addKind, setAddKind] = useState<"receivable" | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);

  const [backPath, setBackPath] = useState("/dues");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ref = document.referrer;
      if (ref && typeof ref === "string" && ref.includes("/customers")) {
        setBackPath("/customers");
      }
    }
  }, []);

  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  const customer = partyQuery.data;
  const isLoading = partyQuery.isLoading && !customer;

  const saleDue = (sales.data ?? []).filter(s => !s.returned).reduce((a, s) => a + Number(s.due_amount), 0);
  const extraReceivable = (receivables.data ?? []).reduce((a, r) => a + Number(r.amount), 0);
  const paidTotal = (payments.data ?? []).reduce((a, p) => a + Number(p.amount), 0);
  const netBalance = saleDue + extraReceivable - paidTotal;

  type Entry = {
    id: string; date: string; label: string; amount: number;
    kind: "sale" | "payment" | "receivable";
    deletable: boolean; rawId: string;
  };

  const entries: Entry[] = [
    ...(sales.data ?? []).filter(s => Number(s.due_amount) > 0 && !s.returned).map(s => ({
      id: "s" + s.id, rawId: s.id, date: s.created_at,
      label: s.product_id ? `${s.product_name} ×${s.qty}` : s.product_name,
      amount: Number(s.due_amount), kind: "sale" as const, deletable: !s.product_id,
    })),
    ...(receivables.data ?? []).map(r => ({
      id: "r" + r.id, rawId: r.id, date: r.created_at,
      label: r.note || t("money_owed"), amount: Number(r.amount),
      kind: "receivable" as const, deletable: true,
    })),
    ...(payments.data ?? []).map(p => ({
      id: "p" + p.id, rawId: p.id, date: p.created_at,
      label: p.note || t("collect_payment"), amount: -Number(p.amount),
      kind: "payment" as const, deletable: true,
    })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  async function performDeleteEntry() {
    if (!entryToDelete) return;
    setIsDeletingEntry(true);
    const prevPayments = qc.getQueryData<Payment[]>(["payments", id]);
    const prevSales = qc.getQueryData<Sale[]>(["party-detail", "sales", id]);
    const prevReceivables = qc.getQueryData<PartyLedger[]>(["party-receivables", id]);

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
      }
      await refreshQueries(qc, ["all-payments"], ["sales"], ["all-party-receivables"], ["cashbox"]);
      toast.success(t("delete"));
      setEntryToDelete(null);
    } catch (err: unknown) {
      if (entryToDelete.kind === "payment" && prevPayments) setCachedData(qc, ["payments", id], prevPayments);
      if (entryToDelete.kind === "sale" && prevSales) setCachedData(qc, ["party-detail", "sales", id], prevSales);
      if (entryToDelete.kind === "receivable" && prevReceivables) setCachedData(qc, ["party-receivables", id], prevReceivables);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeletingEntry(false);
    }
  }

  async function performDeleteCustomer() {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);
    const prevCustomers = qc.getQueryData<Customer[]>(["customers"]);
    try {
      setCachedData<Customer[]>(qc, ["customers"], old => (old ?? []).filter(p => p.id !== id));
      await deleteCustomerFn({ data: { id } });
      qc.removeQueries({ queryKey: ["customer", id] });
      qc.removeQueries({ queryKey: ["party-detail", "sales", id] });
      qc.removeQueries({ queryKey: ["payments", id] });
      qc.removeQueries({ queryKey: ["party-receivables", id] });
      await refreshQueries(qc, ["customers"]);
      toast.success(t("delete"));
      setCustomerToDelete(null);
      router.push(backPath);
    } catch (err: unknown) {
      if (prevCustomers) setCachedData<Customer[]>(qc, ["customers"], prevCustomers);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeletingCustomer(false);
    }
  }

  if (isLoading) return <SpeedLoader fullScreen={false} />;

  if (!customer) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-muted-foreground">{t("no_results")}</p>
        <Link href={backPath}>
          <Button variant="outline">
            <ArrowLeft className="size-4 mr-1" />{t("due")}
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
          {backPath === "/dues" ? (lang === "bn" ? "বাকী" : "Dues") : (lang === "bn" ? "কাস্টমার" : "Customers")}
        </Button>
      </Link>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{customer.name || "Unnamed"}</h1>
          <div className="text-sm text-muted-foreground space-y-0.5">
            {customer.phone && <p>{customer.phone}</p>}
            {customer.address && <p>{customer.address}</p>}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5 mr-1" />{t("edit")}
          </Button>
          <Button size="sm" variant="destructive" className="beveled-button" onClick={() => setCustomerToDelete(customer)}>
            <Trash2 className="size-3.5 mr-1" />{lang === "bn" ? "মুছুন" : "Delete"}
          </Button>
        </div>
      </div>

      {(sales.isFetching || payments.isFetching) && (
        <div className="h-1 rounded-full bg-primary/20 overflow-hidden">
          <div className="h-full w-1/3 bg-primary animate-pulse rounded-full" />
        </div>
      )}

      <div className="max-w-md mx-auto w-full space-y-4">
        {/* Dynamic Balance Card */}
        {(() => {
          const isDue = netBalance > 0;
          const isAdvance = netBalance < 0;
          const absVal = Math.abs(netBalance);
          
          let cardBg = "bg-rose-500/5 border-rose-500/20";
          let textColor = "text-rose-600 dark:text-rose-400";
          let labelText = lang === "bn" ? "বকেয়া বাকী (তারা দেবে)" : "Outstanding Dues";
          let formula = lang === "bn"
            ? `হিসাব: বাকী ও অন্যান্য (${fmtMoney(saleDue + extraReceivable)}) − আদায় (${fmtMoney(paidTotal)}) = বাকি দেবে ${fmtMoney(absVal)}`
            : `Calculation: Dues (${fmtMoney(saleDue + extraReceivable)}) − Paid (${fmtMoney(paidTotal)}) = Owed ${fmtMoney(absVal)}`;

          if (isAdvance) {
            cardBg = "bg-emerald-500/5 border-emerald-500/20";
            textColor = "text-emerald-600 dark:text-emerald-400";
            labelText = lang === "bn" ? "অগ্রিম জমা (গ্রাহক পাবে)" : "Customer Advance Credit";
            formula = lang === "bn"
              ? `হিসাব: আদায় (${fmtMoney(paidTotal)}) − বাকী ও অন্যান্য (${fmtMoney(saleDue + extraReceivable)}) = অগ্রিম জমা পাবে ${fmtMoney(absVal)}`
              : `Calculation: Paid (${fmtMoney(paidTotal)}) − Dues (${fmtMoney(saleDue + extraReceivable)}) = Credit ${fmtMoney(absVal)}`;
          } else if (netBalance === 0) {
            cardBg = "bg-zinc-500/5 border-zinc-200 dark:border-zinc-800";
            textColor = "text-zinc-500 dark:text-zinc-400";
            labelText = lang === "bn" ? "পরিশোধিত হিসাব" : "Account Settled";
            formula = lang === "bn"
              ? `হিসাব: কোনো বাকী বা বকেয়া নেই (ব্যালেন্স ৳০)`
              : `Calculation: Settled (Balance ৳0)`;
          }

          return (
            <Card className={`p-5 glass-card relative overflow-hidden ${cardBg}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.03] rounded-full blur-2xl pointer-events-none" />
              <div className={`text-xs font-semibold uppercase tracking-wider ${textColor}`}>{labelText}</div>
              <div className={`text-3xl font-extrabold mt-2 font-serif ${textColor}`}>{fmtMoney(absVal)}</div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-normal border-t border-dashed border-border/80 pt-2">
                {formula}
              </p>
              <Button className="mt-4 w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium beveled-button" size="sm" onClick={() => setCollectOpen(true)}>
                <Plus className="size-3.5 mr-1.5" /> {lang === "bn" ? "টাকা আদায় করুন" : "Collect Payment"}
              </Button>
            </Card>
          );
        })()}

        <div className="flex gap-2 w-full">
          <Button size="sm" variant="outline" className="flex-1 h-9 text-xs beveled-button" onClick={() => setAddKind("receivable")}>
            <Plus className="size-3.5 mr-1" /> {lang === "bn" ? "বাকী যোগ করুন" : "Add money owned"}
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-9 text-xs beveled-button border-rose-200 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/10 text-rose-600 font-medium" onClick={() => setReturnOpen(true)}>
            <Plus className="size-3.5 mr-1" /> {lang === "bn" ? "পণ্য ফেরত" : "Product Return"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-xs mx-auto mb-3">
          <TabsTrigger value="ledger" className="text-xs">{lang === "bn" ? "লেনদেন খাতা" : "Ledger"}</TabsTrigger>
          <TabsTrigger value="purchases" className="text-xs">{lang === "bn" ? "ক্রয়সমূহ" : "Purchases"}</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger">
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
        </TabsContent>

        <TabsContent value="purchases">
          <Card className="divide-y divide-border overflow-hidden">
            {(!sales.data || sales.data.length === 0) ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {lang === "bn" ? "কোন ক্রয়ের বিবরণ নেই" : "No purchase records"}
              </div>
            ) : (
              (sales.data ?? []).map(s => (
                <div key={s.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-medium text-sm text-foreground truncate">{s.product_name}</div>
                    <div className="text-muted-foreground flex gap-1.5 flex-wrap items-center">
                      <span>{fmtDateTime(s.created_at)}</span>
                      <span>·</span>
                      <span className="capitalize px-1 bg-zinc-100 dark:bg-zinc-800 rounded font-medium text-[10px]">
                        {s.type === "cash" ? (lang === "bn" ? "নগদ" : "Cash") : s.type === "online" ? (lang === "bn" ? "অনলাইন" : "Online") : (lang === "bn" ? "বাকী" : "Credit")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-foreground text-sm">
                      {fmtMoney(Number(s.sell_price) * s.qty)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      ৳{s.sell_price} × {s.qty}
                      {Number((s as any).discount) > 0 && ` (Dis: ৳${(s as any).discount})`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <CollectDialog partyId={id} open={collectOpen} onOpenChange={setCollectOpen} />
      <EditCustomerDialog customer={customer} open={editOpen} onOpenChange={setEditOpen} />
      {addKind && (
        <AddLedgerDialog partyId={id} kind={addKind} open={!!addKind} onOpenChange={v => { if (!v) setAddKind(null); }} />
      )}
      <PartyReturnDialog partyId={id} open={returnOpen} onOpenChange={setReturnOpen} />

      <ConfirmDeleteDialog
        open={entryToDelete !== null}
        onOpenChange={(v) => { if (!v) setEntryToDelete(null); }}
        title="Delete Transaction"
        description={`Are you sure you want to delete this ${entryToDelete?.kind || "transaction"}? This action is permanent and cannot be undone.`}
        onConfirm={performDeleteEntry}
        busy={isDeletingEntry}
      />

      <ConfirmDeleteDialog
        open={customerToDelete !== null}
        onOpenChange={(v) => { if (!v) setCustomerToDelete(null); }}
        title="Delete Customer"
        description={`Are you sure you want to delete customer "${customerToDelete?.name || "Unnamed"}"? All associated transaction history will be permanently deleted.`}
        onConfirm={performDeleteCustomer}
        busy={isDeletingCustomer}
      />
    </div>
  );
}

function EditCustomerDialog({ customer, open, onOpenChange }: { customer: Customer | undefined; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && customer) {
      setName(customer.name || "");
      setPhone(customer.phone ?? "");
      setAddress(customer.address ?? "");
    }
  }, [open, customer]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const phoneVal = phone.trim() || null;
    const addressVal = address.trim() || null;
    const prevCustomer = qc.getQueryData<Customer>(["customer", customer.id]);
    const prevCustomers = qc.getQueryData<Customer[]>(["customers"]);

    setCachedData<Customer>(qc, ["customer", customer.id], { ...customer, name: trimmedName, phone: phoneVal, address: addressVal });
    setCachedData<Customer[]>(qc, ["customers"], old =>
      (old ?? []).map(p => (p.id === customer.id ? { ...p, name: trimmedName, phone: phoneVal, address: addressVal } : p)),
    );
    onOpenChange(false);
    toast.success(t("save"));

    setBusy(true);
    try {
      await updateCustomerFn({ data: { id: customer.id, name: trimmedName, phone: phoneVal, address: addressVal } });
      await refreshQueries(qc, ["customers"], ["customer", customer.id]);
    } catch (err: unknown) {
      if (prevCustomer) setCachedData(qc, ["customer", customer.id], prevCustomer);
      if (prevCustomers) setCachedData(qc, ["customers"], prevCustomers);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm glass-card border-border/80">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">{t("edit")} (কাস্টমার)</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name (নাম)</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} disabled={busy} className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Phone (ফোন)</Label>
            <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Address (ঠিকানা)</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} disabled={busy} className="h-9 text-xs" />
          </div>
          <DialogFooter className="flex flex-row gap-2 mt-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="flex-1 h-9 text-xs beveled-button">
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="flex-1 h-9 text-xs bg-primary text-primary-foreground font-semibold beveled-button">
              {busy ? "Saving..." : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddLedgerDialog({ partyId, kind, open, onOpenChange }: { partyId: string; kind: "receivable"; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang, t } = useT();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const queryKey = ["party-receivables", partyId];

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
      const saved = await createPartyReceivableFn({ data: { party_id: partyId, amount: amt, note: note || null } });
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
        <DialogHeader><DialogTitle>{lang === "bn" ? "বাকী যোগ করুন" : "Add money owned"}</DialogTitle></DialogHeader>
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
        (old ?? []).map(p => (p.id === tempId ? { ...saved, id: saved.id } : p)),
      );
      await refreshQueries(qc, ["all-payments"], ["cashbox"]);
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
