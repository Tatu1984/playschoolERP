"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, Globe, Moon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { SectionCard } from "@/frontend/components/ui/Bits";
import { SelectField, SwitchField, TextField } from "@/frontend/components/ui/Field";
import { ConfirmDialog } from "@/frontend/components/ui/FormDialog";
import type { NotificationChannel, NotificationKind } from "@/shared/types/ops.types";
import { titleCase, toggle } from "@/shared/utils/common.util";
import { PhotoConsentCard } from "@/frontend/components/features/parent/PhotoConsentCard";

const CHANNELS: { key: NotificationChannel; label: string; description: string }[] = [
  { key: "PUSH", label: "Push notifications", description: "Instant alerts on your phone" },
  { key: "IN_APP", label: "In-app", description: "The bell icon in the portal" },
  { key: "EMAIL", label: "Email", description: "Daily digest and important notices" },
  { key: "WHATSAPP", label: "WhatsApp", description: "Fee reminders and urgent notices" },
  { key: "SMS", label: "SMS", description: "Emergencies only (charges may apply)" },
];

const KINDS: NotificationKind[] = [
  "ACTIVITY",
  "ATTENDANCE",
  "NOTICE",
  "FEE",
  "MESSAGE",
  "EVENT",
  "ACHIEVEMENT",
  "EMERGENCY",
];

export function SettingsView() {
  const prefs = useErpStore((s) => s.notificationPreference);
  const setPrefs = useErpStore((s) => s.setNotificationPreference);
  const resetDemo = useErpStore((s) => s.resetDemoData);

  const [language, setLanguage] = useState("en");
  const [dyslexic, setDyslexic] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const quiet = prefs.quietHours ?? { from: "21:30", to: "07:00" };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="How and when we contact you, plus language and accessibility."
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Settings" }]}
      />

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="language">Language &amp; access</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4 pt-4">
          <SectionCard title="Channels" description="Turn off anything you don't want." icon={<Bell className="h-4 w-4" />}>
            <div className="grid gap-2 md:grid-cols-2">
              {CHANNELS.map((c) => (
                <SwitchField
                  key={c.key}
                  label={c.label}
                  description={c.description}
                  checked={prefs.channels[c.key]}
                  onChange={(checked) => {
                    setPrefs({ channels: { ...prefs.channels, [c.key]: checked } });
                    toast.success(`${c.label} ${checked ? "on" : "off"}`);
                  }}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="What to notify me about">
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => {
                const muted = prefs.mutedKinds.includes(k);
                const isEmergency = k === "EMERGENCY";
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={isEmergency}
                    onClick={() => {
                      setPrefs({ mutedKinds: toggle(prefs.mutedKinds, k) });
                      toast.success(`${titleCase(k)} ${muted ? "unmuted" : "muted"}`);
                    }}
                    className={
                      isEmergency
                        ? "cursor-not-allowed rounded-full bg-ck-red/10 px-3 py-1 text-xs font-semibold text-ck-red"
                        : muted
                          ? "rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground line-through"
                          : "rounded-full bg-ck-green/15 px-3 py-1 text-xs font-semibold text-lime-700"
                    }
                  >
                    {titleCase(k)}
                    {isEmergency && " (always on)"}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Tap to mute or unmute. Emergency broadcasts can never be muted.
            </p>
          </SectionCard>

          <SectionCard title="Quiet hours" description="We hold non-urgent notifications during this window." icon={<Moon className="h-4 w-4" />}>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <TextField
                label="From"
                type="time"
                value={quiet.from}
                onChange={(v) => setPrefs({ quietHours: { ...quiet, from: v } })}
              />
              <TextField
                label="To"
                type="time"
                value={quiet.to}
                onChange={(v) => setPrefs({ quietHours: { ...quiet, to: v } })}
              />
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPrefs({ quietHours: prefs.quietHours ? null : { from: "21:30", to: "07:00" } });
                    toast.success(prefs.quietHours ? "Quiet hours off" : "Quiet hours on");
                  }}
                >
                  {prefs.quietHours ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="language" className="space-y-4 pt-4">
          <SectionCard title="Language" icon={<Globe className="h-4 w-4" />} description="Applies to the portal and app for your account only.">
            <SelectField
              label="Preferred language"
              value={language}
              onChange={(v) => {
                setLanguage(v);
                toast.success("Language preference saved");
              }}
              options={[
                { value: "en", label: "English" },
                { value: "hi", label: "हिन्दी Hindi" },
                { value: "bn", label: "বাংলা Bengali" },
              ]}
            />
          </SectionCard>

          <SectionCard title="Accessibility">
            <div className="grid gap-2 md:grid-cols-2">
              <SwitchField
                label="Dyslexia-friendly font"
                description="Wider letter spacing and a rounder typeface"
                checked={dyslexic}
                onChange={(c) => {
                  setDyslexic(c);
                  toast.success(`Dyslexia-friendly font ${c ? "on" : "off"}`);
                }}
              />
              <SwitchField
                label="High contrast"
                description="Stronger colour separation for low vision"
                checked={highContrast}
                onChange={(c) => {
                  setHighContrast(c);
                  toast.success(`High contrast ${c ? "on" : "off"}`);
                }}
              />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4 pt-4">
          {/*
            One switch, and it is real.
            
            There used to be four here — class feed, public website, video
            recordings, live camera — and every one of them called
            toast.success("Consent preference recorded") and recorded nothing.
            A consent screen that does not record consent is worse than no
            screen: it produces a family who believe they have refused.
            
            The one the product can actually honour is photographs in the class
            feed, because that is the one the server enforces: a post carrying
            photographs cannot name a child without consent on file. The rest
            are things the office does, so the screen says so instead of
            pretending to be the control.
          */}
          <PhotoConsentCard />

          <SectionCard
            title="Your data"
            description="Under the DPDP Act you can ask what we hold about your family, and ask us to delete it."
          >
            <p className="text-sm text-muted-foreground">
              Both requests go to the school office, who will answer in writing. There is no
              self-service button here yet — and a button that filed nothing would be worse than
              this sentence.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">No third-party trackers in the Kids Zone</Badge>
              <Badge variant="outline">Live camera is viewed, never recorded by this app</Badge>
            </div>
          </SectionCard>

          <SectionCard title="Demo data" description="This portal runs on an in-browser demo dataset while the backend is being wired up.">
            <Button variant="destructive" onClick={() => setResetOpen(true)}>
              <RotateCcw /> Reset demo data
            </Button>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset demo data?"
        description="Anything you created — comments, payments, RSVPs, kids-zone progress — goes back to the seeded state."
        confirmLabel="Reset"
        onConfirm={() => {
          resetDemo();
          toast.success("Demo data restored");
        }}
      />
    </div>
  );
}
