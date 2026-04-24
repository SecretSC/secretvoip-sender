import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui-kit";
import {
  Send, Wallet, Map, Radar, AlertTriangle, MessageSquare,
  Zap, ShieldCheck, ChevronRight,
} from "lucide-react";

const TELEGRAM_HANDLE = "Hamfranord";

export default function Help({ kind = "customer" }: { kind?: "customer" | "admin" }) {
  return (
    <DashboardLayout kind={kind}>
      <PageHeader
        title="Help & Guide"
        subtitle="Everything you need to know to send SMS, manage your balance and pick the right route."
      />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Section icon={Send} title="How to send an SMS">
            <Step n={1}>Open <b>Send SMS</b> in the sidebar.</Step>
            <Step n={2}>Set your <b>Sender ID</b> (the name your recipients will see).</Step>
            <Step n={3}>
              Paste recipients in international format, separated by commas or new lines —
              for example <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40">12025550123, 447700900111</code>.
              Country code is required, the leading <code className="font-mono">+</code> is optional.
            </Step>
            <Step n={4}>Type your message. The counter shows segments — long messages are split into 153-character segments.</Step>
            <Step n={5}>Pick a route (see below for differences). The <b>Estimated cost</b> in the side panel updates instantly.</Step>
            <Step n={6}>Click <b>Send SMS</b>. A progress bar shows live progress when sending to many recipients.</Step>
          </Section>

          <Section icon={Map} title="Choosing the right route">
            <Item title="Route Alpha — Premium worldwide">
              Highest deliverability worldwide. Best for transactional and OTP traffic where it must land.
            </Item>
            <Item title="Route Beta — Standard worldwide">
              Cost-efficient general-purpose route. Good default for marketing campaigns.
            </Item>
            <Item title="Route Epsilon — High deliverability">
              Multiple sub-routes (TTSKY 1–13). Pick a sub-route from the picker for fine-grained tuning.
            </Item>
            <Item title="Route Gamma — Direct international">
              Country-specific, channel-specific pricing. Pick a country, then a channel. Use this when
              you want the cheapest reliable path to one country.
            </Item>
          </Section>

          <Section icon={Wallet} title="How pricing & balance work">
            <p className="text-sm text-muted-foreground leading-relaxed">
              All prices you see in the dashboard are <b>your final price</b> per SMS segment —
              already inclusive of our reseller margin. The platform automatically deducts the cost
              from your wallet balance the moment a send succeeds.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <Bullet>You must have a positive balance to send. The Send button is disabled if you don't.</Bullet>
              <Bullet>Each segment is charged separately — a 200-character message counts as 2 segments.</Bullet>
              <Bullet>Failed sends are <b>not</b> charged.</Bullet>
              <Bullet>
                Your wallet balance updates instantly after every send. You can also see every charge
                in the <b>Profile</b> page transaction history.
              </Bullet>
            </ul>
          </Section>

          <Section icon={Radar} title="Testing routes before a campaign">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The <b>Route Tester</b> sends one real SMS per selected route to a single number you choose,
              so you can compare delivery and latency side by side before launching to your full audience.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <Bullet>Each test SMS is metered exactly like a normal send.</Bullet>
              <Bullet>You'll see per-route status (delivered / sent / failed), latency in ms, and exact cost.</Bullet>
              <Bullet>Use it whenever you onboard a new country or a new use case.</Bullet>
            </ul>
          </Section>

          <Section icon={AlertTriangle} title="Troubleshooting">
            <Item title="“Insufficient balance”">
              Top up your wallet via Telegram <a className="text-secondary-glow underline" href={`https://t.me/${TELEGRAM_HANDLE}`} target="_blank" rel="noopener noreferrer">@{TELEGRAM_HANDLE}</a>.
              The admin will credit your balance manually in EUR.
            </Item>
            <Item title="SMS sent but not received">
              Try the same number on a different route in <b>Route Tester</b>. Some carriers
              filter Sender IDs that look like brand names — try a numeric Sender ID.
            </Item>
            <Item title="Long messages cost more than expected">
              Anything longer than 160 GSM-7 characters (or 70 unicode) is multi-segment.
              Removing emojis usually halves the segment count.
            </Item>
            <Item title="Estimated cost ≠ charged cost">
              They should always match. If you ever see a difference, take a screenshot and ping admin
              — that's a bug.
            </Item>
          </Section>
        </div>

        <aside className="space-y-5">
          <div className="ring-gradient glass rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 ring-1 ring-secondary/30 grid place-items-center">
                <MessageSquare className="w-5 h-5 text-secondary-glow" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Need a top-up?</div>
                <div className="font-display text-base mt-0.5">Contact us on Telegram</div>
              </div>
            </div>
            <a
              href={`https://t.me/${TELEGRAM_HANDLE}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-glow-primary"
            >
              Message @{TELEGRAM_HANDLE} <ChevronRight className="w-4 h-4" />
            </a>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Send the EUR amount you want to add. Your balance updates within minutes.
            </p>
          </div>

          <div className="ring-gradient glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Tips</div>
            <ul className="mt-3 space-y-2 text-sm">
              <Tip icon={Zap}>Run a tester before any large campaign.</Tip>
              <Tip icon={ShieldCheck}>Use a recognisable Sender ID for trust.</Tip>
              <Tip icon={Wallet}>Keep at least one campaign's worth in balance.</Tip>
            </ul>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}

function Section({ icon: Icon, title, children }: any) {
  return (
    <section className="ring-gradient glass rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/15 ring-1 ring-primary/30 grid place-items-center">
          <Icon className="w-4 h-4 text-primary-glow" />
        </div>
        <h2 className="font-display text-lg">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-6 h-6 shrink-0 rounded-full bg-primary/15 text-primary-glow grid place-items-center text-xs font-mono">
        {n}
      </div>
      <div className="text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <div className="font-medium text-sm">{title}</div>
      <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{children}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-foreground/90">
      <span className="text-secondary-glow mt-1">•</span>
      <span>{children}</span>
    </li>
  );
}

function Tip({ icon: Icon, children }: any) {
  return (
    <li className="flex items-center gap-2 text-foreground/90">
      <Icon className="w-4 h-4 text-secondary-glow" />
      <span>{children}</span>
    </li>
  );
}
