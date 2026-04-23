import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { maskKey } from "@/lib/sms";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const [brand, setBrand] = useState("SecretVoIP SMS");
  const [sender, setSender] = useState("SecretVoIP");
  const [tagline, setTagline] = useState("Premium private-label SMS infrastructure");

  return (
    <DashboardLayout kind="admin">
      <PageHeader title="Settings" subtitle="Branding, defaults and security configuration." />

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="ring-gradient glass rounded-2xl p-5 space-y-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Branding</div>
          <div><Label>Platform name</Label><Input value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
          <div><Label>Tagline</Label><Input value={tagline} onChange={(e) => setTagline(e.target.value)} /></div>
          <div><Label>Default sender ID</Label><Input value={sender} onChange={(e) => setSender(e.target.value)} /></div>
          <Button variant="hero" onClick={() => toast.success("Branding saved")}>Save branding</Button>
        </div>

        <div className="ring-gradient glass rounded-2xl p-5 space-y-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">API configuration</div>
          <div><Label>Upstream base URL</Label><Input value="(configured server-side)" disabled /></div>
          <div><Label>Upstream API key</Label><Input value={maskKey()} disabled /></div>
          <p className="text-xs text-muted-foreground">For security, the API key is configured via the <code className="text-foreground">SMS_UPSTREAM_API_KEY</code> environment variable on the backend and never exposed to the UI.</p>
        </div>

        <div className="ring-gradient glass rounded-2xl p-5 space-y-3 lg:col-span-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Security</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Session timeout (minutes)</Label><Input type="number" defaultValue={120} /></div>
            <div><Label>Min password length</Label><Input type="number" defaultValue={8} /></div>
          </div>
          <Textarea placeholder="Allowed sender IDs (comma-separated)" defaultValue="SecretVoIP, SVoIP, INFO" />
          <Button variant="hero" onClick={() => toast.success("Security settings saved")}>Save security</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
