"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PrimaryHeaderSlot } from "@/components/primary-header-slot";
import {
  Users,
  Wallet,
  ArrowDownLeft,
  Banknote,
  Receipt,
  Calendar,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  RotateCcw,
  User,
  ArrowLeft,
  Lock,
  Unlock,
  Info,
  DollarSign,
  TrendingDown,
  Gift,
  Sparkles,
  ShoppingBag,
  CreditCard,
  KeyRound,
  Phone,
  Mail,
  Search,
  Filter,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Package,
} from "lucide-react";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useCashboxQuery } from "@/hooks/use-cashbox-query";
import { cashboxBalance } from "@/lib/cashbox-utils";
import { calculateEmployeeSalaryWithRollover } from "@/lib/salary-utils";
import {
  getEmployees,
  getSales,
  getEmployeeExpenses,
  getEmployeeSalaries,
  getEmployeeShoppings,
  getProducts,
  type Employee,
  type EmployeeExpense,
  type EmployeeShopping,
  type Product,
} from "@/lib/queries";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { getActiveEmployeeSession } from "@/lib/employee-session";
import { fmtMoney, fmtDateTime, fmtDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  createEmployeeExpenseFn,
  deleteEmployeeExpenseFn,
  addEmployeeFn,
  updateEmployeeFn,
  deleteEmployeeFn,
  createEmployeeSalaryFn,
  deleteEmployeeSalaryFn,
  createEmployeeShoppingFn,
  deleteEmployeeShoppingFn,
} from "@/lib/rpc";
import { OwnerEmployeeDeviceLink } from "@/components/employee-device-link";
import { useQueryClient } from "@tanstack/react-query";

export default function EmployeeHubPage() {
  const { lang, t } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();

  const activeEmpSession = useMemo(() => {
    return getActiveEmployeeSession();
  }, []);

  const isOwner = user?.role === "owner" || user?.role === "admin" || user?.role === "superadmin";
  const isEmployeeRole = !isOwner && (user?.role === "employee" || Boolean(activeEmpSession));
  const currentEmpId = (user as any)?.employee_id || user?.id;

  // Active Main Tab State
  const [activeTab, setActiveTab] = useState<"management" | "advances" | "shopping" | "salaries" | "gifts" | "performance">(
    isOwner ? "management" : "advances"
  );

  // Queries
  const employeesQuery = useCachedQuery(["employees"], getEmployees);
  const employeeExpensesQuery = useCachedQuery(["employee_expenses"], getEmployeeExpenses);
  const employeeSalariesQuery = useCachedQuery(["employee_salaries"], getEmployeeSalaries);
  const employeeShoppingsQuery = useCachedQuery(["employee_shoppings"], getEmployeeShoppings);
  const productsQuery = useCachedQuery(["products"], getProducts);
  const { data: allSales = [] } = useCachedQuery(["sales"], getSales);
  const { data: cashEntries = [] } = useCashboxQuery();

  const currentCashBalance = useMemo(() => cashboxBalance(cashEntries), [cashEntries]);

  const allEmployees: Employee[] = employeesQuery.data ?? [];
  const allExpenses: EmployeeExpense[] = employeeExpensesQuery.data ?? [];
  const allSalaries = employeeSalariesQuery.data ?? [];
  const allShoppings: EmployeeShopping[] = employeeShoppingsQuery.data ?? [];
  const allProducts: Product[] = productsQuery.data ?? [];

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    if (!isOwner && currentEmpId) return currentEmpId;
    return allEmployees[0]?.id || "";
  });

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Owner switcher: "all" shows whole-store stats, or an employee ID focuses all KPIs & ledgers on that user
  const [ownerViewEmpId, setOwnerViewEmpId] = useState<string>("all");

  const handleSwitchOwnerView = (empId: string) => {
    setOwnerViewEmpId(empId);
    if (empId !== "all") {
      setSelectedEmpId(empId);
    }
  };

  const activeEmployee = useMemo(() => {
    if (activeEmpSession) {
      const match = allEmployees.find(e => e.id === activeEmpSession.id || (e.name && e.name.toLowerCase() === activeEmpSession.name?.toLowerCase()));
      if (match) return match;
      return {
        id: activeEmpSession.id,
        name: activeEmpSession.name || "Employee",
        monthly_salary: activeEmpSession.base_salary || 0,
        base_salary: activeEmpSession.base_salary || 0,
        advance_limit: activeEmpSession.advance_limit || activeEmpSession.base_salary || 0,
      } as any;
    }
    if (!isOwner) {
      return (
        allEmployees.find(e => e.id === currentEmpId || (e as any).user_id === user?.id || e.email === user?.email) ||
        ({
          id: currentEmpId,
          name: user?.full_name || "Employee",
          monthly_salary: (user as any)?.monthly_salary || 0,
        } as any)
      );
    }
    if (ownerViewEmpId !== "all") {
      const switched = allEmployees.find(e => e.id === ownerViewEmpId);
      if (switched) return switched;
    }
    return allEmployees.find(e => e.id === selectedEmpId) || allEmployees[0] || null;
  }, [allEmployees, isOwner, activeEmpSession, currentEmpId, selectedEmpId, ownerViewEmpId, user]);

  const viewedEmployee = useMemo(() => {
    if (!isOwner) return activeEmployee;
    if (ownerViewEmpId === "all") return null;
    return allEmployees.find(e => e.id === ownerViewEmpId) || null;
  }, [isOwner, activeEmployee, ownerViewEmpId, allEmployees]);

  const matchesEmpRecord = (rec: any, emp: any) => {
    if (!emp) return true;
    const idMatch = Boolean(emp.id && (rec.employee_id === emp.id || rec.created_by === emp.id));
    const nameMatch = Boolean(
      emp.name &&
      rec.employee_name &&
      String(rec.employee_name).toLowerCase().trim() === String(emp.name).toLowerCase().trim()
    );
    return idMatch || nameMatch;
  };

  const viewedStats = useMemo(() => {
    if (!viewedEmployee) return null;
    const empSales = allSales.filter(s => !s.returned && matchesEmpRecord(s, viewedEmployee));
    const todaySales = empSales.filter(s => (s.created_at || "").slice(0, 10) === todayStr);
    const monthSales = empSales.filter(s => (s.created_at || "").slice(0, 7) === currentMonth);

    const todaySalesTotal = todaySales.reduce((sum, s) => sum + Number(s.sell_price || 0) * (Number(s.qty) || 1), 0);
    const monthSalesTotal = monthSales.reduce((sum, s) => sum + Number(s.sell_price || 0) * (Number(s.qty) || 1), 0);
    const allTimeSalesTotal = empSales.reduce((sum, s) => sum + Number(s.sell_price || 0) * (Number(s.qty) || 1), 0);

    const monthGifts = allExpenses
      .filter(e => (e.category === "bonus" || e.category === "gift") && matchesEmpRecord(e, viewedEmployee) && (e.date || e.created_at || "").startsWith(currentMonth))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0) +
      allShoppings
        .filter(s => s.payment_status === "gift" && matchesEmpRecord(s, viewedEmployee) && (s.date || s.created_at || "").startsWith(currentMonth))
        .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

    const monthPaidSalary = allSalaries
      .filter((s: any) => matchesEmpRecord(s, viewedEmployee) && ((s.month || s.date || s.created_at || "").startsWith(currentMonth)))
      .reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);

    return {
      todaySalesTotal,
      todayOrdersCount: todaySales.length,
      monthSalesTotal,
      monthOrdersCount: monthSales.length,
      allTimeSalesTotal,
      allTimeOrdersCount: empSales.length,
      monthGifts,
      monthPaidSalary,
    };
  }, [viewedEmployee, allSales, allExpenses, allShoppings, allSalaries, todayStr, currentMonth]);

  // Overall Store Staff Overview Aggregations
  const totalBaseSalaries = useMemo(() => {
    return allEmployees.reduce((sum, e) => sum + (Number(e.base_salary || e.monthly_salary) || 0), 0);
  }, [allEmployees]);

  const totalMonthlyAdvances = useMemo(() => {
    return allExpenses
      .filter(e => {
        const isAdv = e.category !== "bonus" && e.category !== "gift";
        if (!isAdv) return false;
        const d = e.date || (e.created_at ? e.created_at.slice(0, 7) : "");
        return d.startsWith(currentMonth);
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [allExpenses, currentMonth]);

  const totalGiftsGiven = useMemo(() => {
    const giftsFromExpenses = allExpenses
      .filter(e => {
        const isGift = e.category === "bonus" || e.category === "gift";
        if (!isGift) return false;
        const d = e.date || (e.created_at ? e.created_at.slice(0, 7) : "");
        return d.startsWith(currentMonth);
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const giftsFromShoppings = allShoppings
      .filter(s => {
        if (s.payment_status !== "gift") return false;
        const d = s.date || (s.created_at ? s.created_at.slice(0, 7) : "");
        return d.startsWith(currentMonth);
      })
      .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

    return giftsFromExpenses + giftsFromShoppings;
  }, [allExpenses, allShoppings, currentMonth]);

  const totalStaffSalesToday = useMemo(() => {
    return allSales
      .filter(s => {
        if (s.returned) return false;
        const isStaff = Boolean((s as any).employee_id || (s as any).employee_name);
        const d = (s.created_at || "").slice(0, 10);
        return isStaff && d === todayStr;
      })
      .reduce((sum, s) => sum + Number(s.sell_price || 0) * (Number(s.qty) || 1), 0);
  }, [allSales, todayStr]);

  const activeEmployeesCount = useMemo(() => {
    return allEmployees.filter(e => e.status !== "inactive").length;
  }, [allEmployees]);

  // Active Employee Individual Rollover & Calculations
  const salaryRollover = useMemo(() => {
    if (!activeEmployee) return null;
    return calculateEmployeeSalaryWithRollover(
      activeEmployee,
      allExpenses,
      allSalaries,
      allShoppings,
      currentMonth
    );
  }, [activeEmployee, allExpenses, allSalaries, allShoppings, currentMonth]);

  const baseSalary = Number(activeEmployee?.monthly_salary || activeEmployee?.base_salary) || 0;
  const advanceLimit = activeEmployee?.advance_limit !== undefined && activeEmployee?.advance_limit !== null
    ? Number(activeEmployee.advance_limit)
    : baseSalary;

  const thisMonthTaken = useMemo(() => {
    if (!activeEmployee) return 0;
    return allExpenses
      .filter(e => {
        const isAdv = e.category === "advance" || e.category === "salary_advance" || (e as any).type === "advance";
        if (!isAdv) return false;
        const empMatch = e.employee_id === activeEmployee.id || (e.employee_name && e.employee_name.toLowerCase() === activeEmployee.name?.toLowerCase());
        const d = e.date || (e.created_at ? e.created_at.slice(0, 7) : "");
        return empMatch && d.startsWith(currentMonth);
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [allExpenses, activeEmployee, currentMonth]);

  const remainingLimit = salaryRollover?.remainingAdvanceLimit ?? Math.max(0, advanceLimit - thisMonthTaken);
  const remainingSalary = salaryRollover?.remainingSalary ?? Math.max(0, baseSalary - thisMonthTaken);

  // ── Dialog States: Take Advance ──
  const [takeMoneyOpen, setTakeMoneyOpen] = useState(false);
  const [takeAmount, setTakeAmount] = useState("");
  const [takeNote, setTakeNote] = useState("");
  const [takeEmpId, setTakeEmpId] = useState("");
  const [takeMethod, setTakeMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);

  // ── Dialog States: Employee Shopping (কর্মচারী কেনাকাটা) ──
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [shoppingEmpId, setShoppingEmpId] = useState("");
  const [shoppingPaymentMode, setShoppingPaymentMode] = useState<"deduct_from_salary" | "gift" | "paid_cash">("deduct_from_salary");
  const [shoppingCart, setShoppingCart] = useState<{ product_id: string; product_name: string; qty: number; unit_price: number; total: number; stock: number }[]>([]);
  const [shoppingSearch, setShoppingSearch] = useState("");
  const [shoppingDate, setShoppingDate] = useState(todayStr);
  const [shoppingNote, setShoppingNote] = useState("");
  const [submittingShopping, setSubmittingShopping] = useState(false);

  // ── Dialog States: Give Gift / Bonus ──
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftEmpId, setGiftEmpId] = useState("");
  const [giftAmount, setGiftAmount] = useState("");
  const [giftType, setGiftType] = useState<"bonus" | "eid_gift" | "target_gift" | "item_gift">("bonus");
  const [giftMethod, setGiftMethod] = useState<"cash" | "online" | "stock">("cash");
  const [giftProductId, setGiftProductId] = useState<string>("");
  const [giftProductQty, setGiftProductQty] = useState<number>(1);
  const [giftDate, setGiftDate] = useState(todayStr);
  const [giftNote, setGiftNote] = useState("");

  // ── Dialog States: Pay Salary ──
  const [paySalaryOpen, setPaySalaryOpen] = useState(false);
  const [paySalEmpId, setPaySalEmpId] = useState("");
  const [paySalAmount, setPaySalAmount] = useState("");
  const [paySalMethod, setPaySalMethod] = useState("cash");
  const [paySalMonth, setPaySalMonth] = useState(currentMonth);
  const [paySalNote, setPaySalNote] = useState("");

  // ── Dialog States: Add / Edit Employee ──
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empDesignation, setEmpDesignation] = useState("Sales Staff");
  const [empSalary, setEmpSalary] = useState("");
  const [empAdvanceLimit, setEmpAdvanceLimit] = useState("");
  const [empStatus, setEmpStatus] = useState("active");
  const [empPin, setEmpPin] = useState("1234");

  const INITIAL_PERMISSIONS = {
    can_sales: true,
    can_customers: true,
    can_returns: true,
    can_discount: false,
    can_products: false,
    can_purchases: false,
    can_expenses: false,
    can_cashbox: false,
    can_somiti: false,
    can_profit_loss: false,
    can_reports: false,
    can_settings: false,
    can_delete: false,
    can_owners_wallet: false,
    can_owners_wallet_edit: false,
  };

  const [empPermissions, setEmpPermissions] = useState(INITIAL_PERMISSIONS);

  const applyPreset = (preset: "sales" | "manager" | "all_business") => {
    if (preset === "sales") {
      setEmpPermissions({
        can_sales: true,
        can_customers: true,
        can_returns: true,
        can_discount: false,
        can_products: false,
        can_purchases: false,
        can_expenses: false,
        can_cashbox: false,
        can_somiti: false,
        can_profit_loss: false,
        can_reports: false,
        can_settings: false,
        can_delete: false,
        can_owners_wallet: false,
        can_owners_wallet_edit: false,
      });
    } else if (preset === "manager") {
      setEmpPermissions({
        can_sales: true,
        can_customers: true,
        can_returns: true,
        can_discount: true,
        can_products: true,
        can_purchases: true,
        can_expenses: true,
        can_cashbox: true,
        can_somiti: false,
        can_profit_loss: false,
        can_reports: true,
        can_settings: false,
        can_delete: false,
        can_owners_wallet: false,
        can_owners_wallet_edit: false,
      });
    } else if (preset === "all_business") {
      setEmpPermissions({
        can_sales: true,
        can_customers: true,
        can_returns: true,
        can_discount: true,
        can_products: true,
        can_purchases: true,
        can_expenses: true,
        can_cashbox: true,
        can_somiti: true,
        can_profit_loss: true,
        can_reports: true,
        can_settings: true,
        can_delete: true,
        can_owners_wallet: false,
        can_owners_wallet_edit: false,
      });
    }
  };

  const openAddEmployeeModal = () => {
    setEditingEmp(null);
    setEmpName("");
    setEmpPhone("");
    setEmpEmail("");
    setEmpDesignation("Sales Staff");
    setEmpSalary("");
    setEmpAdvanceLimit("");
    setEmpStatus("active");
    setEmpPin("1234");
    setEmpPermissions({ ...INITIAL_PERMISSIONS });
    setAddEmpOpen(true);
  };

  const openEditEmployeeModal = (e: Employee) => {
    setEditingEmp(e);
    setEmpName(e.name || "");
    setEmpPhone(e.phone || "");
    setEmpEmail(e.email || "");
    setEmpDesignation(e.designation || "Sales Staff");
    setEmpSalary(e.base_salary ? String(e.base_salary) : "");
    setEmpAdvanceLimit(e.advance_limit !== undefined ? String(e.advance_limit) : (e.base_salary ? String(e.base_salary) : ""));
    setEmpStatus(e.status || "active");
    setEmpPin((e as any).pin || (e as any).plain_password || (e as any).password || "1234");
    const p = e.permissions || {};
    setEmpPermissions({
      can_sales: Boolean(p.can_sales ?? p.sales ?? true),
      can_customers: Boolean(p.can_customers ?? p.parties ?? true),
      can_returns: Boolean(p.can_returns ?? true),
      can_discount: Boolean(p.can_discount ?? false),
      can_products: Boolean(p.can_products ?? p.products ?? false),
      can_purchases: Boolean(p.can_purchases ?? p.purchases ?? false),
      can_expenses: Boolean(p.can_expenses ?? p.expenses ?? false),
      can_cashbox: Boolean(p.can_cashbox ?? p.cashbox ?? false),
      can_somiti: Boolean(p.can_somiti ?? p.somiti ?? false),
      can_profit_loss: Boolean(p.can_profit_loss ?? p.profit_loss ?? false),
      can_reports: Boolean(p.can_reports ?? p.reports ?? false),
      can_settings: Boolean(p.can_settings ?? p.settings ?? false),
      can_delete: Boolean(p.can_delete ?? false),
      can_owners_wallet: Boolean(p.can_owners_wallet ?? p.owners_wallet ?? false),
      can_owners_wallet_edit: Boolean(p.can_owners_wallet_edit ?? p.owners_wallet_edit ?? false),
    });
    setAddEmpOpen(true);
  };

  // ── Handler: Save Employee (Add or Update) ──
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      toast.error(lang === "bn" ? "কর্মচারীর নাম প্রদান করুন" : "Please enter employee name");
      return;
    }
    setSubmitting(true);
    try {
      const fullPermissions = {
        // Standard keys (used by app-shell, navigation, routing)
        dashboard: true,
        sales: Boolean(empPermissions.can_sales),
        products: Boolean(empPermissions.can_products),
        parties: Boolean(empPermissions.can_customers),
        purchases: Boolean(empPermissions.can_purchases),
        expenses: Boolean(empPermissions.can_expenses),
        cashbox: Boolean(empPermissions.can_cashbox),
        somiti: Boolean(empPermissions.can_somiti),
        profit_loss: Boolean(empPermissions.can_profit_loss),
        reports: Boolean(empPermissions.can_reports),
        settings: Boolean(empPermissions.can_settings),
        owners_wallet: Boolean(empPermissions.can_owners_wallet),
        owners_wallet_edit: Boolean(empPermissions.can_owners_wallet_edit),
        danger_zone: false,

        // Legacy / Granular keys
        can_sales: Boolean(empPermissions.can_sales),
        can_customers: Boolean(empPermissions.can_customers),
        can_returns: Boolean(empPermissions.can_returns),
        can_discount: Boolean(empPermissions.can_discount),
        can_products: Boolean(empPermissions.can_products),
        can_purchases: Boolean(empPermissions.can_purchases),
        can_expenses: Boolean(empPermissions.can_expenses),
        can_cashbox: Boolean(empPermissions.can_cashbox),
        can_somiti: Boolean(empPermissions.can_somiti),
        can_profit_loss: Boolean(empPermissions.can_profit_loss),
        can_reports: Boolean(empPermissions.can_reports),
        can_settings: Boolean(empPermissions.can_settings),
        can_delete: Boolean(empPermissions.can_delete),
        can_owners_wallet: Boolean(empPermissions.can_owners_wallet),
        can_owners_wallet_edit: Boolean(empPermissions.can_owners_wallet_edit),
      };

      const payload = {
        name: empName.trim(),
        phone: empPhone.trim(),
        email: empEmail.trim(),
        designation: empDesignation.trim(),
        base_salary: parseFloat(empSalary) || 0,
        monthly_salary: parseFloat(empSalary) || 0,
        advance_limit: empAdvanceLimit !== "" ? parseFloat(empAdvanceLimit) : (parseFloat(empSalary) || 0),
        status: empStatus,
        pin: empPin.trim() || "1234",
        plain_password: empPin.trim() || "1234",
        permissions: fullPermissions,
      };

      if (editingEmp) {
        await updateEmployeeFn({ data: { id: editingEmp.id, ...payload } });
        toast.success(lang === "bn" ? "কর্মচারীর তথ্য সফলভাবে আপডেট হয়েছে!" : "Employee updated successfully!");
      } else {
        await addEmployeeFn({ data: payload });
        toast.success(lang === "bn" ? "নতুন কর্মচারী সফলভাবে যোগ করা হয়েছে!" : "New employee added successfully!");
      }

      setAddEmpOpen(false);
      void qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save employee");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handler: Delete Employee ──
  const handleDeleteEmployee = async (empId: string, name: string) => {
    if (!confirm(lang === "bn" ? `আপনি কি নিশ্চিতভাবে "${name}"-কে অপসারণ করতে চান?` : `Are you sure you want to remove "${name}"?`)) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteEmployeeFn({ data: { id: empId } });
      qc.setQueryData(["employees"], (old: any) => (Array.isArray(old) ? old.filter((x: any) => x.id !== empId) : []));
      toast.success(lang === "bn" ? "কর্মচারী মুছে ফেলা হয়েছে।" : "Employee deleted successfully.");
      void qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handler: Take Advance Withdrawal ──
  const handleTakeMoneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(takeAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error(lang === "bn" ? "সঠিক টাকার পরিমাণ লিখুন" : "Please enter a valid amount");
      return;
    }

    const targetEmp = isOwner ? allEmployees.find(x => x.id === (takeEmpId || selectedEmpId)) || activeEmployee : activeEmployee;
    const targetEmpId = targetEmp?.id || currentEmpId;
    const targetEmpName = targetEmp?.name || user?.full_name || "Employee";

    if (!isOwner && remainingLimit <= 0) {
      toast.error(
        lang === "bn"
          ? `আপনার এই মাসের টাকা তোলার নির্ধারিত সীমা শেষ হয়ে গেছে! (সর্বোচ্চ সীমা: ৳${advanceLimit.toLocaleString()}, উত্তোলিত: ৳${thisMonthTaken.toLocaleString()})`
          : `You have reached your advance withdrawal limit for this month!`
      );
      return;
    }

    if (!isOwner && amountNum > remainingLimit) {
      toast.error(
        lang === "bn"
          ? `আপনার অনুমোদিত উত্তোলনের সীমা (৳${remainingLimit.toLocaleString()}) অতিক্রম করেছে! সর্বোচ্চ ৳${remainingLimit.toLocaleString()} নিতে পারবেন।`
          : `Exceeds your allowed advance withdrawal limit of ৳${remainingLimit.toLocaleString()}!`
      );
      return;
    }

    if (takeMethod === "cash" && amountNum > currentCashBalance) {
      toast.warning(
        lang === "bn"
          ? `সতর্কতা: ক্যাশবক্সে পর্যাপ্ত নগদ টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentCashBalance.toLocaleString()})`
          : `Warning: Cashbox balance is lower than requested (Current: ৳${currentCashBalance.toLocaleString()})`
      );
    }

    setSubmitting(true);
    try {
      await createEmployeeExpenseFn({
        data: {
          employee_id: targetEmpId,
          employee_name: targetEmpName,
          category: "advance",
          amount: amountNum,
          payment_method: takeMethod,
          note: takeNote.trim() || (lang === "bn" ? "কর্মচারী অগ্রিম টাকা উত্তোলন" : "Employee salary advance withdrawal"),
          date: todayStr,
          month: currentMonth,
          taken_by: user?.full_name || targetEmpName,
          created_at: new Date().toISOString(),
        },
      });

      toast.success(
        lang === "bn"
          ? `৳${amountNum.toLocaleString()} টাকা সফলভাবে উত্তোলন করা হয়েছে! ক্যাশবক্স ও অবশিষ্ট বেতন থেকে সমন্বয় হয়েছে।`
          : `৳${amountNum.toLocaleString()} successfully withdrawn! Deducted from cashbox & salary.`
      );

      setTakeAmount("");
      setTakeNote("");
      setTakeMoneyOpen(false);

      void qc.invalidateQueries({ queryKey: ["employee_expenses"] });
      void qc.invalidateQueries({ queryKey: ["cashbox"] });
      void qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to process withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handler: Give Gift / Bonus (Counts as Shop Expense) ──
  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(giftAmount);
    if (!giftEmpId || isNaN(val) || val <= 0) {
      toast.error(lang === "bn" ? "কর্মচারী নির্বাচন করুন এবং সঠিক উপহার/বোনাসের পরিমাণ লিখুন" : "Select employee and enter valid amount");
      return;
    }
    const emp = allEmployees.find(x => x.id === giftEmpId);
    setSubmitting(true);
    try {
      const giftCategoryLabel =
        giftType === "eid_gift" ? "ঈদ/উৎসব উপহার" :
        giftType === "target_gift" ? "টার্গেট পূরণ উপহার" :
        giftType === "item_gift" ? "পোশাক/উপহার সামগ্রী" : "নগদ উপহার ও বোনাস";

      const isStockMethod = giftMethod === "stock";
      const stockNote = isStockMethod
        ? `🎁 [স্টক থেকে উপহার] ${giftCategoryLabel}: ${giftNote.trim() || "স্টক পণ্য উপহার"} (নন-ক্যাশ খরচ: স্টক থেকে মূল্য সমন্বয়, ক্যাশবক্স অপরিবর্তিত)`
        : giftNote.trim() ? `🎁 ${giftCategoryLabel}: ${giftNote.trim()}` : `🎁 মালিকের ${giftCategoryLabel} (দোকানের খরচ হিসেবে গণ্য)`;

      await createEmployeeExpenseFn({
        data: {
          employee_id: giftEmpId,
          employee_name: emp?.name || "Employee",
          category: "bonus", // Counts as bonus/gift and registers in shop expenses!
          amount: val,
          payment_method: giftMethod,
          product_id: isStockMethod && giftProductId ? giftProductId : undefined,
          product_qty: isStockMethod ? (Number(giftProductQty) || 1) : undefined,
          date: giftDate,
          note: stockNote,
        },
      });

      toast.success(
        lang === "bn"
          ? `${emp?.name || "কর্মচারী"}-কে ৳${val.toLocaleString()} উপহার দেওয়া হয়েছে ${isStockMethod ? "(স্টক থেকে সমন্বয়, ক্যাশবক্স অপরিবর্তিত)" : "এবং দোকানের খরচ হিসেবে অন্তর্ভুক্ত হয়েছে"}!`
          : `Gift of ৳${val.toLocaleString()} recorded and accounted as shop expense!`
      );

      setGiftOpen(false);
      setGiftAmount("");
      setGiftNote("");
      setGiftProductId("");
      setGiftProductQty(1);

      void qc.invalidateQueries({ queryKey: ["employee_expenses"] });
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      void qc.invalidateQueries({ queryKey: ["cashbox"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to give gift");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handler: Employee Shopping (কর্মচারী কেনাকাটা / পোশাক ক্রয়) ──
  const handleSaveShopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shoppingEmpId) {
      toast.error(lang === "bn" ? "কর্মচারী নির্বাচন করুন" : "Please select an employee");
      return;
    }
    if (shoppingCart.length === 0) {
      toast.error(lang === "bn" ? "কমপক্ষে একটি পণ্য যোগ করুন" : "Add at least one product to cart");
      return;
    }
    const totalAmount = shoppingCart.reduce((sum, item) => sum + item.total, 0);
    if (totalAmount <= 0) {
      toast.error(lang === "bn" ? "মোট টাকা শূন্য হতে পারে না" : "Total amount must be greater than zero");
      return;
    }

    const emp = allEmployees.find(x => x.id === shoppingEmpId);
    const empName = emp?.name || "Employee";

    setSubmittingShopping(true);
    try {
      await createEmployeeShoppingFn({
        data: {
          employee_id: shoppingEmpId,
          employee_name: empName,
          items: shoppingCart.map(c => ({
            product_id: c.product_id,
            product_name: c.product_name,
            qty: c.qty,
            unit_price: c.unit_price,
            total: c.total,
          })),
          total_amount: totalAmount,
          payment_status: shoppingPaymentMode,
          date: shoppingDate || todayStr,
          note: shoppingNote.trim() || (shoppingPaymentMode === "gift" ? "মালিকের পক্ষ থেকে স্টক উপহার" : "পোশাক কেনাকাটা"),
          created_at: new Date().toISOString(),
        }
      });

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["employee_shoppings"] }),
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["expenses"] }),
        qc.invalidateQueries({ queryKey: ["cashbox_logs"] }),
        qc.invalidateQueries({ queryKey: ["cashbox"] }),
      ]);

      toast.success(
        shoppingPaymentMode === "gift"
          ? (lang === "bn" ? `🎁 ${empName}-কে স্টক থেকে সফলভাবে উপহার দেওয়া হয়েছে (নন-ক্যাশ খরচ, ক্যাশবক্স অপরিবর্তিত)!` : `Gift given from stock to ${empName}!`)
          : shoppingPaymentMode === "deduct_from_salary"
          ? (lang === "bn" ? `🛍️ কেনাকাটা সম্পন্ন! ৳${fmtMoney(totalAmount)} ${empName}-এর বেতন থেকে কর্তন হবে।` : `Shopping recorded! ৳${fmtMoney(totalAmount)} will deduct from salary.`)
          : (lang === "bn" ? `🛍️ কেনাকাটা সম্পন্ন! নগদ ৳${fmtMoney(totalAmount)} ক্যাশবক্সে যুক্ত হয়েছে।` : `Shopping recorded with cash payment.`)
      );

      setShoppingOpen(false);
      setShoppingCart([]);
      setShoppingNote("");
      setShoppingSearch("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record employee shopping");
    } finally {
      setSubmittingShopping(false);
    }
  };

  const handleDeleteShoppingRecord = async (id: string) => {
    if (!confirm(lang === "bn" ? "আপনি কি নিশ্চিত যে এই কেনাকাটার রেকর্ডটি মুছে ফেলতে চান? পণ্য স্টক আবার ফেরত যুক্ত হবে।" : "Delete this shopping record? Products will be returned to stock.")) {
      return;
    }
    try {
      await deleteEmployeeShoppingFn({ id });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["employee_shoppings"] }),
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["expenses"] }),
        qc.invalidateQueries({ queryKey: ["cashbox_logs"] }),
      ]);
      toast.success(lang === "bn" ? "কেনাকাটার রেকর্ড সফলভাবে মুছে ফেলা হয়েছে এবং স্টক ফেরত দেওয়া হয়েছে" : "Shopping record deleted and stock restored");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete shopping record");
    }
  };

  // ── Handler: Pay Salary ──
  const handleSaveSalaryPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(paySalAmount);
    if (!paySalEmpId || isNaN(val) || val <= 0) {
      toast.error(lang === "bn" ? "সঠিক বেতনের পরিমাণ লিখুন" : "Please enter valid salary amount");
      return;
    }
    const emp = allEmployees.find(x => x.id === paySalEmpId);
    setSubmitting(true);
    try {
      await createEmployeeSalaryFn({
        data: {
          employee_id: paySalEmpId,
          employee_name: emp?.name || "Employee",
          amount: val,
          month: paySalMonth,
          payment_method: paySalMethod,
          note: paySalNote.trim() || (lang === "bn" ? "মাসিক বেতন পরিশোধ" : "Monthly salary payout"),
          date: todayStr,
        },
      });

      toast.success(lang === "bn" ? "বেতন সফলভাবে পরিশোধ করা হয়েছে!" : "Salary payment recorded successfully!");
      setPaySalaryOpen(false);
      setPaySalAmount("");
      setPaySalNote("");

      void qc.invalidateQueries({ queryKey: ["employee_salaries"] });
      void qc.invalidateQueries({ queryKey: ["cashbox"] });
      void qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err: any) {
      toast.error(err?.message || "Salary payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handler: Owner Delete Withdrawal / Advance / Expense Record ──
  const handleDeleteExpenseRecord = async (id: string, isGift = false) => {
    if (!isOwner) {
      toast.error(lang === "bn" ? "শুধুমাত্র মালিক এই রেকর্ড মুছতে পারবেন!" : "Only the owner can delete this record.");
      return;
    }
    const promptMsg = isGift
      ? (lang === "bn" ? "আপনি কি এই উপহার/বোনাস রেকর্ডটি মুছে ফেলতে চান? ক্যাশবক্স ও খরচের খাতা থেকেও সমন্বয় হবে।" : "Delete this gift/bonus record? Linked cashbox and expense entries will also be removed.")
      : (lang === "bn" ? "আপনি কি কর্মচারীর এই টাকা উত্তোলন/অগ্রিম রেকর্ডটি মুছে ফেলতে চান? ক্যাশবক্স ও খরচের খাতা থেকেও সমন্বয় হবে।" : "Delete this employee money withdrawal record? Linked cashbox and expense entries will also be removed.");
    if (!confirm(promptMsg)) return;

    try {
      await deleteEmployeeExpenseFn({ data: { id } });
      qc.setQueryData<EmployeeExpense[]>(["employee_expenses"], (prev = []) => prev.filter(x => x.id !== id));
      void qc.invalidateQueries({ queryKey: ["employee_expenses"] });
      void qc.invalidateQueries({ queryKey: ["cashbox"] });
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(lang === "bn" ? "রেকর্ড সফলভাবে মুছে ফেলা হয়েছে এবং ক্যাশবক্স সমন্বয় হয়েছে।" : "Record deleted and cashbox adjusted.");
    } catch (err: any) {
      toast.error(err?.message || (lang === "bn" ? "মুছে ফেলতে ব্যর্থ হয়েছে" : "Failed to delete record"));
    }
  };

  // ── Handler: Owner Delete Salary Payment Record ──
  const handleDeleteSalaryRecord = async (id: string) => {
    if (!isOwner) {
      toast.error(lang === "bn" ? "শুধুমাত্র মালিক বেতনের রেকর্ড মুছতে পারবেন!" : "Only the owner can delete salary records.");
      return;
    }
    if (!confirm(lang === "bn" ? "আপনি কি এই বেতন পরিশোধের রেকর্ডটি মুছে ফেলতে চান? ক্যাশবক্স ও খরচ থেকেও বাদ যাবে।" : "Delete this salary payment record? Linked cashbox and expense entries will also be removed.")) return;

    try {
      await deleteEmployeeSalaryFn({ data: { id } });
      qc.setQueryData<any[]>(["employee_salaries"], (prev = []) => prev.filter(x => x.id !== id));
      void qc.invalidateQueries({ queryKey: ["employee_salaries"] });
      void qc.invalidateQueries({ queryKey: ["cashbox"] });
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(lang === "bn" ? "বেতনের রেকর্ড মুছে ফেলা হয়েছে।" : "Salary record deleted.");
    } catch (err: any) {
      toast.error(err?.message || (lang === "bn" ? "মুছে ফেলতে ব্যর্থ হয়েছে" : "Failed to delete salary record"));
    }
  };

  // ── Filtered Employees for Management Roster ──
  const filteredRoster = useMemo(() => {
    return allEmployees.filter(e => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        e.name?.toLowerCase().includes(q) ||
        e.phone?.includes(q) ||
        e.designation?.toLowerCase().includes(q)
      );
    });
  }, [allEmployees, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-7xl mx-auto px-2 sm:px-4 pt-2 font-bensen">
      <PrimaryHeaderSlot>
        {isOwner && (
          <>
            <Button
              onClick={openAddEmployeeModal}
              size="sm"
              className="h-7 px-2.5 text-[11px] font-bold rounded-full gap-1 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              <Plus className="size-3" />
              <span>{lang === "bn" ? "নতুন কর্মী" : "Add Staff"}</span>
            </Button>

            <Button
              onClick={() => {
                if (allEmployees.length > 0 && !giftEmpId) setGiftEmpId(allEmployees[0].id);
                setGiftAmount("");
                setGiftNote("");
                setGiftOpen(true);
              }}
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px] font-bold rounded-full gap-1 border-lime-500/40 text-lime-700 dark:text-lime-300 cursor-pointer"
            >
              <Gift className="size-3" />
              <span>{lang === "bn" ? "উপহার" : "Gift"}</span>
            </Button>
          </>
        )}

        <Button
          onClick={() => {
            if (isOwner && allEmployees.length > 0) {
              setTakeEmpId(ownerViewEmpId !== "all" ? ownerViewEmpId : (selectedEmpId || allEmployees[0].id));
            }
            setTakeAmount("");
            setTakeNote("");
            setTakeMoneyOpen(true);
          }}
          size="sm"
          className="h-7 px-2.5 text-[11px] font-bold rounded-full gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
        >
          <ArrowDownLeft className="size-3" />
          <span>{lang === "bn" ? "অগ্রিম" : "Advance"}</span>
        </Button>
      </PrimaryHeaderSlot>

      <div className="flex md:hidden items-center justify-end gap-1.5 flex-wrap">
        {isOwner && (
          <>
            <Button onClick={openAddEmployeeModal} size="sm" className="h-8 text-xs font-bold rounded-xl gap-1 bg-indigo-600 text-white cursor-pointer">
              <Plus className="size-3.5" />
              <span>{lang === "bn" ? "নতুন কর্মী" : "Add Staff"}</span>
            </Button>
            <Button
              onClick={() => {
                if (allEmployees.length > 0 && !giftEmpId) setGiftEmpId(allEmployees[0].id);
                setGiftAmount("");
                setGiftNote("");
                setGiftOpen(true);
              }}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold rounded-xl gap-1 cursor-pointer"
            >
              <Gift className="size-3.5" />
              <span>{lang === "bn" ? "উপহার" : "Gift"}</span>
            </Button>
          </>
        )}
        <Button
          onClick={() => {
            if (isOwner && allEmployees.length > 0) {
              setTakeEmpId(ownerViewEmpId !== "all" ? ownerViewEmpId : (selectedEmpId || allEmployees[0].id));
            }
            setTakeAmount("");
            setTakeNote("");
            setTakeMoneyOpen(true);
          }}
          size="sm"
          className="h-8 text-xs font-bold rounded-xl gap-1 bg-emerald-600 text-white cursor-pointer"
        >
          <ArrowDownLeft className="size-3.5" />
          <span>{lang === "bn" ? "অগ্রিম" : "Advance"}</span>
        </Button>
      </div>

      {/* ── Owner User Switcher Bar (Switch between All Staff or Any Individual User Stats) ── */}
      {isOwner && (
        <Card className="p-3 sm:p-3.5 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/[0.04] via-card to-emerald-500/[0.04] shadow-2xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <UserCheck className="size-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-foreground">
                  {lang === "bn" ? "ইউজার ও কর্মচারী পরিসংখ্যান সুইচার" : "Employee / User Statistics Switcher"}
                </h2>
                <p className="text-[10.5px] text-muted-foreground">
                  {viewedEmployee
                    ? (lang === "bn"
                        ? `${viewedEmployee.name}-এর একক বিক্রি, উত্তোলন, বেতন ও খতিয়ান প্রদর্শিত হচ্ছে`
                        : `Showing individual statistics, sales, withdrawals & salary ledger for ${viewedEmployee.name}`)
                    : (lang === "bn"
                        ? "যে কোনো ইউজার নির্বাচন করে তার ব্যক্তিগত পরিসংখ্যান দেখুন"
                        : "Select any user to inspect their individual sales, withdrawals, gifts & salary stats")}
                </p>
              </div>
            </div>

            {allEmployees.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  aria-label={lang === "bn" ? "কর্মচারী নির্বাচন করুন" : "Switch Employee"}
                  value={ownerViewEmpId}
                  onChange={e => handleSwitchOwnerView(e.target.value)}
                  className="h-8 px-2.5 text-xs font-bold rounded-xl bg-background border border-border text-foreground cursor-pointer"
                >
                  <option value="all">
                    {lang === "bn" ? `সকল কর্মচারী (${allEmployees.length} জন)` : `All Staff Overview (${allEmployees.length})`}
                  </option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.designation ? `— ${emp.designation}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => handleSwitchOwnerView("all")}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                ownerViewEmpId === "all"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-background/80 text-muted-foreground border-border/80 hover:text-foreground hover:border-indigo-400/50"
              }`}
            >
              <Users className="size-3.5" />
              <span>{lang === "bn" ? "সকল স্টাফ" : "All Staff"}</span>
              <Badge variant="secondary" className={`h-4 px-1.5 text-[10px] ${ownerViewEmpId === "all" ? "bg-white/20 text-white border-0" : ""}`}>
                {allEmployees.length}
              </Badge>
            </button>

            {allEmployees.map(emp => {
              const isSelected = ownerViewEmpId === emp.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleSwitchOwnerView(emp.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background/80 text-foreground border-border/80 hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <span className={`size-5 rounded-md text-[10px] font-black flex items-center justify-center ${
                    isSelected ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  }`}>
                    {(emp.name || "E").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="max-w-[130px] truncate">{emp.name}</span>
                  <span className={`size-1.5 rounded-full ${emp.status === "inactive" ? "bg-muted-foreground" : "bg-emerald-400"}`} />
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Top Bento KPI Overview Cards (Adapts dynamically to selected user!) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* Card 1: Staff Count / Selected User Identity */}
        <Card className="p-2.5 sm:p-3.5 rounded-2xl bg-card border-border/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] sm:text-xs font-semibold">
              {viewedEmployee ? (lang === "bn" ? "নির্বাচিত স্টাফ" : "Selected User") : (lang === "bn" ? "মোট কর্মচারী" : "Total Staff")}
            </span>
            <Users className="size-3.5 sm:size-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-1">
            <p className="text-sm sm:text-lg font-black font-bensen text-foreground truncate">
              {viewedEmployee ? viewedEmployee.name : `${allEmployees.length} ${lang === "bn" ? "জন" : "Staff"}`}
            </p>
            <span className="text-[9.5px] sm:text-[10px] text-emerald-600 font-semibold block truncate">
              {viewedEmployee
                ? `${viewedEmployee.designation || "Staff"} • ${viewedEmployee.status === "inactive" ? (lang === "bn" ? "নিষ্ক্রিয়" : "Inactive") : (lang === "bn" ? "সক্রিয়" : "Active")}`
                : `${activeEmployeesCount} ${lang === "bn" ? "জন সক্রিয়" : "Active"}`}
            </span>
          </div>
        </Card>

        {/* Card 2: Base Salary */}
        <Card className="p-2.5 sm:p-3.5 rounded-2xl bg-card border-border/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] sm:text-xs font-semibold">
              {viewedEmployee ? (lang === "bn" ? "মাসিক মূল বেতন" : "User Base Salary") : (lang === "bn" ? "মাসিক বেতন বাজেট" : "Base Salaries")}
            </span>
            <DollarSign className="size-3.5 sm:size-4 text-primary" />
          </div>
          <div className="mt-1">
            <p className="text-sm sm:text-lg font-black font-bensen text-primary">
              {fmtMoney(viewedEmployee ? baseSalary : totalBaseSalaries)}
            </p>
            <span className="text-[9.5px] sm:text-[10px] text-muted-foreground block truncate">
              {viewedEmployee
                ? `${lang === "bn" ? "অগ্রিম সীমা:" : "Adv. Limit:"} ${fmtMoney(advanceLimit)}`
                : (lang === "bn" ? "মোট নির্ধারিত বাজেট" : "Monthly budget")}
            </span>
          </div>
        </Card>

        {/* Card 3: Monthly Advances Taken */}
        <Card className="p-2.5 sm:p-3.5 rounded-2xl bg-card border-orange-500/30 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] sm:text-xs font-semibold text-orange-600 dark:text-orange-400">
              {viewedEmployee ? (lang === "bn" ? "ব্যক্তিগত উত্তোলন" : "User Withdrawals") : (lang === "bn" ? "উত্তোলিত অগ্রিম" : "Advances Drawn")}
            </span>
            <TrendingDown className="size-3.5 sm:size-4 text-orange-600" />
          </div>
          <div className="mt-1">
            <p className="text-sm sm:text-lg font-black font-bensen text-orange-600">
              {fmtMoney(viewedEmployee ? thisMonthTaken : totalMonthlyAdvances)}
            </p>
            <span className="text-[9.5px] sm:text-[10px] text-orange-600/80 block truncate">
              {viewedEmployee
                ? `${lang === "bn" ? "অবশিষ্ট সীমা:" : "Limit left:"} ${fmtMoney(remainingLimit)}`
                : (lang === "bn" ? "চলতি মাসে কর্তন" : "Deducted this month")}
            </span>
          </div>
        </Card>

        {/* Card 4: Remaining Salary Due */}
        <Card className="p-2.5 sm:p-3.5 rounded-2xl bg-card border-emerald-500/30 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {viewedEmployee ? (lang === "bn" ? "অবশিষ্ট প্রদেয়" : "User Net Payable") : (lang === "bn" ? "অবশিষ্ট প্রদেয়" : "Remaining Due")}
            </span>
            <Wallet className="size-3.5 sm:size-4 text-emerald-600" />
          </div>
          <div className="mt-1">
            <p className="text-sm sm:text-lg font-black font-bensen text-emerald-600">
              {fmtMoney(viewedEmployee ? remainingSalary : Math.max(0, totalBaseSalaries - totalMonthlyAdvances))}
            </p>
            <span className="text-[9.5px] sm:text-[10px] text-emerald-600/80 block truncate">
              {viewedEmployee && viewedStats
                ? `${lang === "bn" ? "পরিশোধিত:" : "Paid:"} ${fmtMoney(viewedStats.monthPaidSalary)}`
                : (lang === "bn" ? "রোলওভার ব্যালেন্স সহ" : "With rollover")}
            </span>
          </div>
        </Card>

        {/* Card 5: Owner Gifts & Bonuses (Acid Lime Accent) */}
        <Card className="p-2.5 sm:p-3.5 rounded-2xl bg-[#B7F7A8]/45 dark:bg-lime-950/40 border-[#86efac] dark:border-lime-500/40 shadow-2xs flex flex-col justify-between transition-all hover:border-lime-400">
          <div className="flex items-center justify-between text-lime-950 dark:text-lime-300">
            <span className="text-[10.5px] sm:text-xs font-bold flex items-center gap-1">
              <Gift className="size-3.5 text-lime-700 dark:text-lime-400" />
              <span>{lang === "bn" ? "উপহার / বোনাস" : "Owner Gifts"}</span>
            </span>
            <Sparkles className="size-3.5 text-lime-600 dark:text-lime-400 animate-pulse" />
          </div>
          <div className="mt-1">
            <p className="text-sm sm:text-lg font-black font-bensen text-lime-950 dark:text-lime-200">
              {fmtMoney(viewedEmployee && viewedStats ? viewedStats.monthGifts : totalGiftsGiven)}
            </p>
            <span className="text-[9px] sm:text-[9.5px] font-bold text-lime-800 dark:text-lime-400/90 block truncate">
              {lang === "bn" ? "✓ দোকানের খরচ গণ্য" : "✓ Shop expense recorded"}
            </span>
          </div>
        </Card>

        {/* Card 6: Staff Sales Performance */}
        <Card className="p-2.5 sm:p-3.5 rounded-2xl bg-card border-border/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10.5px] sm:text-xs font-semibold">
              {viewedEmployee ? (lang === "bn" ? "চলতি মাসের বিক্রি" : "User Month Sales") : (lang === "bn" ? "আজকের কর্মী বিক্রি" : "Staff Sales Today")}
            </span>
            <ShoppingBag className="size-3.5 sm:size-4 text-indigo-600" />
          </div>
          <div className="mt-1">
            <p className="text-sm sm:text-lg font-black font-bensen text-indigo-600 dark:text-indigo-400">
              {fmtMoney(viewedEmployee && viewedStats ? viewedStats.monthSalesTotal : totalStaffSalesToday)}
            </p>
            <span className="text-[9.5px] sm:text-[10px] text-muted-foreground block truncate">
              {viewedEmployee && viewedStats
                ? `${lang === "bn" ? "আজকে:" : "Today:"} ${fmtMoney(viewedStats.todaySalesTotal)} (${viewedStats.monthOrdersCount} ${lang === "bn" ? "রসিদ" : "orders"})`
                : (lang === "bn" ? "ক্যাশ ড্রয়ারে জমা" : "Deposited in cashbox")}
            </span>
          </div>
        </Card>
      </div>

      {/* ── Individual User Deep Statistics Strip (Visible when Owner Switches to a User) ── */}
      {isOwner && viewedEmployee && viewedStats && (
        <Card className="p-3.5 sm:p-4 rounded-2xl border border-primary/30 bg-card shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-black text-sm">
                {(viewedEmployee.name || "E").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-foreground">{viewedEmployee.name}</h3>
                  <Badge variant="outline" className="text-[10px]">{viewedEmployee.designation || "Staff"}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "bn"
                    ? "এই ব্যবহারকারীর বিস্তারিত পরিসংখ্যান ও লেনদেন"
                    : "Detailed statistics & filtered ledger for this user"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7.5 text-[11px] rounded-lg font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                onClick={() => {
                  setTakeEmpId(viewedEmployee.id);
                  setTakeAmount("");
                  setTakeNote("");
                  setTakeMoneyOpen(true);
                }}
              >
                <ArrowDownLeft className="size-3 mr-1" />
                {lang === "bn" ? "অগ্রিম দিন" : "Record Withdrawal"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7.5 text-[11px] rounded-lg font-bold border-primary/40 text-primary cursor-pointer"
                onClick={() => {
                  setPaySalEmpId(viewedEmployee.id);
                  setPaySalAmount(String(remainingSalary));
                  setPaySalaryOpen(true);
                }}
              >
                <DollarSign className="size-3 mr-1" />
                {lang === "bn" ? "বেতন দিন" : "Pay Salary"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7.5 text-[11px] rounded-lg font-bold border-indigo-500/40 text-indigo-700 dark:text-indigo-300 cursor-pointer"
                onClick={() => {
                  setShoppingEmpId(viewedEmployee.id);
                  setShoppingCart([]);
                  setShoppingNote("");
                  setShoppingPaymentMode("deduct_from_salary");
                  setShoppingOpen(true);
                }}
              >
                <ShoppingBag className="size-3 mr-1" />
                {lang === "bn" ? "কেনাকাটা" : "Shopping"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7.5 text-[11px] rounded-lg text-muted-foreground cursor-pointer"
                onClick={() => handleSwitchOwnerView("all")}
              >
                {lang === "bn" ? "সকল কর্মী দেখুন" : "View All Staff"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-[10px] text-blue-700 dark:text-blue-300 block font-semibold">{lang === "bn" ? "আজকের বিক্রি" : "Today's Sales"}</span>
              <span className="font-black font-mono text-sm text-blue-700 dark:text-blue-200">{fmtMoney(viewedStats.todaySalesTotal)}</span>
              <span className="text-[10px] text-muted-foreground block">{viewedStats.todayOrdersCount} {lang === "bn" ? "টি বিল" : "orders"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 block font-semibold">{lang === "bn" ? "মোট বিক্রি (সর্বকালীন)" : "All-Time Sales"}</span>
              <span className="font-black font-mono text-sm text-indigo-700 dark:text-indigo-200">{fmtMoney(viewedStats.allTimeSalesTotal)}</span>
              <span className="text-[10px] text-muted-foreground block">{viewedStats.allTimeOrdersCount} {lang === "bn" ? "টি বিল" : "orders"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 block font-semibold">{lang === "bn" ? "আগের মাসের রোলওভার" : "Prev. Month Rollover"}</span>
              <span className="font-black font-mono text-sm text-amber-700 dark:text-amber-200">
                {(salaryRollover?.carriedForwardBalance || 0) < 0 ? "-" : ""}
                {fmtMoney(Math.abs(salaryRollover?.carriedForwardBalance || 0))}
              </span>
              <span className="text-[10px] text-muted-foreground block">{lang === "bn" ? "স্বয়ংক্রিয় সমন্বয়" : "Auto-adjusted"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-semibold">{lang === "bn" ? "চলতি মাসে পরিশোধিত বেতন" : "Salary Paid This Month"}</span>
              <span className="font-black font-mono text-sm text-emerald-700 dark:text-emerald-200">{fmtMoney(viewedStats.monthPaidSalary)}</span>
              <span className="text-[10px] text-muted-foreground block">{lang === "bn" ? "বাকি:" : "Due:"} {fmtMoney(remainingSalary)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* ── Main Hub Navigation Tabs ── */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 overflow-x-auto pb-1">
          <TabsList className="bg-muted/70 p-1 rounded-2xl h-auto flex flex-wrap w-full sm:w-auto">
            {isOwner && (
              <TabsTrigger value="management" className="rounded-xl text-xs py-2 font-bold gap-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">
                <Users className="size-3.5" />
                <span>{lang === "bn" ? "কর্মচারী ব্যবস্থাপনা ও নিয়ন্ত্রণ" : "Staff Management & Control"}</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="advances" className="rounded-xl text-xs py-2 font-bold gap-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <ArrowDownLeft className="size-3.5" />
              <span>{lang === "bn" ? "টাকা উত্তোলন ও অগ্রিম" : "Advances & Withdrawals"}</span>
            </TabsTrigger>
            <TabsTrigger value="shopping" className="rounded-xl text-xs py-2 font-bold gap-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <ShoppingBag className="size-3.5 text-indigo-500" />
              <span>{lang === "bn" ? "কর্মচারী কেনাকাটা" : "Staff Shopping"}</span>
              {allShoppings.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                  {allShoppings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="salaries" className="rounded-xl text-xs py-2 font-bold gap-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <DollarSign className="size-3.5" />
              <span>{lang === "bn" ? "বেতন ও খতিয়ান" : "Salary & Ledger"}</span>
            </TabsTrigger>
            <TabsTrigger value="gifts" className="rounded-xl text-xs py-2 font-bold gap-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <Gift className="size-3.5" />
              <span>{lang === "bn" ? "উপহার ও বোনাস (দোকানের খরচ)" : "Gifts & Bonuses"}</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="rounded-xl text-xs py-2 font-bold gap-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <TrendingUp className="size-3.5" />
              <span>{lang === "bn" ? "বিক্রয় পারফরম্যান্স" : "Sales Performance"}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 1: কর্মচারী ব্যবস্থাপনা ও নিয়ন্ত্রণ (STAFF MANAGEMENT & CONTROL)
        ════════════════════════════════════════════════════════════════════════ */}
        {isOwner && (
          <TabsContent value="management" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-2xs">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={lang === "bn" ? "কর্মচারী খুঁজুন (নাম, পদবী, ফোন)..." : "Search staff..."}
                  className="pl-9 h-9 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={openAddEmployeeModal}
                  size="sm"
                  className="h-9 text-xs font-bold rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>{lang === "bn" ? "নতুন কর্মচারী যোগ করুন" : "Add New Staff"}</span>
                </Button>
              </div>
            </div>

            {/* Staff Roster Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredRoster.map(emp => {
                const empSales = allSales.filter(s => (s as any).employee_id === emp.id || (s as any).created_by === emp.id || ((s as any).employee_name && (s as any).employee_name.toLowerCase().trim() === (emp.name || '').toLowerCase().trim()));
                const empTodaySales = empSales.filter(s => (s.created_at || '').slice(0, 10) === todayStr).reduce((sum: number, s: any) => sum + (Number(s.sell_price) || 0), 0);
                const empMonthSales = empSales.filter(s => (s.created_at || '').slice(0, 7) === currentMonth).reduce((sum: number, s: any) => sum + (Number(s.sell_price) || 0), 0);
                const empAdvances = allExpenses
                  .filter(e => {
                    const isAdv = e.category === "advance" || e.category === "salary_advance" || (e as any).type === "advance";
                    return isAdv && (e.employee_id === emp.id || e.employee_name?.toLowerCase() === emp.name?.toLowerCase()) && (e.date || "").startsWith(currentMonth);
                  })
                  .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

                const empBase = Number(emp.base_salary || emp.monthly_salary) || 0;
                const empDue = Math.max(0, empBase - empAdvances);

                return (
                  <Card key={emp.id} className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all space-y-3 relative overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary text-white font-extrabold text-sm grid place-items-center shrink-0 shadow-xs">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{emp.name}</h3>
                            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 shrink-0 ${emp.status === "active" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "border-muted text-muted-foreground"}`}>
                              {emp.status === "active" ? (lang === "bn" ? "সক্রিয়" : "Active") : (lang === "bn" ? "নিষ্ক্রিয়" : "Inactive")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{emp.designation || "Sales Staff"} • {emp.phone || "No phone"}</p>
                        </div>
                      </div>

                      {/* Login PIN & Device Code Pill */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-[11px]">
                          <KeyRound className="size-3 text-amber-500" />
                          <span>PIN: {(emp as any).pin || (emp as any).plain_password || (emp as any).password || "1234"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Financial Mini KPI Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-xs">
                      <div className="bg-muted/40 p-2 rounded-xl border border-border/50">
                        <span className="text-[10px] text-muted-foreground block">{lang === "bn" ? "মাসিক বেতন" : "Base Salary"}</span>
                        <span className="font-bold font-mono text-primary">{fmtMoney(empBase)}</span>
                      </div>
                      <div className="bg-orange-500/10 p-2 rounded-xl border border-orange-500/20">
                        <span className="text-[10px] text-orange-700 dark:text-orange-400 block">{lang === "bn" ? "উত্তোলিত অগ্রিম" : "Advances"}</span>
                        <span className="font-bold font-mono text-orange-600">{fmtMoney(empAdvances)}</span>
                      </div>
                      <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block">{lang === "bn" ? "অবশিষ্ট বেতন" : "Remaining"}</span>
                        <span className="font-bold font-mono text-emerald-600">{fmtMoney(empDue)}</span>
                      </div>
                      <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                        <span className="text-[10px] text-blue-700 dark:text-blue-400 block">{lang === "bn" ? "আজকের বিক্রি" : "Today Sales"}</span>
                        <span className="font-bold font-mono text-blue-600">{fmtMoney(empTodaySales)}</span>
                      </div>
                    </div>

                    {/* Employee Permissions Summary Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/40 font-bensen text-[11px]">
                      <span className="text-[10px] text-muted-foreground font-bold">{lang === "bn" ? "অনুমতি:" : "Perms:"}</span>
                      {Boolean(emp.permissions?.sales ?? (emp.permissions as any)?.can_sales ?? true) && (
                        <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] border-primary/30 text-primary bg-primary/5">
                          {lang === "bn" ? "বিক্রি" : "Sales"}
                        </Badge>
                      )}
                      {Boolean(emp.permissions?.products ?? (emp.permissions as any)?.can_products) && (
                        <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5">
                          {lang === "bn" ? "পণ্য" : "Products"}
                        </Badge>
                      )}
                      {Boolean(emp.permissions?.cashbox ?? (emp.permissions as any)?.can_cashbox) && (
                        <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                          {lang === "bn" ? "ক্যাশবাক্স" : "Cashbox"}
                        </Badge>
                      )}
                      {Boolean(emp.permissions?.expenses ?? (emp.permissions as any)?.can_expenses) && (
                        <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
                          {lang === "bn" ? "খরচ" : "Expenses"}
                        </Badge>
                      )}
                      {Boolean(emp.permissions?.profit_loss ?? (emp.permissions as any)?.can_profit_loss) && (
                        <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">
                          {lang === "bn" ? "লাভ-ক্ষতি" : "Profit"}
                        </Badge>
                      )}
                      {Boolean(emp.permissions?.owners_wallet ?? (emp.permissions as any)?.can_owners_wallet) ? (
                        <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-bold">
                          {lang === "bn" ? "মালিকের ওয়ালেট" : "Owner Wallet"}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 italic">
                          {lang === "bn" ? "ওয়ালেট লকড" : "Wallet locked"}
                        </span>
                      )}
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border/60 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <OwnerEmployeeDeviceLink
                          employeeId={emp.id}
                          employeeName={emp.name}
                          employeePin={(emp as any).pin || (emp as any).plain_password || (emp as any).password || "1234"}
                          disabled={emp.status === "inactive"}
                        />

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs rounded-xl gap-1 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold cursor-pointer font-bensen"
                          onClick={() => openEditEmployeeModal(emp)}
                        >
                          <ShieldCheck className="size-3" />
                          <span>{lang === "bn" ? "পারমিশন" : "Permissions"}</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs rounded-xl gap-1 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold cursor-pointer"
                          onClick={() => {
                            setGiftEmpId(emp.id);
                            setGiftAmount("");
                            setGiftNote("");
                            setGiftOpen(true);
                          }}
                        >
                          <Gift className="size-3" />
                          <span>{lang === "bn" ? "উপহার দিন" : "Gift"}</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs rounded-xl gap-1 border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold cursor-pointer"
                          onClick={() => {
                            setShoppingEmpId(emp.id);
                            setShoppingCart([]);
                            setShoppingNote("");
                            setShoppingPaymentMode("deduct_from_salary");
                            setShoppingOpen(true);
                          }}
                        >
                          <ShoppingBag className="size-3" />
                          <span>{lang === "bn" ? "কেনাকাটা" : "Shopping"}</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs rounded-xl gap-1 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold cursor-pointer"
                          onClick={() => {
                            setPaySalEmpId(emp.id);
                            setPaySalAmount(String(empDue));
                            setPaySalaryOpen(true);
                          }}
                        >
                          <DollarSign className="size-3" />
                          <span>{lang === "bn" ? "বেতন পরিশোধ" : "Pay Salary"}</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] rounded-xl gap-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer"
                          onClick={() => handleSwitchOwnerView(emp.id)}
                          title={lang === "bn" ? "এই কর্মচারীর পরিসংখ্যান দেখুন" : "View user statistics"}
                        >
                          <TrendingUp className="size-3" />
                          <span>{lang === "bn" ? "পরিসংখ্যান" : "Stats"}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => openEditEmployeeModal(emp)}
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 2: টাকা উত্তোলন ও অগ্রিম (ADVANCES & WITHDRAWALS)
        ════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="advances" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ArrowDownLeft className="size-4 text-emerald-600" />
                <span>{lang === "bn" ? "অগ্রিম টাকা উত্তোলনের খতিয়ান" : "Salary Advances Ledger"}</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {lang === "bn" ? "এখানে উত্তোলিত সকল অগ্রিমের ইতিহাস প্রদর্শিত হচ্ছে। প্রতিটি এন্ট্রি ক্যাশবক্স থেকে বাদ হয়েছে।" : "All salary advances deducted from cashbox and salary balance."}
              </p>
            </div>

            <Button
              onClick={() => {
                if (isOwner && allEmployees.length > 0 && !takeEmpId) {
                  setTakeEmpId(selectedEmpId || allEmployees[0].id);
                }
                setTakeAmount("");
                setTakeNote("");
                setTakeMoneyOpen(true);
              }}
              size="sm"
              className="h-9 text-xs font-bold rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{lang === "bn" ? "টাকা উত্তোলন করুন" : "Record Advance"}</span>
            </Button>
          </div>

          {/* Advances & Withdrawals Ledger List */}
          <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
            {(() => {
              const filteredWithdrawals = allExpenses.filter(e => {
                const isWithdrawal = e.category !== "bonus" && e.category !== "gift";
                if (!isWithdrawal) return false;
                return viewedEmployee ? matchesEmpRecord(e, viewedEmployee) : true;
              });
              if (filteredWithdrawals.length === 0) {
                return (
                  <div className="p-8 text-center space-y-2 text-muted-foreground">
                    <ArrowDownLeft className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm font-semibold">{lang === "bn" ? "কোনো অগ্রিম উত্তোলনের তথ্য পাওয়া যায়নি" : "No salary advances or withdrawals recorded"}</p>
                  </div>
                );
              }
              return (
                <div className="divide-y divide-border/60">
                  {filteredWithdrawals.map(adv => (
                    <div key={adv.id} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold shrink-0">
                            <ArrowDownLeft className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-foreground truncate">{adv.employee_name || "Employee"}</span>
                              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 bg-muted/50 border-border">
                                {adv.payment_method === "cash" ? (lang === "bn" ? "নগদ ক্যাশবক্স" : "Cashbox") : (lang === "bn" ? "অনলাইন / ব্যাংক" : "Online")}
                              </Badge>
                              {adv.category && adv.category !== "advance" && adv.category !== "salary_advance" && (
                                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 border-orange-500/30 text-orange-700 dark:text-orange-300">
                                  {adv.category}
                                </Badge>
                              )}
                              <span className="text-[10.5px] text-muted-foreground font-mono">
                                {adv.date || fmtDate(adv.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-sm sm:text-base font-bold font-mono text-orange-600">
                              -{fmtMoney(Number(adv.amount) || 0)}
                            </span>
                          </div>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                              title={lang === "bn" ? "উত্তোলন মুছে ফেলুন" : "Delete withdrawal"}
                              onClick={() => handleDeleteExpenseRecord(adv.id, false)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Pretty Un-truncated Comment Note */}
                      {adv.note && (
                        <div className="ml-12 px-2.5 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs text-foreground/90 flex items-start gap-1.5">
                          <span className="text-muted-foreground font-bold text-[11px] shrink-0">💬 {lang === "bn" ? "মন্তব্য:" : "Note:"}</span>
                          <span className="break-words font-medium">{adv.note}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════════
            TAB: কর্মচারী কেনাকাটা ও পোশাক ক্রয় (EMPLOYEE SHOPPING & CLOTHING DRAW)
        ════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="shopping" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-500/10 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-500/30 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                  <ShoppingBag className="size-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{lang === "bn" ? "কর্মচারী কেনাকাটা ও পোশাক ক্রয় খতিয়ান" : "Employee Shopping & Purchases"}</span>
                </h2>
                <Badge className="bg-indigo-600 text-white border-none text-[10px] font-bold">
                  {lang === "bn" ? "বেতন থেকে কর্তন বা স্টক উপহার" : "Salary Cut / Stock Gift"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "bn"
                  ? "🛍️ কর্মচারী নিজের জন্য দোকান থেকে কেনাকাটা করলে তা সরাসরি মাসিক বেতন থেকে কর্তন (Salary Cut) হয়। মালিক চাইলে স্টক থেকে উপহার (Non-Cash Stock Expense) হিসেবেও প্রদান করতে পারেন যা ক্যাশবক্সের নগদ টাকা স্পর্শ করে না।"
                  : "Purchases made by employees auto-deduct from salary. Gifts from stock are recorded as non-cash expenses without touching the cashbox."}
              </p>
            </div>

            <Button
              onClick={() => {
                if (allEmployees.length > 0 && !shoppingEmpId) {
                  setShoppingEmpId(selectedEmpId || allEmployees[0].id);
                }
                setShoppingCart([]);
                setShoppingNote("");
                setShoppingPaymentMode("deduct_from_salary");
                setShoppingOpen(true);
              }}
              size="sm"
              className="h-9 text-xs font-bold rounded-xl gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{lang === "bn" ? "নতুন কেনাকাটা / পোশাক ক্রয়" : "New Employee Shopping"}</span>
            </Button>
          </div>

          {/* Quick Summary Cards */}
          {(() => {
            const relevantShoppings = allShoppings.filter(s =>
              viewedEmployee ? matchesEmpRecord(s, viewedEmployee) : true
            );
            const totalSalaryCut = relevantShoppings
              .filter(s => s.payment_status === "deduct_from_salary")
              .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
            const totalStockGifts = relevantShoppings
              .filter(s => s.payment_status === "gift")
              .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
            const totalPaidCash = relevantShoppings
              .filter(s => s.payment_status === "paid_cash")
              .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Card className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20">
                  <span className="text-[10.5px] font-bold text-indigo-700 dark:text-indigo-300 block">
                    {lang === "bn" ? "বেতন থেকে কর্তনকৃত কেনাকাটা" : "Salary Cut Purchases"}
                  </span>
                  <span className="text-lg font-black font-mono text-indigo-900 dark:text-indigo-100">
                    ৳{fmtMoney(totalSalaryCut)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {lang === "bn" ? "মাসিক প্রদেয় বেতন থেকে বাদ যাবে" : "Deducted from payable salary"}
                  </span>
                </Card>

                <Card className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 block">
                    {lang === "bn" ? "স্টক থেকে উপহার (নন-ক্যাশ খরচ)" : "Stock Gifts (Non-Cash Expense)"}
                  </span>
                  <span className="text-lg font-black font-mono text-emerald-900 dark:text-emerald-100">
                    ৳{fmtMoney(totalStockGifts)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {lang === "bn" ? "ক্যাশ অক্ষত, স্টক থেকে ব্যয়" : "Zero cashbox impact, stock deducted"}
                  </span>
                </Card>

                <Card className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
                  <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-300 block">
                    {lang === "bn" ? "নগদে পরিশোধিত কেনাকাটা" : "Cash Paid Purchases"}
                  </span>
                  <span className="text-lg font-black font-mono text-amber-900 dark:text-amber-100">
                    ৳{fmtMoney(totalPaidCash)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {lang === "bn" ? "ক্যাশবক্সে সরাসরি জমা" : "Deposited to cashbox"}
                  </span>
                </Card>
              </div>
            );
          })()}

          {/* Shoppings Feed / Statement List */}
          <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
            {(() => {
              const filteredShoppings = allShoppings.filter(s =>
                viewedEmployee ? matchesEmpRecord(s, viewedEmployee) : true
              );

              if (filteredShoppings.length === 0) {
                return (
                  <div className="p-8 text-center space-y-2 text-muted-foreground">
                    <ShoppingBag className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm font-semibold">
                      {lang === "bn" ? "কোনো কেনাকাটার রেকর্ড পাওয়া যায়নি" : "No shopping records found"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {lang === "bn" ? "কর্মচারীরা নিজেদের কেনা পোশাক বা পণ্য এখানে যুক্ত করতে পারেন যা মাসিক বেতন থেকে সমন্বয় হয়।" : "Staff purchases can be recorded here and auto-deduct from monthly salary."}
                    </p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-border/60">
                  {filteredShoppings.map(shop => {
                    const isSalaryCut = shop.payment_status === "deduct_from_salary";
                    const isGift = shop.payment_status === "gift";
                    const isCash = shop.payment_status === "paid_cash";

                    return (
                      <div key={shop.id} className="p-3.5 sm:p-4 hover:bg-muted/30 transition-colors space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`size-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                              isGift ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30" :
                              isSalaryCut ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/30" :
                              "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                            }`}>
                              {isGift ? <Gift className="size-4" /> : <ShoppingBag className="size-4" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                                  {shop.employee_name || "Employee"}
                                </span>

                                {isSalaryCut && (
                                  <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                                    🟣 {lang === "bn" ? "বেতন থেকে কর্তন (Salary Cut)" : "Salary Cut"}
                                  </Badge>
                                )}
                                {isGift && (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                    🎁 {lang === "bn" ? "মালিকের স্টক উপহার (Non-Cash)" : "Owner Stock Gift"}
                                  </Badge>
                                )}
                                {isCash && (
                                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                    💵 {lang === "bn" ? "নগদ আদায়" : "Cash Paid"}
                                  </Badge>
                                )}

                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {fmtDate(shop.date || shop.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className={`text-sm sm:text-base font-bold font-mono ${
                                isGift ? "text-emerald-600 dark:text-emerald-400" :
                                isSalaryCut ? "text-indigo-600 dark:text-indigo-400" :
                                "text-amber-600 dark:text-amber-400"
                              }`}>
                                {isSalaryCut ? "-" : isGift ? "🎁 " : "+"}৳{fmtMoney(Number(shop.total_amount) || 0)}
                              </span>
                              {isGift && (
                                <span className="text-[9.5px] text-muted-foreground block font-sans">
                                  {lang === "bn" ? "দোকানের নন-ক্যাশ খরচ" : "Non-cash expense"}
                                </span>
                              )}
                            </div>

                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                                title={lang === "bn" ? "রেকর্ড মুছে ফেলুন ও স্টক ফেরত দিন" : "Delete record & restore stock"}
                                onClick={() => handleDeleteShoppingRecord(shop.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Purchased Items List */}
                        {Array.isArray(shop.items) && shop.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-12">
                            {shop.items.map((item: any, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 text-[11px] bg-background border border-border/80 px-2 py-0.5 rounded-lg shadow-2xs font-mono"
                              >
                                <Package className="size-3 text-muted-foreground" />
                                <span className="font-sans font-semibold text-foreground">{item.product_name}</span>
                                <span className="text-muted-foreground">× {item.qty}</span>
                                <span className="text-foreground font-bold">৳{fmtMoney(item.total || (item.qty * item.unit_price))}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Statement Comments / Notes Display */}
                        {shop.note && (
                          <div className="ml-12 px-2.5 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs text-foreground/90 flex items-start gap-1.5">
                            <span className="text-muted-foreground font-bold text-[11px] shrink-0">💬 {lang === "bn" ? "মন্তব্য:" : "Note:"}</span>
                            <span className="break-words font-medium">{shop.note}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 3: বেতন ও রোলওভার খতিয়ান (SALARY & ROLLOVER LEDGER)
        ════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="salaries" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <DollarSign className="size-4 text-primary" />
                <span>{lang === "bn" ? "মাসিক বেতন ও রোলওভার খতিয়ান" : "Salary Rollover Ledger"}</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {lang === "bn" ? "পূর্ববর্তী মাসের বকেয়া বা অতিরিক্ত উত্তোলন স্বয়ংক্রিয়ভাবে চলতি মাসে যুক্ত ও সমন্বয় হয়।" : "Previous month's unpaid salary or excess advance auto-rolls over to the new month."}
              </p>
            </div>
            {isOwner && (
              <Button
                onClick={() => {
                  if (allEmployees.length > 0 && !paySalEmpId) setPaySalEmpId(allEmployees[0].id);
                  setPaySalAmount("");
                  setPaySalNote("");
                  setPaySalaryOpen(true);
                }}
                size="sm"
                className="h-9 text-xs font-bold rounded-xl gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>{lang === "bn" ? "বেতন পরিশোধ করুন" : "Pay Salary"}</span>
              </Button>
            )}
          </div>

          {/* Salary Records List */}
          <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
            {(() => {
              const filteredSalaries = allSalaries.filter((sal: any) =>
                viewedEmployee ? matchesEmpRecord(sal, viewedEmployee) : true
              );
              if (filteredSalaries.length === 0) {
                return (
                  <div className="p-8 text-center space-y-2 text-muted-foreground">
                    <Receipt className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm font-semibold">{lang === "bn" ? "কোনো বেতন পরিশোধের রসিদ পাওয়া যায়নি" : "No salary payments found"}</p>
                  </div>
                );
              }
              return (
                <div className="divide-y divide-border/60">
                  {filteredSalaries.map((sal: any) => (
                    <div key={sal.id} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                            <CheckCircle2 className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-foreground truncate">{sal.employee_name || "Employee"}</span>
                              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                {sal.month || currentMonth}
                              </Badge>
                              {sal.payment_method && (
                                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 bg-muted/50 border-border">
                                  {sal.payment_method === "cash" ? (lang === "bn" ? "নগদ ক্যাশবক্স" : "Cashbox") : (lang === "bn" ? "অনলাইন / ব্যাংক" : "Online")}
                                </Badge>
                              )}
                              <span className="text-[10.5px] text-muted-foreground font-mono">
                                {fmtDate(sal.date || sal.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-sm sm:text-base font-bold font-mono text-emerald-600">
                              +{fmtMoney(Number(sal.amount) || 0)}
                            </span>
                          </div>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                              title={lang === "bn" ? "বেতনের রেকর্ড মুছে ফেলুন" : "Delete salary payment"}
                              onClick={() => handleDeleteSalaryRecord(sal.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Pretty Un-truncated Comment Note */}
                      {sal.note && (
                        <div className="ml-12 px-2.5 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs text-foreground/90 flex items-start gap-1.5">
                          <span className="text-muted-foreground font-bold text-[11px] shrink-0">💬 {lang === "bn" ? "মন্তব্য:" : "Note:"}</span>
                          <span className="break-words font-medium">{sal.note}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 4: উপহার ও বোনাস (GIFTS & BONUSES - COUNTED AS SHOP EXPENSE)
        ════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="gifts" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#B7F7A8]/30 dark:bg-lime-950/40 p-4 rounded-2xl border border-[#86efac] dark:border-lime-500/40 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-lime-950 dark:text-lime-200 flex items-center gap-2">
                  <Gift className="size-4 text-lime-600 dark:text-lime-400" />
                  <span>{lang === "bn" ? "মালিকের উপহার ও বোনাস খতিয়ান" : "Owner Gifts & Bonus Ledger"}</span>
                </h2>
                <Badge className="bg-[#B7F7A8] text-lime-950 border border-[#86efac] text-[10px] font-bold">
                  {lang === "bn" ? "দোকানের খরচ গণ্য" : "Counted as Shop Expense"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "bn"
                  ? "মালিক কর্মচারীকে যে কোনো উপহার, টিপস বা বোনাস দিলে তা স্বয়ংক্রিয়ভাবে দোকানের মোট খরচ (Shop Expense) হিসেবে গণ্য হয় এবং কর্মচারীর বেতন থেকে কাটা হয় না।"
                  : "Owner gifts and bonuses automatically count as shop expenses and are never deducted from employee salary."}
              </p>
            </div>

            {isOwner && (
              <Button
                onClick={() => {
                  if (allEmployees.length > 0 && !giftEmpId) setGiftEmpId(allEmployees[0].id);
                  setGiftAmount("");
                  setGiftNote("");
                  setGiftOpen(true);
                }}
                size="sm"
                className="h-9 text-xs font-bold rounded-xl gap-1.5 bg-[#B7F7A8] hover:bg-[#a3f390] text-lime-950 border border-lime-500/40 shadow-xs cursor-pointer"
              >
                <Plus className="size-3.5 text-lime-950" />
                <span>{lang === "bn" ? "নতুন উপহার প্রদান করুন" : "Give New Gift"}</span>
              </Button>
            )}
          </div>

          {/* Gifts Feed */}
          <Card className="rounded-2xl border border-[#bef264]/40 dark:border-lime-500/30 overflow-hidden bg-card shadow-xs">
            {(() => {
              const filteredGifts = allExpenses.filter(e =>
                (e.category === "bonus" || e.category === "gift") &&
                (viewedEmployee ? matchesEmpRecord(e, viewedEmployee) : true)
              );
              if (filteredGifts.length === 0) {
                return (
                  <div className="p-8 text-center space-y-2 text-muted-foreground">
                    <Gift className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm font-semibold">{lang === "bn" ? "কোনো উপহার বা বোনাসের রেকর্ড নেই" : "No gifts or bonuses recorded yet"}</p>
                  </div>
                );
              }
              return (
                <div className="divide-y divide-border/60">
                  {filteredGifts.map(gift => {
                    const isStockGift = gift.payment_method === "stock" || (gift as any).is_stock_expense;
                    return (
                      <div key={gift.id} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-9 rounded-xl bg-[#d9f99d]/40 text-lime-800 dark:text-lime-300 flex items-center justify-center font-bold shrink-0 border border-lime-400/30">
                              <Gift className="size-4 text-lime-600 dark:text-lime-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-foreground truncate">{gift.employee_name || "Employee"}</span>
                                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 bg-[#d9f99d]/30 text-lime-900 dark:text-lime-300 border-[#bef264]/60">
                                  🎁 {lang === "bn" ? "মালিকের উপহার" : "Gift"}
                                </Badge>
                                {isStockGift ? (
                                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                    📦 {lang === "bn" ? "স্টক পণ্য (নন-ক্যাশ খরচ)" : "Stock Product (Non-Cash)"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 bg-muted/50 border-border">
                                    {gift.payment_method === "online" ? (lang === "bn" ? "অনলাইন / ব্যাংক" : "Online") : (lang === "bn" ? "নগদ ক্যাশবক্স" : "Cashbox")}
                                  </Badge>
                                )}
                                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  {lang === "bn" ? "দোকানের খরচ" : "Shop Expense"}
                                </span>
                                <span className="text-[10.5px] text-muted-foreground font-mono">
                                  {fmtDate(gift.date || gift.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-sm sm:text-base font-bold font-mono text-lime-800 dark:text-lime-300">
                                {fmtMoney(Number(gift.amount) || 0)}
                              </span>
                            </div>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                                title={lang === "bn" ? "উপহার মুছে ফেলুন" : "Delete gift record"}
                                onClick={() => handleDeleteExpenseRecord(gift.id, true)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Pretty Un-truncated Comment Note */}
                        {gift.note && (
                          <div className="ml-12 px-2.5 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs text-foreground/90 flex items-start gap-1.5">
                            <span className="text-muted-foreground font-bold text-[11px] shrink-0">💬 {lang === "bn" ? "মন্তব্য:" : "Note:"}</span>
                            <span className="break-words font-medium">{gift.note}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 5: বিক্রয় পারফরম্যান্স (SALES PERFORMANCE)
        ════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(viewedEmployee ? allEmployees.filter(e => e.id === viewedEmployee.id) : allEmployees).map(emp => {
              const empSales = allSales.filter(s => (s as any).employee_id === emp.id || (s as any).created_by === emp.id || ((s as any).employee_name && (s as any).employee_name.toLowerCase().trim() === (emp.name || '').toLowerCase().trim()));
              const empTodaySales = empSales.filter(s => (s.created_at || '').slice(0, 10) === todayStr);
              const empMonthSales = empSales.filter(s => (s.created_at || '').slice(0, 7) === currentMonth);

              const todayTotal = empTodaySales.reduce((sum, s) => sum + (s.returned ? 0 : Number(s.sell_price || 0) * (Number(s.qty) || 1)), 0);
              const monthTotal = empMonthSales.reduce((sum, s) => sum + (s.returned ? 0 : Number(s.sell_price || 0) * (Number(s.qty) || 1)), 0);

              return (
                <Card key={emp.id} className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{emp.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{emp.designation || "Staff"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block">{lang === "bn" ? "আজকের বিক্রি" : "Today Sales"}</span>
                      <span className="font-extrabold text-emerald-600 font-mono text-sm">{fmtMoney(todayTotal)}</span>
                      <span className="text-[9px] text-muted-foreground block">{empTodaySales.length} {lang === "bn" ? "টি রসিদ" : "Orders"}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium block">{lang === "bn" ? "চলতি মাসের বিক্রি" : "Month Sales"}</span>
                      <span className="font-extrabold text-blue-600 font-mono text-sm">{fmtMoney(monthTotal)}</span>
                      <span className="text-[9px] text-muted-foreground block">{empMonthSales.length} {lang === "bn" ? "টি রসিদ" : "Orders"}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 1: TAKE ADVANCE WITHDRAWAL
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={takeMoneyOpen} onOpenChange={setTakeMoneyOpen}>
        <DialogContent className="max-w-md font-bensen rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold font-bensen flex items-center gap-2">
              <ArrowDownLeft className="size-5 text-emerald-600" />
              <span>{lang === "bn" ? "অগ্রিম টাকা উত্তোলন করুন" : "Take Salary Advance"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "টাকা সরাসরি ক্যাশবক্স ও কর্মচারীর বেতন থেকে কাটা হবে।"
                : "Deducted immediately from cashbox and employee net salary."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTakeMoneySubmit} className="space-y-3.5">
            {isOwner && allEmployees.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "কর্মচারী নির্বাচন করুন" : "Select Staff"}</Label>
                <select
                  value={takeEmpId || selectedEmpId || allEmployees[0]?.id || ""}
                  onChange={e => setTakeEmpId(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border font-medium"
                >
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({fmtMoney(emp.monthly_salary || 0)})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "টাকার পরিমাণ (৳) *" : "Amount (৳) *"}</Label>
              <Input
                required
                type="number"
                step="any"
                inputMode="decimal"
                pattern="[0-9.]*"
                placeholder="0.00"
                value={takeAmount}
                onChange={e => setTakeAmount(e.target.value)}
                className="h-10 text-base font-bold font-mono rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment Method"}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTakeMethod("cash")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    takeMethod === "cash"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  💵 {lang === "bn" ? "নগদ (ক্যাশবক্স)" : "Cashbox"}
                </button>
                <button
                  type="button"
                  onClick={() => setTakeMethod("online")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    takeMethod === "online"
                      ? "bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  🌐 {lang === "bn" ? "অনলাইন / ব্যাংক" : "Online/Bank"}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "উত্তোলনের কারণ বা বিবরণ" : "Note / Reason"}</Label>
              <Input
                value={takeNote}
                onChange={e => setTakeNote(e.target.value)}
                placeholder={lang === "bn" ? "যেমন: ব্যক্তিগত জরুরি প্রয়োজন..." : "e.g. Family emergency..."}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setTakeMoneyOpen(false)} className="rounded-xl">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting} size="sm" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? "..." : (lang === "bn" ? "উত্তোলন নিশ্চিত করুন" : "Confirm Withdrawal")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 2: GIVE OWNER GIFT / BONUS (COUNTS AS SHOP EXPENSE)
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
        <DialogContent className="max-w-md font-bensen rounded-2xl border-[#bef264]/50">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold font-bensen flex items-center gap-2 text-lime-900 dark:text-lime-300">
              <Gift className="size-5 text-lime-600 dark:text-lime-400" />
              <span>{lang === "bn" ? "মালিকের উপহার বা বোনাস প্রদান" : "Give Owner Gift / Bonus"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "✨ এই উপহারটি সরাসরি দোকানের মোট খরচ (Shop Expense) হিসেবে গণ্য হবে। কর্মচারীর বেতন থেকে কাটা যাবে না।"
                : "This gift is strictly recorded as a shop expense and will not reduce the employee's salary."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGift} className="space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "কর্মচারী নির্বাচন করুন" : "Select Staff"}</Label>
              <select
                value={giftEmpId}
                onChange={e => setGiftEmpId(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border font-medium"
              >
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "উপহারের ধরণ" : "Gift Category"}</Label>
              <select
                value={giftType}
                onChange={e => setGiftType(e.target.value as any)}
                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border font-medium"
              >
                <option value="bonus">{lang === "bn" ? "🎁 নগদ বোনাস / পুরস্কার" : "Cash Bonus"}</option>
                <option value="eid_gift">{lang === "bn" ? "🌙 ঈদ / উৎসব উপহার" : "Eid / Festival Gift"}</option>
                <option value="target_gift">{lang === "bn" ? "🎯 সেলস টার্গেট উপহার" : "Sales Target Reward"}</option>
                <option value="item_gift">{lang === "bn" ? "👕 পোশাক / উপহার সামগ্রী" : "Gift Item / Clothes"}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{lang === "bn" ? "পেমেন্ট / উপহারের মাধ্যম" : "Payment / Gift Method"}</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGiftMethod("stock")}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                    giftMethod === "stock"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/40 shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  📦 {lang === "bn" ? "স্টক পণ্য (নন-ক্যাশ)" : "Stock Item (Non-Cash)"}
                </button>
                <button
                  type="button"
                  onClick={() => setGiftMethod("cash")}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                    giftMethod === "cash"
                      ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  💵 {lang === "bn" ? "নগদ ক্যাশবক্স" : "Cashbox"}
                </button>
                <button
                  type="button"
                  onClick={() => setGiftMethod("online")}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                    giftMethod === "online"
                      ? "bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  🌐 {lang === "bn" ? "অনলাইন / ব্যাংক" : "Online/Bank"}
                </button>
              </div>

              {giftMethod === "stock" && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <Package className="size-3.5" />
                    <span>{lang === "bn" ? "স্টক পণ্য নির্বাচন করুন (নন-ক্যাশ খরচ)" : "Select Stock Product (Non-Cash Expense)"}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 leading-tight">
                    {lang === "bn"
                      ? "💡 কর্মচারীকে দোকানের পণ্য উপহার দিলে স্টক স্বয়ংক্রিয়ভাবে কমবে এবং দোকানের মোট খরচে অন্তর্ভুক্ত হবে। ক্যাশবক্সের নগদ টাকা কাটা যাবে না এবং কর্মচারীর বেতন থেকেও কাটা যাবে না।"
                      : "Gifting stock products deducts product inventory and records a shop expense. Zero impact on cashbox, and never deducted from salary."}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] font-semibold">{lang === "bn" ? "পণ্য *" : "Product *"}</Label>
                      <select
                        value={giftProductId}
                        onChange={e => {
                          const pid = e.target.value;
                          setGiftProductId(pid);
                          const prod = allProducts.find(p => p.id === pid);
                          if (prod) {
                            const unitP = Number(prod.sell_price) || 0;
                            setGiftAmount(String(unitP * giftProductQty));
                            if (!giftNote) setGiftNote(`স্টক পণ্য উপহার: ${prod.name}`);
                          }
                        }}
                        className="w-full h-8 px-2 text-xs rounded-lg bg-card border border-border font-medium"
                      >
                        <option value="">{lang === "bn" ? "-- পণ্য বেছে নিন --" : "-- Choose Product --"}</option>
                        {allProducts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.code ? `(${p.code})` : ""} - স্টক: {p.stock} - ৳{p.sell_price}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">{lang === "bn" ? "পরিমাণ *" : "Quantity *"}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={giftProductQty}
                        onChange={e => {
                          const q = Math.max(1, parseInt(e.target.value) || 1);
                          setGiftProductQty(q);
                          const prod = allProducts.find(p => p.id === giftProductId);
                          if (prod) {
                            setGiftAmount(String((Number(prod.sell_price) || 0) * q));
                          }
                        }}
                        className="h-8 text-xs font-mono font-bold rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {giftMethod === "stock"
                  ? (lang === "bn" ? "উপহার পণ্যের মূল্যমান (৳) *" : "Product Gift Value (৳) *")
                  : (lang === "bn" ? "উপহারের টাকার পরিমাণ (৳) *" : "Gift Value (৳) *")}
              </Label>
              <Input
                required
                type="number"
                step="any"
                inputMode="decimal"
                pattern="[0-9.]*"
                placeholder="0.00"
                value={giftAmount}
                onChange={e => setGiftAmount(e.target.value)}
                className="h-10 text-base font-bold font-mono rounded-xl border-amber-500/40"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "উপহারের বিবরণ / নোট" : "Note"}</Label>
              <Input
                value={giftNote}
                onChange={e => setGiftNote(e.target.value)}
                placeholder={lang === "bn" ? "যেমন: ভালো কাজের স্বীকৃতিস্বরূপ..." : "e.g. Good work reward..."}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setGiftOpen(false)} className="rounded-xl">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting} size="sm" className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white">
                {submitting ? "..." : (lang === "bn" ? "উপহার নিশ্চিত করুন" : "Confirm Gift")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 3: PAY SALARY
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={paySalaryOpen} onOpenChange={setPaySalaryOpen}>
        <DialogContent className="max-w-md font-bensen rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold font-bensen flex items-center gap-2 text-primary">
              <DollarSign className="size-5" />
              <span>{lang === "bn" ? "কর্মচারীকে বেতন পরিশোধ" : "Pay Employee Salary"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSalaryPayment} className="space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "কর্মচারী নির্বাচন করুন" : "Select Staff"}</Label>
              <select
                value={paySalEmpId}
                onChange={e => setPaySalEmpId(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border font-medium"
              >
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "বেতনের মাস" : "Month"}</Label>
                <Input
                  type="month"
                  value={paySalMonth}
                  onChange={e => setPaySalMonth(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "টাকার পরিমাণ (৳) *" : "Amount (৳) *"}</Label>
                <Input
                  required
                  type="number"
                  step="any"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  placeholder="0.00"
                  value={paySalAmount}
                  onChange={e => setPaySalAmount(e.target.value)}
                  className="h-9 text-xs font-bold font-mono rounded-xl border-primary"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment Method"}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaySalMethod("cash")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    paySalMethod === "cash"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  💵 {lang === "bn" ? "নগদ (ক্যাশবক্স)" : "Cashbox"}
                </button>
                <button
                  type="button"
                  onClick={() => setPaySalMethod("online")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    paySalMethod === "online"
                      ? "bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  🌐 {lang === "bn" ? "অনলাইন / ব্যাংক" : "Online/Bank"}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "নোট বা বিবরণ" : "Note"}</Label>
              <Input
                value={paySalNote}
                onChange={e => setPaySalNote(e.target.value)}
                placeholder={lang === "bn" ? "বেতন পরিশোধ বিবরণ..." : "Salary voucher note..."}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPaySalaryOpen(false)} className="rounded-xl">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting} size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground">
                {submitting ? "..." : (lang === "bn" ? "বেতন নিশ্চিত করুন" : "Confirm Payment")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 4: ADD / EDIT EMPLOYEE (FULL CONTROL)
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="max-w-xl font-bensen rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold font-bensen">
              {editingEmp ? (lang === "bn" ? "কর্মচারীর তথ্য সম্পাদনা" : "Edit Employee Details") : (lang === "bn" ? "নতুন কর্মচারী যোগ করুন" : "Add New Employee")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "কর্মচারীর পদবী, বেতন, অগ্রিম সীমা ও পিন কোড নির্ধারণ করুন।"
                : "Configure designation, base salary, advance limit, and access PIN."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEmployee} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "কর্মচারীর পুরো নাম *" : "Full Name *"}</Label>
              <Input
                required
                value={empName}
                onChange={e => setEmpName(e.target.value)}
                placeholder={lang === "bn" ? "যেমন: মো: রহিম উদ্দিন" : "e.g. John Doe"}
                className="h-9 text-xs rounded-xl"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "মোবাইল নম্বর" : "Phone Number"}</Label>
                <Input
                  value={empPhone}
                  onChange={e => setEmpPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "পদবী" : "Designation"}</Label>
                <Input
                  value={empDesignation}
                  onChange={e => setEmpDesignation(e.target.value)}
                  placeholder={lang === "bn" ? "যেমন: সেলস এক্সিকিউটিভ" : "e.g. Sales Staff"}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "মাসিক মূল বেতন (৳)" : "Base Salary (৳)"}</Label>
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  placeholder="15000"
                  value={empSalary}
                  onChange={e => setEmpSalary(e.target.value)}
                  className="h-9 text-xs font-bold font-mono rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "অগ্রিম সীমা (৳)" : "Advance Limit (৳)"}</Label>
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  placeholder="5000"
                  value={empAdvanceLimit}
                  onChange={e => setEmpAdvanceLimit(e.target.value)}
                  className="h-9 text-xs font-bold font-mono rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "লগইন পিন (PIN)" : "Login PIN"}</Label>
                <Input
                  value={empPin}
                  onChange={e => setEmpPin(e.target.value)}
                  placeholder="1234"
                  maxLength={6}
                  className="h-9 text-xs font-mono font-bold rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</Label>
                <select
                  value={empStatus}
                  onChange={e => setEmpStatus(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border font-medium"
                >
                  <option value="active">{lang === "bn" ? "সক্রিয় (Active)" : "Active"}</option>
                  <option value="inactive">{lang === "bn" ? "নিষ্ক্রিয় (Inactive)" : "Inactive"}</option>
                </select>
              </div>
            </div>

            {/* ─── Comprehensive Employee Permissions (Full Owner Control) ─── */}
            <div className="p-3 sm:p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/50">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 font-bensen">
                    <ShieldCheck className="size-4 text-primary" />
                    <span>{lang === "bn" ? "কর্মচারী অ্যাক্সেস পারমিশন কন্ট্রোল" : "Employee Access Permissions"}</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground font-bensen">
                    {lang === "bn"
                      ? "মালিক হিসেবে নির্ধারণ করুন কর্মচারী কোন কোন পেজ ও ফিচার দেখতে বা ব্যবহার করতে পারবে।"
                      : "Configure which pages and features this employee is allowed to view and access."}
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 flex-wrap shrink-0">
                  <span className="text-[10px] text-muted-foreground font-bensen mr-1">
                    {lang === "bn" ? "প্রিসেট:" : "Presets:"}
                  </span>
                  <button
                    type="button"
                    onClick={() => applyPreset("sales")}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-border bg-card hover:bg-muted transition-colors font-bensen"
                  >
                    {lang === "bn" ? "বিক্রয়কর্মী" : "Sales"}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("manager")}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-border bg-card hover:bg-muted transition-colors font-bensen"
                  >
                    {lang === "bn" ? "ম্যানেজার" : "Manager"}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("all_business")}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-border bg-card hover:bg-muted transition-colors font-bensen"
                  >
                    {lang === "bn" ? "সব ফিচার" : "All Features"}
                  </button>
                </div>
              </div>

              {/* Section 1: Sales & POS */}
              <div className="p-2.5 rounded-xl border border-border/60 bg-card space-y-2">
                <span className="text-[11px] font-bold text-foreground/90 font-bensen flex items-center gap-1.5">
                  <ShoppingBag className="size-3.5 text-primary" />
                  {lang === "bn" ? "১. বিক্রি ও কাস্টমার সেবা" : "1. Sales & POS Operations"}
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_sales}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_sales: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "বিক্রি ও পিওএস (Sales)" : "Sales & POS"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_customers}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_customers: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "কাস্টমার ও বাকির খাতা" : "Customers & Dues"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_returns}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_returns: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "পণ্য ফেরত / এক্সচেঞ্জ" : "Product Returns"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_discount}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_discount: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "ডিসকাউন্ট প্রদান" : "Special Discounts"}</span>
                  </label>
                </div>
              </div>

              {/* Section 2: Products & Inventory */}
              <div className="p-2.5 rounded-xl border border-border/60 bg-card space-y-2">
                <span className="text-[11px] font-bold text-foreground/90 font-bensen flex items-center gap-1.5">
                  <Package className="size-3.5 text-indigo-500" />
                  {lang === "bn" ? "২. পণ্য ও পাইকারি ক্রয়" : "2. Products & Purchases"}
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_products}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_products: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "পণ্য ও স্টক পরিচালনা" : "Products & Stock"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_purchases}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_purchases: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "পণ্য ক্রয় ও মহাজন হিসাব" : "Purchases & Suppliers"}</span>
                  </label>
                </div>
              </div>

              {/* Section 3: Cashbox, Expenses & Accounts */}
              <div className="p-2.5 rounded-xl border border-border/60 bg-card space-y-2">
                <span className="text-[11px] font-bold text-foreground/90 font-bensen flex items-center gap-1.5">
                  <Banknote className="size-3.5 text-emerald-600" />
                  {lang === "bn" ? "৩. ক্যাশবাক্স, খরচ ও হিসাব" : "3. Cashbox & Ledger"}
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_cashbox}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_cashbox: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "ক্যাশবাক্স ও নগদ জমার খাতা" : "Cashbox Management"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_expenses}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_expenses: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "দোকানের সাধারণ খরচ" : "Shop Expenses"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_somiti}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_somiti: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "সমিতি একাউন্ট" : "Somiti Accounts"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_profit_loss}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_profit_loss: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "লাভ-ক্ষতি ও মার্জিন" : "Profit & Loss"}</span>
                  </label>
                </div>
              </div>

              {/* Section 4: Reports, Settings & Danger Control */}
              <div className="p-2.5 rounded-xl border border-border/60 bg-card space-y-2">
                <span className="text-[11px] font-bold text-foreground/90 font-bensen flex items-center gap-1.5">
                  <Receipt className="size-3.5 text-blue-500" />
                  {lang === "bn" ? "৪. রিপোর্ট ও নিয়ন্ত্রণ" : "4. Reports & Controls"}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_reports}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_reports: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "বিজনেস রিপোর্ট" : "Reports"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_settings}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_settings: Boolean(c) }))}
                    />
                    <span>{lang === "bn" ? "দোকান সেটিংস" : "Shop Settings"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={empPermissions.can_delete}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_delete: Boolean(c) }))}
                    />
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      {lang === "bn" ? "বিল/ডাটা ডিলিট" : "Delete Access"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Section 5: Owner's Private Wallet (Strict Sensitivity Control) */}
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 font-bensen flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-amber-600 dark:text-amber-400" />
                    {lang === "bn" ? "৫. মালিকের ব্যক্তিগত ওয়ালেট (গোপনীয়)" : "5. Owner's Private Wallet"}
                  </span>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-[10px] h-4.5 px-1.5 font-bensen">
                    {lang === "bn" ? "মালিকের ব্যক্তিগত" : "Owner Only"}
                  </Badge>
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-bensen leading-tight">
                  {lang === "bn"
                    ? "⚠️ এটি দোকান মালিকের ব্যক্তিগত ও পরিবার খরচের ওয়ালেট। টিক না দিলে এই কর্মচারী কখনোই মালিকের ওয়ালেট দেখতে বা এন্ট্রি করতে পারবে না।"
                    : "⚠️ Personal and family ledger of the store owner. Kept strictly inaccessible unless ticked by the owner."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-lg bg-card/80 border border-amber-500/20">
                    <Checkbox
                      checked={empPermissions.can_owners_wallet}
                      onCheckedChange={c => {
                        const val = Boolean(c);
                        setEmpPermissions(p => ({
                          ...p,
                          can_owners_wallet: val,
                          can_owners_wallet_edit: val ? p.can_owners_wallet_edit : false,
                        }));
                      }}
                    />
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      {lang === "bn" ? "ওয়ালেট দেখার অনুমতি (View)" : "Allow Viewing Wallet"}
                    </span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg bg-card/80 border border-amber-500/20 select-none ${!empPermissions.can_owners_wallet ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                    <Checkbox
                      disabled={!empPermissions.can_owners_wallet}
                      checked={empPermissions.can_owners_wallet_edit}
                      onCheckedChange={c => setEmpPermissions(p => ({ ...p, can_owners_wallet_edit: Boolean(c) }))}
                    />
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      {lang === "bn" ? "খরচ যোগ/ইডিট অনুমতি (Edit)" : "Allow Adding/Editing"}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddEmpOpen(false)} className="rounded-xl">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting} size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground">
                {submitting ? "..." : (lang === "bn" ? "সংরক্ষণ করুন" : "Save Employee")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 5: EMPLOYEE SHOPPING / PURCHASES (বেতন থেকে কর্তন বা স্টক উপহার)
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={shoppingOpen} onOpenChange={setShoppingOpen}>
        <DialogContent className="max-w-2xl font-bensen rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold font-bensen flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
              <ShoppingBag className="size-5 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === "bn" ? "কর্মচারী কেনাকাটা ও পোশাক ক্রয়" : "Employee Shopping & Purchases"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-bensen">
              {lang === "bn"
                ? "কর্মচারী দোকান থেকে পণ্য কিনলে তা মাসিক বেতন থেকে কাটা যাবে অথবা মালিকের পক্ষ থেকে স্টক উপহার হিসেবে গণ্য হবে।"
                : "Staff purchases deduct from monthly salary or can be granted as a non-cash stock gift from the owner."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveShopping} className="space-y-4">
            {/* Step 1: Select Employee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "কর্মচারী নির্বাচন করুন *" : "Select Employee *"}</Label>
                <select
                  value={shoppingEmpId || (selectedEmpId || allEmployees[0]?.id || "")}
                  onChange={e => setShoppingEmpId(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border font-medium"
                >
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({fmtMoney(emp.monthly_salary || 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "তারিখ" : "Date"}</Label>
                <Input
                  type="date"
                  value={shoppingDate}
                  onChange={e => setShoppingDate(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Step 2: Payment Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{lang === "bn" ? "ক্রয় / পেমেন্টের ধরণ *" : "Purchase / Payment Mode *"}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setShoppingPaymentMode("deduct_from_salary")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left space-y-1 ${
                    shoppingPaymentMode === "deduct_from_salary"
                      ? "bg-indigo-500/15 border-indigo-500 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/30"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>🟣</span>
                    <span>{lang === "bn" ? "বেতন থেকে কর্তন" : "Salary Cut"}</span>
                  </div>
                  <p className="text-[10px] font-normal text-muted-foreground leading-tight">
                    {lang === "bn" ? "চলতি মাসের প্রদেয় বেতন থেকে স্বয়ংক্রিয় বাদ যাবে" : "Auto-deducted from net monthly salary"}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setShoppingPaymentMode("gift")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left space-y-1 ${
                    shoppingPaymentMode === "gift"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                    <span>🎁</span>
                    <span>{lang === "bn" ? "মালিকের স্টক উপহার" : "Stock Gift"}</span>
                  </div>
                  <p className="text-[10px] font-normal text-muted-foreground leading-tight">
                    {lang === "bn" ? "নন-ক্যাশ খরচ: স্টক কমবে, ক্যাশবক্স অক্ষত থাকবে" : "Non-cash shop expense; zero cashbox impact"}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setShoppingPaymentMode("paid_cash")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left space-y-1 ${
                    shoppingPaymentMode === "paid_cash"
                      ? "bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                    <span>💵</span>
                    <span>{lang === "bn" ? "নগদ আদায়" : "Cash Paid"}</span>
                  </div>
                  <p className="text-[10px] font-normal text-muted-foreground leading-tight">
                    {lang === "bn" ? "কর্মচারী নগদ পরিশোধ করেছেন (ক্যাশবক্সে জমা)" : "Paid immediately; deposited into cashbox"}
                  </p>
                </button>
              </div>
            </div>

            {/* Step 3: Product Search & Add to Cart */}
            <div className="space-y-2 p-3 rounded-2xl border border-border/80 bg-muted/20">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>{lang === "bn" ? "দোকান থেকে পণ্য যুক্ত করুন" : "Add Products from Stock"}</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {lang === "bn" ? `মোট প্রাপ্ত পণ্য: ${allProducts.length}` : `Available items: ${allProducts.length}`}
                </span>
              </Label>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={shoppingSearch}
                  onChange={e => setShoppingSearch(e.target.value)}
                  placeholder={lang === "bn" ? "পণ্যের নাম বা বারকোড দিয়ে খুঁজুন..." : "Search products by name or barcode..."}
                  className="pl-9 h-9 text-xs rounded-xl bg-card"
                />
              </div>

              {/* Product Search Results Dropdown/List */}
              {shoppingSearch.trim().length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-card divide-y divide-border/60 shadow-md">
                  {allProducts
                    .filter(p => {
                      const q = shoppingSearch.toLowerCase().trim();
                      return (p.name || "").toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q);
                    })
                    .slice(0, 10)
                    .map(prod => (
                      <div
                        key={prod.id}
                        onClick={() => {
                          setShoppingCart(prev => {
                            const existing = prev.find(item => item.product_id === prod.id);
                            if (existing) {
                              return prev.map(item =>
                                item.product_id === prod.id
                                  ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.unit_price }
                                  : item
                              );
                            }
                            return [
                              ...prev,
                              {
                                product_id: prod.id,
                                product_name: prod.name,
                                qty: 1,
                                unit_price: Number(prod.sell_price) || 0,
                                total: Number(prod.sell_price) || 0,
                                stock: Number(prod.stock) || 0,
                              },
                            ];
                          });
                          setShoppingSearch("");
                        }}
                        className="p-2 sm:px-3 flex items-center justify-between gap-2 hover:bg-primary/10 cursor-pointer transition-colors text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{prod.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {prod.code ? `[${prod.code}] ` : ""}স্টক: {prod.stock ?? 0}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold font-mono text-emerald-600">৳{prod.sell_price}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-bold">
                            + {lang === "bn" ? "যোগ" : "Add"}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Cart Items Table */}
              {shoppingCart.length > 0 ? (
                <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
                  <div className="p-2 bg-muted/50 border-b border-border/60 text-[11px] font-bold text-muted-foreground grid grid-cols-12 gap-2">
                    <span className="col-span-6">{lang === "bn" ? "পণ্য" : "Item"}</span>
                    <span className="col-span-3 text-center">{lang === "bn" ? "পরিমাণ" : "Qty"}</span>
                    <span className="col-span-2 text-right">{lang === "bn" ? "মোট (৳)" : "Total"}</span>
                    <span className="col-span-1 text-center"></span>
                  </div>

                  <div className="divide-y divide-border/50">
                    {shoppingCart.map((item) => (
                      <div key={item.product_id} className="p-2 grid grid-cols-12 gap-2 items-center text-xs">
                        <div className="col-span-6 min-w-0">
                          <p className="font-semibold text-foreground truncate">{item.product_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">৳{item.unit_price} / পিস</p>
                        </div>

                        <div className="col-span-3 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShoppingCart(prev =>
                                prev
                                  .map(it => (it.product_id === item.product_id ? { ...it, qty: it.qty - 1, total: (it.qty - 1) * it.unit_price } : it))
                                  .filter(it => it.qty > 0)
                              );
                            }}
                            className="size-6 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold font-mono">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShoppingCart(prev =>
                                prev.map(it => (it.product_id === item.product_id ? { ...it, qty: it.qty + 1, total: (it.qty + 1) * it.unit_price } : it))
                              );
                            }}
                            className="size-6 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                        </div>

                        <div className="col-span-2 text-right font-bold font-mono text-foreground">
                          ৳{item.total.toLocaleString()}
                        </div>

                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => setShoppingCart(prev => prev.filter(it => it.product_id !== item.product_id))}
                            className="text-destructive hover:text-destructive/80 p-1"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  {lang === "bn" ? "উপরে সার্চ করে কেনা পণ্যগুলো তালিকায় যুক্ত করুন" : "Search and select products to add to this purchase"}
                </div>
              )}
            </div>

            {/* Financial Impact & Total Summary */}
            {shoppingCart.length > 0 && (
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    {lang === "bn" ? "মোট ক্রয়ের পরিমাণ:" : "Total Purchase Amount:"}
                  </span>
                  <span className="text-lg font-black font-mono text-indigo-900 dark:text-indigo-100">
                    ৳{shoppingCart.reduce((sum, it) => sum + it.total, 0).toLocaleString()}
                  </span>
                </div>

                <div className="text-[11px] text-muted-foreground pt-1 border-t border-indigo-200/50 dark:border-indigo-800/40">
                  {shoppingPaymentMode === "deduct_from_salary" && (
                    <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                      🟣 {lang === "bn" ? "এই টাকা কর্মচারীর মাসিক নিট বেতন থেকে কর্তন করা হবে (ক্যাশবক্স অপরিবর্তিত থাকবে)।" : "Deducted from employee net salary. Cashbox untouched."}
                    </span>
                  )}
                  {shoppingPaymentMode === "gift" && (
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                      🎁 {lang === "bn" ? "স্টক থেকে সমন্বয় হবে এবং দোকানে নন-ক্যাশ খরচ হিসেবে গণ্য হবে (ক্যাশবক্স ও বেতন অপরিবর্তিত)।" : "Recorded as non-cash shop expense; zero cashbox & salary deduction."}
                    </span>
                  )}
                  {shoppingPaymentMode === "paid_cash" && (
                    <span className="text-amber-700 dark:text-amber-300 font-medium">
                      💵 {lang === "bn" ? "কর্মচারী নগদ পরিশোধ করায় এই টাকা ক্যাশবক্সে জমা হবে।" : "Cash collected and deposited directly into the cashbox."}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Notes / Comments */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "মন্তব্য বা বিবরণ" : "Note / Remarks"}</Label>
              <Input
                value={shoppingNote}
                onChange={e => setShoppingNote(e.target.value)}
                placeholder={lang === "bn" ? "যেমন: নিজের জন্য পাঞ্জাবি ক্রয়..." : "e.g. Panjabi purchase..."}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShoppingOpen(false)} className="rounded-xl">
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={submittingShopping || shoppingCart.length === 0}
                size="sm"
                className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
              >
                {submittingShopping ? "..." : (lang === "bn" ? "কেনাকাটা নিশ্চিত করুন" : "Confirm Shopping")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
