"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Send, Users, Truck, Sparkles, RefreshCw,
  Settings, CheckCircle2, AlertCircle, Clock, ShieldCheck,
  Eye, EyeOff, Plus, Trash2, Search, Smartphone, Info,
  Check, ArrowRight, ExternalLink, HelpCircle, FileText,
  BadgePercent, UserCheck, PhoneCall, Copy, MessageCircle,
  Radio, BatteryCharging, BatteryMedium, Cpu, QrCode, Download,
  Power, SignalHigh, CheckCircle, Wifi, Laptop
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { getParties, getCustomers, getSales } from "@/lib/queries";
import {
  getSmsSettingsFn,
  updateSmsSettingsFn,
  checkSmsBalanceFn,
  sendSmsCampaignFn,
  getSmsLogsFn,
  checkSmsDeliveryStatusFn,
  deleteSmsLogFn,
  getSmsGatewayStatusFn,
  generateSmsGatewayCodeFn,
  updateSmsGatewaySettingsFn,
  unpairSmsGatewayDeviceFn,
  sendTestGatewaySmsFn,
  getGatewayQueueLogsFn,
} from "@/lib/rpc";
import { calculateSmsParts, sanitizeBdPhoneNumber } from "@/lib/mimsms";

function SmsCharacterCounter({
  message,
  maxLength = 1000,
}: {
  message: string;
  maxLength?: number;
}) {
  const parts = useMemo(() => calculateSmsParts(message), [message]);
  const chars = message.length;
  const left = Math.max(0, maxLength - chars);
  const charLimitPerSms = parts.isUnicode ? (parts.parts > 1 ? 67 : 70) : (parts.parts > 1 ? 153 : 160);
  const smsCount = chars === 0 ? 0 : parts.parts;

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 py-1 px-0.5 text-xs text-muted-foreground font-mono">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="outline"
          className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
            parts.isUnicode
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          }`}
        >
          {parts.isUnicode ? "Unicode (বাংলা)" : "GSM (English)"}
        </Badge>
        <span className="font-semibold text-foreground">
          {chars} Characters | {left} Characters Left | {smsCount} SMS ({charLimitPerSms} Char./SMS)
        </span>
      </div>
      {chars >= maxLength && (
        <span className="text-[11px] text-destructive font-semibold">
          (সর্বোচ্চ সীমা ১০০০ ক্যারেক্টার)
        </span>
      )}
    </div>
  );
}

export default function SmsPage() {
  const { lang, t } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("direct");
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{ count: number; price: number; nameBn: string; nameEn: string; rate: string }>({
    count: 500,
    price: 225,
    nameBn: "জনপ্রিয় প্যাক",
    nameEn: "Popular Pack",
    rate: "৳0.45/SMS",
  });

  // Queries
  const { data: smsSettings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ["sms-settings"],
    queryFn: () => getSmsSettingsFn(),
  });

  const { data: smsLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["sms-logs"],
    queryFn: () => getSmsLogsFn(),
  });

  const {
    data: gatewayStatus,
    isLoading: gatewayLoading,
    refetch: refetchGateway,
  } = useQuery({
    queryKey: ["sms-gateway-status"],
    queryFn: () => getSmsGatewayStatusFn(),
    refetchInterval: 5000,
  });

  const {
    data: gatewayQueue = [],
    refetch: refetchGatewayQueue,
  } = useQuery({
    queryKey: ["sms-gateway-queue"],
    queryFn: () => getGatewayQueueLogsFn(),
    refetchInterval: 6000,
  });

  const { data: rawCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => getCustomers(),
  });
  const customers = rawCustomers.filter((c: any) => c.type !== "supplier" && !c.is_supplier);

  const { data: rawParties = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: () => getParties(),
  });
  const parties = rawParties.filter((p: any) => p.type !== "customer" && !p.is_customer);

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => getSales(),
  });

  // Balance State
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [ipBlocked, setIpBlocked] = useState(false);

  const fetchBalance = async (showToast = true) => {
    try {
      setBalanceLoading(true);
      const res: any = await checkSmsBalanceFn();
      
      const balVal =
        res?.balance ??
        res?.Balance ??
        res?.smsCount ??
        res?.SmsCount ??
        res?.data?.balance ??
        res?.data?.Balance ??
        (res?.status === "Success" && typeof res?.responseResult === "number" ? res.responseResult : null);

      if (balVal !== undefined && balVal !== null && !res?.isIpBlocked) {
        setBalance(String(balVal));
        setIpBlocked(false);
        if (showToast) {
          toast.success(lang === "bn" ? `বর্তমান ব্যালেন্স: ${balVal} টি এসএমএস` : `Current balance: ${balVal} SMS`);
        }
      } else if ((res?.status === "Success" || res?.statusCode === "200") && !res?.isIpBlocked) {
        const b = String(res?.balance || res?.Balance || "0");
        setBalance(b);
        setIpBlocked(false);
        if (showToast) {
          toast.success(lang === "bn" ? `বর্তমান ব্যালেন্স: ${b} টি এসএমএস` : `Current balance: ${b} SMS`);
        }
      } else {
        const respStr = String(res?.responseResult || res?.ResponseResult || res?.message || res?.error || "");
        if (res?.isIpBlocked || respStr.toLowerCase().includes("black") || respStr.toLowerCase().includes("ip")) {
          setIpBlocked(true);
          if (showToast) {
            toast.error(
              lang === "bn"
                ? "MiMSMS সতর্কতা: আপনার সার্ভার/ডিভাইস IP অনুমোদিত নয় (IP Blacklist)। sms.mimsms.com-এ গিয়ে IP Whitelist চেক করুন।"
                : "MiMSMS Warning: Server/Device IP is blocked or not in MiMSMS IP Whitelist."
            );
          }
        } else {
          if (showToast) {
            toast.error(respStr || (lang === "bn" ? "ব্যালেন্স আনা সম্ভব হয়নি" : "Failed to fetch balance"));
          }
        }
      }
    } catch (err: any) {
      console.warn("fetchBalance error:", err);
      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("black") || msg.toLowerCase().includes("ip")) {
        setIpBlocked(true);
      }
      if (showToast) {
        toast.error(err?.message || (lang === "bn" ? "ব্যালেন্স আনা সম্ভব হয়নি" : "Failed to fetch balance"));
      }
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (smsSettings?.apiKey && smsSettings?.userName) {
      fetchBalance(false);
    }
  }, [smsSettings?.apiKey, smsSettings?.userName]);

  // Direct SMS state
  const [directNumbers, setDirectNumbers] = useState("");
  const [directMessage, setDirectMessage] = useState("");
  const [directTxType, setDirectTxType] = useState<"T" | "P">("T");
  const [directSending, setDirectSending] = useState(false);

  // Customer SMS state
  const [custTargetMode, setCustTargetMode] = useState<"all" | "selected" | "dues">("all");
  const [custSearch, setCustSearch] = useState("");
  const [selectedCustIds, setSelectedCustIds] = useState<string[]>([]);
  const [custCampaignTitle, setCustCampaignTitle] = useState("");
  const [custMessage, setCustMessage] = useState("");
  const [custPersonalized, setCustPersonalized] = useState(true);
  const [custTxType, setCustTxType] = useState<"T" | "P">("P");
  const [custSending, setCustSending] = useState(false);

  // Supplier SMS state
  const [suppTargetMode, setSuppTargetMode] = useState<"all" | "selected">("all");
  const [suppSearch, setSuppSearch] = useState("");
  const [selectedSuppIds, setSelectedSuppIds] = useState<string[]>([]);
  const [suppCampaignTitle, setSuppCampaignTitle] = useState("");
  const [suppMessage, setSuppMessage] = useState("");
  const [suppPersonalized, setSuppPersonalized] = useState(true);
  const [suppSending, setSuppSending] = useState(false);

  // Auto Purchase SMS state
  const [autoSmsEnabled, setAutoSmsEnabled] = useState(false);
  const [autoSmsTemplate, setAutoSmsTemplate] = useState("");
  const [autoTestNumber, setAutoTestNumber] = useState("");
  const [autoTestSending, setAutoTestSending] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  // Settings tab state
  const [apiKey, setApiKey] = useState("");
  const [userName, setUserName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [defaultTxType, setDefaultTxType] = useState<"T" | "P">("T");
  const [showApiKey, setShowApiKey] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Sync settings into local inputs
  useEffect(() => {
    if (smsSettings) {
      setApiKey(smsSettings.apiKey || "");
      setUserName(smsSettings.userName || "");
      setSenderName(smsSettings.senderName || "");
      setDefaultTxType((smsSettings.defaultTransactionType as "T" | "P") || "T");
      setAutoSmsEnabled(Boolean(smsSettings.customer_sms_after_purchase));
      setAutoSmsTemplate(smsSettings.purchase_sms_template || "");
    }
  }, [smsSettings]);

  // Gateway tab state & actions
  const [gatewayMode, setGatewayMode] = useState<"phone" | "mimsms" | "hybrid">("hybrid");
  const [preferredSim, setPreferredSim] = useState<number>(0);
  const [sendDelaySec, setSendDelaySec] = useState<number>(2);
  const [gatewaySettingsSaving, setGatewaySettingsSaving] = useState(false);
  const [codeGenerating, setCodeGenerating] = useState(false);
  const [unpairing, setUnpairing] = useState(false);
  const [gatewayTestNumber, setGatewayTestNumber] = useState("");
  const [gatewayTestMessage, setGatewayTestMessage] = useState("");
  const [gatewayTestSending, setGatewayTestSending] = useState(false);

  useEffect(() => {
    if (gatewayStatus?.settings) {
      setGatewayMode(gatewayStatus.settings.gatewayMode || "hybrid");
      setPreferredSim(gatewayStatus.settings.preferredSim ?? 0);
      setSendDelaySec(gatewayStatus.settings.sendDelaySec ?? 2);
    }
  }, [gatewayStatus]);

  const handleGeneratePairingCode = async () => {
    try {
      setCodeGenerating(true);
      await generateSmsGatewayCodeFn();
      toast.success(lang === "bn" ? "নতুন ৬-ডিজিট কোড তৈরি হয়েছে" : "Generated new 6-digit pairing code");
      refetchGateway();
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate pairing code");
    } finally {
      setCodeGenerating(false);
    }
  };

  const handleSaveGatewaySettings = async () => {
    try {
      setGatewaySettingsSaving(true);
      await updateSmsGatewaySettingsFn({
        data: {
          gatewayMode,
          preferredSim,
          sendDelaySec,
        },
      });
      toast.success(lang === "bn" ? "গেটওয়ে সেটিংস সংরক্ষণ হয়েছে" : "Gateway settings updated successfully");
      refetchGateway();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save gateway settings");
    } finally {
      setGatewaySettingsSaving(false);
    }
  };

  const handleUnpairGateway = async () => {
    if (!confirm(lang === "bn" ? "আপনি কি এই ফোন সংযোগ বিচ্ছিন্ন করতে চান?" : "Are you sure you want to disconnect this device?")) {
      return;
    }
    try {
      setUnpairing(true);
      await unpairSmsGatewayDeviceFn();
      toast.success(lang === "bn" ? "ডিভাইস সংযোগ বিচ্ছিন্ন করা হয়েছে" : "Device unpaired successfully");
      refetchGateway();
    } catch (err: any) {
      toast.error(err?.message || "Failed to unpair device");
    } finally {
      setUnpairing(false);
    }
  };

  const handleSendGatewayTest = async () => {
    const sanitized = sanitizeBdPhoneNumber(gatewayTestNumber);
    if (!sanitized) {
      toast.error(lang === "bn" ? "সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন" : "Enter a valid 11-digit mobile number");
      return;
    }

    try {
      setGatewayTestSending(true);
      const res = await sendTestGatewaySmsFn({
        data: {
          mobileNumber: sanitized,
          message: gatewayTestMessage || undefined,
        },
      });
      toast.success(res?.summary || (lang === "bn" ? "টেস্ট এসএমএস ফোনে পাঠানো হয়েছে!" : "Test SMS sent to phone gateway!"));
      refetchGateway();
      refetchGatewayQueue();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send test SMS to phone");
    } finally {
      setGatewayTestSending(false);
    }
  };

  // Log inspection dialog
  const [inspectLog, setInspectLog] = useState<any | null>(null);
  const [checkingDlr, setCheckingDlr] = useState(false);
  const [logSearch, setLogSearch] = useState("");

  // Comprehensive All Customers List
  const validCustomers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string; address?: string | null; total_due?: number }>();

    // 1. Add all from customers query
    customers.forEach((c: any) => {
      const rawPhone = (c.phone || "").trim();
      const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
      if (cleanPhone.length >= 10) {
        map.set(cleanPhone, {
          id: c.id || c._id || cleanPhone,
          name: c.name || "Customer",
          phone: rawPhone,
          address: c.address || null,
        });
      }
    });

    // 2. Add all customer parties
    parties.forEach((p: any) => {
      if (p.type !== "supplier") {
        const rawPhone = (p.phone || "").trim();
        const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
        if (cleanPhone.length >= 10 && !map.has(cleanPhone)) {
          map.set(cleanPhone, {
            id: p.id || p._id || cleanPhone,
            name: p.name || "Party Customer",
            phone: rawPhone,
            address: p.address || null,
          });
        }
      }
    });

    // 3. Add all buyers from sales
    sales.forEach((s: any) => {
      const rawPhone = ((s as any).customer_phone || (s as any).party_phone || "").trim();
      const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
      if (cleanPhone.length >= 10 && !map.has(cleanPhone)) {
        const name = ((s as any).customer_name || (s as any).party_name || s.parties?.name || "Customer").trim();
        map.set(cleanPhone, {
          id: s.party_id || s.id || cleanPhone,
          name,
          phone: rawPhone,
          address: null,
        });
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [customers, parties, sales]);

  const customersWithDues = useMemo(() => {
    // Collect customers with remaining dues
    const duePartyIds = new Set(sales.filter(s => (Number(s.due_amount) || 0) > 0 && s.party_id).map(s => s.party_id));
    const duePhones = new Set(
      sales
        .filter(s => (Number(s.due_amount) || 0) > 0 && ((s as any).customer_phone || (s as any).party_phone))
        .map(s => (((s as any).customer_phone || (s as any).party_phone || "") as string).trim().replace(/[^0-9]/g, ""))
    );
    return validCustomers.filter(c => duePartyIds.has(c.id) || duePhones.has(c.phone.replace(/[^0-9]/g, "")));
  }, [validCustomers, sales]);

  const validParties = useMemo(() => {
    return parties.filter(p => p.phone && p.phone.trim().length >= 10);
  }, [parties]);

  // Filtered customers for checklist
  const displayCustomers = useMemo(() => {
    const list = custTargetMode === "dues" ? customersWithDues : validCustomers;
    if (!custSearch.trim()) return list;
    const q = custSearch.toLowerCase();
    return list.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  }, [validCustomers, customersWithDues, custTargetMode, custSearch]);

  // Filtered suppliers for checklist
  const displaySuppliers = useMemo(() => {
    if (!suppSearch.trim()) return validParties;
    const q = suppSearch.toLowerCase();
    return validParties.filter(p => p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q)));
  }, [validParties, suppSearch]);

  // Calculations
  const directParts = useMemo(() => calculateSmsParts(directMessage), [directMessage]);
  const custParts = useMemo(() => calculateSmsParts(custMessage), [custMessage]);
  const suppParts = useMemo(() => calculateSmsParts(suppMessage), [suppMessage]);
  const autoParts = useMemo(() => calculateSmsParts(autoSmsTemplate), [autoSmsTemplate]);

  // Direct parsed numbers count
  const directNumbersList = useMemo(() => {
    return directNumbers
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(s => Boolean(sanitizeBdPhoneNumber(s)));
  }, [directNumbers]);

  // Action: Save SMS Gateway Settings
  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true);
      await updateSmsSettingsFn({
        data: {
          apiKey,
          userName,
          senderName,
          defaultTransactionType: defaultTxType,
        },
      });
      await qc.invalidateQueries({ queryKey: ["sms-settings"] });
      toast.success(lang === "bn" ? "এসএমএস সেটিংস সংরক্ষিত হয়েছে!" : "SMS Gateway settings saved successfully!");
      fetchBalance();
    } catch (err: any) {
      toast.error(err?.message || (lang === "bn" ? "সেটিংস সংরক্ষণ ব্যর্থ হয়েছে" : "Failed to save settings"));
    } finally {
      setSettingsSaving(false);
    }
  };

  // Action: Save Auto SMS Settings
  const handleSaveAutoSms = async () => {
    try {
      setAutoSaving(true);
      await updateSmsSettingsFn({
        data: {
          customer_sms_after_purchase: autoSmsEnabled,
          purchase_sms_template: autoSmsTemplate,
        },
      });
      await qc.invalidateQueries({ queryKey: ["sms-settings"] });
      toast.success(lang === "bn" ? "স্বয়ংক্রিয় এসএমএস সেটিংস সংরক্ষিত হয়েছে!" : "Auto-SMS settings saved successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update auto SMS");
    } finally {
      setAutoSaving(false);
    }
  };

  // Action: Send Direct SMS
  const handleSendDirect = async () => {
    if (!directNumbersList.length) {
      toast.error(lang === "bn" ? "দয়া করে অন্তত একটি সঠিক মোবাইল নম্বর লিখুন" : "Please enter at least one valid phone number");
      return;
    }
    if (!directMessage.trim()) {
      toast.error(lang === "bn" ? "দয়া করে এসএমএস বার্তা লিখুন" : "Please enter message text");
      return;
    }

    try {
      setDirectSending(true);
      const res = await sendSmsCampaignFn({
        data: {
          recipientType: "direct_numbers",
          directNumbers,
          message: directMessage,
          transactionType: directTxType,
          campaignTitle: "Direct Message",
        },
      });

      if (res?.success) {
        toast.success(lang === "bn" ? `সফলভাবে ${res.recipientCount} টি মেসেজ পাঠানো হয়েছে!` : `Successfully sent to ${res.recipientCount} recipient(s)!`);
        setDirectMessage("");
        setDirectNumbers("");
        qc.invalidateQueries({ queryKey: ["sms-logs"] });
        fetchBalance();
      } else {
        toast.error(res?.summary || (lang === "bn" ? "মেসেজ পাঠাতে ব্যর্থ হয়েছে" : "Failed to send message"));
      }
    } catch (err: any) {
      toast.error(err?.message || (lang === "bn" ? "মেসেজ পাঠাতে ব্যর্থ হয়েছে" : "Failed to send message"));
    } finally {
      setDirectSending(false);
    }
  };

  // Action: Send Customer Campaign
  const handleSendCustomerCampaign = async () => {
    if (!custMessage.trim()) {
      toast.error(lang === "bn" ? "দয়া করে ক্যাম্পেইন বার্তা লিখুন" : "Please enter campaign message text");
      return;
    }

    let targetCount = 0;
    if (custTargetMode === "all") targetCount = validCustomers.length;
    else if (custTargetMode === "dues") targetCount = customersWithDues.length;
    else targetCount = selectedCustIds.length;

    if (targetCount === 0) {
      toast.error(lang === "bn" ? "কোন কাস্টমার পাওয়া যায়নি" : "No customers selected or available");
      return;
    }

    try {
      setCustSending(true);
      const res = await sendSmsCampaignFn({
        data: {
          recipientType: custTargetMode === "selected" ? "selected_customers" : "all_customers",
          selectedIds: custTargetMode === "selected" ? selectedCustIds : custTargetMode === "dues" ? customersWithDues.map(c => c.id) : undefined,
          message: custMessage,
          transactionType: custTxType,
          campaignTitle: custCampaignTitle || "Customer Offer Campaign",
          isPersonalized: custPersonalized,
        },
      });

      if (res?.success) {
        toast.success(lang === "bn" ? `সফলভাবে ${res.recipientCount} জন কাস্টমারকে এসএমএস পাঠানো হয়েছে!` : `Successfully sent to ${res.recipientCount} customer(s)!`);
        setCustMessage("");
        setCustCampaignTitle("");
        setSelectedCustIds([]);
        qc.invalidateQueries({ queryKey: ["sms-logs"] });
        fetchBalance();
      } else {
        toast.error(res?.summary || "Failed to send customer campaign");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send customer campaign");
    } finally {
      setCustSending(false);
    }
  };

  // Action: Send Supplier Campaign
  const handleSendSupplierCampaign = async () => {
    if (!suppMessage.trim()) {
      toast.error(lang === "bn" ? "দয়া করে বার্তা লিখুন" : "Please enter message text");
      return;
    }

    const targetCount = suppTargetMode === "all" ? validParties.length : selectedSuppIds.length;
    if (targetCount === 0) {
      toast.error(lang === "bn" ? "কোন সাপ্লায়ার পাওয়া যায়নি" : "No suppliers selected or available");
      return;
    }

    try {
      setSuppSending(true);
      const res = await sendSmsCampaignFn({
        data: {
          recipientType: suppTargetMode === "selected" ? "selected_suppliers" : "all_suppliers",
          selectedIds: suppTargetMode === "selected" ? selectedSuppIds : undefined,
          message: suppMessage,
          transactionType: "T",
          campaignTitle: suppCampaignTitle || "Supplier Communication",
          isPersonalized: suppPersonalized,
        },
      });

      if (res?.success) {
        toast.success(lang === "bn" ? `সফলভাবে ${res.recipientCount} জন সাপ্লায়ারকে মেসেজ পাঠানো হয়েছে!` : `Successfully sent to ${res.recipientCount} supplier(s)!`);
        setSuppMessage("");
        setSuppCampaignTitle("");
        setSelectedSuppIds([]);
        qc.invalidateQueries({ queryKey: ["sms-logs"] });
        fetchBalance();
      } else {
        toast.error(res?.summary || "Failed to send supplier campaign");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send supplier campaign");
    } finally {
      setSuppSending(false);
    }
  };

  // Action: Send Test Auto-SMS
  const handleSendTestAutoSms = async () => {
    const sanitized = sanitizeBdPhoneNumber(autoTestNumber);
    if (!sanitized) {
      toast.error(lang === "bn" ? "সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন" : "Enter a valid 11-digit mobile number");
      return;
    }

    try {
      setAutoTestSending(true);
      const sampleRendered = autoSmsTemplate
        .replace(/{customer_name}/g, "Rahim Ahmed")
        .replace(/{shop_name}/g, "Dream Fashion")
        .replace(/{product_name}/g, "Premium Panjabi (XL)")
        .replace(/{qty}/g, "1")
        .replace(/{total_amount}/g, "1850")
        .replace(/{paid_amount}/g, "1850")
        .replace(/{due_amount}/g, "0")
        .replace(/{invoice_id}/g, "TEST992");

      const res = await sendSmsCampaignFn({
        data: {
          recipientType: "direct_numbers",
          directNumbers: sanitized,
          message: sampleRendered,
          transactionType: "T",
          campaignTitle: "Test Auto Purchase SMS",
        },
      });

      if (res?.success) {
        toast.success(lang === "bn" ? "টেস্ট এসএমএস সফলভাবে পাঠানো হয়েছে!" : "Test auto-SMS sent successfully!");
        fetchBalance();
        qc.invalidateQueries({ queryKey: ["sms-logs"] });
      } else {
        toast.error(res?.summary || "Failed to send test SMS");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send test SMS");
    } finally {
      setAutoTestSending(false);
    }
  };

  // Action: Check DLR
  const handleCheckDlr = async (trackingId: string, logId?: string) => {
    try {
      setCheckingDlr(true);
      const res = await checkSmsDeliveryStatusFn({ data: { trackingId, logId } });
      if (res?.status === "Success" || res?.statusCode === "200") {
        toast.success(`DLR Status: ${res.deliveryStatus || "DELIVRD"}`);
        qc.invalidateQueries({ queryKey: ["sms-logs"] });
        if (inspectLog) {
          setInspectLog({ ...inspectLog, delivery_status: res.deliveryStatus });
        }
      } else {
        toast.info(res?.responseResult || "Delivery status pending");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to query delivery status");
    } finally {
      setCheckingDlr(false);
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (!logSearch.trim()) return smsLogs;
    const q = logSearch.toLowerCase();
    return smsLogs.filter((l: any) =>
      (l.message && l.message.toLowerCase().includes(q)) ||
      (l.recipients_summary && l.recipients_summary.toLowerCase().includes(q)) ||
      (l.campaign_title && l.campaign_title.toLowerCase().includes(q)) ||
      (l.status && l.status.toLowerCase().includes(q))
    );
  }, [smsLogs, logSearch]);

  const hasConfig = Boolean(smsSettings?.apiKey && smsSettings?.userName && smsSettings?.senderName);

  return (
    <div className="p-2.5 sm:p-5 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-primary/10 border border-emerald-500/20 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              {lang === "bn" ? "এসএমএস সিস্টেম ও বার্তা প্যানেল" : "SMS Management & Gateway"}
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] sm:text-xs font-semibold uppercase">
              MiMSMS v2
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {lang === "bn"
              ? "সাপ্লায়ার, কাস্টমারদের কাছে বাল্ক এসএমএস, বিশেষ অফার এবং বিক্রির পর অটোমেটিক বার্তা পাঠান।"
              : "Send broadcast SMS, promotional offers, supplier alerts, and automatic post-purchase confirmations."}
          </p>
        </div>

        {/* Real-time SMS Balance & Recharge Widget */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5 sm:gap-3 bg-card/80 backdrop-blur border border-border/80 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-sm">
          <div className="flex flex-col">
            <span className="text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {lang === "bn" ? "অবশিষ্ট এসএমএস ক্রেডিট" : "Available SMS Credits"}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-foreground font-num">
                {balanceLoading ? (
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-primary inline" />
                ) : balance !== null ? (
                  balance
                ) : smsSettings?.sms_credits !== undefined ? (
                  smsSettings.sms_credits
                ) : (
                  "0"
                )}
              </span>
              <span className="text-xs text-muted-foreground">{lang === "bn" ? "টি" : "SMS"}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchBalance(true)}
              disabled={balanceLoading}
              className="h-8 sm:h-9 px-2.5 rounded-lg sm:rounded-xl border-primary/30 hover:bg-primary/5 text-primary"
              title={lang === "bn" ? "ব্যালেন্স রিফ্রেশ" : "Refresh Balance"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${balanceLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => setRechargeOpen(true)}
              className="h-8 sm:h-9 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-md gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>{lang === "bn" ? "রিচার্জ করুন" : "Recharge SMS"}</span>
            </Button>
          </div>

          {/* Real-time Phone Gateway Status Pill */}
          <div
            onClick={() => setActiveTab("mobile_gateway")}
            className={`cursor-pointer transition-all flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl border ${
              gatewayStatus?.isOnline
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                : gatewayStatus?.device
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
                : "bg-muted/60 border-border hover:bg-muted"
            }`}
            title={lang === "bn" ? "ফোন এসএমএস গেটওয়ে সেটিংস" : "Phone SMS Gateway Settings"}
          >
            <div className="relative flex items-center justify-center p-1 rounded-lg bg-background/80 shadow-xs">
              <Radio className={`w-4 h-4 ${gatewayStatus?.isOnline ? "text-emerald-600 animate-pulse" : "text-muted-foreground"}`} />
              {gatewayStatus?.isOnline && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-background" />
              )}
            </div>
            <div className="flex flex-col text-left pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold leading-tight">
                  {gatewayStatus?.isOnline
                    ? (lang === "bn" ? "ফোন গেটওয়ে একটিভ" : "Phone Gateway Active")
                    : gatewayStatus?.device
                    ? (lang === "bn" ? "ফোন গেটওয়ে অফলাইন" : "Gateway Offline")
                    : (lang === "bn" ? "ফোন গেটওয়ে কানেক্ট করুন" : "Pair Phone Gateway")}
                </span>
                {gatewayStatus?.isOnline && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-emerald-500/20 text-emerald-600 border-emerald-500/40">
                    LIVE
                  </Badge>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {gatewayStatus?.device
                  ? `${gatewayStatus.device.model} • ${gatewayStatus.device.batteryLevel}% 🔋`
                  : (lang === "bn" ? "৬-ডিজিট কোড দিয়ে কানেক্ট করুন" : "6-digit code pairing")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto pb-1 -mx-2.5 px-2.5 sm:mx-0 sm:px-0">
          <TabsList className="bg-muted/70 p-1 rounded-xl sm:rounded-2xl h-auto flex flex-nowrap sm:flex-wrap overflow-x-auto gap-1 min-w-max sm:min-w-0">
            <TabsTrigger
              value="mobile_gateway"
              className="shrink-0 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2 relative border border-emerald-500/20 bg-emerald-500/5"
            >
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span className="font-semibold">{lang === "bn" ? "মোবাইল গেটওয়ে" : "Phone Gateway"}</span>
              {gatewayStatus?.isOnline ? (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              ) : gatewayStatus?.device ? (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="direct" className="shrink-0 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2">
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>{lang === "bn" ? "ডাইরেক্ট মেসেজ" : "Direct SMS"}</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="shrink-0 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              <span>{lang === "bn" ? "কাস্টমার ও অফার" : "Customer & Offers"}</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">
                {validCustomers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="shrink-0 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2">
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
              <span>{lang === "bn" ? "সাপ্লায়ার এসএমএস" : "Suppliers SMS"}</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">
                {validParties.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="auto" className="shrink-0 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2">
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
              <span>{lang === "bn" ? "অটো এসএমএস" : "Auto SMS"}</span>
              {autoSmsEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" className="shrink-0 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
              <span>{lang === "bn" ? "হিস্টোরি" : "SMS Logs"}</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">
                {smsLogs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="settings" className="shrink-0 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2">
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600" />
              <span>{lang === "bn" ? "সেটিংস" : "Settings"}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── TAB 1: DIRECT SMS ────────────────────────────────────────────── */}
        <TabsContent value="direct" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/80 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Send className="w-5 h-5 text-emerald-600" />
                  {lang === "bn" ? "যেকোনো নম্বরে সরাসরি এসএমএস পাঠান" : "Send Direct SMS to Numbers"}
                </CardTitle>
                <CardDescription>
                  {lang === "bn"
                    ? "এক বা একাধিক মোবাইল নম্বরে দ্রুত কাস্টম বার্তা পাঠান (কমা বা নতুন লাইন দিয়ে আলাদা করুন)।"
                    : "Enter one or multiple mobile numbers separated by commas or line breaks."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="direct-numbers" className="font-semibold text-sm">
                      {lang === "bn" ? "মোবাইল নম্বরসমূহ (BD Mobile Numbers)" : "Mobile Numbers (01XXXXXXXXX)"}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {directNumbersList.length > 0
                        ? lang === "bn"
                          ? `সঠিক নম্বর: ${directNumbersList.length} টি`
                          : `Valid Numbers: ${directNumbersList.length}`
                        : lang === "bn"
                        ? "উদাহরণ: 01711000000, 01811000000"
                        : "e.g. 01711000000, 01811000000"}
                    </span>
                  </div>
                  <Textarea
                    id="direct-numbers"
                    placeholder="017XXXXXXXX&#10;018XXXXXXXX&#10;019XXXXXXXX"
                    value={directNumbers}
                    onChange={e => setDirectNumbers(e.target.value)}
                    rows={3}
                    className="rounded-xl font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="direct-msg" className="font-semibold text-sm">
                      {lang === "bn" ? "এসএমএস বার্তা" : "Message Content"}
                    </Label>
                  </div>
                  <Textarea
                    id="direct-msg"
                    placeholder={lang === "bn" ? "আপনার বার্তা লিখুন..." : "Type your SMS content here..."}
                    value={directMessage}
                    onChange={e => setDirectMessage(e.target.value.slice(0, 1000))}
                    maxLength={1000}
                    rows={5}
                    className="rounded-xl text-base"
                  />
                  <SmsCharacterCounter message={directMessage} maxLength={1000} />
                </div>

                {/* Quick Templates */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {lang === "bn" ? "কুইক টেমপ্লেট নির্বাচন করুন:" : "Quick Preset Messages:"}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-lg h-7"
                      onClick={() => setDirectMessage("Dear Customer, thank you for shopping with us! Visit again soon.")}
                    >
                      {lang === "bn" ? "ধন্যবাদ বার্তা" : "Thank You Message"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-lg h-7"
                      onClick={() => setDirectMessage("সম্মানিত গ্রাহক, আপনার দোকানে কিছু বকেয়া রয়েছে। দয়া করে পরিশোধ করুন।")}
                    >
                      {lang === "bn" ? "বকেয়া তাগাদা" : "Due Reminder (BN)"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-lg h-7"
                      onClick={() => setDirectMessage("Eid Mubarak! Enjoy special discount on our latest fashion collection.")}
                    >
                      {lang === "bn" ? "ঈদ মোবারক অফার" : "Eid Promo"}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      {lang === "bn" ? "রুট টাইপ:" : "Route Type:"}
                    </Label>
                    <Select value={directTxType} onValueChange={(val: "T" | "P") => setDirectTxType(val)}>
                      <SelectTrigger className="h-9 w-44 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="T">{lang === "bn" ? "ট্রানজেকশনাল (T) - দ্রুত" : "Transactional (T)"}</SelectItem>
                        <SelectItem value="P">{lang === "bn" ? "প্রোমোশনাল (P)" : "Promotional (P)"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSendDirect}
                    disabled={directSending || !directNumbersList.length || !directMessage.trim()}
                    className="w-full sm:w-auto rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    {directSending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {lang === "bn" ? "পাঠানো হচ্ছে..." : "Sending SMS..."}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {lang === "bn" ? `পাঠান (${directNumbersList.length})` : `Send SMS (${directNumbersList.length})`}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Preview Card */}
            <Card className="border-border/80 shadow-sm rounded-2xl flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  {lang === "bn" ? "বার্তা প্রিভিউ" : "SMS Preview Mockup"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {lang === "bn" ? "মোবাইলে যেভাবে প্রদর্শিত হবে" : "Live appearance on recipient's handset"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl shadow-inner border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <span className="font-semibold text-emerald-400">
                      {smsSettings?.senderName || "DreamFashion"}
                    </span>
                    <span>Just Now</span>
                  </div>
                  <div className="bg-slate-800/90 text-white p-3 rounded-xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap break-words min-h-[90px]">
                    {directMessage || (
                      <span className="text-slate-500 italic">
                        {lang === "bn" ? "বার্তা লিখলে এখানে প্রিভিউ দেখা যাবে..." : "Message content preview will show here..."}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-muted/40 p-3.5 rounded-xl text-xs space-y-2 border border-border/50">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "bn" ? "প্রাপক সংখ্যা:" : "Recipients:"}</span>
                    <span className="font-semibold font-num">{directNumbersList.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "bn" ? "প্রতি মেসেজ সাইজ:" : "Parts per SMS:"}</span>
                    <span className="font-semibold font-num">{directParts.parts} part(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "bn" ? "মোট আনুমানিক খরচ:" : "Total SMS Credits:"}</span>
                    <span className="font-semibold text-primary font-num">{directNumbersList.length * directParts.parts} units</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 2: CUSTOMER SMS & OFFERS ─────────────────────────────────── */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/80 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                    {lang === "bn" ? "কাস্টমারদের কাছে বাল্ক এসএমএস ও অফার ক্যাম্পেইন" : "Customer Bulk SMS & Offer Campaigns"}
                  </CardTitle>
                  <CardDescription>
                    {lang === "bn"
                      ? "সকল বা নির্দিষ্ট কাস্টমারদের কাছে ডিসকাউন্ট, বিশেষ অফার বা গুরুত্বপূর্ণ নোটিশ পাঠান।"
                      : "Send promotional offers, seasonal discounts, or general notices to customers."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Target Audience Selector */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">
                      {lang === "bn" ? "প্রাপক কাস্টমার নির্বাচন করুন:" : "Target Customer Audience:"}
                    </Label>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setCustTargetMode("all")}
                        className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all ${
                          custTargetMode === "all"
                            ? "border-blue-600 bg-blue-500/10 ring-2 ring-blue-500/20"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span className="font-semibold text-xs sm:text-sm truncate">{lang === "bn" ? "সকল কাস্টমার" : "All Customers"}</span>
                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-num block">
                          {validCustomers.length} {lang === "bn" ? "জন" : "recipients"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustTargetMode("dues")}
                        className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all ${
                          custTargetMode === "dues"
                            ? "border-amber-600 bg-amber-500/10 ring-2 ring-amber-500/20"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span className="font-semibold text-xs sm:text-sm truncate">{lang === "bn" ? "বকেয়াদার" : "With Dues"}</span>
                          <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-num block">
                          {customersWithDues.length} {lang === "bn" ? "জন" : "recipients"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustTargetMode("selected")}
                        className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all ${
                          custTargetMode === "selected"
                            ? "border-purple-600 bg-purple-500/10 ring-2 ring-purple-500/20"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span className="font-semibold text-xs sm:text-sm truncate">{lang === "bn" ? "বাছাইকৃত" : "Custom"}</span>
                          <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-num block">
                          {selectedCustIds.length} {lang === "bn" ? "জন" : "selected"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Campaign Title */}
                  <div className="space-y-2">
                    <Label htmlFor="cust-camp-title" className="font-semibold text-sm">
                      {lang === "bn" ? "ক্যাম্পেইন শিরোনাম (অপশনাল)" : "Campaign Title (Optional)"}
                    </Label>
                    <Input
                      id="cust-camp-title"
                      placeholder="e.g. Eid Discount 20%, New Arrival Notice"
                      value={custCampaignTitle}
                      onChange={e => setCustCampaignTitle(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  {/* Message Composer */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cust-msg" className="font-semibold text-sm">
                        {lang === "bn" ? "অফার বা প্রচারমূলক বার্তা" : "Offer / Promotional Message"}
                      </Label>
                    </div>
                    <Textarea
                      id="cust-msg"
                      placeholder={
                        lang === "bn"
                          ? "প্রিয় {customer_name}, {shop_name}-এ শুরু হয়েছে বিশেষ ছাড়! আজই ভিজিট করুন..."
                          : "Dear {customer_name}, special sale at {shop_name}! Get flat 20% off this week..."
                      }
                      value={custMessage}
                      onChange={e => setCustMessage(e.target.value.slice(0, 1000))}
                      maxLength={1000}
                      rows={5}
                      className="rounded-xl text-base"
                    />
                    <SmsCharacterCounter message={custMessage} maxLength={1000} />
                  </div>

                  {/* Dynamic Tags */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium">
                      {lang === "bn" ? "ডাইনামিক ভ্যারিয়েবল ট্যাগ (ক্লিক করে যুক্ত করুন):" : "Insert Dynamic Tags:"}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs rounded-lg h-7 font-mono"
                        onClick={() => setCustMessage(prev => prev + " {customer_name}")}
                      >
                        + {"{customer_name}"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs rounded-lg h-7 font-mono"
                        onClick={() => setCustMessage(prev => prev + " {shop_name}")}
                      >
                        + {"{shop_name}"}
                      </Button>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="cust-personalized"
                        checked={custPersonalized}
                        onCheckedChange={setCustPersonalized}
                      />
                      <Label htmlFor="cust-personalized" className="text-xs cursor-pointer">
                        {lang === "bn" ? "প্রতি কাস্টমারের নামে ব্যক্তিগতকরণ (Personalized Dynamic SMS)" : "Personalize with Customer Name"}
                      </Label>
                    </div>

                    <Button
                      onClick={handleSendCustomerCampaign}
                      disabled={custSending || !custMessage.trim()}
                      className="w-full sm:w-auto rounded-xl px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      {custSending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          {lang === "bn" ? "ক্যাম্পেইন পাঠানো হচ্ছে..." : "Broadcasting Campaign..."}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {lang === "bn"
                            ? `পাঠান (${custTargetMode === "all" ? validCustomers.length : custTargetMode === "dues" ? customersWithDues.length : selectedCustIds.length})`
                            : `Send to ${custTargetMode === "all" ? validCustomers.length : custTargetMode === "dues" ? customersWithDues.length : selectedCustIds.length} Customers`}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Customer Selection Checklist when in 'selected' mode, or details */}
            <Card className="border-border/80 shadow-sm rounded-2xl flex flex-col h-[520px]">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>{lang === "bn" ? "কাস্টমার তালিকা" : "Recipient Customers"}</span>
                  </div>
                  <Badge variant="outline" className="font-num">
                    {displayCustomers.length}
                  </Badge>
                </CardTitle>
                <div className="pt-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder={lang === "bn" ? "কাস্টমার বা মোবাইল খুঁজুন..." : "Search name or phone..."}
                      value={custSearch}
                      onChange={e => setCustSearch(e.target.value)}
                      className="pl-8 h-9 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto divide-y divide-border/40">
                {custTargetMode === "selected" && (
                  <div className="p-3 bg-muted/40 flex items-center justify-between text-xs sticky top-0 backdrop-blur z-10">
                    <span className="font-medium text-muted-foreground">
                      {selectedCustIds.length} of {displayCustomers.length} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setSelectedCustIds(displayCustomers.map(c => c.id))}
                      >
                        {lang === "bn" ? "সব নির্বাচন" : "Select All"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setSelectedCustIds([])}
                      >
                        {lang === "bn" ? "মুছুন" : "Clear"}
                      </Button>
                    </div>
                  </div>
                )}

                {displayCustomers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    {lang === "bn" ? "কোন সচল মোবাইল নম্বরসহ কাস্টমার পাওয়া যায়নি" : "No customers with valid phone numbers found"}
                  </div>
                ) : (
                  displayCustomers.map(cust => {
                    const isSelected = selectedCustIds.includes(cust.id);
                    return (
                      <div
                        key={cust.id}
                        onClick={() => {
                          if (custTargetMode !== "selected") return;
                          setSelectedCustIds(prev =>
                            isSelected ? prev.filter(id => id !== cust.id) : [...prev, cust.id]
                          );
                        }}
                        className={`p-3 flex items-center justify-between text-sm hover:bg-muted/30 transition-colors ${
                          custTargetMode === "selected" ? "cursor-pointer" : ""
                        } ${isSelected && custTargetMode === "selected" ? "bg-blue-500/5" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          {custTargetMode === "selected" && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => {
                                setSelectedCustIds(prev =>
                                  isSelected ? prev.filter(id => id !== cust.id) : [...prev, cust.id]
                                );
                              }}
                            />
                          )}
                          <div>
                            <p className="font-medium text-foreground">{cust.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{cust.phone}</p>
                          </div>
                        </div>
                        {cust.address && (
                          <span className="text-xs text-muted-foreground max-w-[100px] truncate hidden sm:inline">
                            {cust.address}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 3: SUPPLIER SMS ─────────────────────────────────────────── */}
        <TabsContent value="suppliers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/80 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Truck className="w-5 h-5 text-purple-600" />
                    {lang === "bn" ? "সাপ্লায়ার ও পার্টনারদের এসএমএস বার্তা" : "Supplier & Vendor Communication"}
                  </CardTitle>
                  <CardDescription>
                    {lang === "bn"
                      ? "পণ্য ক্রয় সংক্রান্ত অর্ডার, পেমেন্ট কনফার্মেশন বা স্টক অনুসন্ধান বার্তা পাঠান।"
                      : "Send purchase requests, stock queries, or payment notices directly to suppliers."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Target Supplier Selector */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">
                      {lang === "bn" ? "প্রাপক সাপ্লায়ার নির্বাচন করুন:" : "Target Suppliers:"}
                    </Label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setSuppTargetMode("all")}
                        className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all ${
                          suppTargetMode === "all"
                            ? "border-purple-600 bg-purple-500/10 ring-2 ring-purple-500/20"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span className="font-semibold text-xs sm:text-sm truncate">{lang === "bn" ? "সকল সাপ্লায়ার" : "All Suppliers"}</span>
                          <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-num block">
                          {validParties.length} {lang === "bn" ? "জন" : "suppliers"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSuppTargetMode("selected")}
                        className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all ${
                          suppTargetMode === "selected"
                            ? "border-purple-600 bg-purple-500/10 ring-2 ring-purple-500/20"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span className="font-semibold text-xs sm:text-sm truncate">{lang === "bn" ? "বাছাইকৃত" : "Selected"}</span>
                          <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-num block">
                          {selectedSuppIds.length} {lang === "bn" ? "জন" : "selected"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Message Composer */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="supp-msg" className="font-semibold text-sm">
                        {lang === "bn" ? "বার্তা লিখুন" : "Supplier Message"}
                      </Label>
                    </div>
                    <Textarea
                      id="supp-msg"
                      placeholder={
                        lang === "bn"
                          ? "সম্মানিত সাপ্লায়ার, {shop_name} থেকে আমাদের নতুন লটের মালের অর্ডার পাঠানো হয়েছে। অনুগ্রহ করে স্টক কনফার্ম করুন..."
                          : "Dear Supplier, we need urgent stock dispatch for {shop_name}. Please confirm availability."
                      }
                      value={suppMessage}
                      onChange={e => setSuppMessage(e.target.value.slice(0, 1000))}
                      maxLength={1000}
                      rows={5}
                      className="rounded-xl text-base"
                    />
                    <SmsCharacterCounter message={suppMessage} maxLength={1000} />
                  </div>

                  {/* Preset Templates */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium">
                      {lang === "bn" ? "সাপ্লায়ার টেমপ্লেট নির্বাচন করুন:" : "Quick Supplier Presets:"}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-lg h-7"
                        onClick={() => setSuppMessage("সম্মানিত সাপ্লায়ার, আমাদের নতুন লটের পণ্যের তাগাদা ও রেট জানার জন্য যোগাযোগ করছি।")}
                      >
                        {lang === "bn" ? "নতুন স্টক অর্ডার" : "Stock Inquiry (BN)"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-lg h-7"
                        onClick={() => setSuppMessage("Dear Supplier, your payment has been processed successfully from {shop_name}. Thank you.")}
                      >
                        {lang === "bn" ? "পেমেন্ট নিশ্চিতকরণ" : "Payment Confirmed"}
                      </Button>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="supp-personalized"
                        checked={suppPersonalized}
                        onCheckedChange={setSuppPersonalized}
                      />
                      <Label htmlFor="supp-personalized" className="text-xs cursor-pointer">
                        {lang === "bn" ? "নামসহ ব্যক্তিগতকরণ (Personalized Dynamic SMS)" : "Personalize with Supplier Name"}
                      </Label>
                    </div>

                    <Button
                      onClick={handleSendSupplierCampaign}
                      disabled={suppSending || !suppMessage.trim()}
                      className="w-full sm:w-auto rounded-xl px-6 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                    >
                      {suppSending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          {lang === "bn" ? "পাঠানো হচ্ছে..." : "Sending..."}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {lang === "bn"
                            ? `সাপ্লায়ারদের পাঠান (${suppTargetMode === "all" ? validParties.length : selectedSuppIds.length})`
                            : `Send to ${suppTargetMode === "all" ? validParties.length : selectedSuppIds.length} Suppliers`}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Supplier Checklist */}
            <Card className="border-border/80 shadow-sm rounded-2xl flex flex-col h-[520px]">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-purple-600" />
                    <span>{lang === "bn" ? "সাপ্লায়ার তালিকা" : "Suppliers List"}</span>
                  </div>
                  <Badge variant="outline" className="font-num">
                    {displaySuppliers.length}
                  </Badge>
                </CardTitle>
                <div className="pt-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder={lang === "bn" ? "সাপ্লায়ার বা নম্বর খুঁজুন..." : "Search supplier..."}
                      value={suppSearch}
                      onChange={e => setSuppSearch(e.target.value)}
                      className="pl-8 h-9 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto divide-y divide-border/40">
                {suppTargetMode === "selected" && (
                  <div className="p-3 bg-muted/40 flex items-center justify-between text-xs sticky top-0 backdrop-blur z-10">
                    <span className="font-medium text-muted-foreground">
                      {selectedSuppIds.length} of {displaySuppliers.length} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setSelectedSuppIds(displaySuppliers.map(p => p.id))}
                      >
                        {lang === "bn" ? "সব নির্বাচন" : "Select All"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setSelectedSuppIds([])}
                      >
                        {lang === "bn" ? "মুছুন" : "Clear"}
                      </Button>
                    </div>
                  </div>
                )}

                {displaySuppliers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    {lang === "bn" ? "কোন সচল নম্বরসহ সাপ্লায়ার পাওয়া যায়নি" : "No suppliers with phone numbers found"}
                  </div>
                ) : (
                  displaySuppliers.map(supp => {
                    const isSelected = selectedSuppIds.includes(supp.id);
                    return (
                      <div
                        key={supp.id}
                        onClick={() => {
                          if (suppTargetMode !== "selected") return;
                          setSelectedSuppIds(prev =>
                            isSelected ? prev.filter(id => id !== supp.id) : [...prev, supp.id]
                          );
                        }}
                        className={`p-3 flex items-center justify-between text-sm hover:bg-muted/30 transition-colors ${
                          suppTargetMode === "selected" ? "cursor-pointer" : ""
                        } ${isSelected && suppTargetMode === "selected" ? "bg-purple-500/5" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          {suppTargetMode === "selected" && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => {
                                setSelectedSuppIds(prev =>
                                  isSelected ? prev.filter(id => id !== supp.id) : [...prev, supp.id]
                                );
                              }}
                            />
                          )}
                          <div>
                            <p className="font-medium text-foreground">{supp.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{supp.phone}</p>
                          </div>
                        </div>
                        {supp.address && (
                          <span className="text-xs text-muted-foreground max-w-[100px] truncate hidden sm:inline">
                            {supp.address}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 4: AUTOMATIC SMS ON PURCHASE ─────────────────────────────── */}
        <TabsContent value="auto" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/80 shadow-sm rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Smartphone className="w-5 h-5 text-amber-600" />
                      {lang === "bn" ? "পণ্য ক্রয়ের পর স্বয়ংক্রিয় এসএমএস" : "Automated SMS on Customer Purchase"}
                    </CardTitle>
                    <CardDescription>
                      {lang === "bn"
                        ? "কাস্টমারের ফোন নম্বরে বিক্রি বা ইনভয়েস তৈরি হওয়ার সাথে সাথে অটো কনফার্মেশন এসএমএস পাঠানো হবে।"
                        : "Automatically dispatches a personalized SMS invoice whenever a sale is completed with a customer phone number."}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/60 p-2 rounded-xl">
                    <Switch
                      id="auto-sms-toggle"
                      checked={autoSmsEnabled}
                      onCheckedChange={setAutoSmsEnabled}
                    />
                    <Label htmlFor="auto-sms-toggle" className="font-bold text-xs cursor-pointer">
                      {autoSmsEnabled ? (
                        <span className="text-emerald-600 font-semibold">{lang === "bn" ? "চালু আছে" : "ACTIVE"}</span>
                      ) : (
                        <span className="text-muted-foreground">{lang === "bn" ? "বন্ধ" : "DISABLED"}</span>
                      )}
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-template" className="font-semibold text-sm">
                      {lang === "bn" ? "স্বয়ংক্রিয় বার্তা টেমপ্লেট" : "Purchase Confirmation Template"}
                    </Label>
                  </div>
                  <Textarea
                    id="auto-template"
                    value={autoSmsTemplate}
                    onChange={e => setAutoSmsTemplate(e.target.value.slice(0, 1000))}
                    maxLength={1000}
                    rows={4}
                    className="rounded-xl text-sm leading-relaxed"
                  />
                  <SmsCharacterCounter message={autoSmsTemplate} maxLength={1000} />
                </div>

                {/* Variable Inserters */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {lang === "bn" ? "টেমপ্লেটে যোগ করার ভ্যারিয়েবলসমূহ:" : "Available Template Placeholders (Click to insert):"}
                  </Label>
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {[
                      { key: "{customer_name}", desc: "গ্রাহকের নাম" },
                      { key: "{shop_name}", desc: "দোকানের নাম" },
                      { key: "{product_name}", desc: "পণ্যের নাম" },
                      { key: "{qty}", desc: "পরিমাণ" },
                      { key: "{total_amount}", desc: "মোট টাকা" },
                      { key: "{paid_amount}", desc: "জমা টাকা" },
                      { key: "{due_amount}", desc: "বাকী টাকা" },
                      { key: "{invoice_id}", desc: "ইনভয়েস নং" },
                    ].map(item => (
                      <Button
                        key={item.key}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs rounded-lg bg-muted hover:bg-muted/80"
                        onClick={() => setAutoSmsTemplate(prev => prev + " " + item.key)}
                      >
                        + {item.key}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Test SMS Box */}
                <div className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-primary" />
                    <Label className="text-xs font-semibold">
                      {lang === "bn" ? "টেস্ট এসএমএস পাঠিয়ে যাচাই করুন" : "Send Test Post-Purchase SMS:"}
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="01XXXXXXXXX"
                      value={autoTestNumber}
                      onChange={e => setAutoTestNumber(e.target.value)}
                      className="rounded-xl h-9 text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSendTestAutoSms}
                      disabled={autoTestSending || !autoTestNumber}
                      className="rounded-xl h-9 text-xs flex-shrink-0"
                    >
                      {autoTestSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                      {lang === "bn" ? "টেস্ট পাঠান" : "Send Test"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={handleSaveAutoSms}
                    disabled={autoSaving}
                    className="rounded-xl px-6 bg-primary text-primary-foreground font-medium"
                  >
                    {autoSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    {lang === "bn" ? "সেটিংস সংরক্ষণ করুন" : "Save Auto-SMS Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Handset Live Render Mockup */}
            <Card className="border-border/80 shadow-sm rounded-2xl flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  {lang === "bn" ? "কাস্টমারের মোবাইলে প্রিভিউ" : "Customer Handset Preview"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {lang === "bn" ? "নমুনা ডেটাসহ লাইভ রেন্ডারিং" : "Live interpolated sample values"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-950 text-slate-100 p-4 rounded-3xl border-4 border-slate-800 shadow-2xl space-y-4">
                  <div className="text-center">
                    <span className="w-12 h-1 bg-slate-700 rounded-full inline-block mb-2" />
                    <p className="text-xs font-semibold text-emerald-400">
                      {smsSettings?.senderName || "DreamFashion"}
                    </p>
                    <p className="text-[10px] text-slate-400">Today, 03:45 PM</p>
                  </div>

                  <div className="bg-slate-800 text-slate-100 p-3.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed whitespace-pre-wrap border border-slate-700">
                    {autoSmsTemplate
                      .replace(/{customer_name}/g, "Rahim Ahmed")
                      .replace(/{shop_name}/g, "Dream Fashion")
                      .replace(/{product_name}/g, "Premium Panjabi (XL)")
                      .replace(/{qty}/g, "1")
                      .replace(/{total_amount}/g, "1850")
                      .replace(/{paid_amount}/g, "1850")
                      .replace(/{due_amount}/g, "0")
                      .replace(/{invoice_id}/g, "DF-8821")}
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                  <p className="font-semibold flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {lang === "bn" ? "অটোমেটিক ট্রিগার চালু থাকবে" : "Instant Post-Sale Trigger"}
                  </p>
                  <p className="text-[11px] opacity-90">
                    {lang === "bn"
                      ? "ইনভয়েস বা কুইক সেলে কাস্টমারের ফোন নম্বর থাকলেই স্বয়ংক্রিয়ভাবে এই এসএমএস গ্রাহকের মোবাইলে পৌঁছে যাবে।"
                      : "Whenever a sale has an attached customer phone number, this SMS will be dispatched instantly."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 5: SMS LOGS & DELIVERY REPORTS ───────────────────────────── */}
        <TabsContent value="logs" className="space-y-6">
          <Card className="border-border/80 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  {lang === "bn" ? "প্রেরিত এসএমএস লগ ও ডেলিভারি হিস্টোরি" : "SMS Dispatch Logs & Delivery Reports"}
                </CardTitle>
                <CardDescription>
                  {lang === "bn"
                    ? "আপনার পাঠানো সকল এসএমএস ক্যাম্পেইনের লাইভ স্ট্যাটাস ও হিস্টোরি।"
                    : "Real-time delivery status, tracking IDs, and message logs for all sent campaigns."}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder={lang === "bn" ? "হিস্টোরি খুঁজুন..." : "Filter logs..."}
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    className="pl-8 h-9 rounded-xl text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchLogs()}
                  className="rounded-xl h-9"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  {lang === "bn" ? "রিফ্রেশ" : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="p-12 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm">{lang === "bn" ? "লগ লোড হচ্ছে..." : "Loading SMS history..."}</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm font-medium">{lang === "bn" ? "কোন এসএমএস লগ পাওয়া যায়নি" : "No SMS history records found"}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-3">
                    {filteredLogs.map((log: any) => {
                      const d = log.created_at ? new Date(log.created_at) : null;
                      const dateStr = d && !isNaN(d.getTime()) ? d.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "N/A";
                      const isSuccess = log.status === "Success";
                      const trxnId = log.trxn_ids && log.trxn_ids[0];

                      return (
                        <div key={log.id} className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2.5 shadow-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-xs text-foreground">
                                {log.campaign_title || log.recipient_type}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {dateStr}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                  isSuccess
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : log.status === "Partial"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                    : "bg-red-500/10 text-red-600 border-red-500/30"
                                }`}
                              >
                                {log.status}
                              </Badge>
                              {log.delivery_status && (
                                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0.5">
                                  {log.delivery_status}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="text-xs bg-muted/40 p-2.5 rounded-lg text-foreground whitespace-pre-wrap leading-relaxed">
                            {log.message}
                          </div>

                          <div className="flex items-center justify-between pt-1 text-xs">
                            <span className="text-[11px] text-muted-foreground">
                              {lang === "bn" ? "প্রাপক:" : "Recipients:"} <strong className="text-foreground">{log.recipient_count}</strong> ({log.recipients_summary})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7.5 px-2.5 text-xs rounded-lg"
                                onClick={() => setInspectLog(log)}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1 text-primary" />
                                <span>{lang === "bn" ? "ডিটেইলস" : "Details"}</span>
                              </Button>
                              {trxnId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7.5 px-2 text-xs rounded-lg"
                                  onClick={() => handleCheckDlr(trxnId, log.id)}
                                  title="Check Live DLR"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground font-semibold bg-muted/30">
                          <th className="p-3">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                          <th className="p-3">{lang === "bn" ? "টাইপ ও ক্যাম্পেইন" : "Type / Title"}</th>
                          <th className="p-3">{lang === "bn" ? "প্রাপক" : "Recipients"}</th>
                          <th className="p-3">{lang === "bn" ? "বার্তা" : "Message"}</th>
                          <th className="p-3">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                          <th className="p-3 text-right">{lang === "bn" ? "অ্যাকশন" : "Actions"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-sans">
                        {filteredLogs.map((log: any) => {
                          const d = log.created_at ? new Date(log.created_at) : null;
                          const dateStr = d && !isNaN(d.getTime()) ? d.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "N/A";
                          const isSuccess = log.status === "Success";
                          const trxnId = log.trxn_ids && log.trxn_ids[0];

                          return (
                            <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                                {dateStr}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs text-foreground">
                                    {log.campaign_title || log.recipient_type}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground uppercase">
                                    {log.recipient_type === "auto_purchase"
                                      ? "Auto-Purchase"
                                      : log.recipient_type === "all_customers"
                                      ? "Customers"
                                      : log.recipient_type === "all_suppliers"
                                      ? "Suppliers"
                                      : "Direct"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-xs">
                                <span className="font-semibold font-num">{log.recipient_count} </span>
                                <span className="text-muted-foreground text-[11px]">
                                  ({log.recipients_summary})
                                </span>
                              </td>
                              <td className="p-3 text-xs max-w-xs truncate text-muted-foreground">
                                {log.message}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-2 py-0.5 rounded-md ${
                                      isSuccess
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                        : log.status === "Partial"
                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                        : "bg-red-500/10 text-red-600 border-red-500/30"
                                    }`}
                                  >
                                    {log.status}
                                  </Badge>
                                  {log.delivery_status && (
                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                      {log.delivery_status}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => setInspectLog(log)}
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    {lang === "bn" ? "বিস্তারিত" : "Details"}
                                  </Button>
                                  {trxnId && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2 text-xs"
                                      onClick={() => handleCheckDlr(trxnId, log.id)}
                                      title="Check Live DLR"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 6: MOBILE PHONE SMS GATEWAY ─────────────────────────────── */}
        <TabsContent value="mobile_gateway" className="space-y-6">
          {/* Gateway Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-primary/10 border border-emerald-500/20 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600">
                  <Radio className="w-5 h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  {lang === "bn" ? "অ্যান্ড্রয়েড ফোন এসএমএস গেটওয়ে" : "Android Phone SMS Gateway"}
                </h2>
                <Badge
                  variant="outline"
                  className={`text-[10px] sm:text-xs font-semibold uppercase px-2 py-0.5 ${
                    gatewayStatus?.isOnline
                      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/40"
                      : gatewayStatus?.device
                      ? "bg-amber-500/15 text-amber-600 border-amber-500/40"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {gatewayStatus?.isOnline
                    ? lang === "bn"
                      ? "🟢 লাইভ কানেক্টেড"
                      : "🟢 Live Connected"
                    : gatewayStatus?.device
                    ? lang === "bn"
                      ? "🔴 ফোন অফলাইন"
                      : "🔴 Phone Offline"
                    : lang === "bn"
                    ? "⚪ আনপেয়ার্ড"
                    : "⚪ Not Paired"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {lang === "bn"
                  ? "আপনার নিজস্ব অ্যান্ড্রয়েড মোবাইল ও সিম কার্ড ব্যবহার করে যেকোনো নম্বরে সরাসরি এসএমএস পাঠান (ফ্রি ও আনলিমিটেড)।"
                  : "Turn your Android phone into a high-speed SMS dispatch gateway using your physical SIM card package."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/hakimqzz-sms-gateway.apk"
                download="hakimqzz-sms-gateway.apk"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{lang === "bn" ? "অ্যাপ ডাউনলোড (.APK)" : "Download Gateway APK"}</span>
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchGateway();
                  refetchGatewayQueue();
                  toast.success(lang === "bn" ? "গেটওয়ে স্ট্যাটাস রিফ্রেশ হয়েছে" : "Gateway status refreshed");
                }}
                disabled={gatewayLoading}
                className="h-9 px-2.5 rounded-xl border-border hover:bg-muted"
                title={lang === "bn" ? "রিফ্রেশ" : "Refresh"}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gatewayLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Quick Metrics & Device Info (When Paired) */}
          {gatewayStatus?.device && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Device Card */}
              <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium flex items-center justify-between">
                    <span>{lang === "bn" ? "সংযুক্ত ডিভাইস" : "Connected Phone"}</span>
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                  </CardDescription>
                  <CardTitle className="text-base font-bold truncate">
                    {gatewayStatus.device.model || gatewayStatus.device.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>{lang === "bn" ? "ব্র্যান্ড" : "Manufacturer"}:</span>
                    <span className="font-semibold text-foreground">{gatewayStatus.device.manufacturer || "Android"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Android:</span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                      v{gatewayStatus.device.androidVersion || "13+"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Battery & Power */}
              <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium flex items-center justify-between">
                    <span>{lang === "bn" ? "ব্যাটারি ও চার্জিং" : "Battery & Power"}</span>
                    {gatewayStatus.device.isCharging ? (
                      <BatteryCharging className="w-4 h-4 text-emerald-500 animate-pulse" />
                    ) : (
                      <BatteryMedium className="w-4 h-4 text-amber-500" />
                    )}
                  </CardDescription>
                  <CardTitle className="text-xl font-bold flex items-baseline gap-1 font-num">
                    {gatewayStatus.device.batteryLevel}%
                    {gatewayStatus.device.isCharging && (
                      <span className="text-xs text-emerald-600 font-semibold">(Charging)</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-1.5 text-xs text-muted-foreground">
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        gatewayStatus.device.batteryLevel > 30 ? "bg-emerald-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, gatewayStatus.device.batteryLevel)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span>{lang === "bn" ? "নেটওয়ার্ক" : "Network"}:</span>
                    <span className="font-semibold text-foreground">{gatewayStatus.device.networkType}</span>
                  </div>
                </CardContent>
              </Card>

              {/* SIM & Carrier Card */}
              <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium flex items-center justify-between">
                    <span>{lang === "bn" ? "সিম কার্ড সমূহ" : "Detected SIM Cards"}</span>
                    <SignalHigh className="w-4 h-4 text-primary" />
                  </CardDescription>
                  <CardTitle className="text-base font-bold">
                    {gatewayStatus.device.simSlots && gatewayStatus.device.simSlots.length > 0
                      ? `${gatewayStatus.device.simSlots.length} SIM Available`
                      : "Default SIM Slot"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-1 text-xs">
                  {gatewayStatus.device.simSlots && gatewayStatus.device.simSlots.length > 0 ? (
                    gatewayStatus.device.simSlots.map((sim: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-0.5">
                        <span className="text-muted-foreground">SIM {sim.slotIndex + 1}:</span>
                        <Badge
                          variant={gatewayStatus.device.activeSimSlot === sim.slotIndex ? "default" : "secondary"}
                          className="text-[10px] font-semibold px-1.5 py-0"
                        >
                          {sim.carrier || sim.displayName || "Active SIM"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">{lang === "bn" ? "ডিফল্ট সিম ব্যবহৃত হবে" : "Default SIM active"}</span>
                  )}
                </CardContent>
              </Card>

              {/* Stats Card */}
              <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-medium flex items-center justify-between">
                    <span>{lang === "bn" ? "প্রেরিত এসএমএস" : "SMS Dispatched"}</span>
                    <Send className="w-4 h-4 text-blue-500" />
                  </CardDescription>
                  <CardTitle className="text-xl font-bold font-num text-foreground">
                    {(gatewayStatus.device.totalSent ?? 0).toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground ml-1">{lang === "bn" ? "টি" : "Sent"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>{lang === "bn" ? "আজ প্রেরিত" : "Today"}:</span>
                    <span className="font-semibold text-emerald-600 font-num">{gatewayStatus.queue.sentToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{lang === "bn" ? "পেন্ডিং কিউ" : "Pending Queue"}:</span>
                    <span className="font-semibold text-amber-600 font-num">{gatewayStatus.queue.pending}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 6-Digit Pairing & Setup Instructions */}
            <Card className="lg:col-span-2 rounded-2xl border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  {lang === "bn" ? "৬-ডিজিটের কোড দিয়ে মোবাইল পেয়ারিং" : "Pair Phone via 6-Digit Authorization Code"}
                </CardTitle>
                <CardDescription>
                  {lang === "bn"
                    ? "মোবাইলের HakimQzz SMS Gateway অ্যাপটি চালু করে নিচের ৬-ডিজিট কোডটি প্রবেশ করান।"
                    : "Enter this 6-digit code into your HakimQzz SMS Gateway Android app to instantly link your phone."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Giant 6-digit Code Display */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-muted/40 border border-border/80">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {lang === "bn" ? "আপনার ৬-ডিজিট পেয়ারিং কোড" : "Your 6-Digit Pairing Code"}
                    </span>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                      {String(gatewayStatus?.pairingCode || "784920")
                        .split("")
                        .map((digit, idx) => (
                          <React.Fragment key={idx}>
                            {idx === 3 && <span className="text-2xl font-bold text-muted-foreground px-1">-</span>}
                            <span className="w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-mono font-black bg-card border-2 border-emerald-500/40 text-emerald-600 rounded-xl shadow-xs">
                              {digit}
                            </span>
                          </React.Fragment>
                        ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (gatewayStatus?.pairingCode) {
                          navigator.clipboard.writeText(gatewayStatus.pairingCode);
                          toast.success(lang === "bn" ? "কোড কপি করা হয়েছে!" : "Pairing code copied to clipboard!");
                        }
                      }}
                      className="h-10 px-3 rounded-xl gap-1.5"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{lang === "bn" ? "কোড কপি" : "Copy Code"}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGeneratePairingCode}
                      disabled={codeGenerating}
                      className="h-10 px-3 rounded-xl gap-1.5"
                    >
                      <RefreshCw className={`w-4 h-4 ${codeGenerating ? "animate-spin" : ""}`} />
                      <span>{lang === "bn" ? "নতুন কোড তৈরি" : "Regenerate"}</span>
                    </Button>
                  </div>
                </div>

                {/* 3 Step Guide */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-1">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                      ১
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {lang === "bn" ? "১. অ্যাপ ডাউনলোড ও ওপেন" : "1. Download & Open App"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "bn"
                        ? "আপনার মোবাইল ফোনে HakimQzz SMS Gateway APK টি ইনস্টল করে ওপেন করুন।"
                        : "Download and launch HakimQzz SMS Gateway APK on your Android device."}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-1">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs flex items-center justify-center">
                      ২
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {lang === "bn" ? "২. পারমিশন অনুমোদন" : "2. Grant SMS Permissions"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "bn"
                        ? "অ্যাপে SMS ও ব্যাকগ্রাউন্ড পারমিশন দিন যাতে স্ক্রিন বন্ধ থাকলেও এসএমএস যায়।"
                        : "Allow SMS and battery optimization bypass so SMS delivers even in background."}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-1">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center">
                      ৩
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {lang === "bn" ? "৩. ৬-ডিজিট কোড দিয়ে কানেক্ট" : "3. Enter 6-Digit Code"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "bn"
                        ? "অ্যাপে উপরের ৬-ডিজিটের কোডটি লিখুন। সঙ্গে সঙ্গে স্ট্যাটাস 'Connected' হবে!"
                        : "Enter the 6-digit code in the app. Status turns green immediately!"}
                    </p>
                  </div>
                </div>

                {/* Installation Troubleshooting Banner */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{lang === "bn" ? "অ্যাপ ইনস্টল করতে সমস্যা বা 'App not installed' দেখালে:" : "If you see 'App not installed' or cannot install:"}</span>
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11.5px] leading-relaxed">
                    <li>
                      <strong>{lang === "bn" ? "পুরনো সংস্করণ আনইনস্টল করুন:" : "Uninstall previous version:"}</strong>{" "}
                      {lang === "bn"
                        ? "ফোনে আগে থেকে কোনো পুরনো HakimQzz POS বা Gateway অ্যাপ থাকলে সেটি আগে আনইনস্টল (Uninstall) করুন।"
                        : "If you previously installed an older version, please uninstall it first so Android accepts the new release signature."}
                    </li>
                    <li>
                      <strong>{lang === "bn" ? "অজানা সোর্স অনুমোদন (Unknown Sources):" : "Allow Unknown Sources:"}</strong>{" "}
                      {lang === "bn"
                        ? "ব্রাউজার বা ফাইল ম্যানেজার থেকে 'Install unknown apps' পারমিশন Allow করে দিন।"
                        : "Allow 'Install unknown apps' permission when prompted by Chrome/Downloads."}
                    </li>
                  </ul>
                </div>

                {/* Connected device fast actions */}
                {gatewayStatus?.device && (
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/60">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        {lang === "bn"
                          ? `কানেক্টেড ডিভাইস: ${gatewayStatus.device.model} (${gatewayStatus.device.name})`
                          : `Paired with ${gatewayStatus.device.model}`}
                      </span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleUnpairGateway}
                      disabled={unpairing}
                      className="h-8 rounded-lg text-xs gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === "bn" ? "ডিভাইস আনপেয়ার করুন" : "Unpair Device"}</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gateway Dispatch Route & Preference Settings */}
            <Card className="rounded-2xl border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="w-4 h-4 text-zinc-600" />
                  {lang === "bn" ? "এসএমএস রুট সেটিংস" : "SMS Route Preferences"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {lang === "bn"
                    ? "প্যানেল থেকে এসএমএস পাঠানোর মাধ্যম ও নিয়ম নির্বাচন করুন।"
                    : "Configure how messages sent from the panel should be delivered."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Gateway Mode */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {lang === "bn" ? "এসএমএস প্রেরক মাধ্যম (Gateway Route)" : "Gateway Route Mode"}
                  </Label>
                  <Select
                    value={gatewayMode}
                    onValueChange={(val: any) => setGatewayMode(val)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hybrid">
                        ⚡ {lang === "bn" ? "স্মার্ট হাইব্রিড (ফোন প্রথম, অফলাইনে MiMSMS)" : "Smart Hybrid (Phone first, MiMSMS fallback)"}
                      </SelectItem>
                      <SelectItem value="phone">
                        📱 {lang === "bn" ? "শুধুমাত্র মোবাইল ফোন (ফ্রি সিম এসএমএস)" : "Mobile Phone Only (SIM SMS)"}
                      </SelectItem>
                      <SelectItem value="mimsms">
                        🌐 {lang === "bn" ? "শুধুমাত্র MiMSMS ক্লাউড গেটওয়ে" : "MiMSMS Cloud API Only"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {gatewayMode === "hybrid"
                      ? lang === "bn"
                        ? "ফোন কানেক্টেড থাকলে ফোন সিম দিয়ে ফ্রি এসএমএস যাবে, ফোন বন্ধ থাকলে MiMSMS দিয়ে যাবে।"
                        : "Sends via phone SIM when online, falls back to MiMSMS if phone offline."
                      : gatewayMode === "phone"
                      ? lang === "bn"
                        ? "সব এসএমএস শুধুমাত্র মোবাইল ফোনের সিম কার্ড দিয়ে ডেলিভারি হবে (১০০% ফ্রি)।"
                        : "All SMS dispatched solely through your Android phone SIM card."
                      : lang === "bn"
                      ? "সব এসএমএস MiMSMS এপিআই দিয়ে যাবে।"
                      : "All SMS dispatched via MiMSMS cloud aggregator."}
                  </p>
                </div>

                {/* Preferred SIM Card */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {lang === "bn" ? "সিম কার্ড পছন্দ (Preferred SIM)" : "Preferred SIM Card"}
                  </Label>
                  <Select
                    value={String(preferredSim)}
                    onValueChange={(val) => setPreferredSim(parseInt(val, 10))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">SIM 1 (ডিফল্ট / স্লট ১)</SelectItem>
                      <SelectItem value="1">SIM 2 (স্লট ২)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Send Delay */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {lang === "bn" ? "এসএমএস প্রেরণের বিরতি (Anti-Spam Delay)" : "Dispatch Delay (Per SMS)"}
                  </Label>
                  <Select
                    value={String(sendDelaySec)}
                    onValueChange={(val) => setSendDelaySec(parseInt(val, 10))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">২ সেকেন্ড (সাধারণ)</SelectItem>
                      <SelectItem value="3">৩ সেকেন্ড (সুপারিশকৃত)</SelectItem>
                      <SelectItem value="5">৫ সেকেন্ড (বাল্কের জন্য নিরাপদ)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {lang === "bn"
                      ? "টেলিকম অপারেটরের স্প্যাম ব্লক এড়াতে বাল্ক এসএমএসে নির্দিষ্ট বিরতি রাখা উচিত।"
                      : "Prevents telco spam filtering during large broadcast campaigns."}
                  </p>
                </div>

                <Button
                  onClick={handleSaveGatewaySettings}
                  disabled={gatewaySettingsSaving}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9"
                >
                  {gatewaySettingsSaving ? "সংরক্ষণ হচ্ছে..." : lang === "bn" ? "সেটিংস সংরক্ষণ করুন" : "Save Route Settings"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Test Live Phone SMS Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 rounded-2xl border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  {lang === "bn" ? "মোবাইল দিয়ে টেস্ট এসএমএস" : "Live Test SMS via Phone"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {lang === "bn"
                    ? "আপনার মোবাইল সিম দিয়ে সরাসরি যেকোনো নম্বরে টেস্ট এসএমএস পাঠিয়ে যাচাই করুন।"
                    : "Send a test SMS through the connected phone to verify delivery."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="gw-test-num" className="text-xs font-semibold">
                    {lang === "bn" ? "টেস্ট মোবাইল নম্বর" : "Test Mobile Number"}
                  </Label>
                  <Input
                    id="gw-test-num"
                    placeholder="017XXXXXXXX"
                    value={gatewayTestNumber}
                    onChange={(e) => setGatewayTestNumber(e.target.value)}
                    className="rounded-xl font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="gw-test-msg" className="text-xs font-semibold">
                    {lang === "bn" ? "টেস্ট বার্তা" : "Test Message"}
                  </Label>
                  <Textarea
                    id="gw-test-msg"
                    placeholder="Hello! This is a test SMS from DreamFashion Android Gateway."
                    value={gatewayTestMessage}
                    onChange={(e) => setGatewayTestMessage(e.target.value)}
                    rows={2}
                    className="rounded-xl text-xs"
                  />
                </div>

                <Button
                  onClick={handleSendGatewayTest}
                  disabled={gatewayTestSending || !gatewayStatus?.isOnline}
                  className="w-full rounded-xl bg-primary font-semibold text-xs h-9 gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {gatewayTestSending
                      ? "পাঠানো হচ্ছে..."
                      : !gatewayStatus?.isOnline
                      ? lang === "bn"
                        ? "ফোন অফলাইন (চালু করুন)"
                        : "Phone Offline"
                      : lang === "bn"
                      ? "মোবাইল দিয়ে টেস্ট পাঠান"
                      : "Send Test SMS via Phone"}
                  </span>
                </Button>
              </CardContent>
            </Card>

            {/* Live Queue & Dispatch History Table */}
            <Card className="lg:col-span-2 rounded-2xl border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    {lang === "bn" ? "মোবাইল গেটওয়ে লাইভ হিস্টোরি ও কিউ" : "Mobile Gateway Live Queue & Logs"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {lang === "bn"
                      ? "মোবাইল ফোনের মাধ্যমে প্রেরিত সাম্প্রতিক বার্তার লাইভ স্ট্যাটাস।"
                      : "Recent SMS jobs queued and processed by the connected Android device."}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs font-mono">
                  {gatewayQueue.length} {lang === "bn" ? "টি" : "jobs"}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {gatewayQueue.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    {lang === "bn" ? "এখনো কোনো মেসেজ কিউতে নেই।" : "No recent SMS jobs queued for phone gateway."}
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 text-muted-foreground border-b border-border/60 sticky top-0 backdrop-blur">
                        <tr>
                          <th className="p-2.5 text-left font-semibold">{lang === "bn" ? "মোবাইল" : "Recipient"}</th>
                          <th className="p-2.5 text-left font-semibold">{lang === "bn" ? "বার্তা" : "Message"}</th>
                          <th className="p-2.5 text-center font-semibold">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                          <th className="p-2.5 text-right font-semibold">{lang === "bn" ? "সময়" : "Time"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {gatewayQueue.map((item: any) => (
                          <tr key={item.id} className="hover:bg-muted/30">
                            <td className="p-2.5 font-mono font-medium whitespace-nowrap">{item.phoneNumber}</td>
                            <td className="p-2.5 max-w-[220px] truncate text-muted-foreground" title={item.message}>
                              {item.message}
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold px-2 py-0 ${
                                  item.status === "delivered"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : item.status === "sending"
                                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30 animate-pulse"
                                    : item.status === "failed"
                                    ? "bg-red-500/10 text-red-600 border-red-500/30"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                }`}
                              >
                                {item.status}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* ─── SMS RECHARGE MODAL ────────────────────────────────────────── */}
      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent className="max-w-xl p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-primary/20 shadow-2xl space-y-5">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-inner">
                <Sparkles className="size-6 text-emerald-500 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {lang === "bn" ? "এসএমএস ব্যালেন্স রিচার্জ" : "Recharge SMS Credits"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  {lang === "bn"
                    ? "প্যাকেজ নির্বাচন করুন এবং সরাসরি হোয়াটসঅ্যাপে অ্যাডমিনের সাথে যোগাযোগ করে ব্যালেন্স রিচার্জ করুন।"
                    : "Select a package and contact admin on WhatsApp to instantly refill your SMS balance."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {[
              { count: 100, price: 50, nameBn: "স্টার্টার প্যাক", nameEn: "Starter Pack", rate: "৳0.50/SMS" },
              { count: 500, price: 225, nameBn: "জনপ্রিয় প্যাক", nameEn: "Popular Pack", rate: "৳0.45/SMS", popular: true },
              { count: 1000, price: 400, nameBn: "বিজনেস প্যাক", nameEn: "Business Pack", rate: "৳0.40/SMS" },
              { count: 5000, price: 1800, nameBn: "এন্টারপ্রাইজ প্যাক", nameEn: "Enterprise Pack", rate: "৳0.36/SMS" },
            ].map(pack => {
              const isSelected = selectedPackage.count === pack.count;
              return (
                <div
                  key={pack.count}
                  onClick={() => setSelectedPackage(pack)}
                  className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer select-none ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/20"
                      : "border-border/80 bg-card/60 hover:bg-card hover:border-emerald-500/40"
                  }`}
                >
                  {pack.popular && (
                    <Badge className="absolute -top-2.5 right-2 bg-emerald-600 hover:bg-emerald-600 text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider text-white shadow-xs">
                      Popular
                    </Badge>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground truncate">
                      {lang === "bn" ? pack.nameBn : pack.nameEn}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg sm:text-2xl font-bold font-num text-foreground">
                        {pack.count.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{lang === "bn" ? "টি এসএমএস" : "SMS"}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-num">
                        ৳{pack.price}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {pack.rate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* WhatsApp / Call Action Card */}
          {(() => {
            const adminWhatsapp = smsSettings?.admin_whatsapp || user?.admin_whatsapp || "8801700000000";
            const cleanNumber = adminWhatsapp.replace(/[^0-9]/g, "");
            const shopName = user?.business_name || "My Shop";
            const shopEmail = user?.email || "";
            const waText = encodeURIComponent(
              `Hello Admin, I want to recharge SMS credits for my shop "${shopName}" (${shopEmail}).\n\nSelected Package: ${selectedPackage.count} SMS (Price: Tk ${selectedPackage.price}).\nPlease refill my account.`
            );
            const waUrl = `https://wa.me/${cleanNumber.startsWith("88") ? cleanNumber : `880${cleanNumber}`}?text=${waText}`;

            return (
              <div className="space-y-3 pt-1">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm sm:text-base shadow-lg hover:shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  <MessageCircle className="size-5 fill-current" />
                  <span>
                    {lang === "bn"
                      ? `হোয়াটসঅ্যাপে ৳${selectedPackage.price} রিচার্জ মেসেজ দিন`
                      : `Request Recharge (Tk ${selectedPackage.price}) via WhatsApp`}
                  </span>
                </a>

                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground px-1">
                  <span>
                    {lang === "bn" ? "জরুরি প্রয়োজনে সরাসরি কল করুন:" : "Direct Hotline:"}{" "}
                    <a href={`tel:${adminWhatsapp}`} className="text-primary font-bold hover:underline font-num">
                      {adminWhatsapp}
                    </a>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setRechargeOpen(false)} className="h-7 text-xs">
                    {lang === "bn" ? "বাতিল" : "Cancel"}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Inspect Log Dialog */}
      <Dialog open={Boolean(inspectLog)} onOpenChange={open => !open && setInspectLog(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4 text-primary" />
              {lang === "bn" ? "এসএমএস প্রেরণের বিবরণ" : "SMS Dispatch Details"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {inspectLog && (inspectLog.created_at ? new Date(inspectLog.created_at).toLocaleString() : "N/A")}
            </DialogDescription>
          </DialogHeader>
          {inspectLog && (
            <div className="space-y-4 text-xs">
              <div className="bg-muted/50 p-3 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "bn" ? "টাইপ:" : "Type:"}</span>
                  <span className="font-semibold uppercase">{inspectLog.recipient_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "bn" ? "প্রাপক সংখ্যা:" : "Total Recipients:"}</span>
                  <span className="font-semibold font-num">{inspectLog.recipient_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "bn" ? "প্রাপকদের বিবরণ:" : "Recipients Summary:"}</span>
                  <span className="font-medium text-right max-w-[200px] truncate">{inspectLog.recipients_summary}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "bn" ? "স্ট্যাটাস:" : "Status:"}</span>
                  <Badge variant="outline">{inspectLog.status}</Badge>
                </div>
                {inspectLog.delivery_status && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DLR Delivery Status:</span>
                    <Badge variant="secondary" className="font-mono">{inspectLog.delivery_status}</Badge>
                  </div>
                )}
                {inspectLog.trxn_ids && inspectLog.trxn_ids.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="font-mono font-bold text-primary">{inspectLog.trxn_ids[0]}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-muted-foreground">{lang === "bn" ? "মেসেজ টেক্সট:" : "Message Content:"}</Label>
                <div className="p-3 bg-card border rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
                  {inspectLog.message}
                </div>
              </div>

              {inspectLog.trxn_ids && inspectLog.trxn_ids.length > 0 && (
                <Button
                  onClick={() => handleCheckDlr(inspectLog.trxn_ids[0], inspectLog.id)}
                  disabled={checkingDlr}
                  variant="outline"
                  className="w-full rounded-xl text-xs"
                >
                  {checkingDlr ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                  {lang === "bn" ? "লাইভ ডেলিভারি স্ট্যাটাস চেক করুন (DLR)" : "Query Live DLR Report"}
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInspectLog(null)} className="rounded-xl">
              {lang === "bn" ? "বন্ধ করুন" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
