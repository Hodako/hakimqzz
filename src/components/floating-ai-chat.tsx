"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, MessageSquare, Bot, AlertTriangle, HelpCircle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export function FloatingAiChat() {
  const { lang, t } = useT();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested questions in English and Bangla
  const suggestions = lang === "bn"
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

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Only show for owner (admin) role on desktop/PC
  if (!user || user.role !== "owner" || isMobile) {
    return null;
  }

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: "user", content: textToSend };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

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
      // Remove last user message on failure so they can retry easily
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // Basic structured renderer helper for custom AI markdown answers
  const renderMessageContent = (content: string) => {
    return content.split("\n").map((line, idx) => {
      let trimmed = line.trim();
      
      // Header lines (starts with # or ## or ###)
      if (trimmed.startsWith("###")) {
        return <h4 key={idx} className="font-bold text-xs mt-2 text-primary">{trimmed.replace(/###/g, "").trim()}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={idx} className="font-bold text-sm mt-3 text-primary border-b pb-0.5">{trimmed.replace(/##/g, "").trim()}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={idx} className="font-bold text-base mt-4 text-primary">{trimmed.replace(/#/g, "").trim()}</h2>;
      }

      // Bullet points
      if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*")) {
        const text = trimmed.substring(1).trim();
        return (
          <div key={idx} className="flex items-start gap-1 text-[11px] leading-relaxed my-0.5 pl-2">
            <span className="text-primary">•</span>
            <span>{parseBold(text)}</span>
          </div>
        );
      }

      // Numeric lists
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed my-0.5 pl-2">
            <span className="font-bold text-primary">{numMatch[1]}.</span>
            <span>{parseBold(numMatch[2])}</span>
          </div>
        );
      }

      // Normal text
      return (
        <p key={idx} className="text-[11px] leading-relaxed my-1">
          {parseBold(trimmed)}
        </p>
      );
    });
  };

  // Helper to parse **bold** tags
  const parseBold = (text: string) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-zinc-950 dark:text-white">{part}</strong> : part));
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 size-12 rounded-full bg-gradient-to-tr from-primary via-indigo-500 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center cursor-pointer border border-primary/20"
        title={t("ai_audits")}
      >
        {isOpen ? <X className="size-5" /> : <Sparkles className="size-5" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
        )}
      </button>

      {/* Floating Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-20 right-6 w-96 h-[550px] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-3 bg-gradient-to-r from-primary/10 via-indigo-500/5 to-background border-b border-border/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center border border-primary/10">
                <Bot className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs leading-none">{lang === "bn" ? "হাকিম ইজি এআই অ্যাসিস্ট্যান্ট" : "HakimEzy AI Assistant"}</h3>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  {lang === "bn" ? "অনলাইন এজেন্ট" : "Online Agent"}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg hover:bg-muted"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4 my-auto h-full flex flex-col justify-center text-center px-2">
                <div className="size-12 rounded-full bg-gradient-to-br from-primary/20 to-indigo-600/10 text-primary flex items-center justify-center mx-auto mb-2 border border-primary/10">
                  <Sparkles className="size-6 text-primary" />
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
                <div className="grid grid-cols-1 gap-2 pt-2 text-left">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s.text)}
                      className="p-2 text-[10px] font-semibold bg-secondary/30 hover:bg-primary/10 border border-border/50 rounded-xl text-foreground text-left transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
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
                    <div key={idx} className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                      {/* Avatar */}
                      <div className={`size-7 rounded-xl flex items-center justify-center border shrink-0 ${
                        isUser 
                          ? "bg-primary text-white border-primary/10" 
                          : "bg-secondary text-foreground border-border"
                      }`}>
                        {isUser ? <HelpCircle className="size-4" /> : <Bot className="size-4" />}
                      </div>

                      {/* Bubble */}
                      <Card className={`p-3 max-w-[80%] rounded-2xl text-[11px] ${
                        isUser 
                          ? "bg-primary text-primary-foreground rounded-tr-none border-0" 
                          : "bg-muted/75 text-foreground rounded-tl-none border-border/40"
                      }`}>
                        {isUser ? <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p> : renderMessageContent(m.content)}
                      </Card>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-start gap-2.5">
                    <div className="size-7 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center shrink-0">
                      <Bot className="size-4" />
                    </div>
                    <Card className="p-3 rounded-2xl rounded-tl-none bg-muted/75 border border-border/40 flex items-center gap-1.5 shrink-0">
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
            <div className="px-3 py-1.5 border-t border-border/40 bg-muted/30 flex gap-1.5 overflow-x-auto shrink-0 select-none no-scrollbar">
              {suggestions.slice(0, 3).map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s.text)}
                  className="px-2.5 py-1 text-[9px] font-semibold bg-background hover:bg-primary/10 border border-border/60 rounded-full text-foreground whitespace-nowrap transition-all active:scale-95 cursor-pointer shrink-0"
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
              handleSend(input);
            }}
            className="p-3 border-t border-border bg-background flex gap-2 shrink-0 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder={lang === "bn" ? "আপনার প্রশ্ন লিখুন..." : "Ask your question..."}
              className="flex-1 h-9 rounded-xl border border-border bg-muted/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="size-9 rounded-xl shrink-0 cursor-pointer"
            >
              <Send className="size-3.5" />
            </Button>
          </form>
        </Card>
      )}
    </>
  );
}
