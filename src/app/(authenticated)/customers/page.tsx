"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, UserPlus, Search, Users, Archive, Download } from "lucide-react";
import { getCustomers, getSales, getAllPayments, getAllPartyReceivables } from "@/lib/queries";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { PaginationBar, paginate } from "@/components/ui/pagination-bar";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createCustomerFn, archiveCustomerFn } from "@/lib/rpc";
import { setCachedData, refreshQueries } from "@/lib/optimistic-cache";
import type { Customer } from "@/lib/queries";
import Link from "next/link";
import { downloadCsv, exportDateStamp } from "@/lib/export";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CustomersPage() {
  const { lang, t } = useT();
  const customers = useCachedQuery(["customers"], getCustomers);
  const sales = useCachedQuery(["sales"], getSales);
  const allPayments = useCachedQuery(["all-payments"], getAllPayments);
  const allReceivables = useCachedQuery(["all-party-receivables"], getAllPartyReceivables);
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const pageSize = 10;

  const duesByParty: Record<string, number> = {};
  (sales.data ?? []).forEach(s => {
    if (s.party_id && !s.returned) {
      duesByParty[s.party_id] = (duesByParty[s.party_id] ?? 0) + Number(s.due_amount);
    }
  });

  const paidByParty: Record<string, number> = {};
  (allPayments.data ?? []).forEach(p => {
    paidByParty[p.party_id] = (paidByParty[p.party_id] ?? 0) + Number(p.amount);
  });

  const extraByParty: Record<string, number> = {};
  (allReceivables.data ?? []).forEach(r => {
    extraByParty[r.party_id] = (extraByParty[r.party_id] ?? 0) + Number(r.amount);
  });

  const getCustomerReceivable = (customerId: string) => {
    const totalDues = (duesByParty[customerId] ?? 0) + (extraByParty[customerId] ?? 0);
    const paid = paidByParty[customerId] ?? 0;
    return Math.max(totalDues - paid, 0);
  };

  const totalOutstanding = (customers.data ?? []).filter(Boolean).reduce((sum, p) => {
    if (p.archived) return sum;
    return sum + getCustomerReceivable(p.id);
  }, 0);

  const filtered = (customers.data ?? [])
    .filter(Boolean)
    .filter(p => {
      const matchesSearch = (p.name || "").toLowerCase().includes(search.toLowerCase()) || (p.phone ?? "").includes(search);
      const matchesTab = activeTab === "archived" ? p.archived === true : p.archived !== true;
      return matchesSearch && matchesTab;
    });

  const { items: pagedCustomers, totalPages, safePage } = paginate(filtered, page, pageSize);

  function prefetchCustomer(p: Customer) {
    setCachedData<Customer>(qc, ["customer", p.id], p);
  }

  async function toggleArchive(p: Customer) {
    const nextVal = !p.archived;
    const prevCustomers = qc.getQueryData<Customer[]>(["customers"]);
    setCachedData<Customer[]>(qc, ["customers"], old =>
      (old ?? []).map(x => x.id === p.id ? { ...x, archived: nextVal } : x)
    );
    toast.success(nextVal ? t("archived") : t("active"));
    try {
      await archiveCustomerFn({ data: { id: p.id, archived: nextVal } });
      await refreshQueries(qc, ["customers"]);
    } catch (err: unknown) {
      if (prevCustomers) setCachedData(qc, ["customers"], prevCustomers);
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function exportCustomers(langCode: "en" | "bn") {
    const headers = langCode === "bn"
      ? ["নাম", "ফোন নম্বর", "মোট দেনা (গ্রাহক দেবে)", "আর্কাইভ করা"]
      : ["Name", "Phone", "Total Dues (They Owe)", "Archived"];
    const rows = filtered.map(p => [
      p.name,
      p.phone || "",
      getCustomerReceivable(p.id),
      p.archived
        ? (langCode === "bn" ? "হ্যাঁ" : "Yes")
        : (langCode === "bn" ? "না" : "No")
    ]);
    downloadCsv(`customers_${activeTab}_${exportDateStamp()}.csv`, headers, rows);
    toast.success(langCode === "bn" ? "CSV ফাইল ডাউনলোড সফল হয়েছে!" : "CSV exported successfully!");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{lang === "bn" ? "কাস্টমার খাতা" : "Customer Ledger"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} {lang === "bn" ? "গ্রাহক" : "Customers"}</p>
        </div>
        <div className="flex gap-1.5 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <Download className="size-4 mr-1" />
                {t("download_csv")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCustomers("en")}>English CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCustomers("bn")}>বাংলা CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={() => setAddOpen(true)} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white beveled-button">
            <UserPlus className="size-4 mr-1" />
            {lang === "bn" ? "নতুন কাস্টমার" : "Add Customer"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <Card className="p-4 bg-amber-500/5 border-amber-500/20 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">{lang === "bn" ? "গ্রাহকদের থেকে মোট বকেয়া" : "Total Outstanding Receivable"}</span>
          <span className="text-2xl font-black text-amber-600 font-serif mt-1">{fmtMoney(totalOutstanding)}</span>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
        <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); setPage(1); }} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-2 w-full sm:w-[240px] h-8 p-0.5 bg-muted/60">
            <TabsTrigger value="active" className="text-xs h-7">{lang === "bn" ? "সক্রিয়" : "Active"}</TabsTrigger>
            <TabsTrigger value="archived" className="text-xs h-7">{lang === "bn" ? "আর্কাইভ" : "Archived"}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={lang === "bn" ? "কাস্টমার খুঁজুন…" : "Search customers…"}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <Card className="divide-y divide-border overflow-hidden">
        {filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Users className="size-8 mx-auto text-muted-foreground/40 mb-2" />
            {lang === "bn" ? "কোনো কাস্টমার পাওয়া যায়নি" : "No customers found"}
          </div>
        )}
        {pagedCustomers.map(p => {
          const outstanding = getCustomerReceivable(p.id);

          return (
            <Link
              key={p.id}
              href={`/customers/detail?id=${p.id}`}
              onMouseEnter={() => prefetchCustomer(p)}
              className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{p.name}</div>
                <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                  {p.phone && <span>{p.phone}</span>}
                  {p.address && (
                    <>
                      <span>·</span>
                      <span className="truncate">{p.address}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-right">
                <div>
                  <div className="text-xs text-muted-foreground">{lang === "bn" ? "পাওনা" : "Outstanding"}</div>
                  <div className={`text-sm font-bold font-serif ${outstanding > 0 ? "text-amber-600" : "text-muted-foreground/60"}`}>
                    {fmtMoney(outstanding)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleArchive(p);
                    }}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    title={p.archived ? "Activate" : "Archive"}
                  >
                    <Archive className="size-4" />
                  </Button>
                  <ChevronRight className="size-4 text-muted-foreground/60" />
                </div>
              </div>
            </Link>
          );
        })}
      </Card>

      <PaginationBar page={safePage} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />

      <AddCustomerDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function AddCustomerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang, t } = useT();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await createCustomerFn({ data: { name: trimmed, phone: phone.trim() || null, address: address.trim() || null } });
      await refreshQueries(qc, ["customers"]);
      setName("");
      setPhone("");
      setAddress("");
      onOpenChange(false);
      toast.success(lang === "bn" ? `${trimmed} কে সফলভাবে কাস্টমার হিসেবে যোগ করা হয়েছে!` : `Successfully added customer ${trimmed}!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm glass-card border-border/80">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            {lang === "bn" ? "নতুন কাস্টমার যোগ করুন" : "Add New Customer"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{lang === "bn" ? "কাস্টমারের নাম" : "Customer Name"}</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} disabled={busy} placeholder="E.g. Jamil Ahmed" className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{lang === "bn" ? "ফোন নম্বর" : "Phone number"}</Label>
            <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} placeholder="E.g. 017xxxxxxxx" className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{lang === "bn" ? "ঠিকানা" : "Address"}</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} disabled={busy} placeholder="E.g. Banani, Dhaka" className="h-9 text-xs" />
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
