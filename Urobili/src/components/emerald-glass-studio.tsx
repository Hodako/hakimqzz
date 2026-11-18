"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import GlassWorkspace, {
  type WorkspaceCashFlowPeriod,
  type WorkspaceGoal,
  type WorkspaceTransaction,
} from "@/components/ui/adjustable-glass-dashboard";
import { getExpenses, getSales, type Expense, type Sale } from "@/lib/queries";
import { useCashboxQuery } from "@/hooks/use-cashbox-query";
import { cashboxBalance } from "@/lib/cashbox-utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import {
  DEFAULT_EMERALD_GLASS,
  EMERALD_WORKSPACE_PALETTE,
  THEME_UPDATED_EVENT,
  normalizeEmeraldGlass,
  readCustomThemeConfig,
  writeCustomThemeConfig,
  type ThemeConfig,
} from "@/lib/emerald-theme";
import { useResolvedMediaUrl } from "@/lib/local-media-db";

interface EmeraldGlassStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmeraldGlassStudio({
  open,
  onOpenChange,
}: EmeraldGlassStudioProps) {
  const { user } = useAuth();
  const { resolved } = useTheme();
  const [currentConfig, setCurrentConfig] = useState<ThemeConfig>({});

  useEffect(() => {
    const sync = () => setCurrentConfig(readCustomThemeConfig());
    sync();
    window.addEventListener(THEME_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(THEME_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const glass = normalizeEmeraldGlass(currentConfig.emeraldGlass);
  const resolvedBackdrop = useResolvedMediaUrl(
    glass.backdropImage || DEFAULT_EMERALD_GLASS.backdropImage,
    DEFAULT_EMERALD_GLASS.backdropImage,
  );
  const resolvedBrandLogo = useResolvedMediaUrl(user?.logo_url || "", "");

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: getSales,
    enabled: open,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: getExpenses,
    enabled: open,
  });

  const { data: cashboxEntries = [] } = useCashboxQuery();

  const balance = useMemo(
    () => cashboxBalance(cashboxEntries || []),
    [cashboxEntries],
  );

  const transactions: WorkspaceTransaction[] = useMemo(() => {
    const saleItems: WorkspaceTransaction[] = (sales as Sale[])
      .filter((s) => !s.returned)
      .slice(0, 10)
      .map((s) => {
        const amt = (Number(s.sell_price) || 0) * (Number(s.qty) || 1);
        return {
          id: `sale-${s.id}`,
          name: s.product_name || "Sale",
          category: "Income",
          date: new Date(s.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
          }),
          amount: amt,
          status: (Number(s.due_amount) || 0) > 0 ? "Pending" : "Completed",
        };
      });

    const expItems: WorkspaceTransaction[] = (expenses as Expense[])
      .slice(0, 6)
      .map((e) => ({
        id: `exp-${e.id}`,
        name: e.title || e.category || "Expense",
        category: e.category || "Operations",
        date: new Date(e.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
        }),
        amount: -(Number(e.amount) || 0),
        status: "Completed",
      }));

    return [...saleItems, ...expItems].slice(0, 12);
  }, [sales, expenses]);

  const cashFlowPeriods: WorkspaceCashFlowPeriod[] = useMemo(() => {
    const dayPoints = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      const key = d.toLocaleDateString("en-CA");
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const daySales = (sales as Sale[])
        .filter(
          (s) =>
            !s.returned &&
            new Date(s.created_at).toLocaleDateString("en-CA") === key,
        )
        .reduce(
          (sum, s) => sum + (Number(s.sell_price) || 0) * (Number(s.qty) || 1),
          0,
        );
      const dayExp = (expenses as Expense[])
        .filter((e) => new Date(e.created_at).toLocaleDateString("en-CA") === key)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return { label, income: daySales, expenses: dayExp };
    });

    const monthIncome = (sales as Sale[])
      .filter((s) => !s.returned)
      .reduce(
        (sum, s) => sum + (Number(s.sell_price) || 0) * (Number(s.qty) || 1),
        0,
      );
    const monthExp = (expenses as Expense[]).reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0,
    );

    return [
      {
        id: "week",
        label: "7 Days",
        description: "Live sales revenue vs operating expenses (last 7 days).",
        points: dayPoints,
      },
      {
        id: "total",
        label: "All Activity",
        description: "Cumulative sales and expense summary from Urobili.",
        points: [
          { label: "Start", income: monthIncome * 0.4, expenses: monthExp * 0.45 },
          { label: "Mid", income: monthIncome * 0.72, expenses: monthExp * 0.7 },
          { label: "Now", income: monthIncome, expenses: monthExp },
        ],
      },
    ];
  }, [sales, expenses]);

  const goals: WorkspaceGoal[] = useMemo(() => {
    const totalSales = (sales as Sale[])
      .filter((s) => !s.returned)
      .reduce(
        (sum, s) => sum + (Number(s.sell_price) || 0) * (Number(s.qty) || 1),
        0,
      );
    const totalProfit = (sales as Sale[])
      .filter((s) => !s.returned)
      .reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

    return [
      {
        id: "cashbox-reserve",
        name: "Cashbox Reserve",
        saved: Math.max(0, balance),
        target: Math.max(100000, balance * 1.35 || 100000),
        color: "#296249",
      },
      {
        id: "monthly-sales",
        name: "Sales Volume Milestone",
        saved: Math.max(0, totalSales),
        target: Math.max(250000, totalSales * 1.25 || 250000),
        color: "#10b981",
      },
      {
        id: "net-profit",
        name: "Profit Target",
        saved: Math.max(0, totalProfit),
        target: Math.max(80000, totalProfit * 1.4 || 80000),
        color: "#6ee7b7",
      },
    ];
  }, [balance, sales]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1320px] max-h-[92vh] p-0 overflow-y-auto border-0 bg-transparent shadow-2xl rounded-3xl">
        <DialogTitle className="sr-only">
          Emerald Glass Workspace Studio
        </DialogTitle>
        <GlassWorkspace
          brand={user?.business_name || "Urobili"}
          brandLogo={resolvedBrandLogo || "/logo.png"}
          userName={user?.full_name || "Owner"}
          backgroundImage={
            resolvedBackdrop || DEFAULT_EMERALD_GLASS.backdropImage
          }
          balance={balance}
          balanceChange={{ percent: 100, label: "Live Cashbox synced" }}
          account={{ name: "Urobili Cashbox", lastFour: "POS1" }}
          periodLabel={new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
          cashFlowPeriods={cashFlowPeriods}
          initialPeriodId="week"
          footerNote="Connected live to Urobili POS database — adjust sliders anytime with 'Adjust glass'."
          savingsNote="Live financial overview synced directly from your shop sales, expenses, and cashbox entries."
          transactions={transactions}
          goals={goals}
          currency="BDT"
          theme={resolved}
          useHostTheme={false}
          style={EMERALD_WORKSPACE_PALETTE}
          glass={{
            blur: glass.blur,
            opacity: glass.opacity,
            saturation: glass.saturation,
            tint: glass.tint,
            edge: glass.edge,
          }}
          onGlassChange={(nextGlass) => {
            const latest = readCustomThemeConfig();
            writeCustomThemeConfig({
              emeraldGlass: {
                ...latest.emeraldGlass,
                ...nextGlass,
              },
            });
          }}
          className="rounded-3xl"
        />
      </DialogContent>
    </Dialog>
  );
}
