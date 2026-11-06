"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  KeyRound,
  Lock,
  DollarSign,
  Receipt,
  ShoppingBag,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  Pencil,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Shirt,
  Printer,
  X,
  Check,
  CheckCheck,
  Copy,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Info,
  Clock,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCachedQuery } from "@/hooks/use-cached-query";
import {
  getEmployees,
  getEmployeeSalaries,
  getEmployeeExpenses,
  getEmployeeShoppings,
  getProducts,
  type Employee,
  type EmployeeSalary,
  type EmployeeExpense,
  type EmployeeShopping,
  type Product,
} from "@/lib/queries";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate, fmtDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  addEmployeeFn,
  updateEmployeeFn,
  regenerateEmployeeLoginCodeFn,
  deleteEmployeeFn,
  createEmployeeSalaryFn,
  deleteEmployeeSalaryFn,
  createEmployeeExpenseFn,
  deleteEmployeeExpenseFn,
  createEmployeeShoppingFn,
  deleteEmployeeShoppingFn,
} from "@/lib/rpc";

export default function EmployeesPage() {
  const { lang, t } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const searchParams = useSearchParams();

  const paramTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"accounts" | "salaries" | "expenses" | "shoppings">(
    (paramTab === "shoppings" || paramTab === "expenses" || paramTab === "salaries" || paramTab === "accounts")
      ? (paramTab as any)
      : user?.role === "employee"
      ? "shoppings"
      : "accounts"
  );
  const [search, setSearch] = useState("");

  // Queries
  const { data: employees = [], isLoading: empLoading } = useCachedQuery(["employees"], getEmployees);
  const { data: salaries = [], isLoading: salLoading } = useCachedQuery(["employee_salaries"], getEmployeeSalaries);
  const { data: expenses = [], isLoading: expLoading } = useCachedQuery(["employee_expenses"], getEmployeeExpenses);
  const { data: shoppings = [], isLoading: shopLoading } = useCachedQuery(["employee_shoppings"], getEmployeeShoppings);
  const { data: products = [] } = useCachedQuery(["products"], getProducts);

  // Dialog States: Employee Account
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empDesignation, setEmpDesignation] = useState("Sales Staff");
  const [empSalary, setEmpSalary] = useState("");
  const [empStatus, setEmpStatus] = useState<"active" | "inactive">("active");
  const [empPassword, setEmpPassword] = useState("1234");
  const [empPin, setEmpPin] = useState("1234");
  const [empLoginCode, setEmpLoginCode] = useState("");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [empPermissions, setEmpPermissions] = useState({
    can_sales: true,
    can_customers: true,
    can_returns: true,
    can_products: false,
    can_expenses: false,
    can_reports: false,
    can_delete: false,
    can_discount: false,
  });

  // Dialog States: Salary
  const [addSalaryOpen, setAddSalaryOpen] = useState(false);
  const [salEmpId, setSalEmpId] = useState("");
  const [salMonth, setSalMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salAmount, setSalAmount] = useState("");
  const [salMethod, setSalMethod] = useState("cash");
  const [salNote, setSalNote] = useState("");
  const [deductShoppings, setDeductShoppings] = useState(true);

  // Dialog States: Give Bonus
  const [addBonusOpen, setAddBonusOpen] = useState(false);
  const [bonusEmpId, setBonusEmpId] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusMethod, setBonusMethod] = useState("cash");
  const [bonusDate, setBonusDate] = useState(new Date().toISOString().slice(0, 10));
  const [bonusNote, setBonusNote] = useState("");

  // Dialog States: Expense
  const [addExpOpen, setAddExpOpen] = useState(false);
  const [expEmpId, setExpEmpId] = useState("");
  const [expCat, setExpCat] = useState("food");
  const [expAmount, setExpAmount] = useState("");
  const [expMethod, setExpMethod] = useState("cash");
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expNote, setExpNote] = useState("");

  // Dialog States: Shopping
  const [addShopOpen, setAddShopOpen] = useState(false);
  const [shopEmpId, setShopEmpId] = useState("");
  const [shopStatus, setShopStatus] = useState<"deduct_from_salary" | "paid_cash" | "gift">("deduct_from_salary");
  const [shopItems, setShopItems] = useState<{
    product_id: string;
    product_name: string;
    qty: number;
    regular_price: number;
    unit_price: number;
    discount: number;
    total: number;
  }[]>([]);
  const [shopOverallDiscount, setShopOverallDiscount] = useState("");
  const [shopProdSearch, setShopProdSearch] = useState("");
  const [shopNote, setShopNote] = useState("");
  const [printSlipItem, setPrintSlipItem] = useState<EmployeeShopping | null>(null);

  const [busy, setBusy] = useState(false);

  function updateItemUnitPrice(index: number, newPriceStr: string) {
    setShopItems(prev => {
      const next = [...prev];
      if (!next[index]) return prev;
      const unitPrice = Math.max(0, parseFloat(newPriceStr) || 0);
      const discount = next[index].discount || 0;
      const total = Math.max(0, (unitPrice - discount) * next[index].qty);
      next[index] = { ...next[index], unit_price: unitPrice, total };
      return next;
    });
  }

  function updateItemDiscount(index: number, newDiscStr: string) {
    setShopItems(prev => {
      const next = [...prev];
      if (!next[index]) return prev;
      const discount = Math.max(0, parseFloat(newDiscStr) || 0);
      const unitPrice = next[index].unit_price;
      const total = Math.max(0, (unitPrice - discount) * next[index].qty);
      next[index] = { ...next[index], discount, total };
      return next;
    });
  }

  function updateItemQty(index: number, newQty: number) {
    setShopItems(prev => {
      const next = [...prev];
      if (!next[index]) return prev;
      const q = Math.max(1, newQty);
      const total = Math.max(0, (next[index].unit_price - next[index].discount) * q);
      next[index] = { ...next[index], qty: q, total };
      return next;
    });
  }

  const shopRawSubtotal = useMemo(() => {
    return shopItems.reduce((acc, it) => acc + (it.unit_price * it.qty), 0);
  }, [shopItems]);

  const shopItemDiscounts = useMemo(() => {
    return shopItems.reduce((acc, it) => acc + ((it.discount || 0) * it.qty), 0);
  }, [shopItems]);

  const shopLineTotalsSum = useMemo(() => {
    return shopItems.reduce((acc, it) => acc + it.total, 0);
  }, [shopItems]);

  const shopOverallDiscNum = useMemo(() => {
    return Math.min(Math.max(0, Number(shopOverallDiscount) || 0), shopLineTotalsSum);
  }, [shopOverallDiscount, shopLineTotalsSum]);

  const shopFinalNetTotal = useMemo(() => {
    return Math.max(0, shopLineTotalsSum - shopOverallDiscNum);
  }, [shopLineTotalsSum, shopOverallDiscNum]);

  const shopTotalDiscountAll = useMemo(() => {
    return shopItemDiscounts + shopOverallDiscNum;
  }, [shopItemDiscounts, shopOverallDiscNum]);

  // Selected employee for salary calculation
  const selectedSalaryEmp = useMemo(() => {
    return employees.find(x => x.id === salEmpId) || null;
  }, [employees, salEmpId]);

  // Shoppings with "deduct_from_salary" not yet settled
  const pendingShoppingsForSal = useMemo(() => {
    if (!salEmpId) return [];
    return shoppings.filter(s =>
      (s.employee_id === salEmpId || (!s.employee_id && selectedSalaryEmp && s.employee_name.toLowerCase() === selectedSalaryEmp.name.toLowerCase())) &&
      s.payment_status === "deduct_from_salary" &&
      !(s as any).settled
    );
  }, [salEmpId, shoppings, selectedSalaryEmp]);

  const shoppingDeductionTotal = useMemo(() => {
    return pendingShoppingsForSal.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  }, [pendingShoppingsForSal]);

  // Helper to calculate early money (advance), daily spends, bonus and remaining salary balance for an employee in a given month
  const getEmployeeSalaryStats = (empId: string, monthStr: string, deductShop: boolean = true) => {
    const emp = employees.find(x => x.id === empId);
    const baseSal = Number(emp?.base_salary) || 0;
    if (!emp) {
      return { baseSal: 0, earlyMoney: 0, dailySpends: 0, bonusGiven: 0, shoppingDeductions: 0, remaining: 0, salariesPaid: 0, advancesPaid: 0 };
    }

    const matchEmp = (recEmpId?: string | null, recEmpName?: string | null) =>
      recEmpId === empId || (!recEmpId && Boolean(recEmpName && recEmpName.toLowerCase() === emp.name.toLowerCase()));

    // 1. Salaries already paid for this employee in this month
    const salariesInMonth = salaries.filter(s =>
      matchEmp(s.employee_id, s.employee_name) &&
      s.month === monthStr &&
      !(s as any).is_bonus
    );
    const salariesPaid = salariesInMonth.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    // 2. Advance / early money expenses taken for this employee in this month
    const advancesInMonth = expenses.filter(e =>
      matchEmp(e.employee_id, e.employee_name) &&
      (e.category === "advance" || e.category === "salary_advance") &&
      (e.date || "").startsWith(monthStr)
    );
    const advancesPaid = advancesInMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 3. Employee daily spends (food, travel, tea, other — excluding advance and bonus)
    const spendsInMonth = expenses.filter(e =>
      matchEmp(e.employee_id, e.employee_name) &&
      e.category !== "advance" &&
      e.category !== "salary_advance" &&
      e.category !== "bonus" &&
      (e.date || "").startsWith(monthStr)
    );
    const dailySpends = spendsInMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 4. Bonuses given by owner (not deducted from remaining salary)
    const bonusesInMonth = expenses.filter(e =>
      matchEmp(e.employee_id, e.employee_name) &&
      e.category === "bonus" &&
      (e.date || "").startsWith(monthStr)
    );
    const bonusGiven = bonusesInMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const earlyMoney = salariesPaid + advancesPaid;

    // 5. Pending shopping deductions
    const pendings = shoppings.filter(s =>
      matchEmp(s.employee_id, s.employee_name) &&
      s.payment_status === "deduct_from_salary" &&
      !(s as any).settled &&
      !(s as any).is_settled
    );
    const shoppingDeductions = deductShop ? pendings.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) : 0;

    const remaining = Math.max(0, baseSal - earlyMoney - dailySpends - shoppingDeductions);

    return {
      baseSal,
      earlyMoney,
      dailySpends,
      bonusGiven,
      salariesPaid,
      advancesPaid,
      shoppingDeductions,
      remaining,
    };
  };

  const selectedSalaryEmpCalc = useMemo(() => {
    if (!salEmpId) return null;
    return getEmployeeSalaryStats(salEmpId, salMonth, deductShoppings);
  }, [salEmpId, salMonth, deductShoppings, salaries, expenses, shoppings, employees]);

  const selectedExpEmp = useMemo(() => {
    return employees.find(x => x.id === expEmpId) || null;
  }, [employees, expEmpId]);

  const selectedExpEmpCalc = useMemo(() => {
    if (!expEmpId) return null;
    const currentMonth = expDate.slice(0, 7) || new Date().toISOString().slice(0, 7);
    return getEmployeeSalaryStats(expEmpId, currentMonth, true);
  }, [expEmpId, expDate, salaries, expenses, shoppings, employees]);

  // Identify currently logged-in employee
  const currentEmployee = useMemo(() => {
    if (!user) return null;
    return employees.find(e =>
      (e.email && user.email && e.email.toLowerCase() === user.email.toLowerCase()) ||
      (e.phone && (user as any)?.phone && e.phone.replace(/[^0-9]/g, "") === (user as any).phone.replace(/[^0-9]/g, "")) ||
      (e.name && user.full_name && e.name.toLowerCase() === user.full_name.toLowerCase()) ||
      e.id === user.id
    ) || null;
  }, [employees, user]);

  const [shopFilter, setShopFilter] = useState<"all" | "my">(user?.role === "employee" ? "my" : "all");

  const handleOpenAddShop = () => {
    if (currentEmployee) {
      setShopEmpId(currentEmployee.id);
    } else if (employees.length > 0 && !shopEmpId) {
      setShopEmpId(employees[0].id);
    }
    setShopItems([]);
    setShopOverallDiscount("");
    setShopProdSearch("");
    setShopNote("");
    setAddShopOpen(true);
  };

  // Filtered lists
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        (e.phone || "").includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (e.designation || "").toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  const filteredSalaries = useMemo(() => {
    return salaries.filter(s => {
      const q = search.toLowerCase();
      return s.employee_name.toLowerCase().includes(q) || s.month.includes(q);
    });
  }, [salaries, search]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const q = search.toLowerCase();
      return e.employee_name.toLowerCase().includes(q) || (e.note || "").toLowerCase().includes(q);
    });
  }, [expenses, search]);

  const filteredShoppings = useMemo(() => {
    return shoppings.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = s.employee_name.toLowerCase().includes(q) || (s.note || "").toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (shopFilter === "my" && currentEmployee) {
        return s.employee_id === currentEmployee.id || s.employee_name.toLowerCase() === currentEmployee.name.toLowerCase();
      }
      return true;
    });
  }, [shoppings, search, shopFilter, currentEmployee]);

  // Totals
  const totalSalariesPaid = useMemo(() => salaries.reduce((a, b) => a + (Number(b.amount) || 0), 0), [salaries]);
  const totalEmployeeExpenses = useMemo(() => expenses.reduce((a, b) => a + (Number(b.amount) || 0), 0), [expenses]);
  const totalEmployeeShoppings = useMemo(() => shoppings.reduce((a, b) => a + (Number(b.total_amount) || 0), 0), [shoppings]);

  // Handle Employee Account Add / Update
  async function handleSaveEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!empName.trim()) {
      toast.error(lang === "bn" ? "কর্মচারীর নাম লিখুন" : "Please enter employee name");
      return;
    }
    if (!empPhone.trim() && !empEmail.trim()) {
      toast.error(lang === "bn" ? "ফোন নম্বর অথবা ইমেইল যেকোনো একটি অবশ্যই লিখুন" : "Please enter phone number or email");
      return;
    }

    setBusy(true);
    try {
      if (editingEmp) {
        await updateEmployeeFn({
          data: {
            id: editingEmp.id,
            name: empName.trim(),
            phone: empPhone.trim() || null,
            email: empEmail.trim() || null,
            designation: empDesignation,
            base_salary: Number(empSalary) || 0,
            status: empStatus,
            login_code: empLoginCode.trim() || undefined,
            password: empPassword.trim() || "1234",
            plain_password: empPassword.trim() || "1234",
            pin: empPin.trim() || empPassword.trim() || "1234",
            permissions: empPermissions,
          },
        });
        toast.success(lang === "bn" ? "কর্মচারী তথ্য আপডেট হয়েছে" : "Employee updated successfully");
      } else {
        await addEmployeeFn({
          data: {
            name: empName.trim(),
            phone: empPhone.trim() || null,
            email: empEmail.trim() || null,
            designation: empDesignation,
            base_salary: Number(empSalary) || 0,
            status: empStatus,
            login_code: empLoginCode.trim() || undefined,
            password: empPassword.trim() || "1234",
            plain_password: empPassword.trim() || "1234",
            pin: empPin.trim() || empPassword.trim() || "1234",
            permissions: empPermissions,
          },
        });
        toast.success(lang === "bn" ? "নতুন কর্মচারী যুক্ত হয়েছে" : "Employee added successfully");
      }

      qc.invalidateQueries({ queryKey: ["employees"] });
      setAddEmpOpen(false);
      setEditingEmp(null);
      setEmpName("");
      setEmpPhone("");
      setEmpEmail("");
      setEmpSalary("");
      setEmpPassword("1234");
      setEmpPin("1234");
      setEmpLoginCode("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save employee");
    } finally {
      setBusy(false);
    }
  }

  // Handle Salary Submit
  async function handleSaveSalary(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(salAmount);
    if (!salEmpId || isNaN(val) || val < 0) {
      toast.error(lang === "bn" ? "কর্মচারী নির্বাচন করুন এবং সঠিক টাকার অঙ্ক লিখুন" : "Select employee and enter valid amount");
      return;
    }
    const emp = employees.find(x => x.id === salEmpId);
    setBusy(true);
    try {
      await createEmployeeSalaryFn({
        data: {
          employee_id: salEmpId,
          employee_name: emp?.name || "Employee",
          base_salary: emp?.base_salary || 0,
          deductions: deductShoppings ? shoppingDeductionTotal : 0,
          month: salMonth,
          amount: val,
          payment_method: salMethod,
          note: salNote.trim() || null,
          settled_shopping_ids: deductShoppings ? pendingShoppingsForSal.map(s => s.id) : [],
        },
      });
      toast.success(lang === "bn" ? "বেতন পরিশোধ রেকর্ড সংরক্ষিত হয়েছে" : "Salary payment recorded successfully");
      qc.invalidateQueries({ queryKey: ["employee_salaries"] });
      qc.invalidateQueries({ queryKey: ["employee_shoppings"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
      setAddSalaryOpen(false);
      setSalAmount("");
      setSalNote("");
    } catch (err: any) {
      toast.error(err.message || "Failed to record salary");
    } finally {
      setBusy(false);
    }
  }

  // Handle Give Bonus Submit
  async function handleSaveBonus(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(bonusAmount);
    if (!bonusEmpId || isNaN(val) || val <= 0) {
      toast.error(lang === "bn" ? "কর্মচারী নির্বাচন করুন এবং সঠিক বোনাসের পরিমাণ লিখুন" : "Select employee and enter valid bonus amount");
      return;
    }
    const emp = employees.find(x => x.id === bonusEmpId);
    setBusy(true);
    try {
      await createEmployeeExpenseFn({
        data: {
          employee_id: bonusEmpId,
          employee_name: emp?.name || "Employee",
          category: "bonus",
          amount: val,
          payment_method: bonusMethod,
          date: bonusDate,
          note: bonusNote.trim() ? `🎁 বোনাস: ${bonusNote.trim()}` : "🎁 মালিক প্রদত্ত বোনাস (Owner Bonus)",
        },
      });
      toast.success(lang === "bn" ? `${emp?.name || "কর্মচারী"}-কে বোনাস প্রদান করা হয়েছে!` : "Employee bonus recorded!");
      qc.invalidateQueries({ queryKey: ["employee_expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
      setAddBonusOpen(false);
      setBonusAmount("");
      setBonusNote("");
    } catch (err: any) {
      toast.error(err.message || "Failed to give bonus");
    } finally {
      setBusy(false);
    }
  }

  // Handle Expense Submit
  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(expAmount);
    if (isNaN(val) || val <= 0) {
      toast.error(lang === "bn" ? "সঠিক টাকার অঙ্ক লিখুন" : "Please enter valid amount");
      return;
    }
    const emp = employees.find(x => x.id === expEmpId);
    setBusy(true);
    try {
      await createEmployeeExpenseFn({
        data: {
          employee_id: expEmpId || null,
          employee_name: emp?.name || "Employee",
          category: expCat,
          amount: val,
          payment_method: expMethod,
          date: expDate,
          note: expNote.trim() || null,
        },
      });
      toast.success(
        lang === "bn"
          ? (expCat === "advance" ? "কর্মচারীর অগ্রিম টাকা (Early Money) সংরক্ষিত হয়েছে" : "কর্মচারী খরচ যুক্ত হয়েছে")
          : (expCat === "advance" ? "Employee early money/advance recorded" : "Employee expense recorded")
      );
      qc.invalidateQueries({ queryKey: ["employee_expenses"] });
      qc.invalidateQueries({ queryKey: ["employee_salaries"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
      setAddExpOpen(false);
      setExpAmount("");
      setExpNote("");
    } catch (err: any) {
      toast.error(err.message || "Failed to record expense");
    } finally {
      setBusy(false);
    }
  }

  // Handle Shopping Submit
  async function handleSaveShopping(e: React.FormEvent) {
    e.preventDefault();
    if (!shopEmpId) {
      toast.error(lang === "bn" ? "কর্মচারী নির্বাচন করুন" : "Please select employee");
      return;
    }
    if (shopItems.length === 0) {
      toast.error(lang === "bn" ? "কমপক্ষে ১টি পণ্য নির্বাচন করুন" : "Please add at least 1 product");
      return;
    }
    const emp = employees.find(x => x.id === shopEmpId);
    setBusy(true);
    try {
      await createEmployeeShoppingFn({
        data: {
          employee_id: shopEmpId,
          employee_name: emp?.name || "Employee",
          items: shopItems,
          subtotal: shopRawSubtotal,
          discount: shopTotalDiscountAll,
          overall_discount: shopOverallDiscNum,
          total_amount: shopFinalNetTotal,
          payment_status: shopStatus,
          note: shopNote.trim() || null,
        },
      });
      toast.success(lang === "bn" ? "কর্মচারীর পোশাক/পণ্য কেনাকাটা রেকর্ড হয়েছে ও স্টক আপডেট হয়েছে" : "Employee shopping recorded and stock updated");
      qc.invalidateQueries({ queryKey: ["employee_shoppings"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
      setAddShopOpen(false);
      setShopItems([]);
      setShopOverallDiscount("");
      setShopNote("");
    } catch (err: any) {
      toast.error(err.message || "Failed to record shopping");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-3 sm:p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/more">
            <Button variant="ghost" size="icon" className="size-8 rounded-xl">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold font-charukola text-foreground flex items-center gap-2">
              {lang === "bn" ? "কর্মচারী ব্যবস্থাপনা ও নিয়ন্ত্রণ" : "Employee Management Suite"}
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {employees.length} {lang === "bn" ? "জন" : "Staff"}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground font-balooda">
              {lang === "bn"
                ? "কর্মচারী একাউন্ট, বেতন রেজিস্টার, দৈনিক খরচ ও পোশাক কেনাকাটা নিয়ন্ত্রণ"
                : "Manage staff accounts, salary payouts, daily allowances & shopping draws"}
            </p>
          </div>
        </div>

        {/* Tab-Specific Action Button */}
        <div className="flex items-center gap-2">
          {activeTab === "accounts" && (
            <Button
              onClick={() => {
                setEditingEmp(null);
                setEmpName("");
                setEmpPhone("");
                setEmpEmail("");
                setEmpSalary("");
                setEmpPassword("1234");
                setEmpPin("1234");
                setEmpLoginCode(Math.floor(100000 + Math.random() * 900000).toString());
                setAddEmpOpen(true);
              }}
              size="sm"
              className="h-8.5 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm cursor-pointer"
            >
              <UserPlus className="size-3.5" />
              <span>{lang === "bn" ? "নতুন কর্মচারী যোগ করুন" : "Add Employee"}</span>
            </Button>
          )}

          {activeTab === "salaries" && (
            <Button
              onClick={() => setAddSalaryOpen(true)}
              size="sm"
              className="h-8.5 rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
            >
              <DollarSign className="size-3.5" />
              <span>{lang === "bn" ? "বেতন প্রদান করুন" : "Pay Salary"}</span>
            </Button>
          )}

          {activeTab === "expenses" && (
            <Button
              onClick={() => setAddExpOpen(true)}
              size="sm"
              className="h-8.5 rounded-xl text-xs font-bold gap-1.5 bg-orange-600 hover:bg-orange-700 text-white shadow-sm cursor-pointer"
            >
              <Receipt className="size-3.5" />
              <span>{lang === "bn" ? "কর্মচারী খরচ যোগ" : "Add Expense"}</span>
            </Button>
          )}

          {activeTab === "shoppings" && (
            <Button
              onClick={handleOpenAddShop}
              size="sm"
              className="h-8.5 rounded-xl text-xs font-bold gap-1.5 bg-pink-600 hover:bg-pink-700 text-white shadow-sm cursor-pointer"
            >
              <Shirt className="size-3.5" />
              <span>{lang === "bn" ? "পোশাক/পণ্য প্রদান" : "Record Shopping"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Auto-Link Informational Notice */}
      <div className="p-3 bg-gradient-to-r from-primary/10 via-indigo-500/5 to-transparent border border-primary/20 rounded-2xl flex items-start gap-2.5">
        <Info className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <span className="font-bold text-foreground">
            {lang === "bn" ? "💡 স্বয়ংক্রিয় কর্মচারী একাউন্ট লগইন পদ্ধতি:" : "💡 Automatic Employee Role Assignment:"}
          </span>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {lang === "bn"
              ? "এখানে কর্মচারীর যে ফোন নম্বর বা ইমেইল যোগ করবেন, সেই নম্বর/ইমেইল দিয়ে কর্মচারী সাইন-আপ করলে স্বয়ংক্রিয়ভাবে কর্মচারী একাউন্টে যুক্ত হয়ে যাবে।"
              : "When a staff signs up with the phone number or email registered here, they will automatically be assigned the Employee role with your configured permissions."}
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 rounded-2xl bg-card border-border/80 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">{lang === "bn" ? "মোট কর্মচারী" : "Total Staff"}</span>
            <Users className="size-3.5 text-primary" />
          </div>
          <p className="text-lg sm:text-xl font-bold font-charukola text-foreground">{employees.length} {lang === "bn" ? "জন" : ""}</p>
          <span className="text-[10px] text-emerald-600">{employees.filter(e => e.status === "active").length} {lang === "bn" ? "সক্রিয়" : "Active"}</span>
        </Card>

        <Card className="p-3 rounded-2xl bg-card border-border/80 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">{lang === "bn" ? "মোট পরিশোধিত বেতন" : "Salaries Paid"}</span>
            <DollarSign className="size-3.5 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold font-charukola text-emerald-600">{fmtMoney(totalSalariesPaid)}</p>
          <span className="text-[10px] text-muted-foreground">{salaries.length} {lang === "bn" ? "টি ট্রানজেকশন" : "Records"}</span>
        </Card>

        <Card className="p-3 rounded-2xl bg-card border-border/80 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">{lang === "bn" ? "কর্মচারী খরচ ও ভাতা" : "Staff Expenses"}</span>
            <Receipt className="size-3.5 text-orange-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold font-charukola text-orange-600">{fmtMoney(totalEmployeeExpenses)}</p>
          <span className="text-[10px] text-muted-foreground">{expenses.length} {lang === "bn" ? "টি ভাউচার" : "Vouchers"}</span>
        </Card>

        <Card className="p-3 rounded-2xl bg-card border-border/80 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">{lang === "bn" ? "কর্মচারী কেনাকাটা" : "Staff Shopping"}</span>
            <Shirt className="size-3.5 text-pink-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold font-charukola text-pink-600">{fmtMoney(totalEmployeeShoppings)}</p>
          <span className="text-[10px] text-muted-foreground">{shoppings.length} {lang === "bn" ? "বার কেনাকাটা" : "Draws"}</span>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-auto grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="accounts" className="rounded-lg text-xs py-1.5 font-bold gap-1.5">
              <Users className="size-3.5" />
              <span>{lang === "bn" ? "কর্মচারী একাউন্ট" : "Accounts"}</span>
            </TabsTrigger>
            <TabsTrigger value="salaries" className="rounded-lg text-xs py-1.5 font-bold gap-1.5">
              <DollarSign className="size-3.5" />
              <span>{lang === "bn" ? "বেতন হিসাব" : "Salary"}</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-lg text-xs py-1.5 font-bold gap-1.5">
              <Receipt className="size-3.5" />
              <span>{lang === "bn" ? "দৈনিক খরচ" : "Expenses"}</span>
            </TabsTrigger>
            <TabsTrigger value="shoppings" className="rounded-lg text-xs py-1.5 font-bold gap-1.5">
              <Shirt className="size-3.5" />
              <span>{lang === "bn" ? "কেনাকাটা" : "Shopping"}</span>
            </TabsTrigger>
          </TabsList>

          <div className="relative min-w-[200px] sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder={lang === "bn" ? "সার্চ করুন..." : "Search..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8.5 pl-8 text-xs rounded-xl bg-card"
            />
          </div>
        </div>

        {/* ── TAB 1: ACCOUNTS & STAFF LIST ── */}
        <TabsContent value="accounts" className="space-y-3">
          <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Users className="size-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold text-muted-foreground font-balooda">
                  {lang === "bn" ? "কোনো কর্মচারী পাওয়া যায়নি" : "No employees found"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingEmp(null);
                    setEmpName("");
                    setEmpPhone("");
                    setEmpEmail("");
                    setEmpSalary("");
                    setEmpPassword("1234");
                    setEmpPin("1234");
                    setEmpLoginCode(Math.floor(100000 + Math.random() * 900000).toString());
                    setAddEmpOpen(true);
                  }}
                  className="text-xs rounded-xl"
                >
                  {lang === "bn" ? "প্রথম কর্মচারী যোগ করুন" : "Add first employee"}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredEmployees.map(e => (
                  <div key={e.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold font-charukola text-sm shrink-0">
                        {e.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{e.name}</span>
                          <Badge variant="outline" className={`text-[10px] ${e.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>
                            {e.status === "active" ? (lang === "bn" ? "সক্রিয়" : "Active") : (lang === "bn" ? "নিষ্ক্রিয়" : "Inactive")}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {e.designation || "Staff"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {e.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3 text-muted-foreground" /> {e.phone}
                            </span>
                          )}
                          {e.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="size-3 text-muted-foreground" /> {e.email}
                            </span>
                          )}
                          {e.base_salary ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground font-charukola">
                                {lang === "bn" ? "মাসিক বেতন:" : "Salary:"} {fmtMoney(e.base_salary)}
                              </span>
                              {(() => {
                                const currentMonth = new Date().toISOString().slice(0, 7);
                                const stats = getEmployeeSalaryStats(e.id, currentMonth);
                                return (
                                  <>
                                    {stats.earlyMoney > 0 && (
                                      <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-medium">
                                        {lang === "bn" ? "মালিক প্রদত্ত:" : "Given by Owner:"} ৳{fmtMoney(stats.earlyMoney)}
                                      </Badge>
                                    )}
                                    {(stats.dailySpends + stats.shoppingDeductions) > 0 && (
                                      <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30 font-medium">
                                        {lang === "bn" ? "খরচ ও কেনা:" : "Spends:"} ৳{fmtMoney(stats.dailySpends + stats.shoppingDeductions)}
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold">
                                      <Wallet className="size-2.5 mr-1 text-emerald-600 inline" />
                                      {lang === "bn" ? "অবশিষ্ট বেতন:" : "Remaining Salary:"} ৳{fmtMoney(stats.remaining)}
                                    </Badge>
                                    {stats.bonusGiven > 0 && (
                                      <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold">
                                        🎁 {lang === "bn" ? "বোনাস:" : "Bonus:"} ৳{fmtMoney(stats.bonusGiven)}
                                      </Badge>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : null}
                        </div>

                        {/* WhatsApp-Style Login Code Badge */}
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs shadow-xs">
                            <span className="font-semibold flex items-center gap-1 text-[11px]">
                              <KeyRound className="size-3 text-emerald-600 dark:text-emerald-400" />
                              {lang === "bn" ? "লগইন কোড:" : "Login Code:"}
                            </span>
                            <span className="font-mono font-bold tracking-widest text-emerald-950 dark:text-emerald-100 bg-emerald-500/20 px-2 py-0.5 rounded-lg text-xs select-all">
                              {e.login_code
                                ? (e.login_code.length === 6
                                    ? `${e.login_code.slice(0, 3)}-${e.login_code.slice(3)}`
                                    : e.login_code)
                                : "---"}
                            </span>
                            <button
                              type="button"
                              title={lang === "bn" ? "কোড কপি করুন" : "Copy Code"}
                              onClick={() => {
                                if (e.login_code) {
                                  navigator.clipboard.writeText(e.login_code);
                                  setCopiedCodeId(e.id);
                                  toast.success(lang === "bn" ? `লগইন কোড ${e.login_code} কপি হয়েছে!` : `Login code ${e.login_code} copied!`);
                                  setTimeout(() => setCopiedCodeId(null), 2000);
                                }
                              }}
                              className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                            >
                              {copiedCodeId === e.id ? <CheckCheck className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                            </button>
                            <button
                              type="button"
                              title={lang === "bn" ? "নতুন কোড জেনারেট করুন" : "Generate new code"}
                              disabled={regeneratingId === e.id}
                              onClick={async () => {
                                if (confirm(lang === "bn" ? "আপনি কি এই কর্মচারীর জন্য নতুন ৬-সংখ্যার লগইন কোড জেনারেট করতে চান?" : "Generate a new 6-digit login code for this employee?")) {
                                  setRegeneratingId(e.id);
                                  try {
                                    const res = await regenerateEmployeeLoginCodeFn({ data: { id: e.id } });
                                    qc.invalidateQueries({ queryKey: ["employees"] });
                                    toast.success(lang === "bn" ? `নতুন লগইন কোড: ${res.login_code}` : `New login code: ${res.login_code}`);
                                  } catch (err: any) {
                                    toast.error(err.message || "Failed to regenerate code");
                                  } finally {
                                    setRegeneratingId(null);
                                  }
                                }
                              }}
                              className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                            >
                              <RefreshCw className={`size-3.5 ${regeneratingId === e.id ? "animate-spin" : ""}`} />
                            </button>
                          </div>
                          <span className="text-[10px] text-muted-foreground/80 hidden md:inline">
                            {lang === "bn" ? "💬 কর্মচারী লগইন পেজে এই কোডটি লিখবে" : "💬 Employee inputs this code to sign in"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-xl gap-1 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold cursor-pointer"
                        onClick={() => {
                          setBonusEmpId(e.id);
                          setBonusAmount("");
                          setBonusNote("");
                          setAddBonusOpen(true);
                        }}
                      >
                        <span>🎁</span>
                        <span>{lang === "bn" ? "বোনাস দিন" : "Give Bonus"}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-xl gap-1"
                        onClick={() => {
                          setEditingEmp(e);
                          setEmpName(e.name || "");
                          setEmpPhone(e.phone || "");
                          setEmpEmail(e.email || "");
                          setEmpDesignation(e.designation || "Sales Staff");
                          setEmpSalary(e.base_salary ? String(e.base_salary) : "");
                          setEmpStatus(e.status || "active");
                          setEmpLoginCode(e.login_code || (e as any).pin || "123456");
                          setEmpPassword((e as any).plain_password || (e as any).password || (e as any).pin || "1234");
                          setEmpPin((e as any).pin || (e as any).plain_password || (e as any).password || "1234");
                          setEmpPermissions({
                            can_sales: Boolean(e.permissions?.can_sales ?? true),
                            can_customers: Boolean(e.permissions?.can_customers ?? true),
                            can_returns: Boolean(e.permissions?.can_returns ?? true),
                            can_products: Boolean(e.permissions?.can_products ?? false),
                            can_expenses: Boolean(e.permissions?.can_expenses ?? false),
                            can_reports: Boolean(e.permissions?.can_reports ?? false),
                            can_delete: Boolean(e.permissions?.can_delete ?? false),
                            can_discount: Boolean(e.permissions?.can_discount ?? false),
                          });
                          setAddEmpOpen(true);
                        }}
                      >
                        <Pencil className="size-3" />
                        <span>{lang === "bn" ? "সম্পাদনা ও পারমিশন" : "Edit & Permissions"}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={async () => {
                          if (confirm(lang === "bn" ? "আপনি কি এই কর্মচারীকে মুছে ফেলতে চান?" : "Are you sure you want to delete this employee?")) {
                            await deleteEmployeeFn({ data: { id: e.id } });
                            qc.invalidateQueries({ queryKey: ["employees"] });
                            toast.success(lang === "bn" ? "কর্মচারী মুছে ফেলা হয়েছে" : "Employee deleted");
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── TAB 2: SALARIES ── */}
        <TabsContent value="salaries" className="space-y-3">
          <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
            {filteredSalaries.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <DollarSign className="size-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold text-muted-foreground font-balooda">
                  {lang === "bn" ? "কোনো বেতন রেকর্ড নেই" : "No salary payments recorded"}
                </p>
                <Button size="sm" variant="outline" onClick={() => setAddSalaryOpen(true)} className="text-xs rounded-xl">
                  {lang === "bn" ? "প্রথম বেতন প্রদান করুন" : "Record first salary"}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredSalaries.map(s => (
                  <div key={s.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                        <DollarSign className="size-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{s.employee_name}</span>
                          <Badge variant="outline" className="text-[10px] bg-muted font-mono">
                            {s.month}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {s.payment_method}
                          </Badge>
                          {(() => {
                            const emp = employees.find(x => x.id === s.employee_id || x.name.toLowerCase() === s.employee_name.toLowerCase());
                            if (!emp || !emp.base_salary) return null;
                            const stats = getEmployeeSalaryStats(emp.id, s.month);
                            return (
                              <Badge variant="outline" className={`text-[10px] font-semibold ${stats.remaining > 0 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"}`}>
                                {stats.remaining > 0 ? `${lang === "bn" ? "অবশিষ্ট বেতন:" : "Remaining:"} ৳${fmtMoney(stats.remaining)}` : (lang === "bn" ? "পরিশোধ সম্পন্ন" : "Fully Settled")}
                              </Badge>
                            );
                          })()}
                        </div>
                        {s.note && <p className="text-xs text-muted-foreground truncate">{s.note}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm sm:text-base font-charukola text-emerald-600">
                          {fmtMoney(s.amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{s.payment_date || fmtDate(s.created_at)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-rose-600"
                        onClick={async () => {
                          if (confirm(lang === "bn" ? "এই বেতন রেকর্ড মুছে ফেলতে চান?" : "Delete this salary record?")) {
                            await deleteEmployeeSalaryFn({ data: { id: s.id } });
                            qc.invalidateQueries({ queryKey: ["employee_salaries"] });
                            qc.invalidateQueries({ queryKey: ["expenses"] });
                            qc.invalidateQueries({ queryKey: ["cashbox"] });
                            toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted");
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── TAB 3: EXPENSES ── */}
        <TabsContent value="expenses" className="space-y-3">
          <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Receipt className="size-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold text-muted-foreground font-balooda">
                  {lang === "bn" ? "কোনো খরচ পাওয়া যায়নি" : "No employee expenses recorded"}
                </p>
                <Button size="sm" variant="outline" onClick={() => setAddExpOpen(true)} className="text-xs rounded-xl">
                  {lang === "bn" ? "প্রথম খরচ যোগ করুন" : "Add first expense"}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredExpenses.map(e => (
                  <div key={e.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20 shrink-0">
                        <Receipt className="size-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{e.employee_name}</span>
                          <Badge variant="outline" className={`text-[10px] ${e.category === "advance" ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-bold" : "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"}`}>
                            {e.category === "advance"
                              ? (lang === "bn" ? "অগ্রিম টাকা (Early Money)" : "Early Money / Advance")
                              : e.category === "food" ? (lang === "bn" ? "খাবার ভাতা" : "Food")
                              : e.category === "travel" ? (lang === "bn" ? "যাতায়াত" : "Travel")
                              : e.category === "tea" ? (lang === "bn" ? "নাস্তা / চা" : "Tea / Snacks")
                              : e.category === "bonus" ? (lang === "bn" ? "বোনাস" : "Bonus")
                              : (lang === "bn" ? "অন্যান্য" : "Other")}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{e.date}</span>
                        </div>
                        {e.note && <p className="text-xs text-muted-foreground truncate">{e.note}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm sm:text-base font-charukola text-orange-600">
                          {fmtMoney(e.amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{e.payment_method}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-rose-600"
                        onClick={async () => {
                          if (confirm(lang === "bn" ? "এই খরচ মুছে ফেলতে চান?" : "Delete this expense?")) {
                            await deleteEmployeeExpenseFn({ data: { id: e.id } });
                            qc.invalidateQueries({ queryKey: ["employee_expenses"] });
                            qc.invalidateQueries({ queryKey: ["expenses"] });
                            qc.invalidateQueries({ queryKey: ["cashbox"] });
                            toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted");
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── TAB 4: SHOPPINGS ── */}
        <TabsContent value="shoppings" className="space-y-3">
          {/* Shopping Filter & Quick Action Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-card border border-border/80 p-2 sm:p-2.5 rounded-xl shadow-xs">
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setShopFilter("all")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  shopFilter === "all"
                    ? "bg-card text-foreground shadow-xs border border-border/80 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{lang === "bn" ? "সকলের কেনাকাটা" : "All Staff"}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {shoppings.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setShopFilter("my")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  shopFilter === "my"
                    ? "bg-card text-pink-600 dark:text-pink-400 shadow-xs border border-pink-500/30 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shirt className="size-3 text-pink-600" />
                <span>{lang === "bn" ? "আমার কেনাকাটা" : "My Shopping"}</span>
                {currentEmployee && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-pink-500/10 text-pink-600">
                    {shoppings.filter(s => s.employee_id === currentEmployee.id || s.employee_name.toLowerCase() === currentEmployee.name.toLowerCase()).length}
                  </Badge>
                )}
              </button>
            </div>

            <Button
              size="sm"
              onClick={handleOpenAddShop}
              className="h-8 rounded-xl text-xs font-bold gap-1 bg-pink-600 hover:bg-pink-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{lang === "bn" ? "কেনাকাটা এন্ট্রি" : "Add Record"}</span>
            </Button>
          </div>

          <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
            {filteredShoppings.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Shirt className="size-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold text-muted-foreground font-balooda">
                  {lang === "bn" ? "কোনো কেনাকাটা রেকর্ড পাওয়া যায়নি" : "No employee shopping records"}
                </p>
                <Button size="sm" variant="outline" onClick={handleOpenAddShop} className="text-xs rounded-xl">
                  {lang === "bn" ? "প্রথম কেনাকাটা রেকর্ড করুন" : "Record first shopping"}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredShoppings.map(s => (
                  <div key={s.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-600 border border-pink-500/20 shrink-0">
                        <Shirt className="size-4" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{s.employee_name}</span>
                          <Badge variant="outline" className={`text-[10px] ${s.payment_status === "paid_cash" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : s.payment_status === "gift" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" : (s as any).settled ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                            {s.payment_status === "paid_cash" ? (lang === "bn" ? "নগদ পরিশোধিত" : "Paid in Cash") : s.payment_status === "gift" ? (lang === "bn" ? "উপহার/বোনাস" : "Gift") : ((s as any).settled ? (lang === "bn" ? "✓ বেতন থেকে কর্তিত" : "✓ Deducted from Salary") : (lang === "bn" ? "বেতন থেকে কর্তনযোগ্য" : "Pending Salary Deduction"))}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{s.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          {s.items?.map((item, idx) => (
                            <span key={idx} className="bg-muted px-2 py-0.5 rounded-md font-medium text-foreground inline-flex items-center gap-1">
                              <span>{item.product_name} x{item.qty} (৳{item.unit_price})</span>
                              {item.discount && item.discount > 0 ? (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-1 rounded">
                                  −৳{item.discount}
                                </span>
                              ) : null}
                            </span>
                          ))}
                          {s.discount && s.discount > 0 ? (
                            <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                              {lang === "bn" ? `ছাড়: −৳${fmtMoney(s.discount)}` : `Disc: −৳${fmtMoney(s.discount)}`}
                            </span>
                          ) : null}
                        </div>
                        {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm sm:text-base font-charukola text-pink-600">
                          {fmtMoney(s.total_amount)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-primary cursor-pointer"
                        title={lang === "bn" ? "রসিদ প্রিন্ট করুন" : "Print Voucher Slip"}
                        onClick={() => setPrintSlipItem(s)}
                      >
                        <Printer className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-rose-600"
                        onClick={async () => {
                          if (confirm(lang === "bn" ? "এই কেনাকাটা রেকর্ড মুছে ফেলতে চান?" : "Delete this shopping record?")) {
                            await deleteEmployeeShoppingFn({ data: { id: s.id } });
                            qc.invalidateQueries({ queryKey: ["employee_shoppings"] });
                            toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted");
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ──────────────── Modal 1: Add / Edit Employee ──────────────── */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-charukola flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              {editingEmp ? (lang === "bn" ? "কর্মচারী তথ্য ও পারমিশন সম্পাদনা" : "Edit Employee & Permissions") : (lang === "bn" ? "নতুন কর্মচারী যোগ করুন" : "Add New Employee")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEmployee} className="space-y-3.5 font-balooda">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "কর্মচারীর নাম *" : "Full Name *"}</Label>
                <Input
                  required
                  placeholder="e.g. Rahim Ahmed"
                  value={empName}
                  onChange={e => setEmpName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "পদবী / রোল" : "Designation"}</Label>
                <Input
                  placeholder="e.g. Sales Executive"
                  value={empDesignation}
                  onChange={e => setEmpDesignation(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "মোবাইল নম্বর (লগইন লিংক)" : "Phone Number (Auto-Link)"}</Label>
                <Input
                  placeholder="017XXXXXXXX"
                  value={empPhone}
                  onChange={e => setEmpPhone(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "ইমেইল (লগইন লিংক)" : "Email (Auto-Link)"}</Label>
                <Input
                  type="email"
                  placeholder="staff@example.com"
                  value={empEmail}
                  onChange={e => setEmpEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "মাসিক মূল বেতন (৳)" : "Base Monthly Salary (৳)"}</Label>
                <Input
                  type="number"
                  placeholder="12000"
                  value={empSalary}
                  onChange={e => setEmpSalary(e.target.value)}
                  className="h-9 text-xs font-charukola"
                />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {lang === "bn" ? "💡 বেতন নির্ধারণে ক্যাশ থেকে টাকা কাটবে না। 'বেতন প্রদান' করার সময় ক্যাশ কর্তন হবে।" : "💡 Setting salary does not deduct cash. Cash is deducted only upon payment."}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</Label>
                <Select value={empStatus} onValueChange={v => setEmpStatus(v as any)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{lang === "bn" ? "🟢 সক্রিয় (Active)" : "🟢 Active"}</SelectItem>
                    <SelectItem value="inactive">{lang === "bn" ? "🔴 নিষ্ক্রিয় (Inactive)" : "🔴 Inactive"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            
            {/* WhatsApp 6-Digit Login Code */}
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-emerald-600" />
                  {lang === "bn" ? "হোয়াটসঅ্যাপ স্টাইল ৬-সংখ্যার লগইন কোড" : "WhatsApp Style 6-Digit Login Code"}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                    setEmpLoginCode(newCode);
                    toast.success(lang === "bn" ? "নতুন কোড তৈরি করা হয়েছে" : "New code generated");
                  }}
                  className="h-7 px-2 text-[11px] rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 gap-1 cursor-pointer"
                >
                  <RefreshCw className="size-3" />
                  <span>{lang === "bn" ? "নতুন কোড" : "Generate"}</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={empLoginCode}
                  onChange={e => setEmpLoginCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  className="h-10 text-base font-bold font-mono tracking-widest bg-background text-emerald-900 dark:text-emerald-100 text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (empLoginCode) {
                      navigator.clipboard.writeText(empLoginCode);
                      toast.success(lang === "bn" ? `কোড ${empLoginCode} কপি হয়েছে!` : `Code ${empLoginCode} copied!`);
                    }
                  }}
                  className="h-10 px-3 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 shrink-0 cursor-pointer"
                >
                  <Copy className="size-4" />
                </Button>
              </div>

              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-tight">
                {lang === "bn"
                  ? "💬 কর্মচারীকে এই কোডটি দিন। Employee Login পেজে এই কোডটি দিয়ে সে এক ক্লিকেই লগইন করতে পারবে।"
                  : "💬 Give this code to your staff. They can enter it on the Employee Login page to sign in instantly."}
              </p>
            </div>

            {/* Login Credentials: Password & PIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/20">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <KeyRound className="size-3.5" />
                  {lang === "bn" ? "লগইন পাসওয়ার্ড *" : "Login Password *"}
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. 1234"
                  value={empPassword}
                  onChange={e => setEmpPassword(e.target.value)}
                  className="h-9 text-xs font-mono bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <Lock className="size-3.5" />
                  {lang === "bn" ? "৪-ডিজিট সিক্রেট পিন" : "4-Digit Quick PIN"}
                </Label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="1234"
                  value={empPin}
                  onChange={e => setEmpPin(e.target.value)}
                  className="h-9 text-xs font-mono bg-background"
                />
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-primary" />
                {lang === "bn" ? "কর্মচারী পারমিশন ও এক্সেস সেটিংস:" : "Employee Permissions & Access Control:"}
              </Label>
              <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-xl border">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="p_sales"
                    checked={empPermissions.can_sales}
                    onCheckedChange={v => setEmpPermissions({ ...empPermissions, can_sales: Boolean(v) })}
                  />
                  <Label htmlFor="p_sales" className="text-[11px] cursor-pointer">{lang === "bn" ? "বিক্রয় / POS বিলিং" : "Sales & POS"}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="p_cust"
                    checked={empPermissions.can_customers}
                    onCheckedChange={v => setEmpPermissions({ ...empPermissions, can_customers: Boolean(v) })}
                  />
                  <Label htmlFor="p_cust" className="text-[11px] cursor-pointer">{lang === "bn" ? "কাস্টমার ও বাকি আদায়" : "Customers & Dues"}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="p_returns"
                    checked={empPermissions.can_returns}
                    onCheckedChange={v => setEmpPermissions({ ...empPermissions, can_returns: Boolean(v) })}
                  />
                  <Label htmlFor="p_returns" className="text-[11px] cursor-pointer">{lang === "bn" ? "পণ্য পরিবর্তন / এক্সচেঞ্জ" : "Returns & Exchange"}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="p_prod"
                    checked={empPermissions.can_products}
                    onCheckedChange={v => setEmpPermissions({ ...empPermissions, can_products: Boolean(v) })}
                  />
                  <Label htmlFor="p_prod" className="text-[11px] cursor-pointer">{lang === "bn" ? "পণ্য যোগ ও সম্পাদনা" : "Product Management"}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="p_exp"
                    checked={empPermissions.can_expenses}
                    onCheckedChange={v => setEmpPermissions({ ...empPermissions, can_expenses: Boolean(v) })}
                  />
                  <Label htmlFor="p_exp" className="text-[11px] cursor-pointer">{lang === "bn" ? "দোকান খরচ এন্ট্রি" : "Add Expenses"}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="p_rep"
                    checked={empPermissions.can_reports}
                    onCheckedChange={v => setEmpPermissions({ ...empPermissions, can_reports: Boolean(v) })}
                  />
                  <Label htmlFor="p_rep" className="text-[11px] cursor-pointer">{lang === "bn" ? "রিপোর্ট ও লাভ দেখা" : "View Reports"}</Label>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddEmpOpen(false)} className="rounded-xl text-xs">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy} size="sm" className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                {busy ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                <span>{editingEmp ? (lang === "bn" ? "আপডেট করুন" : "Save Changes") : (lang === "bn" ? "যোগ করুন" : "Add Staff")}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────── Modal 2: Pay Salary ──────────────── */}
      <Dialog open={addSalaryOpen} onOpenChange={setAddSalaryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-charukola flex items-center gap-2">
              <DollarSign className="size-4 text-emerald-600" />
              {lang === "bn" ? "কর্মচারী বেতন প্রদান" : "Pay Employee Salary"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSalary} className="space-y-3 font-balooda">
            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "কর্মচারী নির্বাচন *" : "Select Employee *"}</Label>
              <Select value={salEmpId} onValueChange={v => {
                setSalEmpId(v);
                const stats = getEmployeeSalaryStats(v, salMonth, deductShoppings);
                setSalAmount(String(stats.remaining));
              }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={lang === "bn" ? "কর্মচারী বাছাই করুন" : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.base_salary ? `(মূল বেতন: ৳${fmtMoney(e.base_salary)})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Early Money & Remaining Salary Balance Display */}
            {selectedSalaryEmpCalc && selectedSalaryEmpCalc.baseSal > 0 && (
              <div className="space-y-2">
                {selectedSalaryEmpCalc.earlyMoney > 0 && (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {lang === "bn" ? "পূর্বে গৃহীত অগ্রিম / উত্তোলিত টাকা" : "Early Money / Advance Taken"}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/30 font-bold">
                        −৳{fmtMoney(selectedSalaryEmpCalc.earlyMoney)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {lang === "bn"
                        ? `এই কর্মচারীর চলতি মাসে ইতিমধ্যে ৳${fmtMoney(selectedSalaryEmpCalc.earlyMoney)} অগ্রিম টাকা উত্তোলন করা হয়েছে।`
                        : `Employee has already drawn ৳${fmtMoney(selectedSalaryEmpCalc.earlyMoney)} early/advance money this month.`}
                    </p>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex justify-between items-center font-semibold">
                  <span className="text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-emerald-600" />
                    {lang === "bn" ? "অবশিষ্ট বেতন ব্যালেন্স:" : "Remaining Salary Balance:"}
                  </span>
                  <span className="text-sm font-bold font-charukola text-emerald-700 dark:text-emerald-300 font-serif">
                    ৳{fmtMoney(selectedSalaryEmpCalc.remaining)}
                  </span>
                </div>
              </div>
            )}

            {shoppingDeductionTotal > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <Shirt className="size-3.5" />
                    {lang === "bn" ? "পোশাক/পণ্য কেনাকাটা কর্তন" : "Shopping Deduction"}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30">
                    −৳{fmtMoney(shoppingDeductionTotal)}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {lang === "bn"
                    ? `কর্মচারীর বকেয়া কেনাকাটা (${pendingShoppingsForSal.length}টি চালান) বেতন থেকে কর্তন করা হচ্ছে।`
                    : `Employee has ${pendingShoppingsForSal.length} shopping orders pending deduction.`}
                </p>
                <div className="flex items-center space-x-2 pt-0.5">
                  <Checkbox
                    id="deduct_shop"
                    checked={deductShoppings}
                    onCheckedChange={(checked) => {
                      const isChecked = Boolean(checked);
                      setDeductShoppings(isChecked);
                      if (salEmpId) {
                        const stats = getEmployeeSalaryStats(salEmpId, salMonth, isChecked);
                        setSalAmount(String(stats.remaining));
                      }
                    }}
                  />
                  <Label htmlFor="deduct_shop" className="text-[11px] font-semibold cursor-pointer">
                    {lang === "bn" ? "এই কেনাকাটা বিল বেতন থেকে কর্তন করুন" : "Deduct shopping from salary"}
                  </Label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "মাসের নাম" : "Month"}</Label>
                <Input
                  type="month"
                  value={salMonth}
                  onChange={e => {
                    const m = e.target.value;
                    setSalMonth(m);
                    if (salEmpId) {
                      const stats = getEmployeeSalaryStats(salEmpId, m, deductShoppings);
                      setSalAmount(String(stats.remaining));
                    }
                  }}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{lang === "bn" ? "প্রদেয় বেতন (৳) *" : "Net Payable (৳) *"}</Label>
                  {shoppingDeductionTotal > 0 && deductShoppings && (
                    <span className="text-[9px] text-amber-600 font-bold">{lang === "bn" ? "কর্তন সমন্বিত" : "Adjusted"}</span>
                  )}
                </div>
                <Input
                  type="number"
                  required
                  placeholder="0.00"
                  value={salAmount}
                  onChange={e => setSalAmount(e.target.value)}
                  className="h-8.5 text-xs font-bold font-charukola text-emerald-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "পরিশোধের মাধ্যম" : "Payment Method"}</Label>
              <Select value={salMethod} onValueChange={setSalMethod}>
                <SelectTrigger className="h-8.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{lang === "bn" ? "💵 ক্যাশ / নগদ (ক্যাশ ডেক থেকে কর্তন)" : "💵 Cash (Deducts from Cashbox)"}</SelectItem>
                  <SelectItem value="bkash">{lang === "bn" ? "📱 বিকাশ (bKash)" : "📱 bKash"}</SelectItem>
                  <SelectItem value="bank">{lang === "bn" ? "🏦 ব্যাংক ট্রান্সফার" : "🏦 Bank Transfer"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "বিবরণ / নোট" : "Note (Optional)"}</Label>
              <Input
                placeholder={lang === "bn" ? "যেমন: পুরো বেতন বা অগ্রিম..." : "e.g. Full salary..."}
                value={salNote}
                onChange={e => setSalNote(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddSalaryOpen(false)} className="rounded-xl text-xs">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy} size="sm" className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                {busy ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                <span>{lang === "bn" ? "পরিশোধ রেকর্ড করুন" : "Record Payment"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────── Modal 3: Employee Expense ──────────────── */}
      <Dialog open={addExpOpen} onOpenChange={setAddExpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-charukola flex items-center gap-2">
              <Receipt className="size-4 text-orange-600" />
              {lang === "bn" ? "কর্মচারী দৈনিক খরচ ও ভাতা" : "Employee Daily Expense"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveExpense} className="space-y-3 font-balooda">
            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "কর্মচারী" : "Employee"}</Label>
              <Select value={expEmpId} onValueChange={setExpEmpId}>
                <SelectTrigger className="h-8.5 text-xs">
                  <SelectValue placeholder={lang === "bn" ? "কর্মচারী বাছাই করুন" : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "খরচের ধরন" : "Category"}</Label>
                <Select value={expCat} onValueChange={setExpCat}>
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">{lang === "bn" ? "💵 অগ্রিম টাকা (Early Money)" : "💵 Early Money / Advance"}</SelectItem>
                    <SelectItem value="food">{lang === "bn" ? "খাবার / লাঞ্চ" : "Food / Lunch"}</SelectItem>
                    <SelectItem value="travel">{lang === "bn" ? "যাতায়াত / ভাড়া" : "Travel"}</SelectItem>
                    <SelectItem value="tea">{lang === "bn" ? "নাস্তা / চা" : "Tea / Snacks"}</SelectItem>
                    <SelectItem value="bonus">{lang === "bn" ? "টিপস / বোনাস" : "Bonus / Tip"}</SelectItem>
                    <SelectItem value="other">{lang === "bn" ? "অন্যান্য" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "টাকার পরিমাণ (৳) *" : "Amount (৳) *"}</Label>
                <Input
                  type="number"
                  required
                  placeholder="0.00"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  className="h-8.5 text-xs font-bold font-charukola text-orange-600"
                />
              </div>
            </div>

            {/* Remaining Salary Balance display when employee is selected */}
            {selectedExpEmpCalc && selectedExpEmpCalc.baseSal > 0 && (
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-border text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{lang === "bn" ? "কর্মচারীর মূল মাসিক বেতন:" : "Monthly Base Salary:"}</span>
                  <span className="font-semibold font-serif">৳{fmtMoney(selectedExpEmpCalc.baseSal)}</span>
                </div>
                {selectedExpEmpCalc.earlyMoney > 0 && (
                  <div className="flex justify-between items-center text-purple-600 dark:text-purple-400 text-[11px]">
                    <span>{lang === "bn" ? "চলতি মাসে ইতিমধ্যে উত্তোলিত অগ্রিম:" : "Already Taken Early Money:"}</span>
                    <span className="font-semibold font-serif">−৳{fmtMoney(selectedExpEmpCalc.earlyMoney)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold border-t border-border/50 pt-1">
                  <span className="flex items-center gap-1">
                    <Wallet className="size-3 text-emerald-600" />
                    {lang === "bn" ? "বর্তমান অবশিষ্ট বেতন:" : "Current Remaining Salary:"}
                  </span>
                  <span className="font-serif text-sm">৳{fmtMoney(selectedExpEmpCalc.remaining)}</span>
                </div>
                {Number(expAmount) > 0 && expCat === "advance" && (
                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 text-[11px] font-semibold pt-1 border-t border-dashed border-border/50">
                    <span>{lang === "bn" ? "এই অগ্রিমের পর অবশিষ্ট বেতন থাকবে:" : "After This Advance Remaining:"}</span>
                    <span className="font-serif font-bold">
                      ৳{fmtMoney(Math.max(0, selectedExpEmpCalc.remaining - (Number(expAmount) || 0)))}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "বিবরণ / নোট" : "Note"}</Label>
              <Input
                placeholder={lang === "bn" ? "খরচের বিবরণ..." : "Note..."}
                value={expNote}
                onChange={e => setExpNote(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddExpOpen(false)} className="rounded-xl text-xs">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy} size="sm" className="rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white">
                {busy ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                <span>{lang === "bn" ? "খরচ সংরক্ষণ" : "Save Expense"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────── Modal 3.5: Give Bonus (Owner Bonus to Employee) ──────────────── */}
      <Dialog open={addBonusOpen} onOpenChange={setAddBonusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-charukola flex items-center gap-2 text-amber-600">
              <span>🎁</span>
              {lang === "bn" ? "কর্মচারীকে বোনাস প্রদান করুন" : "Give Bonus to Employee"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveBonus} className="space-y-3 font-balooda">
            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "কর্মচারী নির্বাচন *" : "Select Employee *"}</Label>
              <Select value={bonusEmpId} onValueChange={setBonusEmpId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={lang === "bn" ? "কর্মচারী বাছাই করুন" : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300">
              {lang === "bn"
                ? "💡 বোনাস কর্মচারীর মূল বেতন বা অবশিষ্ট বেতন থেকে কাটা হবে না।"
                : "💡 Bonus is an extra reward and will NOT reduce the employee's remaining salary."}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "তারিখ" : "Date"}</Label>
                <Input
                  type="date"
                  value={bonusDate}
                  onChange={e => setBonusDate(e.target.value)}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "বোনাসের পরিমাণ (৳) *" : "Bonus Amount (৳) *"}</Label>
                <Input
                  type="number"
                  required
                  placeholder="0.00"
                  value={bonusAmount}
                  onChange={e => setBonusAmount(e.target.value)}
                  className="h-8.5 text-xs font-bold font-charukola text-amber-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "পরিশোধের মাধ্যম" : "Payment Method"}</Label>
              <Select value={bonusMethod} onValueChange={setBonusMethod}>
                <SelectTrigger className="h-8.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{lang === "bn" ? "💵 ক্যাশ / নগদ (ক্যাশবক্স থেকে)" : "💵 Cash (From Cashbox)"}</SelectItem>
                  <SelectItem value="bkash">{lang === "bn" ? "📱 বিকাশ (bKash)" : "📱 bKash"}</SelectItem>
                  <SelectItem value="bank">{lang === "bn" ? "🏦 ব্যাংক ট্রান্সফার" : "🏦 Bank Transfer"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "বোনাসের উপলক্ষ / নোট" : "Bonus Reason / Note"}</Label>
              <Input
                placeholder={lang === "bn" ? "যেমন: ঈদ বোনাস, ভালো কাজের পুরস্কার..." : "e.g. Eid Bonus, Sales Target Bonus..."}
                value={bonusNote}
                onChange={e => setBonusNote(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddBonusOpen(false)} className="rounded-xl text-xs">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy} size="sm" className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                {busy ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                <span>🎁 {lang === "bn" ? "বোনাস প্রদান করুন" : "Give Bonus"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────── Modal 4: Employee Shopping / Clothing Draw ──────────────── */}
      <Dialog open={addShopOpen} onOpenChange={setAddShopOpen}>
        <DialogContent className="w-[calc(100vw-20px)] sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-charukola flex items-center gap-2 text-base sm:text-lg">
              <Shirt className="size-4 text-pink-600" />
              {lang === "bn" ? "কর্মচারী পোশাক / পণ্য কেনাকাটা" : "Employee Clothing & Shopping Draw"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveShopping} className="space-y-3 font-balooda">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "কর্মচারী *" : "Employee *"}</Label>
                <Select value={shopEmpId} onValueChange={setShopEmpId}>
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue placeholder={lang === "bn" ? "কর্মচারী বাছাই করুন" : "Select employee"} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{lang === "bn" ? "হিসাবের ধরন" : "Payment Status"}</Label>
                <Select value={shopStatus} onValueChange={v => setShopStatus(v as any)}>
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deduct_from_salary">{lang === "bn" ? "বেতন থেকে কর্তন" : "Deduct from Salary"}</SelectItem>
                    <SelectItem value="paid_cash">{lang === "bn" ? "নগদ পরিশোধ" : "Paid in Cash"}</SelectItem>
                    <SelectItem value="gift">{lang === "bn" ? "উপহার / ফ্রি বোনাস" : "Gift / Free Bonus"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Picker */}
            <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-700 dark:text-pink-300">
                  {lang === "bn" ? "দোকান থেকে নেওয়া পণ্য বাছাই করুন" : "Select Products from Store"}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {shopItems.length} {lang === "bn" ? "টি পণ্য" : "items"}
                </span>
              </div>

              <Input
                placeholder={lang === "bn" ? "পণ্য সার্চ করুন..." : "Search products..."}
                value={shopProdSearch}
                onChange={e => setShopProdSearch(e.target.value)}
                className="h-8 text-xs bg-card"
              />

              {shopProdSearch.trim() && (
                <div className="max-h-36 overflow-y-auto divide-y divide-border bg-card border rounded-lg shadow-xs">
                  {products
                    .filter(p => p.name.toLowerCase().includes(shopProdSearch.toLowerCase()) || (p.code && p.code.toLowerCase().includes(shopProdSearch.toLowerCase())))
                    .slice(0, 6)
                    .map(p => (
                      <div
                        key={p.id}
                        className="p-2 flex items-center justify-between hover:bg-muted/60 cursor-pointer text-xs"
                        onClick={() => {
                          const existingIdx = shopItems.findIndex(i => i.product_id === p.id);
                          let newItems = [...shopItems];
                          if (existingIdx >= 0) {
                            const item = newItems[existingIdx];
                            const newQty = item.qty + 1;
                            newItems[existingIdx] = {
                              ...item,
                              qty: newQty,
                              total: Math.max(0, (item.unit_price - item.discount) * newQty),
                            };
                          } else {
                            const price = Number(p.sell_price) || 0;
                            newItems.push({
                              product_id: p.id,
                              product_name: p.name,
                              qty: 1,
                              regular_price: price,
                              unit_price: price,
                              discount: 0,
                              total: price,
                            });
                          }
                          setShopItems(newItems);
                          setShopProdSearch("");
                        }}
                      >
                        <div>
                          <span className="font-semibold">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">(স্টক: {p.stock})</span>
                        </div>
                        <span className="font-bold text-emerald-600 font-mono">৳{p.sell_price}</span>
                      </div>
                    ))}
                </div>
              )}

              {/* Chosen Items with Editable Sell Price and Discount */}
              {shopItems.length > 0 && (
                <div className="space-y-2 pt-1 max-h-56 overflow-y-auto pr-1">
                  {shopItems.map((item, idx) => (
                    <div key={idx} className="p-2 sm:p-2.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-foreground truncate">{item.product_name}</span>
                            {item.regular_price > 0 && item.regular_price !== item.unit_price && (
                              <span className="text-[10px] text-muted-foreground line-through">
                                MRP: ৳{item.regular_price}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShopItems(shopItems.filter((_, i) => i !== idx))}
                          className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                          title={lang === "bn" ? "আইটেম মুছুন" : "Remove item"}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-12 gap-1.5 sm:gap-2 items-center text-xs">
                        {/* Sell Price (বিক্রয় মূল্য) */}
                        <div className="col-span-4 space-y-0.5">
                          <label className="text-[10px] font-semibold text-muted-foreground block truncate">
                            {lang === "bn" ? "বিক্রয় মূল্য (৳)" : "Sell Price (৳)"}
                          </label>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={item.unit_price}
                            onChange={e => updateItemUnitPrice(idx, e.target.value)}
                            className="h-7 text-xs font-mono font-bold bg-background px-2"
                          />
                        </div>

                        {/* Discount (ছাড়) */}
                        <div className="col-span-3 space-y-0.5">
                          <label className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block truncate">
                            {lang === "bn" ? "ছাড় (৳)" : "Disc (৳)"}
                          </label>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0"
                            value={item.discount || ""}
                            onChange={e => updateItemDiscount(idx, e.target.value)}
                            className="h-7 text-xs font-mono text-rose-600 dark:text-rose-400 font-bold bg-background px-2"
                          />
                        </div>

                        {/* Qty (পরিমাণ) */}
                        <div className="col-span-3 space-y-0.5">
                          <label className="text-[10px] font-semibold text-muted-foreground block truncate">
                            {lang === "bn" ? "পরিমাণ" : "Qty"}
                          </label>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => updateItemQty(idx, Math.max(1, item.qty - 1))}
                              className="size-7 flex items-center justify-center rounded-l-md border border-r-0 bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-bold select-none cursor-pointer"
                            >
                              −
                            </button>
                            <Input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={e => updateItemQty(idx, parseInt(e.target.value) || 1)}
                              className="h-7 rounded-none text-center font-mono font-bold text-xs p-0 border-x-0 bg-background w-8 shrink-0"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQty(idx, item.qty + 1)}
                              className="size-7 flex items-center justify-center rounded-r-md border border-l-0 bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-bold select-none cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Line Total */}
                        <div className="col-span-2 text-right space-y-0.5">
                          <span className="text-[10px] text-muted-foreground block">
                            {lang === "bn" ? "মোট" : "Total"}
                          </span>
                          <span className="font-bold font-mono text-xs text-foreground block pt-0.5">
                            ৳{item.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Shopping Bill Summary */}
              {shopItems.length > 0 && (
                <div className="border border-border/80 rounded-xl p-3 bg-muted/20 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{lang === "bn" ? "উপমোট (বিক্রয় মূল্য):" : "Subtotal (Sell Price):"}</span>
                    <span className="font-mono font-medium">৳{shopRawSubtotal}</span>
                  </div>

                  {shopItemDiscounts > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                      <span>{lang === "bn" ? "আইটেম ডিসকাউন্ট ছাড়:" : "Item Discounts:"}</span>
                      <span className="font-mono font-semibold">−৳{shopItemDiscounts}</span>
                    </div>
                  )}

                  {/* Overall Cart / Final Discount Input */}
                  <div className="flex items-center justify-between gap-2 py-1.5 border-y border-border/60">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Sparkles className="size-3.5 text-amber-500" />
                      <span>{lang === "bn" ? "অতিরিক্ত সার্বিক ছাড়:" : "Extra Cart Discount:"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-rose-500 font-bold">−৳</span>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={shopOverallDiscount}
                        onChange={e => setShopOverallDiscount(e.target.value)}
                        className="h-7 w-24 text-right text-xs font-bold font-mono bg-background border-border/80 text-rose-600 dark:text-rose-400 rounded-lg"
                      />
                    </div>
                  </div>

                  {shopTotalDiscountAll > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                      <span>{lang === "bn" ? "সর্বমোট ছাড় কর্তন:" : "Total Discount Deducted:"}</span>
                      <span className="font-mono">−৳{shopTotalDiscountAll}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 border-t border-border/80 font-bold">
                    <span className="text-xs sm:text-sm">{lang === "bn" ? "সর্বমোট প্রদেয় বিল:" : "Net Payable Total:"}</span>
                    <span className="text-base sm:text-lg text-pink-600 font-charukola">
                      ৳{fmtMoney(shopFinalNetTotal)}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-pink-600 dark:text-pink-400">
                {lang === "bn"
                  ? "✓ এই পোশাকের স্টক স্বয়ংক্রিয়ভাবে ইনভেন্টরি থেকে কেটে নেওয়া হবে।"
                  : "✓ Product stock will automatically be deducted from inventory."}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "নোট (ঐচ্ছিক)" : "Note"}</Label>
              <Input
                placeholder={lang === "bn" ? "যেমন: ঈদের কেনাকাটা..." : "e.g. Eid shopping..."}
                value={shopNote}
                onChange={e => setShopNote(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddShopOpen(false)} className="rounded-xl text-xs">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy} size="sm" className="rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white cursor-pointer">
                {busy ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                <span>{lang === "bn" ? "রেকর্ড সম্পন্ন করুন" : "Save Draw"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────── Modal 5: Thermal Print Voucher Slip ──────────────── */}
      <Dialog open={!!printSlipItem} onOpenChange={open => !open && setPrintSlipItem(null)}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader>
            <DialogTitle className="font-charukola flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm">
                <Printer className="size-4 text-pink-600" />
                {lang === "bn" ? "কর্মচারী কেনাকাটা রসিদ" : "Employee Shopping Slip"}
              </span>
            </DialogTitle>
          </DialogHeader>

          {printSlipItem && (
            <div className="space-y-3 font-balooda">
              <div id="thermal-employee-receipt" className="p-4 bg-background rounded-xl border border-dashed text-xs space-y-2.5 font-mono shadow-inner">
                <div className="text-center border-b pb-2 space-y-0.5">
                  <h3 className="font-bold text-sm uppercase tracking-wide">{user?.business_name || "Dream Fashion"}</h3>
                  <p className="text-[10px] text-muted-foreground">{lang === "bn" ? "পোশাক ও পণ্য ড্র ভাউচার" : "Staff Clothing Voucher"}</p>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "bn" ? "কর্মচারী:" : "Employee:"}</span>
                    <span className="font-bold">{printSlipItem.employee_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "bn" ? "তারিখ:" : "Date:"}</span>
                    <span>{printSlipItem.date || printSlipItem.created_at?.slice(0, 10)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "bn" ? "পরিশোধ পদ্ধতি:" : "Payment:"}</span>
                    <span className="font-bold text-pink-600">
                      {printSlipItem.payment_status === "paid_cash"
                        ? (lang === "bn" ? "নগদ পরিশোধ" : "Paid Cash")
                        : printSlipItem.payment_status === "gift"
                        ? (lang === "bn" ? "উপহার / ফ্রি" : "Gift")
                        : (lang === "bn" ? "বেতন থেকে কর্তন" : "Salary Deduction")}
                    </span>
                  </div>
                </div>

                <div className="border-t border-b py-2 space-y-1.5">
                  <div className="flex justify-between font-bold text-[10px] text-muted-foreground uppercase">
                    <span>{lang === "bn" ? "আইটেম" : "Item"}</span>
                    <span>{lang === "bn" ? "মূল্য" : "Total"}</span>
                  </div>
                  {printSlipItem.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] gap-2">
                      <div className="truncate max-w-[190px]">
                        <div>{it.product_name} x{it.qty}</div>
                        <div className="text-[9px] text-muted-foreground">
                          @৳{it.unit_price}
                          {it.discount && it.discount > 0 ? ` (-৳${it.discount} ছাড়)` : ""}
                        </div>
                      </div>
                      <span className="font-bold shrink-0">৳{it.total}</span>
                    </div>
                  ))}
                </div>

                {printSlipItem.discount && printSlipItem.discount > 0 ? (
                  <div className="space-y-1 pt-1 text-[11px]">
                    {printSlipItem.subtotal && printSlipItem.subtotal !== printSlipItem.total_amount && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>{lang === "bn" ? "উপমোট:" : "Subtotal:"}</span>
                        <span>৳{printSlipItem.subtotal}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>{lang === "bn" ? "মোট ছাড়:" : "Total Discount:"}</span>
                      <span>−৳{printSlipItem.discount}</span>
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-between font-bold text-sm pt-1 border-t">
                  <span>{lang === "bn" ? "সর্বমোট:" : "Grand Total:"}</span>
                  <span className="text-pink-600 font-charukola">{fmtMoney(printSlipItem.total_amount)}</span>
                </div>

                {printSlipItem.note && (
                  <p className="text-[10px] text-muted-foreground pt-1 border-t italic">
                    {lang === "bn" ? "নোট:" : "Note:"} {printSlipItem.note}
                  </p>
                )}

                <div className="text-center pt-3 text-[9px] text-muted-foreground">
                  {lang === "bn" ? "*** ধন্যবাদ ***" : "*** Thank You ***"}
                </div>
              </div>

              <DialogFooter className="gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPrintSlipItem(null)}
                  className="rounded-xl text-xs flex-1"
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const printContent = document.getElementById("thermal-employee-receipt");
                    if (!printContent) return;
                    const win = window.open("", "", "width=400,height=600");
                    if (win) {
                      win.document.write(`
                        <html>
                          <head>
                            <title>Employee Voucher - ${printSlipItem.employee_name}</title>
                            <style>
                              body { font-family: monospace; padding: 20px; font-size: 12px; }
                              .text-center { text-align: center; }
                              .flex { display: flex; justify-content: space-between; }
                              .border-b { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                              .border-t { border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; }
                              .bold { font-weight: bold; }
                            </style>
                          </head>
                          <body>
                            ${printContent.innerHTML}
                          </body>
                        </html>
                      `);
                      win.document.close();
                      win.focus();
                      win.print();
                      win.close();
                    }
                  }}
                  className="rounded-xl text-xs font-bold bg-primary text-primary-foreground flex-1 cursor-pointer"
                >
                  <Printer className="size-3.5 mr-1" />
                  <span>{lang === "bn" ? "প্রিন্ট করুন" : "Print Voucher"}</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
