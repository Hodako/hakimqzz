"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Layers, BarChart3, RotateCcw } from "lucide-react";
import { RiSparklingLine } from "react-icons/ri";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { updateBusinessSettingsFn } from "@/lib/rpc";
import {
  MODULE_CATALOG,
  KPI_CATALOG,
  getIndustryDefaultDisabledModules,
  getIndustryLabel,
  readModuleConfig,
  writeModuleConfig,
  type ModuleConfig,
} from "@/lib/module-config";

export function ModuleCustomizerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { lang } = useT();
  const { user, updateUser } = useAuth();
  const [config, setConfig] = useState<ModuleConfig>(() =>
    readModuleConfig(user?.industry, (user as any)?.module_config)
  );
  const [saving, setSaving] = useState(false);

  const [newModEn, setNewModEn] = useState("");
  const [newModBn, setNewModBn] = useState("");
  const [newModUrl, setNewModUrl] = useState("/erp");

  useEffect(() => {
    if (open) {
      setConfig(readModuleConfig(user?.industry, (user as any)?.module_config));
    }
  }, [open, user]);

  function toggleModule(key: string) {
    setConfig((prev) => {
      const exists = prev.disabledModules.includes(key);
      return {
        ...prev,
        disabledModules: exists
          ? prev.disabledModules.filter((k) => k !== key)
          : [...prev.disabledModules, key],
      };
    });
  }

  function toggleKpi(key: string) {
    setConfig((prev) => {
      const exists = prev.disabledKpis.includes(key);
      return {
        ...prev,
        disabledKpis: exists
          ? prev.disabledKpis.filter((k) => k !== key)
          : [...prev.disabledKpis, key],
      };
    });
  }

  function addCustomModule() {
    const en = newModEn.trim();
    const bn = newModBn.trim() || en;
    const url = newModUrl.trim() || "/erp";
    if (!en) {
      toast.error(lang === "bn" ? "মডিউলের নাম লিখুন" : "Please enter a module name");
      return;
    }
    setConfig((prev) => ({
      ...prev,
      customModules: [
        ...prev.customModules,
        {
          id: `custom_${Date.now()}`,
          labelEn: en,
          labelBn: bn,
          url: url.startsWith("/") || url.startsWith("http") ? url : `/${url}`,
        },
      ],
    }));
    setNewModEn("");
    setNewModBn("");
    setNewModUrl("/erp");
  }

  function removeCustomModule(id: string) {
    setConfig((prev) => ({
      ...prev,
      customModules: prev.customModules.filter((m) => m.id !== id),
    }));
  }

  function resetToIndustryDefaults() {
    setConfig({
      disabledModules: getIndustryDefaultDisabledModules(user?.industry),
      disabledKpis: [],
      customModules: [],
    });
    toast.success(
      lang === "bn"
        ? "ইন্ডাস্ট্রি অনুযায়ী ডিফল্ট সেটিংস রিসেট হয়েছে"
        : "Reset to industry default modules"
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      writeModuleConfig(config);
      await updateBusinessSettingsFn({ data: { module_config: config } });
      updateUser({ module_config: config } as any);
      toast.success(
        lang === "bn"
          ? "মডিউল ও ড্যাশবোর্ড সেটিংস সংরক্ষিত হয়েছে"
          : "Modules & KPI settings saved to PostgreSQL"
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save module settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 text-base font-bold">
            <span className="flex items-center gap-2">
              <RiSparklingLine className="size-4 text-primary" />
              <span>
                {lang === "bn" ? "মডিউল ও ড্যাশবোর্ড কাস্টমাইজ করুন" : "Customize Modules & KPIs"}
              </span>
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {getIndustryLabel(user?.industry, lang)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="grid grid-cols-3 w-full rounded-xl">
            <TabsTrigger value="modules" className="text-xs rounded-lg">
              <Layers className="size-3.5 mr-1.5" />
              {lang === "bn" ? "মডিউল" : "Modules"}
            </TabsTrigger>
            <TabsTrigger value="kpis" className="text-xs rounded-lg">
              <BarChart3 className="size-3.5 mr-1.5" />
              {lang === "bn" ? "ড্যাশবোর্ড কার্ড" : "KPI Cards"}
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs rounded-lg">
              <Plus className="size-3.5 mr-1.5" />
              {lang === "bn" ? "কাস্টম মডিউল" : "Custom"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="space-y-2 pt-3 max-h-[340px] overflow-y-auto pr-1">
            {MODULE_CATALOG.map((m) => {
              const enabled = !config.disabledModules.includes(m.key);
              return (
                <div
                  key={m.key}
                  className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card"
                >
                  <div>
                    <div className="text-xs font-bold">{lang === "bn" ? m.labelBn : m.labelEn}</div>
                    <div className="text-[10px] text-muted-foreground">{m.key}</div>
                  </div>
                  <Switch checked={enabled} onCheckedChange={() => toggleModule(m.key)} />
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="kpis" className="space-y-2 pt-3 max-h-[340px] overflow-y-auto pr-1">
            {KPI_CATALOG.map((k) => {
              const enabled = !config.disabledKpis.includes(k.key);
              return (
                <div
                  key={k.key}
                  className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card"
                >
                  <div className="text-xs font-bold">{lang === "bn" ? k.labelBn : k.labelEn}</div>
                  <Switch checked={enabled} onCheckedChange={() => toggleKpi(k.key)} />
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="custom" className="space-y-3 pt-3">
            <div className="p-3 rounded-2xl border border-border/60 bg-muted/30 space-y-2.5">
              <div className="text-xs font-bold">
                {lang === "bn" ? "নতুন কাস্টম মডিউল যোগ করুন" : "Add Custom Module"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={newModEn}
                  onChange={(e) => setNewModEn(e.target.value)}
                  placeholder="English Name (e.g. Catering)"
                  className="h-9 text-xs rounded-xl"
                />
                <Input
                  value={newModBn}
                  onChange={(e) => setNewModBn(e.target.value)}
                  placeholder="বাংলা নাম (যেমন: ক্যাটারিং)"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={newModUrl}
                  onChange={(e) => setNewModUrl(e.target.value)}
                  placeholder="/erp or /reports or https://..."
                  className="h-9 text-xs rounded-xl"
                />
                <Button type="button" onClick={addCustomModule} className="h-9 px-4 text-xs rounded-xl cursor-pointer">
                  <Plus className="size-3.5 mr-1" />
                  {lang === "bn" ? "যোগ করুন" : "Add"}
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {config.customModules.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {lang === "bn" ? "কোনো কাস্টম মডিউল যোগ করা হয়নি" : "No custom modules added yet"}
                </p>
              ) : (
                config.customModules.map((cm) => (
                  <div
                    key={cm.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card text-xs"
                  >
                    <div>
                      <div className="font-bold">{lang === "bn" ? cm.labelBn : cm.labelEn}</div>
                      <div className="text-[10px] text-muted-foreground">{cm.url}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustomModule(cm.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetToIndustryDefaults}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            {lang === "bn" ? "ডিফল্ট রিসেট" : "Reset Defaults"}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="rounded-xl text-xs px-5 cursor-pointer">
            {saving
              ? lang === "bn"
                ? "সংরক্ষণ হচ্ছে..."
                : "Saving..."
              : lang === "bn"
                ? "সংরক্ষণ করুন"
                : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
