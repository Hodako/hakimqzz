"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart, Receipt, PiggyBank, DollarSign,
  Banknote, BarChart3, Settings, FileText,
  LogOut, TrendingUp, TrendingDown, GripVertical, Palette,
  Layout, Type, Image as ImageIcon, Sparkles, LayoutGrid, AlignLeft, AlignCenter, AlignRight,
  Bot, Send, Loader2, HelpCircle
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, resolvePermissions } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

const businessLinks = [
  { to: "/invoices",       labelKey: "invoice_generator", desc: "Create & customize invoices", icon: FileText,     perm: "sales"      as const },
  { to: "/purchases",      labelKey: "new_purchase",    desc: "Log product inventory buys", icon: ShoppingCart, perm: "purchases"  as const },
  { to: "/online-sells",   labelKey: "online_sell",     desc: "Track web and online sales", icon: DollarSign,   perm: "sales"      as const },
  { to: "/dues",           labelKey: "due",             desc: "Total customer outstanding dues", icon: Banknote, perm: "parties"    as const },
  { to: "/settings",       labelKey: "settings",        desc: "Business profile & settings", icon: Settings,     perm: "settings"   as const },
] as const;

const financeLinks = [
  { to: "/expenses",       labelKey: "expenses",        desc: "Record overhead expenses", icon: Receipt, imageUrl: "https://img.icons8.com/color/48/tax.png", perm: "expenses"   as const },
  { to: "/somiti",         labelKey: "somiti",          desc: "Manage Somiti accounts", icon: PiggyBank,    perm: "expenses"   as const },
  { to: "/cash-management",labelKey: "cash_management", desc: "Cashbox ledger & cashflow", icon: Banknote,     perm: "expenses"   as const },
  { to: "/profits",        labelKey: "profit",          desc: "Sales margins & net profits", icon: TrendingUp,  perm: "reports"    as const },
  { to: "/losses",         labelKey: "losses",          desc: "Analyze transactional losses", icon: TrendingDown, perm: "reports" as const },
  { to: "/trackback",      labelKey: "trackback",       desc: "Comparative metrics chart", icon: BarChart3,    perm: "reports"    as const },
  { to: "/reports",        labelKey: "reports_generator", desc: "Generate custom PDF reports", icon: FileText, perm: "reports"    as const },
  { to: "/ai-audits",      labelKey: "ai_audits",       desc: "Chat with AI about your business", icon: Sparkles, perm: "reports"    as const },
] as const;

export default function MorePage() {
  const { lang, t } = useT();
  const { user, logout, isUploading, uploadProgress, uploadProfilePic } = useAuth();
  const perms = resolvePermissions(user?.role ?? "employee", user?.permissions);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  interface Message {
    role: "system" | "user" | "assistant";
    content: string;
  }

  // AI Assistant Tab states
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const aiSuggestions = lang === "bn"
    ? [
        { label: "লাভ বা মুনাফা কত?", text: "লাভ বা মুনাফা কত?" },
        { label: "ব্যবসায়ের সমস্যা কোথায়?", text: "ব্যবসায়ের সমস্যা কোথায়?" },
        { label: "সংকটজনক স্টক কোনগুলো?", text: "সংকটজনক স্টক কোনগুলো এবং কোন পণ্যের স্টক কম?" },
        { label: "কোথায় আপডেট করতে হবে?", text: "ব্যবসায়ের উন্নতির জন্য কোথায় আপডেট বা পরিবর্তন করতে হবে?" },
        { label: "সার্বিক বিশ্লেষণ দিন", text: "দয়া করে আমার ব্যবসার একটি সার্বিক বিশ্লেষণ ও পরামর্শ দিন।" },
      ]
    : [
        { label: "What is the profits?", text: "What is the profits?" },
        { label: "Where is the business problems?", text: "Where is the business problems?" },
        { label: "What is the critical stocks?", text: "What is the critical stocks and which products have less number in stocks?" },
        { label: "Where have to update?", text: "Where do we have to update or make changes for the business?" },
        { label: "Total analyzation of the business", text: "Provide a total analyzation and health check of the business." },
      ];

  const handleAiSend = async (textToSend: string) => {
    if (!textToSend.trim() || aiLoading) return;

    const userMessage: Message = { role: "user", content: textToSend };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setAiInput("");
    setAiLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          lang,
        }),
      });

      if (!res.ok) {
        throw new Error(lang === "bn" ? "এআই সার্ভার থেকে সাড়া পাওয়া যায়নি" : "Failed to get response from AI");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      toast.error(err.message || String(err));
      // Remove last user message on failure
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setAiLoading(false);
    }
  };

  // Helper to parse both markdown **bold** and standard HTML tags in AI responses
  const parseBold = (text: string) => {
    const converted = text.replace(/\*\*([\s\S]*?)\*\*/g, "<strong>$1</strong>");
    const tagRegex = /(<[^>]+>)/g;
    const parts = converted.split(tagRegex);
    
    let elements: React.ReactNode[] = [];
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    let textColor = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      
      if (part.startsWith("<") && part.endsWith(">")) {
        const lowercaseTag = part.toLowerCase();
        if (lowercaseTag.startsWith("<span")) {
          const colorMatch = part.match(/style=["'][^"']*color:\s*([^;'"\s]+)/i);
          if (colorMatch) {
            textColor = colorMatch[1];
          }
          const classMatch = part.match(/class=["'][^"']*text-([a-z0-9-]+)/i);
          if (classMatch) {
            const colorClass = classMatch[1];
            if (colorClass === "primary") textColor = "var(--primary)";
            else if (colorClass === "rose-500") textColor = "#f43f5e";
            else if (colorClass === "emerald-500") textColor = "#10b981";
            else if (colorClass === "amber-500") textColor = "#f59e0b";
          }
        } else if (lowercaseTag === "</span>") {
          textColor = "";
        } else if (lowercaseTag === "<b>" || lowercaseTag === "<strong>") {
          isBold = true;
        } else if (lowercaseTag === "</b>" || lowercaseTag === "</strong>") {
          isBold = false;
        } else if (lowercaseTag === "<i>" || lowercaseTag === "<em>") {
          isItalic = true;
        } else if (lowercaseTag === "</i>" || lowercaseTag === "</em>") {
          isItalic = false;
        } else if (lowercaseTag === "<u>") {
          isUnderline = true;
        } else if (lowercaseTag === "</u>") {
          isUnderline = false;
        }
      } else {
        let style: React.CSSProperties = {};
        if (textColor) style.color = textColor;
        
        let el: React.ReactNode = part;
        if (isBold) el = <strong key={i} className="font-bold text-zinc-950 dark:text-white">{el}</strong>;
        if (isItalic) el = <em key={i} className="italic">{el}</em>;
        if (isUnderline) el = <u key={i}>{el}</u>;
        if (textColor) el = <span key={i} style={style}>{el}</span>;
        
        elements.push(el);
      }
    }
    
    return elements.length > 0 ? elements : text;
  };

  const renderStructuredContent = (content: string) => {
    const lines = content.split("\n");
    let elements: React.ReactNode[] = [];
    
    let currentList: { type: "bullet" | "number"; items: string[] } | null = null;
    
    const flushList = (key: string | number) => {
      if (!currentList) return null;
      const list = currentList;
      currentList = null;
      
      if (list.type === "bullet") {
        return (
          <div key={`list-${key}`} className="space-y-1.5 my-2">
            {list.items.map((item, i) => {
              const colonIndex = item.indexOf(":");
              if (colonIndex > 0 && colonIndex < 35) {
                const keyText = item.substring(0, colonIndex).trim();
                const valText = item.substring(colonIndex + 1).trim();
                return (
                  <div key={i} className="flex justify-between items-center text-xs py-1.5 border-b border-border/10 bg-white/5 dark:bg-zinc-950/20 px-2.5 rounded-lg backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <span className="text-muted-foreground font-medium">{parseBold(keyText)}</span>
                    <span className="font-semibold text-foreground">{parseBold(valText)}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="flex items-start gap-2 text-xs leading-relaxed pl-1 py-0.5">
                  <span className="text-primary mt-1.5 size-1.5 rounded-full bg-primary/80 shrink-0 shadow-sm" />
                  <span className="text-foreground/90">{parseBold(item)}</span>
                </div>
              );
            })}
          </div>
        );
      } else {
        return (
          <ol key={`list-${key}`} className="space-y-1.5 my-2 list-decimal pl-5">
            {list.items.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed text-foreground/90 pl-0.5">
                {parseBold(item)}
              </li>
            ))}
          </ol>
        );
      }
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed) {
        if (currentList) {
          elements.push(flushList(i));
        }
        continue;
      }
      
      if (trimmed.startsWith("#")) {
        if (currentList) elements.push(flushList(i));
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        const text = trimmed.replace(/^#+\s*/, "");
        if (level === 1) {
          elements.push(
            <h2 key={i} className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-4 mb-2 border-b border-indigo-500/20 pb-1 flex items-center gap-1.5 uppercase tracking-wider">
              {parseBold(text)}
            </h2>
          );
        } else if (level === 2) {
          elements.push(
            <h3 key={i} className="text-xs font-bold text-zinc-950 dark:text-zinc-50 mt-3.5 mb-1.5 flex items-center gap-1.5">
              {parseBold(text)}
            </h3>
          );
        } else {
          elements.push(
            <h4 key={i} className="text-[11px] font-bold text-primary mt-2.5 mb-1 flex items-center gap-1.5">
              {parseBold(text)}
            </h4>
          );
        }
        continue;
      }
      
      if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*")) {
        const itemText = trimmed.substring(1).trim();
        if (!currentList || currentList.type !== "bullet") {
          if (currentList) elements.push(flushList(i));
          currentList = { type: "bullet", items: [] };
        }
        currentList.items.push(itemText);
        continue;
      }
      
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        const itemText = numMatch[2].trim();
        if (!currentList || currentList.type !== "number") {
          if (currentList) elements.push(flushList(i));
          currentList = { type: "number", items: [] };
        }
        currentList.items.push(itemText);
        continue;
      }
      
      if (currentList) {
        elements.push(flushList(i));
      }
      
      if (trimmed.includes("⚠️")) {
        const text = trimmed.replace("⚠️", "").trim();
        elements.push(
          <div key={i} className="my-2.5 p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300 backdrop-blur-md shadow-sm flex items-start gap-2.5">
            <span className="text-base mt-0.5 shrink-0">⚠️</span>
            <div className="text-xs leading-relaxed font-medium">
              {parseBold(text)}
            </div>
          </div>
        );
        continue;
      }
      
      if (trimmed.includes("✅")) {
        const text = trimmed.replace("✅", "").trim();
        elements.push(
          <div key={i} className="my-2.5 p-3.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-800 dark:text-emerald-300 backdrop-blur-md shadow-sm flex items-start gap-2.5">
            <span className="text-base mt-0.5 shrink-0">✅</span>
            <div className="text-xs leading-relaxed font-medium">
              {parseBold(text)}
            </div>
          </div>
        );
        continue;
      }
      
      if (trimmed.includes("💡") || trimmed.toLowerCase().includes("recommendation")) {
        const text = trimmed.replace("💡", "").trim();
        elements.push(
          <div key={i} className="my-2.5 p-3.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-950/20 border-l-4 border-indigo-500 text-indigo-800 dark:text-indigo-300 backdrop-blur-md shadow-sm flex items-start gap-2.5">
            <span className="text-base mt-0.5 shrink-0">💡</span>
            <div className="text-xs leading-relaxed font-medium">
              {parseBold(text)}
            </div>
          </div>
        );
        continue;
      }
      
      elements.push(
        <p key={i} className="text-xs leading-relaxed my-2 text-foreground/80">
          {parseBold(trimmed)}
        </p>
      );
    }
    
    if (currentList) {
      elements.push(flushList(lines.length));
    }
    
    return <div className="space-y-1">{elements}</div>;
  };

  const renderMobileAiAssistant = () => {
    return (
      <Card className="flex flex-col h-[520px] bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-lg rounded-2xl overflow-hidden">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 no-scrollbar">
          {messages.length === 0 ? (
            <div className="space-y-4 my-auto h-full flex flex-col justify-center text-center px-2">
              <div className="size-11 rounded-full bg-gradient-to-br from-primary/20 to-indigo-600/10 text-primary flex items-center justify-center mx-auto border border-primary/10 shadow-sm animate-pulse">
                <Sparkles className="size-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-foreground">
                  {lang === "bn" ? "হাকিমইজি অডিট এজেন্টের সাথে চ্যাট করুন" : "Chat with HakimEzy Audit Agent"}
                </h4>
                <p className="text-[10px] text-muted-foreground leading-normal max-w-[240px] mx-auto">
                  {lang === "bn"
                    ? "আমি আপনার রিয়েল-টাইম স্টক, লাভ-ক্ষতি ও ব্যবসা বিশ্লেষণ করতে পারি। নিচের একটি প্রশ্ন নির্বাচন করুন বা সরাসরি লিখুন।"
                    : "I can analyze your real-time stocks, profits, expenses, and business metrics. Choose a prompt or type below."}
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 gap-2 pt-1 text-left">
                {aiSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAiSend(s.text)}
                    className="p-2.5 text-[10px] font-semibold bg-white/20 dark:bg-zinc-950/20 hover:bg-primary/10 border border-white/20 dark:border-white/5 rounded-xl text-foreground text-left transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] backdrop-blur-sm"
                  >
                    <HelpCircle className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div key={idx} className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar */}
                    <div className={`size-7 rounded-xl flex items-center justify-center border shrink-0 shadow-sm ${
                      isUser 
                        ? "bg-primary text-white border-primary/10" 
                        : "bg-white/30 dark:bg-zinc-950/30 text-foreground border-white/20 dark:border-white/5"
                    }`}>
                      {isUser ? <HelpCircle className="size-3.5" /> : <Bot className="size-3.5" />}
                    </div>

                    {/* Bubble */}
                    <Card className={`p-3 max-w-[85%] rounded-2xl text-[11px] shadow-sm ${
                      isUser 
                        ? "bg-primary text-primary-foreground rounded-tr-none border-0" 
                        : "bg-white/40 dark:bg-zinc-950/40 text-foreground rounded-tl-none border-white/20 dark:border-white/5 backdrop-blur-sm"
                    }`}>
                      {isUser ? <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p> : renderStructuredContent(m.content)}
                    </Card>
                  </div>
                );
              })}

              {/* Loading indicator */}
              {aiLoading && (
                <div className="flex items-start gap-2">
                  <div className="size-7 rounded-xl bg-white/30 dark:bg-zinc-950/30 text-foreground border border-white/20 dark:border-white/5 flex items-center justify-center shrink-0">
                    <Bot className="size-3.5" />
                  </div>
                  <Card className="p-3 rounded-2xl rounded-tl-none bg-white/40 dark:bg-zinc-950/40 border border-white/20 dark:border-white/5 backdrop-blur-sm flex items-center gap-1.5 shrink-0">
                    <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Quick pills above input */}
        {messages.length > 0 && (
          <div className="px-3 py-1.5 border-t border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/10 flex gap-1.5 overflow-x-auto shrink-0 select-none no-scrollbar">
            {aiSuggestions.slice(0, 3).map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleAiSend(s.text)}
                className="px-2.5 py-1 text-[9px] font-semibold bg-white/20 dark:bg-zinc-950/20 hover:bg-primary/10 border border-white/20 dark:border-white/5 rounded-full text-foreground whitespace-nowrap transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm backdrop-blur-sm"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Panel */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAiSend(aiInput);
          }}
          className="p-2 border-t border-white/10 dark:border-white/5 bg-white/10 dark:bg-black/20 flex gap-2 shrink-0 items-center"
        >
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            disabled={aiLoading}
            placeholder={lang === "bn" ? "আপনার প্রশ্ন লিখুন..." : "Ask your question..."}
            className="flex-1 h-9 rounded-xl border border-white/20 dark:border-white/5 bg-white/20 dark:bg-zinc-950/20 px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50 text-foreground placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            disabled={aiLoading || !aiInput.trim()}
            className="size-9 rounded-xl shrink-0 cursor-pointer shadow-md"
          >
            <Send className="size-3.5" />
          </Button>
        </form>
      </Card>
    );
  };

  // Theme states
  const [theme, setTheme] = useState({
    primaryColor: "",
    backgroundColor: "",
    bgImage: "",
    bgImageOpacity: 0.1,
    fontFamily: "",
    fontSize: "",
    textColor: "",
    density: "standard",
    isMaterialUI: false,
    uiStyle: "default",
    bevelStrength: "medium",
    glowEnabled: false,
    borderRadius: "",
  });

  // KPI config state
  const [kpiConfig, setKpiConfig] = useState({
    align: "left",
    size: "standard",
    columns: 2,
    order: ["credit_sale", "cash_sale", "online_sell", "profit", "loss", "expense", "due", "cashbox"]
  });
  const [kpiDraggedIndex, setKpiDraggedIndex] = useState<number | null>(null);

  const kpiLabels: Record<string, string> = {
    credit_sale: lang === "bn" ? "বাকি বিক্রয়" : "Credit Sale",
    cash_sale: lang === "bn" ? "নগদ বিক্রয়" : "Cash Sale",
    online_sell: lang === "bn" ? "অনলাইন বিক্রয়" : "Online Sale",
    profit: lang === "bn" ? "মোট মুনাফা" : "Total Profit",
    loss: lang === "bn" ? "মোট ক্ষতি" : "Total Loss",
    expense: lang === "bn" ? "মোট খরচ" : "Total Expenses",
    due: lang === "bn" ? "মোট বাকি" : "Total Due",
    cashbox: lang === "bn" ? "ক্যাশবক্স" : "Cashbox",
  };

  const updateKpiConfig = (patch: Partial<typeof kpiConfig>) => {
    const next = { ...kpiConfig, ...patch };
    setKpiConfig(next);
    localStorage.setItem("hz_kpi_config", JSON.stringify(next));
    window.dispatchEvent(new Event("hz-kpi-config-updated"));
  };

  const handleKpiDragStart = (idx: number) => setKpiDraggedIndex(idx);
  const handleKpiDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (kpiDraggedIndex === null || kpiDraggedIndex === idx) return;
    const list = [...kpiConfig.order];
    const item = list[kpiDraggedIndex];
    list.splice(kpiDraggedIndex, 1);
    list.splice(idx, 0, item);
    setKpiDraggedIndex(idx);
    setKpiConfig(prev => ({ ...prev, order: list }));
  };
  const handleKpiDragEnd = () => {
    setKpiDraggedIndex(null);
    localStorage.setItem("hz_kpi_config", JSON.stringify(kpiConfig));
    window.dispatchEvent(new Event("hz-kpi-config-updated"));
  };

  // Widget ordering state
  const [widgets, setWidgets] = useState<any[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    // Load theme config
    const savedTheme = localStorage.getItem("hz_custom_theme");
    if (savedTheme) {
      try {
        setTheme(prev => ({ ...prev, ...JSON.parse(savedTheme) }));
      } catch (e) {
        console.error(e);
      }
    }

    // Load KPI config
    const savedKpi = localStorage.getItem("hz_kpi_config");
    if (savedKpi) {
      try {
        setKpiConfig(prev => ({ ...prev, ...JSON.parse(savedKpi) }));
      } catch (e) {
        console.error(e);
      }
    }

    // Load widget order
    const savedOrder = localStorage.getItem("hz_dashboard_widget_order");
    const defaultOrder = ['kpis', 'valuations', 'graphs', 'reminders', 'quickLinks', 'bestSelling', 'recent'];
    let orderList = defaultOrder;
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length > 0) orderList = parsed;
      } catch (e) {
        console.error(e);
      }
    }
    
    // Map ids to names
    const getWidgetName = (id: string) => {
      switch(id) {
        case 'kpis': return lang === "bn" ? "মূল সূচকসমূহ (KPI গ্রিড)" : "Key Metrics (KPI Grid)";
        case 'valuations': return lang === "bn" ? "ইনভেন্টরি স্টক মূল্যায়ন" : "Inventory Stock Valuation";
        case 'graphs': return lang === "bn" ? "চার্ট ও গ্রাফিক্স বিশ্লেষণ" : "Charts & Analytics Graph";
        case 'reminders': return lang === "bn" ? "রিমাইন্ডার ও টাস্ক লিস্ট" : "Reminders & Task List";
        case 'quickLinks': return lang === "bn" ? "শর্টকাট কুইক লিংকস" : "Shortcut Quick Links";
        case 'bestSelling': return lang === "bn" ? "বেস্ট সেলিং পণ্যসমূহ" : "Best Selling Items";
        case 'recent': return lang === "bn" ? "সাম্প্রতিক বিক্রয় কার্যক্রম" : "Recent Operations Feed";
        default: return id;
      }
    };

    setWidgets(orderList.map(id => ({ id, name: getWidgetName(id) })));
  }, [lang]);

  const updateThemeField = (field: string, value: any) => {
    const nextTheme = { ...theme, [field]: value };
    setTheme(nextTheme);
    localStorage.setItem("hz_custom_theme", JSON.stringify(nextTheme));
    window.dispatchEvent(new Event("hz-theme-updated"));
  };

  const handleResetTheme = () => {
    localStorage.removeItem("hz_custom_theme");
    setTheme({
      primaryColor: "",
      backgroundColor: "",
      bgImage: "",
      bgImageOpacity: 0.1,
      fontFamily: "",
      fontSize: "",
      textColor: "",
      density: "standard",
      isMaterialUI: false,
      uiStyle: "default",
      bevelStrength: "medium",
      glowEnabled: false,
      borderRadius: "",
    });
    window.dispatchEvent(new Event("hz-theme-updated"));
    toast.success(lang === "bn" ? "থিম রিসেট সফল হয়েছে" : "Theme settings reset successfully");
  };

  // Drag and Drop Logic
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const list = [...widgets];
    const draggedItem = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setWidgets(list);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    const order = widgets.map(w => w.id);
    localStorage.setItem("hz_dashboard_widget_order", JSON.stringify(order));
    window.dispatchEvent(new Event("hz-dashboard-order-updated"));
    toast.success(lang === "bn" ? "ড্যাশবোর্ড ক্রম হালনাগাদ হয়েছে" : "Dashboard widget order updated");
  };

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadProfilePic(file);
    }
  };

  const visibleBiz = businessLinks.filter(item => canAccess(perms, item.perm));
  const visibleFin = financeLinks.filter(item => canAccess(perms, item.perm));

  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // Preloaded Gradient Presets
  const bgPresets = [
    { name: "None", url: "" },
    { name: "Flowerism Pattern", url: "/flowerism_preset.png" },
    { name: "Glass Gradient", url: "/glassmorphism_preset.png" },
    { name: "Silk Mesh", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=600&auto=format&fit=crop" },
    { name: "Abstract Gradient", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop" },
    { name: "Dark Texture", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop" },
  ];

  const renderOperations = () => (
    <>
      {/* Group 1: Business Operations */}
      {visibleBiz.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            {lang === "bn" ? "ব্যবসা পরিচালনা" : "Business Operations"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {visibleBiz.map(({ to, labelKey, desc, icon: Icon }) => (
              <Link key={to} href={to} className="block group">
                <Card className="p-3.5 h-full flex flex-col justify-between gap-3 hover:border-primary/30 transition-all active:scale-[0.98] beveled-card bg-card/60 backdrop-blur-sm">
                  <div className="size-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary grid place-items-center shrink-0 border border-primary/10 shadow-sm">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">{t(labelKey as any)}</div>
                    <p className="text-[9px] text-muted-foreground leading-tight">{desc}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Group 2: Accounting & Finance */}
      {visibleFin.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            {lang === "bn" ? "হিসাব ও বিশ্লেষণ" : "Accounting & Financials"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {visibleFin.map(({ to, labelKey, desc, icon: Icon, imageUrl }: any) => (
              <Link key={to} href={to} className="block group">
                <Card className="p-3.5 h-full flex flex-col justify-between gap-3 hover:border-indigo-500/30 transition-all active:scale-[0.98] beveled-card bg-card/60 backdrop-blur-sm">
                  <div className="size-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 grid place-items-center shrink-0 border border-indigo-500/10 shadow-sm overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} className="size-5 object-contain" alt={t(labelKey as any)} />
                    ) : (
                      <Icon className="size-4.5" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">{t(labelKey as any)}</div>
                    <p className="text-[9px] text-muted-foreground leading-tight">{desc}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderMobileOperations = () => (
    <>
      {/* Group 1: Business Operations */}
      {visibleBiz.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1.5">
            {lang === "bn" ? "ব্যবসা পরিচালনা" : "Business Operations"}
          </h3>
          <Card className="overflow-hidden border border-white/20 dark:border-white/5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
            <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/40">
              {visibleBiz.map(({ to, labelKey, desc, icon: Icon }) => (
                <Link key={to} href={to} className="flex items-center justify-between p-3.5 hover:bg-muted/10 active:bg-muted/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="size-8.5 rounded-xl bg-primary/10 text-primary grid place-items-center border border-primary/15 shadow-sm">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{t(labelKey as any)}</div>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-none">{desc}</p>
                    </div>
                  </div>
                  <span className="text-zinc-400 text-xs font-semibold select-none pr-1">→</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Group 2: Accounting & Finance */}
      {visibleFin.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1.5">
            {lang === "bn" ? "হিসাব ও বিশ্লেষণ" : "Accounting & Financials"}
          </h3>
          <Card className="overflow-hidden border border-white/20 dark:border-white/5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
            <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/40">
              {visibleFin.map(({ to, labelKey, desc, icon: Icon, imageUrl }: any) => (
                <Link key={to} href={to} className="flex items-center justify-between p-3.5 hover:bg-muted/10 active:bg-muted/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="size-8.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 grid place-items-center border border-indigo-500/15 shadow-sm overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} className="size-4.5 object-contain" alt={t(labelKey as any)} />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{t(labelKey as any)}</div>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-none">{desc}</p>
                    </div>
                  </div>
                  <span className="text-zinc-400 text-xs font-semibold select-none pr-1">→</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );

  const renderSignOut = () => (
    <div className="pt-2">
      <Button
        onClick={() => {
          if (confirm(lang === "bn" ? "আপনি কি লগআউট করতে চান?" : "Are you sure you want to sign out?")) {
            logout();
          }
        }}
        variant="outline"
        className="w-full h-10 border-rose-500/20 text-rose-600 hover:bg-rose-500/5 dark:hover:bg-rose-950/20 beveled-button rounded-xl text-xs font-semibold"
      >
        <LogOut className="size-4 mr-2" />
        {lang === "bn" ? "লগ আউট" : "Sign Out"}
      </Button>
    </div>
  );



  const renderThemeCustomization = () => (
    <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1.5">
          <Palette className="size-4 text-primary" />
          {lang === "bn" ? "থিম ও লেআউট কাস্টমাইজেশন" : "Themes & Customization"}
        </h3>
        
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border beveled-card space-y-5">
          {/* Design Style Selector */}
          <div className="space-y-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="size-4 text-primary" />
              <span>{lang === "bn" ? "ইউজার ইন্টারফেস ডিজাইন স্টাইল" : "User Interface Design Style"}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "default", label: lang === "bn" ? "ডিফল্ট গ্লাস" : "Default Glass", icon: Layout, desc: lang === "bn" ? "আধুনিক কাঁচ ও বেভেল" : "Standard glass & bevel", setup: { uiStyle: "default", isMaterialUI: false, bgImage: "" } },
                { id: "morphism", label: lang === "bn" ? "নিউমর্ফিজম" : "Neumorphism", icon: Palette, desc: lang === "bn" ? "নরম ত্রিমাত্রিক ছায়া" : "Soft 3D extruded shadows", setup: { uiStyle: "morphism", isMaterialUI: false, fontFamily: "Nunito, sans-serif", bgImage: "" } },
                { id: "brutalism", label: lang === "bn" ? "ব্রুটালিজম" : "Brutalism", icon: LayoutGrid, desc: lang === "bn" ? "কঠোর কালো বর্ডার" : "Thick borders & monospace", setup: { uiStyle: "brutalism", isMaterialUI: false, fontFamily: "'Fira Code', monospace", bgImage: "" } },
                { id: "new-brutalism", label: lang === "bn" ? "নিও-ব্রুটালিজম" : "Neo-Brutalism", icon: Sparkles, desc: lang === "bn" ? "উজ্জ্বল কার্টুনিশ" : "High contrast colorful", setup: { uiStyle: "new-brutalism", isMaterialUI: false, fontFamily: "Poppins, sans-serif", bgImage: "" } },
                { id: "glassmorphic", label: lang === "bn" ? "গ্লাসমর্ফিজম" : "Glassmorphism", icon: ImageIcon, desc: lang === "bn" ? "স্বচ্ছ ফ্রস্টেড গ্লাস" : "Frosted glass on gradient", setup: { uiStyle: "glassmorphism", isMaterialUI: false, bgImage: "/glassmorphism_preset.png", bgImageOpacity: 0.22 } },
                { id: "flowerism", label: lang === "bn" ? "ফ্লাওয়ারিজম" : "Flowerism", icon: Sparkles, desc: lang === "bn" ? "ফ্লোরাল নরম পেস্টেল" : "Organic pastel floral theme", setup: { uiStyle: "flowerism", isMaterialUI: false, bgImage: "/flowerism_preset.png", bgImageOpacity: 0.15, primaryColor: "#f43f5e" } },
                { id: "material", label: lang === "bn" ? "মেটেরিয়াল ইউআই" : "Material UI", icon: Settings, desc: lang === "bn" ? "ফ্ল্যাট এলিভেশন ছায়া" : "Standard flat elevation", setup: { uiStyle: "default", isMaterialUI: true, fontFamily: "Roboto, sans-serif", bgImage: "" } }
              ].map(s => {
                const isActive = s.id === "material" ? theme.isMaterialUI : (theme.uiStyle === s.id && !theme.isMaterialUI);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const next = { ...theme, ...s.setup, uiStyle: s.setup.uiStyle as any };
                      setTheme(next);
                      localStorage.setItem("hz_custom_theme", JSON.stringify(next));
                      window.dispatchEvent(new Event("hz-theme-updated"));
                      toast.success(lang === "bn" ? `${s.label} স্টাইল লোড হয়েছে` : `Loaded ${s.label} style`);
                    }}
                    className={`p-2 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all duration-200 active:scale-95 cursor-pointer hover:bg-muted/10 ${
                      isActive 
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30" 
                        : "border-border bg-card/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`size-5 rounded-lg grid place-items-center ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <s.icon className="size-3" />
                      </div>
                      <span className="font-semibold text-xs text-foreground truncate">{s.label}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground leading-normal">{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Bevels & Glows */}
          <div className="space-y-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="size-4 text-indigo-500" />
              <span>{lang === "bn" ? "বর্ডার বেভেল এবং নিয়ন গ্লো ইফেক্টস" : "Bevels & Glow Effects"}</span>
            </div>

            <div className="space-y-2">
              {/* Bevel selector */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "বেভেল স্টাইল (Bevel Strength)" : "Bevel Style & Highlight"}</Label>
                <div className="flex bg-muted rounded-lg p-0.5 text-xs w-full">
                  {[
                    { id: "none", label: lang === "bn" ? "কিছু না" : "None" },
                    { id: "light", label: lang === "bn" ? "হালকা" : "Light" },
                    { id: "medium", label: lang === "bn" ? "মাঝারি" : "Medium" },
                    { id: "heavy", label: lang === "bn" ? "গাঢ়" : "Heavy" }
                  ].map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => updateThemeField("bevelStrength", b.id)}
                      className={`flex-1 py-1 rounded-md text-center font-medium transition-all ${
                        theme.bevelStrength === b.id
                          ? "bg-background text-foreground shadow font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Glow toggle */}
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-semibold text-foreground">{lang === "bn" ? "নিওন গ্লো ইফেক্ট সক্রিয় করুন" : "Enable Neon Glow Effects"}</Label>
                  <p className="text-[9px] text-muted-foreground">{lang === "bn" ? "কার্ড এবং সক্রিয় বাটনে সুন্দর ব্যাকলাইট গ্লো ছায়ো" : "Adds backlighting glows matching the brand accent"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateThemeField("glowEnabled", !theme.glowEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    theme.glowEnabled ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      theme.glowEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Card Roundness & Sharpness selector */}
              <div className="space-y-1 pt-2 border-t border-border/20">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "কার্ড ও মেট্রিক্স কোণার রাউন্ডনেস (শার্পনেস)" : "Card Roundness & Sharpness"}</Label>
                <div className="flex bg-muted rounded-lg p-0.5 text-xs w-full justify-between">
                  {[
                    { id: "none", label: lang === "bn" ? "তীক্ষ্ণ" : "Sharp" },
                    { id: "small", label: lang === "bn" ? "সামান্য" : "Small" },
                    { id: "medium", label: lang === "bn" ? "মাঝারি" : "Medium" },
                    { id: "large", label: lang === "bn" ? "গোল" : "Rounded" },
                    { id: "full", label: lang === "bn" ? "বৃত্তাকার" : "Pill" }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => updateThemeField("borderRadius", r.id)}
                      className={`flex-1 py-1 rounded-md text-[9px] text-center font-medium transition-all ${
                        theme.borderRadius === r.id
                          ? "bg-background text-foreground shadow font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section A: Typography */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Type className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "টাইপোগ্রাফি ও ফন্ট" : "Typography & Fonts"}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "ফন্ট ফ্যামিলি" : "Font Family"}</Label>
                <select
                  value={theme.fontFamily}
                  onChange={e => updateThemeField("fontFamily", e.target.value)}
                  className="w-full h-8 rounded border border-border bg-background px-2 text-xs"
                >
                  <option value="">{lang === "bn" ? "ডিফল্ট ফন্ট" : "Default Font"}</option>
                  <option value="Roboto, sans-serif">Roboto (Google — Clean)</option>
                  <option value="Montserrat, sans-serif">Montserrat (Google — Bold)</option>
                  <option value="Nunito, sans-serif">Nunito (Google — Rounded)</option>
                  <option value="Ubuntu, sans-serif">Ubuntu (Google — Friendly)</option>
                  <option value="'Playfair Display', serif">Playfair Display (Elegant Serif)</option>
                  <option value="Poppins, 'Hind Siliguri', sans-serif">Poppins & Hind Siliguri (Modern)</option>
                  <option value="Lora, Georgia, serif">Lora (Classic Serif)</option>
                  <option value="'Times New Roman', Times, serif">Times New Roman (Traditional Serif)</option>
                  <option value="'Fira Code', monospace">Fira Code (Developer Mono)</option>
                  <option value="system-ui, -apple-system, sans-serif">System UI (Native OS)</option>
                  <option value="sans-serif">Sans-Serif (Browser Default)</option>
                  <option value="Arial, Helvetica, sans-serif">Arial / Helvetica (Classic)</option>
                  <option value="Georgia, 'Times New Roman', serif">Georgia (Elegant Serif)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <Label>{lang === "bn" ? "ফন্ট সাইজ (স্কেল)" : "Base Font Size"}</Label>
                  <span className="font-mono">{theme.fontSize || "16px"}</span>
                </div>
                <input
                  type="range"
                  min="13"
                  max="22"
                  step="1"
                  value={parseInt(theme.fontSize || "16")}
                  onChange={e => updateThemeField("fontSize", `${e.target.value}px`)}
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section B: Colors & Styling */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Palette className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "রং ও প্যালেট" : "Colors & Aesthetics"}</span>
            </div>

            <div className="space-y-3">
              {/* Accent Color Preset Buttons */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "অ্যাকসেন্ট রং (থিম কালার)" : "Primary Brand Color"}</Label>
                <div className="flex gap-2 flex-wrap items-center pt-1">
                  {[
                    { hex: "#10b981", label: "Green" },
                    { hex: "#6366f1", label: "Indigo" },
                    { hex: "#0ea5e9", label: "Sky" },
                    { hex: "#f97316", label: "Orange" },
                    { hex: "#f43f5e", label: "Rose" },
                  ].map(c => (
                    <button
                      key={c.hex}
                      onClick={() => updateThemeField("primaryColor", c.hex)}
                      className={`size-6 rounded-full border-2 transition-transform active:scale-90 ${
                        theme.primaryColor === c.hex ? "border-foreground scale-110 shadow-sm" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  
                  {/* Custom Color Selector */}
                  <div className="flex items-center gap-1.5 border border-border rounded px-1.5 py-0.5 bg-background">
                    <input
                      type="color"
                      value={theme.primaryColor || "#10b981"}
                      onChange={e => updateThemeField("primaryColor", e.target.value)}
                      className="size-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span className="text-[9px] font-mono">{theme.primaryColor || "#10b981"}</span>
                  </div>
                </div>
              </div>

              {/* Text and Background Custom Pickers */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "ব্যাকগ্রাউন্ড রং" : "Background Color"}</Label>
                  <div className="flex items-center gap-1.5 border border-border rounded px-2 py-1 bg-background h-8">
                    <input
                      type="color"
                      value={theme.backgroundColor || "#fafafa"}
                      onChange={e => updateThemeField("backgroundColor", e.target.value)}
                      className="size-5 rounded cursor-pointer"
                    />
                    <span className="text-[9px] font-mono truncate">{theme.backgroundColor || "Default"}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "টেক্সট রং" : "Text Color"}</Label>
                  <div className="flex items-center gap-1.5 border border-border rounded px-2 py-1 bg-background h-8">
                    <input
                      type="color"
                      value={theme.textColor || "#18181b"}
                      onChange={e => updateThemeField("textColor", e.target.value)}
                      className="size-5 rounded cursor-pointer"
                    />
                    <span className="text-[9px] font-mono truncate">{theme.textColor || "Default"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Density & Spacing */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Layout className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "প্যাডিং ও লেআউট ডেনসিটি" : "Density & Spacing"}</span>
            </div>
            
            <div className="flex bg-muted rounded-lg p-0.5 text-xs w-full justify-between">
              {[
                { id: "compact", label: lang === "bn" ? "কম্প্যাক্ট" : "Compact" },
                { id: "standard", label: lang === "bn" ? "স্ট্যান্ডার্ড" : "Standard" },
                { id: "cozy", label: lang === "bn" ? "কোজি (বড়)" : "Cozy" },
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => updateThemeField("density", d.id)}
                  className={`flex-1 py-1 rounded-md text-center font-medium transition-all ${
                    theme.density === d.id ? "bg-background text-foreground shadow" : "text-muted-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section D: KPI Card Customization */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <LayoutGrid className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "KPI কার্ড কাস্টমাইজেশন" : "KPI Card Customization"}</span>
            </div>

            {/* KPI Alignment */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "কার্ড টেক্সট অ্যালাইনমেন্ট" : "Card Text Alignment"}</Label>
              <div className="flex gap-2">
                {(["left", "center", "right"] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => updateKpiConfig({ align: a })}
                    className={`flex-1 h-8 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${
                      kpiConfig.align === a
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {a === "left" && <AlignLeft className="size-3.5" />}
                    {a === "center" && <AlignCenter className="size-3.5" />}
                    {a === "right" && <AlignRight className="size-3.5" />}
                    {lang === "bn" ? (a === "left" ? "বাম" : a === "center" ? "মাঝ" : "ডান") : (a === "left" ? "Left" : a === "center" ? "Center" : "Right")}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Card Size */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "কার্ড সাইজ" : "Card Size"}</Label>
              <div className="flex bg-muted rounded-lg p-0.5 text-xs w-full">
                {(["small", "standard", "large"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => updateKpiConfig({ size: s })}
                    className={`flex-1 py-1.5 rounded-md text-center font-medium transition-all capitalize ${
                      kpiConfig.size === s
                        ? "bg-background text-foreground shadow font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {lang === "bn" ? (s === "small" ? "ছোট" : s === "standard" ? "স্ট্যান্ডার্ড" : "বড়") : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Columns */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "কলাম সংখ্যা (মোবাইল)" : "Columns per Row (Mobile)"}</Label>
              <div className="flex bg-muted rounded-lg p-0.5 text-xs">
                {[1, 2, 3].map(c => (
                  <button
                    key={c}
                    onClick={() => updateKpiConfig({ columns: c })}
                    className={`flex-1 py-1.5 rounded-md text-center font-medium transition-all ${
                      kpiConfig.columns === c
                        ? "bg-background text-foreground shadow font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {c} {lang === "bn" ? "কলাম" : "Col"}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Drag-and-Drop Order */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "KPI ক্রম (ড্র্যাগ করে পরিবর্তন করুন)" : "KPI Order (Drag to reorder)"}</Label>
              <div className="space-y-1">
                {kpiConfig.order.map((id, idx) => (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handleKpiDragStart(idx)}
                    onDragOver={(e) => handleKpiDragOver(e, idx)}
                    onDragEnd={handleKpiDragEnd}
                    className={`p-2 bg-background border border-border/75 rounded-lg flex items-center gap-2 cursor-grab active:cursor-grabbing transition-all select-none hover:bg-muted/20 ${
                      kpiDraggedIndex === idx ? "opacity-40 scale-[0.98] border-primary" : ""
                    }`}
                  >
                    <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground flex-1">{kpiLabels[id] || id}</span>
                    <span className="text-[9px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section E: Background Image */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <ImageIcon className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "ব্যাকগ্রাউন্ড ছবি" : "Background Image"}</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "ছবি ইউআরএল (Image URL)" : "Custom Background Image URL"}</Label>
                <Input
                  className="bg-background h-8 text-xs placeholder:text-[10px]"
                  placeholder="https://example.com/bg.jpg"
                  value={theme.bgImage}
                  onChange={e => updateThemeField("bgImage", e.target.value)}
                />
              </div>

              {theme.bgImage && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <Label>{lang === "bn" ? "ছবির অপাসিটি" : "Background Opacity"}</Label>
                    <span className="font-mono">{Math.round(theme.bgImageOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.40"
                    step="0.01"
                    value={theme.bgImageOpacity}
                    onChange={e => updateThemeField("bgImageOpacity", parseFloat(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              {/* Presets Grid */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "ডিফল্ট ব্যাকগ্রাউন্ড প্রিসেটস" : "Quick Image Presets"}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {bgPresets.map(p => (
                    <button
                      key={p.name}
                      onClick={() => {
                        updateThemeField("bgImage", p.url);
                        updateThemeField("bgImageOpacity", 0.1);
                      }}
                      className={`h-10 text-[9px] font-semibold border rounded-lg overflow-hidden flex items-center justify-center p-1 bg-cover bg-center text-center transition-all ${
                        theme.bgImage === p.url ? "border-primary font-bold shadow-md scale-105" : "border-border hover:bg-muted/30 text-muted-foreground"
                      }`}
                      style={p.url ? { backgroundImage: `linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.8)), url('${p.url}')` } : {}}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section G: Dashboard Widget Drag-and-Drop */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "ড্যাশবোর্ড লেআউট (ড্র্যাগ অ্যান্ড ড্রপ)" : "Dashboard Layout (Drag & Drop)"}</span>
            </div>
            
            <p className="text-[10px] text-muted-foreground leading-normal">
              {lang === "bn"
                ? "ড্যাশবোর্ডের উপাদানগুলোর ক্রম পরিবর্তন করতে তাদের উপর ক্লিক করে ড্র্যাগ করে উপরে-নিচে নামান।"
                : "Drag and drop the cards below to change the order they appear on your main dashboard."}
            </p>

            <div className="space-y-1.5">
              {widgets.map((w, index) => (
                <div
                  key={w.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-2 bg-background border border-border/75 rounded-lg flex items-center gap-2 cursor-grab active:cursor-grabbing transition-all select-none hover:bg-muted/20 ${
                    draggedIndex === index ? "opacity-40 scale-[0.98] border-primary" : ""
                  }`}
                >
                  <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-semibold text-foreground">{w.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reset button */}
          <Button
            onClick={handleResetTheme}
            variant="outline"
            className="w-full h-8 text-[11px] border-zinc-200 hover:bg-muted font-medium"
          >
            {lang === "bn" ? "থিম সেটিংস ডিফল্ট করুন" : "Reset Custom Theme to Default"}
          </Button>

        </Card>
      </div>
    );
  return (
    <div className="space-y-5 pb-6">
      {/* Profile Header */}
      <Card className="p-4 bg-gradient-to-br from-primary/10 via-indigo-500/5 to-background border-primary/20 beveled-card">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 select-none">
            <Avatar
              onClick={handleAvatarClick}
              className={`size-14 border-2 border-background shadow-md shrink-0 cursor-pointer transition-transform active:scale-95 group hover:brightness-90 ${isUploading ? 'pointer-events-none' : ''}`}
            >
              <AvatarImage src={user?.avatar_url || "https://png.pngtree.com/png-vector/20231019/ourmid/pngtree-user-profile-avatar-png-image_10211467.png"} alt="Profile" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white font-bold text-lg">{initials}</AvatarFallback>
            </Avatar>

            {isUploading ? (
              <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-[9px] text-white font-bold pointer-events-none">
                <span>{uploadProgress}%</span>
                <div className="w-8 h-1 bg-white/30 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : (
              <div
                onClick={handleAvatarClick}
                className="absolute inset-0 bg-black/35 opacity-0 hover:opacity-100 rounded-full flex items-center justify-center text-[8px] text-white font-medium cursor-pointer transition-opacity pointer-events-none"
              >
                {lang === "bn" ? "আপলোড" : "Upload"}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base text-zinc-950 dark:text-zinc-50 truncate">{user?.full_name || "User"}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide border uppercase ${
                user?.role === "owner"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
              }`}>
                {user?.role === "owner" ? (lang === "bn" ? "মালিক" : "Owner") : (lang === "bn" ? "কর্মচারী" : "Employee")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-1 uppercase tracking-wider">
              {user?.business_name || "Dream Fashion"}
            </div>
          </div>
        </div>
      </Card>

      {isMobile ? (
        <Tabs defaultValue="menu" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full h-10 p-1 bg-muted/65 backdrop-blur-sm rounded-xl border border-border/40">
            <TabsTrigger value="menu" className="rounded-lg text-xs font-semibold">{lang === "bn" ? "মেনু ও লিংক" : "Menu & Operations"}</TabsTrigger>
            <TabsTrigger value="ui" className="rounded-lg text-xs font-semibold">{lang === "bn" ? "ইউআই সেটিংস" : "UI Customization"}</TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="space-y-5 outline-none mt-0">
            {renderMobileOperations()}
            {renderSignOut()}
          </TabsContent>

          <TabsContent value="ui" className="space-y-5 outline-none mt-0 animate-in fade-in duration-200">
            {renderThemeCustomization()}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-5">
          {renderOperations()}
          {renderThemeCustomization()}
          {renderSignOut()}
        </div>
      )}
    </div>
  );
}
