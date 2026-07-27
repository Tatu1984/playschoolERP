"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { SectionCard } from "@/frontend/components/ui/Bits";
import { SelectField, SwitchField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { ConfirmDialog } from "@/frontend/components/ui/FormDialog";
import type { SchoolSettings } from "@/shared/types/ops.types";
import { cn } from "@/lib/utils";

const FEATURE_COPY: Record<keyof SchoolSettings["features"], { label: string; description: string }> = {
  cctv: { label: "Live classroom cameras", description: "Parents can watch their child's room during school hours." },
  kidsZone: { label: "Kids learning zone", description: "Games, stories, drawing and music for children." },
  onlinePayments: { label: "Online fee payments", description: "Razorpay checkout inside the parent portal and app." },
  messaging: { label: "Parent–teacher messaging", description: "Secure threads, voice notes and meeting requests." },
  admissionsOnline: { label: "Online admissions", description: "Public enquiry, application and visit booking forms." },
  seasonalTheme: { label: "Seasonal theming", description: "Festive decorations on the public site and kids zone." },
};

const THEMES: { value: SchoolSettings["seasonalTheme"]; label: string; emoji: string }[] = [
  { value: "none", label: "None", emoji: "⚪" },
  { value: "diwali", label: "Diwali", emoji: "🪔" },
  { value: "christmas", label: "Christmas", emoji: "🎄" },
  { value: "summer", label: "Summer camp", emoji: "🏖️" },
  { value: "independence", label: "Independence Day", emoji: "🇮🇳" },
];

export function SettingsPanel() {
  const session = useSession();
  const settings = useErpStore((s) => s.settings);
  const updateSettings = useErpStore((s) => s.updateSettings);
  const toggleFeature = useErpStore((s) => s.toggleFeature);
  const resetDemoData = useErpStore((s) => s.resetDemoData);
  const logAudit = useErpStore((s) => s.logAudit);

  const [draft, setDraft] = useState<SchoolSettings>(settings);
  const [resetOpen, setResetOpen] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  function set<K extends keyof SchoolSettings>(k: K, v: SchoolSettings[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function save() {
    updateSettings(draft);
    logAudit({
      actorName: session.name,
      actorRole: session.role,
      action: "settings.update",
      target: "school settings",
      detail: "profile / localisation updated",
      ip: "local",
    });
    toast.success("Settings saved");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="School profile, feature flags, localisation and demo-data controls."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Settings" }]}
        actions={
          <>
            {dirty && (
              <Button variant="outline" onClick={() => setDraft(settings)}>
                Discard
              </Button>
            )}
            <Button onClick={save} disabled={!dirty}>
              <Save /> Save changes
            </Button>
          </>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">School profile</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="localisation">Localisation</TabsTrigger>
          <TabsTrigger value="danger">Demo data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <SectionCard title="Identity" description="Used on invoices, emails and the public website.">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="School name" value={draft.schoolName} onChange={(v) => set("schoolName", v)} />
              <TextField label="Tagline" value={draft.tagline} onChange={(v) => set("tagline", v)} />
              <TextField label="Support email" type="email" value={draft.supportEmail} onChange={(v) => set("supportEmail", v)} />
              <TextField label="Support phone" type="tel" value={draft.supportPhone} onChange={(v) => set("supportPhone", v)} />
              <TextField label="WhatsApp number" type="tel" value={draft.whatsapp} onChange={(v) => set("whatsapp", v)} />
              <TextField label="Academic year" value={draft.academicYear} onChange={(v) => set("academicYear", v)} />
              <TextareaField label="Registered address" rows={2} value={draft.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="features" className="space-y-3 pt-4">
          <SectionCard title="Feature flags" description="Turning a module off hides it from every portal immediately.">
            <div className="grid gap-2 md:grid-cols-2">
              {(Object.keys(FEATURE_COPY) as (keyof SchoolSettings["features"])[]).map((key) => (
                <SwitchField
                  key={key}
                  label={FEATURE_COPY[key].label}
                  description={FEATURE_COPY[key].description}
                  checked={settings.features[key]}
                  onChange={() => {
                    toggleFeature(key);
                    toast.success(`${FEATURE_COPY[key].label} ${settings.features[key] ? "disabled" : "enabled"}`);
                  }}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Seasonal theme" description="Decorates the public site and kids zone." icon={<Sparkles className="h-4 w-4 text-ck-orange" />}>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    updateSettings({ seasonalTheme: t.value });
                    setDraft((d) => ({ ...d, seasonalTheme: t.value }));
                    toast.success(`Theme: ${t.label}`);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                    settings.seasonalTheme === t.value
                      ? "border-ck-red bg-ck-red/10 text-ck-red"
                      : "hover:bg-muted",
                  )}
                >
                  <span aria-hidden>{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="localisation" className="pt-4">
          <SectionCard title="Region &amp; language" description="Currency and timezone drive invoices, attendance windows and reports.">
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Currency"
                value={draft.currency}
                onChange={(v) => set("currency", v)}
                options={[
                  { value: "INR", label: "₹ Indian Rupee" },
                  { value: "USD", label: "$ US Dollar" },
                  { value: "AED", label: "AED Dirham" },
                ]}
              />
              <SelectField
                label="Timezone"
                value={draft.timezone}
                onChange={(v) => set("timezone", v)}
                options={[
                  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
                  { value: "Asia/Dubai", label: "Asia/Dubai" },
                  { value: "UTC", label: "UTC" },
                ]}
              />
              <SelectField
                label="Default language"
                value={draft.locale}
                onChange={(v) => set("locale", v as SchoolSettings["locale"])}
                options={[
                  { value: "en", label: "English" },
                  { value: "hi", label: "हिन्दी Hindi" },
                  { value: "bn", label: "বাংলা Bengali" },
                ]}
                hint="Parents can override this in their own settings."
              />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="danger" className="pt-4">
          <SectionCard
            title="Demo dataset"
            description="Every portal currently runs on a seeded in-browser dataset. Resetting restores the original demo school and clears anything you created."
          >
            <Button variant="destructive" onClick={() => setResetOpen(true)}>
              <RotateCcw /> Reset demo data
            </Button>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all demo data?"
        description="Students, invoices, notices, messages and kids-zone progress you created in this browser will be discarded."
        confirmLabel="Reset everything"
        onConfirm={() => {
          resetDemoData();
          setDraft(useErpStore.getState().settings);
          toast.success("Demo data restored");
        }}
      />
    </div>
  );
}
