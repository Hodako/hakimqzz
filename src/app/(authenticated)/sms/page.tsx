"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Send, Users, Truck, Sparkles, RefreshCw,
  Settings, CheckCircle2, AlertCircle, Clock, ShieldCheck,
  Eye, EyeOff, Plus, Trash2, Search, Smartphone, Info,
  Check, ArrowRight, ExternalLink, HelpCircle, FileText,
  BadgePercent, UserCheck, PhoneCall, Copy, MessageCircle
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
  getWhatsAppStatusFn,
  startWhatsAppSessionFn,
  disconnectWhatsAppSessionFn,
  sendWhatsAppMessageFn,
  sendWhatsAppCampaignFn,
} from "@/lib/rpc";
import { calculateSmsParts, sanitizeBdPhoneNumber } from "@/lib/mimsms";
import { QrCode, LogOut, CheckCircle, Wifi, WifiOff } from "lucide-react";

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

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => getCustomers(),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: () => getParties(),
  });

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
                ? "সতর্কতা: সার্ভার সংযোগে সমস্যা হচ্ছে। কিছুক্ষণ পর আবার চেষ্টা করুন।"
                : "Warning: SMS gateway connection issue. Please retry shortly."
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
    fetchBalance(false);
  }, []);

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

  // WhatsApp Integration State
  const [directChannel, setDirectChannel] = useState<"sms" | "whatsapp">("sms");
  const [custChannel, setCustChannel] = useState<"sms" | "whatsapp">("sms");
  const [suppChannel, setSuppChannel] = useState<"sms" | "whatsapp">("sms");

  const [waDirectRecipient, setWaDirectRecipient] = useState("");
  const [waDirectMessage, setWaDirectMessage] = useState("");
  const [waDirectSending, setWaDirectSending] = useState(false);
  const [waActionLoading, setWaActionLoading] = useState(false);

  // WhatsApp connection polling query
  const { data: waStatus, refetch: refetchWhatsAppStatus } = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: () => getWhatsAppStatusFn(),
    refetchInterval: (query) => {
      const data: any = query.state.data;
      if (data?.status === "connecting" || data?.status === "qr_ready") {
        return 3000;
      }
      return 15000;
    },
  });

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

  // Log inspection dialog
  const [inspectLog, setInspectLog] = useState<any | null>(null);
  const [checkingDlr, setCheckingDlr] = useState(false);
  const [logSearch, setLogSearch] = useState("");

  // Filtered lists
  const validCustomers = useMemo(() => {
    return customers.filter(c => c.phone && c.phone.trim().length >= 10);
  }, [customers]);

  const customersWithDues = useMemo(() => {
    // Collect customers with remaining dues
    const duePartyIds = new Set(sales.filter(s => (Number(s.due_amount) || 0) > 0 && s.party_id).map(s => s.party_id));
    return validCustomers.filter(c => duePartyIds.has(c.id));
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

  // WhatsApp Action: Start Session
  const handleStartWhatsApp = async () => {
    try {
      setWaActionLoading(true);
      await startWhatsAppSessionFn();
      await refetchWhatsAppStatus();
      toast.success(lang === "bn" ? "হোয়াটসঅ্যাপ লিংক করার প্রক্রিয়া শুরু হয়েছে..." : "WhatsApp linking initialized. Scan the QR code.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to initialize WhatsApp");
    } finally {
      setWaActionLoading(false);
    }
  };

  // WhatsApp Action: Disconnect Session
  const handleDisconnectWhatsApp = async () => {
    try {
      setWaActionLoading(true);
      await disconnectWhatsAppSessionFn();
      await refetchWhatsAppStatus();
      toast.success(lang === "bn" ? "হোয়াটসঅ্যাপ সংযোগ বিচ্ছিন্ন করা হয়েছে" : "WhatsApp disconnected successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to disconnect WhatsApp");
    } finally {
      setWaActionLoading(false);
    }
  };

  // WhatsApp Action: Send Direct Test
  const handleSendWhatsAppDirect = async () => {
    if (!waDirectRecipient.trim()) {
      toast.error(lang === "bn" ? "দয়া করে প্রাপকের মোবাইল নম্বর দিন" : "Please enter recipient phone number");
      return;
    }
    if (!waDirectMessage.trim()) {
      toast.error(lang === "bn" ? "দয়া করে বার্তা লিখুন" : "Please enter message text");
      return;
    }
    try {
      setWaDirectSending(true);
      await sendWhatsAppMessageFn({
        data: {
          phone: waDirectRecipient.trim(),
          message: waDirectMessage.trim(),
        },
      });
      toast.success(lang === "bn" ? "হোয়াটসঅ্যাপ বার্তা সফলভাবে পাঠানো হয়েছে!" : "WhatsApp message sent successfully!");
      setWaDirectMessage("");
      qc.invalidateQueries({ queryKey: ["sms-logs"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to send WhatsApp message");
    } finally {
      setWaDirectSending(false);
    }
  };

  // Action: Send Direct SMS or WhatsApp
  const handleSendDirect = async () => {
    if (!directNumbersList.length) {
      toast.error(lang === "bn" ? "দয়া করে অন্তত একটি সঠিক মোবাইল নম্বর লিখুন" : "Please enter at least one valid phone number");
      return;
    }
    if (!directMessage.trim()) {
      toast.error(lang === "bn" ? "দয়া করে বার্তা লিখুন" : "Please enter message text");
      return;
    }

    try {
      setDirectSending(true);
      if (directChannel === "whatsapp") {
        if (waStatus?.status !== "connected") {
          toast.error(lang === "bn" ? "হোয়াটসঅ্যাপ সংযুক্ত নেই! দয়া করে হোয়াটসঅ্যাপ ট্যাবে গিয়ে কিউআর স্ক্যান করুন।" : "WhatsApp is not connected! Please scan the QR code in the WhatsApp tab first.");
          setActiveTab("whatsapp");
          return;
        }

        const res: any = await sendWhatsAppCampaignFn({
          data: {
            recipientType: "direct_numbers",
            directNumbers,
            message: directMessage,
            campaignTitle: "Direct WhatsApp Message",
          },
        });

        toast.success(lang === "bn" ? `সফলভাবে ${res.successCount} টি হোয়াটসঅ্যাপ মেসেজ পাঠানো হয়েছে!` : `Successfully sent ${res.successCount} WhatsApp message(s)!`);
        setDirectMessage("");
        setDirectNumbers("");
        qc.invalidateQueries({ queryKey: ["sms-logs"] });
      } else {
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
          toast.success(lang === "bn" ? `সফলভাবে ${res.recipientCount} টি এসএমএস পাঠানো হয়েছে!` : `Successfully sent to ${res.recipientCount} recipient(s)!`);
          setDirectMessage("");
          setDirectNumbers("");
          qc.invalidateQueries({ queryKey: ["sms-logs"] });
          fetchBalance();
        } else {
          toast.error(res?.summary || (lang === "bn" ? "মেসেজ পাঠাতে ব্যর্থ হয়েছে" : "Failed to send message"));
        }
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
      if (custChannel === "whatsapp") {
        if (waStatus?.status !== "connected") {
          toast.error(lang === "bn" ? "হোয়াটসঅ্যাপ সংযুক্ত নেই! দয়া করে হোয়াটসঅ্যাপ ট্যাবে গিয়ে কিউআর স্ক্যান করুন।" : "WhatsApp is not connected! Please scan the QR code in the WhatsApp tab first.");
          setActiveTab("whatsapp");
          return;
        }

        const res: any = await sendWhatsAppCampaignFn({
          data: {
            recipientType: custTargetMode === "selected" ? "selected_customers" : "all_customers",
            selectedIds: custTargetMode === "selected" ? selectedCustIds : custTargetMode === "dues" ? customersWithDues.map(c => c.id) : undefined,
            message: custMessage,
            campaignTitle: custCampaignTitle || "Customer WhatsApp Campaign",
            isPersonalized: custPersonalized,
          },
        });

        toast.success(lang === "bn" ? `সফলভাবে ${res.successCount} জন কাস্টমারকে হোয়াটসঅ্যাপ বার্তা পাঠানো হয়েছে!` : `Successfully sent WhatsApp message to ${res.successCount} customer(s)!`);
        setCustMessage("");
        setCustCampaignTitle("");
        setSelectedCustIds([]);
        qc.invalidateQueries({ queryKey: ["sms-logs"] });
      } else {
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
      if (suppChannel === "whatsapp") {
        if (waStatus?.status !== "connected") {
          toast.error(lang === "bn" ? "হোয়াটসঅ্যাপ সংযুক্ত নেই! দয়া করে হোয়াটসঅ্যাপ ট্যাবে গিয়ে কিউআর স্ক্যান করুন।" : "WhatsApp is not connected! Please scan the QR code in the WhatsApp tab first.");
          setActiveTab("whatsapp");
          return;
        }

        const res: any = await sendWhatsAppCampaignFn({
          data: {
            recipientType: suppTargetMode === "selected" ? "selected_suppliers" : "all_suppliers",
            selectedIds: suppTargetMode === "selected" ? selectedSuppIds : undefined,
            message: suppMessage,
            campaignTitle: suppCampaignTitle || "Supplier WhatsApp Notice",
            isPersonalized: suppPersonalized,
          },
        });

        toast.success(lang === "bn" ? `সফলভাবে ${res.successCount} জন সাপ্লায়ারকে হোয়াটসঅ্যাপ বার্তা পাঠানো হয়েছে!` : `Successfully sent WhatsApp notice to ${res.successCount} supplier(s)!`);
        setSuppMessage("");
        setSuppCampaignTitle("");
        setSelectedSuppIds([]);
        qc.invalidateQueries({ queryKey: ["sms-logs"] });
      } else {
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
    <div className="p-2.5 sm:p-5 lg:p-8 max-w-7xl mx-auto space-y-3 sm:space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-primary/10 border border-emerald-500/20 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-base sm:text-2xl lg:text-3xl font-bold tracking-tight truncate whitespace-nowrap">
              {lang === "bn" ? "এসএমএস সিস্টেম ও বার্তা প্যানেল" : "SMS Management & Gateway"}
            </h1>
          </div>
          <p className="text-muted-foreground text-[11px] sm:text-sm truncate sm:whitespace-normal">
            {lang === "bn"
              ? "সাপ্লায়ার ও কাস্টমারদের কাছে বাল্ক ও অটোমেটিক বার্তা পাঠান।"
              : "Send broadcast SMS, promotional offers, and automatic notices."}
          </p>
        </div>

        {/* Real-time SMS Balance & Recharge Widget */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 bg-card/90 backdrop-blur border border-border/80 p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-sm shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              {lang === "bn" ? "অবশিষ্ট ক্রেডিট" : "SMS Credits"}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-2xl font-bold text-foreground font-num">
                {balanceLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-primary inline" />
                ) : balance !== null ? (
                  balance
                ) : smsSettings?.sms_credits !== undefined ? (
                  smsSettings.sms_credits
                ) : (
                  "0"
                )}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">{lang === "bn" ? "টি" : "SMS"}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchBalance(true)}
              disabled={balanceLoading}
              className="h-7 sm:h-9 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border-primary/30 hover:bg-primary/5 text-primary"
              title={lang === "bn" ? "ব্যালেন্স রিফ্রেশ" : "Refresh Balance"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${balanceLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => setRechargeOpen(true)}
              className="h-7 sm:h-9 px-2.5 sm:px-4 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-md gap-1 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>{lang === "bn" ? "রিচার্জ" : "Recharge"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-6">
        {/* Mobile View: Clean Dropdown Button with Short Titles */}
        <div className="block sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-10 rounded-xl bg-card border-border/80 font-semibold text-xs shadow-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">
                <div className="flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === "bn" ? "সরাসরি বার্তা" : "Direct Message"}</span>
                </div>
              </SelectItem>
              <SelectItem value="whatsapp">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{lang === "bn" ? "হোয়াটসঅ্যাপ ওয়েব" : "WhatsApp Web"}</span>
                  {waStatus?.status === "connected" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
              </SelectItem>
              <SelectItem value="customers">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lang === "bn" ? `কাস্টমার (${validCustomers.length})` : `Customers (${validCustomers.length})`}</span>
                </div>
              </SelectItem>
              <SelectItem value="suppliers">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-purple-600" />
                  <span>{lang === "bn" ? `সাপ্লায়ার (${validParties.length})` : `Suppliers (${validParties.length})`}</span>
                </div>
              </SelectItem>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>{lang === "bn" ? "অটো বার্তা" : "Auto SMS"}</span>
                </div>
              </SelectItem>
              <SelectItem value="logs">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === "bn" ? `হিস্টোরি (${smsLogs.length})` : `History (${smsLogs.length})`}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop View: Horizontal Tab List with Short Titles */}
        <div className="hidden sm:block overflow-x-auto pb-1">
          <TabsList className="bg-muted/70 p-1 rounded-xl sm:rounded-2xl h-auto flex flex-wrap gap-1">
            <TabsTrigger value="direct" className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === "bn" ? "সরাসরি" : "Direct"}</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>WhatsApp Web</span>
              {waStatus?.status === "connected" ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : waStatus?.status === "qr_ready" ? (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="customers" className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === "bn" ? "কাস্টমার" : "Customers"}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {validCustomers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-purple-600" />
              <span>{lang === "bn" ? "সাপ্লায়ার" : "Suppliers"}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {validParties.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="auto" className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === "bn" ? "অটো বার্তা" : "Auto SMS"}</span>
              {autoSmsEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === "bn" ? "হিস্টোরি" : "Logs"}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {smsLogs.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── TAB 1: DIRECT SMS ────────────────────────────────────────────── */}
        <TabsContent value="direct" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="lg:col-span-2 border-border/80 shadow-sm rounded-xl sm:rounded-2xl">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-lg font-bold truncate whitespace-nowrap">
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                  <span className="truncate">{lang === "bn" ? "যেকোনো নম্বরে সরাসরি এসএমএস পাঠান" : "Send Direct SMS"}</span>
                </CardTitle>
                <CardDescription className="text-xs hidden sm:block">
                  {lang === "bn"
                    ? "এক বা একাধিক মোবাইল নম্বরে দ্রুত কাস্টম বার্তা পাঠান।"
                    : "Enter mobile numbers separated by commas or line breaks."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                {/* Channel Selector Toggle (SMS vs WhatsApp) */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-border/60">
                  <div className="flex items-center gap-1 p-1 bg-muted/70 rounded-xl border border-border/80 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setDirectChannel("sms")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                        directChannel === "sms"
                          ? "bg-card text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5 text-blue-600" />
                      <span>SMS Gateway</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectChannel("whatsapp")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                        directChannel === "whatsapp"
                          ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs font-bold border border-emerald-500/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>WhatsApp Web</span>
                      {waStatus?.status === "connected" ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      ) : (
                        <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1.5 rounded-md">Scan QR</span>
                      )}
                    </button>
                  </div>

                  {directChannel === "whatsapp" && waStatus?.status !== "connected" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("whatsapp")}
                      className="h-8 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 rounded-xl gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{lang === "bn" ? "কিউআর কোড স্ক্যান করুন" : "Scan QR & Link Device"}</span>
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="direct-numbers" className="font-semibold text-xs sm:text-sm">
                      {lang === "bn" ? "মোবাইল নম্বরসমূহ" : "Mobile Numbers (01XXXXXXXXX)"}
                    </Label>
                    {directNumbersList.length > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {lang === "bn" ? `সঠিক নম্বর: ${directNumbersList.length} টি` : `Valid: ${directNumbersList.length}`}
                      </span>
                    )}
                  </div>
                  <Textarea
                    id="direct-numbers"
                    placeholder="017XXXXXXXX&#10;018XXXXXXXX&#10;019XXXXXXXX"
                    value={directNumbers}
                    onChange={e => setDirectNumbers(e.target.value)}
                    rows={2}
                    className="rounded-xl font-mono text-xs sm:text-sm min-h-[56px] py-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="direct-msg" className="font-semibold text-xs sm:text-sm">
                    {lang === "bn" ? "এসএমএস বার্তা" : "Message Content"}
                  </Label>
                  <Textarea
                    id="direct-msg"
                    placeholder={lang === "bn" ? "আপনার বার্তা লিখুন..." : "Type your SMS content here..."}
                    value={directMessage}
                    onChange={e => setDirectMessage(e.target.value.slice(0, 1000))}
                    maxLength={1000}
                    rows={3}
                    className="rounded-xl text-xs sm:text-sm min-h-[76px] py-2"
                  />
                  <SmsCharacterCounter message={directMessage} maxLength={1000} />
                </div>

                {/* Quick Templates */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {lang === "bn" ? "কুইক টেমপ্লেট:" : "Quick Preset Messages:"}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-lg h-7 px-2"
                      onClick={() => setDirectMessage("Dear Customer, thank you for shopping with us! Visit again soon.")}
                    >
                      {lang === "bn" ? "ধন্যবাদ বার্তা" : "Thank You"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-lg h-7 px-2"
                      onClick={() => setDirectMessage("সম্মানিত গ্রাহক, আপনার দোকানে কিছু বকেয়া রয়েছে। দয়া করে পরিশোধ করুন।")}
                    >
                      {lang === "bn" ? "বকেয়া তাগাদা" : "Due Reminder"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-lg h-7 px-2"
                      onClick={() => setDirectMessage("Special offer! Enjoy discount on our store products.")}
                    >
                      {lang === "bn" ? "অফার বার্তা" : "Promo Offer"}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      {lang === "bn" ? "রুট:" : "Route:"}
                    </Label>
                    <Select value={directTxType} onValueChange={(val: "T" | "P") => setDirectTxType(val)}>
                      <SelectTrigger className="h-8 w-36 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="T">{lang === "bn" ? "ট্রানজেকশনাল (T)" : "Transactional (T)"}</SelectItem>
                        <SelectItem value="P">{lang === "bn" ? "প্রোমোশনাল (P)" : "Promotional (P)"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSendDirect}
                    disabled={directSending || !directNumbersList.length || !directMessage.trim()}
                    className="w-full sm:w-auto rounded-xl px-5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm"
                  >
                    {directSending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                        {lang === "bn" ? "পাঠানো হচ্ছে..." : "Sending..."}
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-2" />
                        {lang === "bn" ? `পাঠান (${directNumbersList.length})` : `Send (${directNumbersList.length})`}
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
        <TabsContent value="customers" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <Card className="border-border/80 shadow-sm rounded-xl sm:rounded-2xl">
                <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-lg font-bold truncate whitespace-nowrap">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                    <span className="truncate">{lang === "bn" ? "কাস্টমার এসএমএস ও অফার ক্যাম্পেইন" : "Customer Bulk SMS & Offers"}</span>
                  </CardTitle>
                  <CardDescription className="text-xs hidden sm:block">
                    {lang === "bn"
                      ? "সকল বা নির্দিষ্ট কাস্টমারদের কাছে ডিসকাউন্ট, বিশেষ অফার বা গুরুত্বপূর্ণ নোটিশ পাঠান।"
                      : "Send promotional offers, seasonal discounts, or general notices to customers."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3.5 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                  {/* Channel Selector Toggle (SMS vs WhatsApp) */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-border/60">
                    <div className="flex items-center gap-1 p-1 bg-muted/70 rounded-xl border border-border/80 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setCustChannel("sms")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          custChannel === "sms"
                            ? "bg-card text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Send className="w-3.5 h-3.5 text-blue-600" />
                        <span>SMS Gateway</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustChannel("whatsapp")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          custChannel === "whatsapp"
                            ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs font-bold border border-emerald-500/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>WhatsApp Web</span>
                        {waStatus?.status === "connected" ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        ) : (
                          <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1.5 rounded-md">Scan QR</span>
                        )}
                      </button>
                    </div>

                    {custChannel === "whatsapp" && waStatus?.status !== "connected" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab("whatsapp")}
                        className="h-8 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 rounded-xl gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{lang === "bn" ? "কিউআর কোড স্ক্যান করুন" : "Scan QR & Link Device"}</span>
                      </Button>
                    )}
                  </div>

                  {/* Target Audience Selector */}
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs sm:text-sm">
                      {lang === "bn" ? "প্রাপক কাস্টমার:" : "Target Audience:"}
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setCustTargetMode("all")}
                        className={`p-2 sm:p-3 rounded-xl border text-left transition-all ${
                          custTargetMode === "all"
                            ? "border-blue-600 bg-blue-500/10 ring-2 ring-blue-500/20"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span className="font-semibold text-xs truncate">{lang === "bn" ? "সকল কাস্টমার" : "All"}</span>
                          <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-num block">
                          {validCustomers.length} {lang === "bn" ? "জন" : "recipients"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustTargetMode("dues")}
                        className={`p-2 sm:p-3 rounded-xl border text-left transition-all ${
                          custTargetMode === "dues"
                            ? "border-amber-600 bg-amber-500/10 ring-2 ring-amber-500/20"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span className="font-semibold text-xs truncate">{lang === "bn" ? "বকেয়াদার" : "With Dues"}</span>
                          <PhoneCall className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-num block">
                          {customersWithDues.length} {lang === "bn" ? "জন" : "recipients"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustTargetMode("selected")}
                        className={`p-2 sm:p-3 rounded-xl border text-left transition-all ${
                          custTargetMode === "selected"
                            ? "border-purple-600 bg-purple-500/10 ring-2 ring-purple-500/20"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span className="font-semibold text-xs truncate">{lang === "bn" ? "বাছাইকৃত" : "Custom"}</span>
                          <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-num block">
                          {selectedCustIds.length} {lang === "bn" ? "জন" : "selected"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Campaign Title */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-camp-title" className="font-semibold text-xs sm:text-sm">
                      {lang === "bn" ? "ক্যাম্পেইন শিরোনাম (অপশনাল)" : "Campaign Title (Optional)"}
                    </Label>
                    <Input
                      id="cust-camp-title"
                      placeholder="e.g. Special Discount 20%, Notice"
                      value={custCampaignTitle}
                      onChange={e => setCustCampaignTitle(e.target.value)}
                      className="rounded-xl h-9 text-xs sm:text-sm"
                    />
                  </div>

                  {/* Message Composer */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-msg" className="font-semibold text-xs sm:text-sm">
                      {lang === "bn" ? "অফার বা প্রচারমূলক বার্তা" : "Offer / Promotional Message"}
                    </Label>
                    <Textarea
                      id="cust-msg"
                      placeholder={
                        lang === "bn"
                          ? "প্রিয় {customer_name}, বিশেষ ছাড় শুরু হয়েছে! আজই ভিজিট করুন..."
                          : "Dear {customer_name}, special discount at our store!"
                      }
                      value={custMessage}
                      onChange={e => setCustMessage(e.target.value.slice(0, 1000))}
                      maxLength={1000}
                      rows={3}
                      className="rounded-xl text-xs sm:text-sm min-h-[76px] py-2"
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
        <TabsContent value="suppliers" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <Card className="border-border/80 shadow-sm rounded-xl sm:rounded-2xl">
                <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-lg font-bold truncate whitespace-nowrap">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 shrink-0" />
                    <span className="truncate">{lang === "bn" ? "সাপ্লায়ার ও পার্টনারদের এসএমএস বার্তা" : "Supplier SMS"}</span>
                  </CardTitle>
                  <CardDescription className="text-xs hidden sm:block">
                    {lang === "bn"
                      ? "পণ্য ক্রয় সংক্রান্ত অর্ডার বা পেমেন্ট কনফার্মেশন বার্তা পাঠান।"
                      : "Send purchase requests or payment notices directly to suppliers."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3.5 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                  {/* Channel Selector Toggle (SMS vs WhatsApp) */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-border/60">
                    <div className="flex items-center gap-1 p-1 bg-muted/70 rounded-xl border border-border/80 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setSuppChannel("sms")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          suppChannel === "sms"
                            ? "bg-card text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Send className="w-3.5 h-3.5 text-blue-600" />
                        <span>SMS Gateway</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuppChannel("whatsapp")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          suppChannel === "whatsapp"
                            ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs font-bold border border-emerald-500/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>WhatsApp Web</span>
                        {waStatus?.status === "connected" ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        ) : (
                          <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1.5 rounded-md">Scan QR</span>
                        )}
                      </button>
                    </div>

                    {suppChannel === "whatsapp" && waStatus?.status !== "connected" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab("whatsapp")}
                        className="h-8 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 rounded-xl gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{lang === "bn" ? "কিউআর কোড স্ক্যান করুন" : "Scan QR & Link Device"}</span>
                      </Button>
                    )}
                  </div>

                  {/* Target Supplier Selector */}
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs sm:text-sm">
                      {lang === "bn" ? "প্রাপক সাপ্লায়ার:" : "Target Suppliers:"}
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setSuppTargetMode("all")}
                        className={`p-2 sm:p-3 rounded-xl border text-left transition-all ${
                          suppTargetMode === "all"
                            ? "border-purple-600 bg-purple-500/10 ring-2 ring-purple-500/20"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-xs truncate">{lang === "bn" ? "সকল সাপ্লায়ার" : "All"}</span>
                          <Truck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-num block">
                          {validParties.length} {lang === "bn" ? "জন" : "suppliers"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSuppTargetMode("selected")}
                        className={`p-2 sm:p-3 rounded-xl border text-left transition-all ${
                          suppTargetMode === "selected"
                            ? "border-purple-600 bg-purple-500/10 ring-2 ring-purple-500/20"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-xs truncate">{lang === "bn" ? "বাছাইকৃত" : "Selected"}</span>
                          <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-num block">
                          {selectedSuppIds.length} {lang === "bn" ? "জন" : "selected"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Message Composer */}
                  <div className="space-y-1.5">
                    <Label htmlFor="supp-msg" className="font-semibold text-xs sm:text-sm">
                      {lang === "bn" ? "বার্তা" : "Supplier Message"}
                    </Label>
                    <Textarea
                      id="supp-msg"
                      placeholder={
                        lang === "bn"
                          ? "সম্মানিত সাপ্লায়ার, নতুন অর্ডারের মাল দ্রুত পাঠান..."
                          : "Dear Supplier, please confirm dispatch."
                      }
                      value={suppMessage}
                      onChange={e => setSuppMessage(e.target.value.slice(0, 1000))}
                      maxLength={1000}
                      rows={3}
                      className="rounded-xl text-xs sm:text-sm min-h-[76px] py-2"
                    />
                    <SmsCharacterCounter message={suppMessage} maxLength={1000} />
                  </div>

                  {/* Preset Templates */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs text-muted-foreground font-medium">
                      {lang === "bn" ? "সাপ্লায়ার টেমপ্লেট:" : "Presets:"}
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-lg h-7 px-2"
                        onClick={() => setSuppMessage("সম্মানিত সাপ্লায়ার, আমাদের নতুন লটের পণ্যের তাগাদা ও রেট জানার জন্য যোগাযোগ করছি।")}
                      >
                        {lang === "bn" ? "নতুন স্টক অর্ডার" : "Stock Inquiry"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-lg h-7 px-2"
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
        <TabsContent value="auto" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="lg:col-span-2 border-border/80 shadow-sm rounded-xl sm:rounded-2xl">
              <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-lg font-bold truncate whitespace-nowrap">
                    <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                    <span className="truncate">{lang === "bn" ? "পণ্য ক্রয়ের পর স্বয়ংক্রিয় এসএমএস" : "Auto SMS on Purchase"}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 bg-muted/60 px-2 py-1 rounded-xl shrink-0">
                    <Switch
                      id="auto-sms-toggle"
                      checked={autoSmsEnabled}
                      onCheckedChange={setAutoSmsEnabled}
                    />
                    <Label htmlFor="auto-sms-toggle" className="font-bold text-[11px] cursor-pointer">
                      {autoSmsEnabled ? (
                        <span className="text-emerald-600">{lang === "bn" ? "চালু" : "ON"}</span>
                      ) : (
                        <span className="text-muted-foreground">{lang === "bn" ? "বন্ধ" : "OFF"}</span>
                      )}
                    </Label>
                  </div>
                </div>
                <CardDescription className="text-xs hidden sm:block">
                  {lang === "bn"
                    ? "কাস্টমারের ফোন নম্বরে বিক্রি বা ইনভয়েস তৈরি হওয়ার সাথে সাথে অটো কনফার্মেশন এসএমএস পাঠানো হবে।"
                    : "Automatically dispatches an SMS whenever a sale is completed."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="auto-template" className="font-semibold text-xs sm:text-sm">
                    {lang === "bn" ? "স্বয়ংক্রিয় বার্তা টেমপ্লেট" : "Purchase Confirmation Template"}
                  </Label>
                  <Textarea
                    id="auto-template"
                    value={autoSmsTemplate}
                    onChange={e => setAutoSmsTemplate(e.target.value.slice(0, 1000))}
                    maxLength={1000}
                    rows={3}
                    className="rounded-xl text-xs sm:text-sm leading-relaxed min-h-[76px] py-2"
                  />
                  <SmsCharacterCounter message={autoSmsTemplate} maxLength={1000} />
                </div>

                {/* Variable Inserters */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {lang === "bn" ? "যোগ করার ভ্যারিয়েবলসমূহ:" : "Available Placeholders:"}
                  </Label>
                  <div className="flex flex-wrap gap-1 font-mono text-xs">
                    {[
                      { key: "{customer_name}", desc: "নাম" },
                      { key: "{shop_name}", desc: "দোকান" },
                      { key: "{product_name}", desc: "পণ্য" },
                      { key: "{qty}", desc: "পরিমাণ" },
                      { key: "{total_amount}", desc: "মোট" },
                      { key: "{paid_amount}", desc: "জমা" },
                      { key: "{due_amount}", desc: "বাকী" },
                      { key: "{invoice_id}", desc: "ইনভয়েস" },
                    ].map(item => (
                      <Button
                        key={item.key}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-6 text-[11px] rounded-lg bg-muted hover:bg-muted/80 px-1.5"
                        onClick={() => setAutoSmsTemplate(prev => prev + " " + item.key)}
                      >
                        + {item.key}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Test SMS Box */}
                <div className="p-3 bg-muted/30 border border-border/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-primary" />
                    <Label className="text-xs font-semibold">
                      {lang === "bn" ? "টেস্ট এসএমএস:" : "Send Test SMS:"}
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="01XXXXXXXXX"
                      value={autoTestNumber}
                      onChange={e => setAutoTestNumber(e.target.value)}
                      className="rounded-xl h-8 text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSendTestAutoSms}
                      disabled={autoTestSending || !autoTestNumber}
                      className="rounded-xl h-8 text-xs flex-shrink-0 px-3"
                    >
                      {autoTestSending ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                      {lang === "bn" ? "টেস্ট" : "Test"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t">
                  <Button
                    onClick={handleSaveAutoSms}
                    disabled={autoSaving}
                    className="w-full sm:w-auto rounded-xl px-5 h-9 bg-primary text-primary-foreground font-medium text-xs sm:text-sm"
                  >
                    {autoSaving ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-2" />}
                    {lang === "bn" ? "সেভ করুন" : "Save Settings"}
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
                      const dateStr = new Date(log.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const isSuccess = log.status === "Success";
                      const trxnId = log.trxn_ids && log.trxn_ids[0];

                      return (
                        <div key={log.id} className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2.5 shadow-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-xs text-foreground">
                                  {log.campaign_title || log.recipient_type}
                                </p>
                                {log.channel === "whatsapp" || log.gateway === "WhatsApp Web" ? (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 px-1.5 py-0">
                                    <MessageCircle className="w-2.5 h-2.5" />
                                    <span>WhatsApp</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1 px-1.5 py-0">
                                    <Send className="w-2.5 h-2.5" />
                                    <span>SMS</span>
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {dateStr}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                  isSuccess || log.status === "Delivered"
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
                              {lang === "bn" ? "প্রাপক:" : "Recipients:"} <strong className="text-foreground">{log.recipient_count || 1}</strong> ({log.recipients_summary || log.recipient})
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
                          <th className="p-3">{lang === "bn" ? "চ্যানেল ও টাইপ" : "Channel & Title"}</th>
                          <th className="p-3">{lang === "bn" ? "প্রাপক" : "Recipients"}</th>
                          <th className="p-3">{lang === "bn" ? "বার্তা" : "Message"}</th>
                          <th className="p-3">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                          <th className="p-3 text-right">{lang === "bn" ? "অ্যাকশন" : "Actions"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-sans">
                        {filteredLogs.map((log: any) => {
                          const dateStr = new Date(log.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          const isSuccess = log.status === "Success" || log.status === "Delivered";
                          const trxnId = log.trxn_ids && log.trxn_ids[0];

                          return (
                            <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                                {dateStr}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-xs text-foreground">
                                      {log.campaign_title || log.recipient_type || "Direct"}
                                    </span>
                                    {log.channel === "whatsapp" || log.gateway === "WhatsApp Web" ? (
                                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 px-1.5 py-0">
                                        <MessageCircle className="w-2.5 h-2.5" />
                                        <span>WhatsApp</span>
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1 px-1.5 py-0">
                                        <Send className="w-2.5 h-2.5" />
                                        <span>SMS</span>
                                      </Badge>
                                    )}
                                  </div>
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

        {/* ─── TAB: WHATSAPP WEB LINK & MESSAGING ──────────────────────────── */}
        <TabsContent value="whatsapp" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* WhatsApp Device Connection / QR Scanner Card */}
            <Card className="lg:col-span-5 border-emerald-500/30 bg-card shadow-sm rounded-xl sm:rounded-3xl overflow-hidden flex flex-col justify-between">
              <CardHeader className="p-4 sm:p-6 pb-3 border-b border-border/60 bg-emerald-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg font-bold">
                        {lang === "bn" ? "হোয়াটসঅ্যাপ ডিভাইস লিংক" : "WhatsApp Device Pairing"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {lang === "bn" ? "কিউআর কোড স্ক্যান করে কানেক্ট করুন" : "Scan QR code to link your WhatsApp Web"}
                      </CardDescription>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      waStatus?.status === "connected"
                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                        : waStatus?.status === "qr_ready"
                        ? "bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {waStatus?.status === "connected"
                      ? "Connected"
                      : waStatus?.status === "qr_ready"
                      ? "Scan QR Code"
                      : waStatus?.status === "connecting"
                      ? "Connecting..."
                      : "Offline"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-4 flex flex-col items-center justify-center text-center">
                {waStatus?.status === "connected" ? (
                  <div className="py-6 space-y-4 flex flex-col items-center w-full">
                    <div className="size-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                      <CheckCircle className="size-10 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground">
                        {lang === "bn" ? "হোয়াটসঅ্যাপ সফলভাবে সংযুক্ত আছে" : "WhatsApp Web Connected"}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {waStatus.phone ? `+${waStatus.phone}` : "Linked Device"} {waStatus.name ? `(${waStatus.name})` : ""}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 text-xs text-muted-foreground max-w-sm text-left space-y-1">
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <Wifi className="size-3.5 text-emerald-500" />
                        <span>Ready to send free WhatsApp messages</span>
                      </div>
                      <p className="text-[11px]">You can now send direct messages and broadcast campaigns via WhatsApp without deducting SMS balance.</p>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={waActionLoading}
                      onClick={handleDisconnectWhatsApp}
                      className="rounded-xl h-9 px-4 text-xs font-semibold gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{lang === "bn" ? "হোয়াটসঅ্যাপ ডিসকানেক্ট করুন" : "Disconnect WhatsApp"}</span>
                    </Button>
                  </div>
                ) : waStatus?.status === "qr_ready" && waStatus.qrCodeDataUrl ? (
                  <div className="space-y-4 flex flex-col items-center w-full">
                    <div className="p-3 bg-white rounded-2xl border border-border shadow-md">
                      <img
                        src={waStatus.qrCodeDataUrl}
                        alt="WhatsApp QR Code"
                        className="size-56 sm:size-64 object-contain rounded-lg"
                      />
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-xs font-bold text-foreground">
                        {lang === "bn" ? "আপনার মোবাইলের হোয়াটসঅ্যাপ দিয়ে স্ক্যান করুন" : "Scan with WhatsApp on your phone"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Settings &gt; Linked Devices &gt; Link a Device
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => refetchWhatsAppStatus()}
                      className="h-8 text-xs rounded-xl gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{lang === "bn" ? "কিউআর রিফ্রেশ করুন" : "Refresh Status"}</span>
                    </Button>
                  </div>
                ) : (
                  <div className="py-8 space-y-4 flex flex-col items-center w-full">
                    <div className="size-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground">
                      <QrCode className="size-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">
                        {lang === "bn" ? "হোয়াটসঅ্যাপ যুক্ত নেই" : "WhatsApp Not Linked"}
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {lang === "bn"
                          ? "নিচের বাটনে ক্লিক করে কিউআর কোড জেনারেট করুন এবং মোবাইল দিয়ে স্ক্যান করুন।"
                          : "Generate a QR pairing code to link your store WhatsApp account."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      disabled={waActionLoading}
                      onClick={handleStartWhatsApp}
                      className="rounded-xl h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md gap-2"
                    >
                      {waActionLoading ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          <span>Generating QR...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="size-4" />
                          <span>{lang === "bn" ? "কিউআর কোড আনুন" : "Link WhatsApp (Scan QR)"}</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>

              {/* Instructions Footer */}
              <CardFooter className="p-4 bg-muted/30 border-t border-border/60 text-xs text-muted-foreground flex flex-col items-start gap-1">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <Info className="size-3.5 text-primary" />
                  <span>{lang === "bn" ? "কীভাবে কানেক্ট করবেন:" : "How to connect:"}</span>
                </p>
                <ol className="list-decimal list-inside text-[11px] space-y-0.5 text-muted-foreground">
                  <li>{lang === "bn" ? "ফোনে WhatsApp অ্যাপ খুলুন" : "Open WhatsApp on your phone"}</li>
                  <li>{lang === "bn" ? "Settings / Menu &gt; Linked Devices এ যান" : "Go to Settings > Linked Devices"}</li>
                  <li>{lang === "bn" ? "'Link a Device' চাপুন এবং কিউআর কোডটি স্ক্যান করুন" : "Tap 'Link a Device' and point your camera at this QR"}</li>
                </ol>
              </CardFooter>
            </Card>

            {/* Direct WhatsApp Sender Card */}
            <Card className="lg:col-span-7 border-border/80 shadow-sm rounded-xl sm:rounded-3xl">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                  <span>{lang === "bn" ? "হোয়াটসঅ্যাপে সরাসরি মেসেজ পাঠান" : "Send WhatsApp Message"}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {lang === "bn"
                    ? "কোন ক্রেডিট চার্জ ছাড়াই যেকোনো সক্রিয় হোয়াটসঅ্যাপ নম্বরে সরাসরি বার্তা পাঠান।"
                    : "Send direct notifications and customer updates with zero SMS credit deduction."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="wa-recipient" className="font-semibold text-xs sm:text-sm">
                    {lang === "bn" ? "প্রাপকের হোয়াটসঅ্যাপ মোবাইল নম্বর" : "Recipient WhatsApp Number"}
                  </Label>
                  <Input
                    id="wa-recipient"
                    placeholder="017XXXXXXXX or 88017XXXXXXXX"
                    value={waDirectRecipient}
                    onChange={e => setWaDirectRecipient(e.target.value)}
                    className="h-10 rounded-xl font-mono text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="wa-message" className="font-semibold text-xs sm:text-sm">
                    {lang === "bn" ? "বার্তা লিখুন (WhatsApp Message)" : "Message Text"}
                  </Label>
                  <Textarea
                    id="wa-message"
                    placeholder={lang === "bn" ? "আপনার হোয়াটসঅ্যাপ বার্তা এখানে লিখুন..." : "Type your WhatsApp message..."}
                    value={waDirectMessage}
                    onChange={e => setWaDirectMessage(e.target.value)}
                    rows={4}
                    className="rounded-xl text-xs sm:text-sm min-h-[90px]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                      WhatsApp Direct (Free)
                    </Badge>
                    <span>{waDirectMessage.length} Characters</span>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {lang === "bn" ? "কুইক টেমপ্লেট:" : "Quick Preset Messages:"}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-lg h-7 px-2"
                      onClick={() => setWaDirectMessage("Dear Customer, thank you for shopping with us! Have a wonderful day.")}
                    >
                      {lang === "bn" ? "ধন্যবাদ বার্তা" : "Thank You"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-lg h-7 px-2"
                      onClick={() => setWaDirectMessage("সম্মানিত গ্রাহক, আপনার কেনাকাটার জন্য আন্তরিক ধন্যবাদ! যেকোনো প্রয়োজনে যোগাযোগ করুন।")}
                    >
                      {lang === "bn" ? "কাস্টমার নোটিশ" : "Customer Notice"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-lg h-7 px-2"
                      onClick={() => setWaDirectMessage("সম্মানিত গ্রাহক, আপনার বকেয়া হিসাবটি অনুগ্রহ করে পরিশোধ করার জন্য অনুরোধ করা হচ্ছে।")}
                    >
                      {lang === "bn" ? "বকেয়া তাগাদা" : "Due Reminder"}
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    disabled={waDirectSending || waStatus?.status !== "connected"}
                    onClick={handleSendWhatsAppDirect}
                    className="w-full sm:w-auto h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md gap-2"
                  >
                    {waDirectSending ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Sending WhatsApp...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        <span>{lang === "bn" ? "হোয়াটসঅ্যাপে পাঠান" : "Send WhatsApp Message"}</span>
                      </>
                    )}
                  </Button>
                </div>
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
              {inspectLog && new Date(inspectLog.created_at).toLocaleString()}
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
