import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type RecoveryStatus = "PENDING" | "RECOVERED" | "CHURNED" | "PHONE_MISSING";
export type MessageChannel = "whatsapp" | "email" | "sms";
export type MessageStatus = "scheduled" | "sent" | "delivered" | "read" | "failed" | "cancelled";
export type DunningStage = 1 | 2 | 3;

export interface Merchant {
  id: string;
  name: string;
  email: string;
  company_name?: string;
  stripe_account_id?: string;
  stripe_webhook_secret?: string;
  meta_whatsapp_phone_number_id?: string;
  meta_whatsapp_token?: string;
  plan_tier: "starter" | "growth" | "scale";
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface RecoveryEvent {
  id: string;
  merchant_id?: string;
  stripe_invoice_id: string;
  stripe_customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  amount: number;
  currency: string;
  status: RecoveryStatus;
  failure_reason: string;
  attempt_count: number;
  hosted_invoice_url?: string;
  pay_token: string;
  current_stage: DunningStage;
  plan_name: string;
  recovered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DunningMessage {
  id: string;
  recovery_event_id: string;
  stage: DunningStage;
  channel: MessageChannel;
  recipient: string;
  status: MessageStatus;
  message_id?: string;
  scheduled_for: string;
  sent_at?: string;
  body: string;
  action_url: string;
  error_message?: string;
  created_at: string;
}

export interface DashboardKPIs {
  totalRecoveredCash: number;
  recoveryRate: number;
  retainedARR: number;
  activePipelines: number;
  totalFailedVolume: number;
  totalAtRiskCustomers: number;
}

// -------------------------------------------------------------
// Initial Mock / Seed Data for Demo & Sandbox Testing
// -------------------------------------------------------------
const seedMerchant: Merchant = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Marcus Vance",
  email: "marcus@vancegrowth.io",
  company_name: "Vance Growth Media",
  plan_tier: "growth",
  quiet_hours_enabled: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};

const initialEvents: RecoveryEvent[] = [
  {
    id: "rec_101",
    merchant_id: seedMerchant.id,
    stripe_invoice_id: "in_1Oq8j22eZvKYlo2CLpQx99a1",
    stripe_customer_id: "cus_P29x811aQ",
    customer_name: "Elena Rostova",
    customer_email: "elena@rostovadesign.com",
    customer_phone: "+1 (555) 392-8192",
    amount: 450.0,
    currency: "USD",
    status: "RECOVERED",
    failure_reason: "card_declined (insufficient_funds)",
    attempt_count: 1,
    hosted_invoice_url: "https://pay.stripe.com/invoice/mock_elena",
    pay_token: "tok_elena_450",
    current_stage: 1,
    plan_name: "Design Retainer Monthly",
    recovered_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 4200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "rec_102",
    merchant_id: seedMerchant.id,
    stripe_invoice_id: "in_1Oq9k33fZvKYlo2CMmRx88b2",
    stripe_customer_id: "cus_Q38y922bR",
    customer_name: "Devin Thorne",
    customer_email: "devin@thorneventures.co",
    customer_phone: "+1 (555) 781-9923",
    amount: 199.0,
    currency: "USD",
    status: "RECOVERED",
    failure_reason: "expired_card",
    attempt_count: 1,
    hosted_invoice_url: "https://pay.stripe.com/invoice/mock_devin",
    pay_token: "tok_devin_199",
    current_stage: 1,
    plan_name: "SaaS Pro Monthly",
    recovered_at: new Date(Date.now() - 10800000).toISOString(),
    created_at: new Date(Date.now() - 11400000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "rec_103",
    merchant_id: seedMerchant.id,
    stripe_invoice_id: "in_1OqAm44gZvKYlo2CNnSx77c3",
    stripe_customer_id: "cus_R47z033cS",
    customer_name: "Aria Montgomery",
    customer_email: "aria@prismanalytics.tech",
    customer_phone: "+1 (555) 912-0044",
    amount: 320.0,
    currency: "USD",
    status: "PENDING",
    failure_reason: "do_not_honor",
    attempt_count: 2,
    hosted_invoice_url: "https://pay.stripe.com/invoice/mock_aria",
    pay_token: "tok_aria_320",
    current_stage: 2,
    plan_name: "Analytics Cluster Pro",
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "rec_104",
    merchant_id: seedMerchant.id,
    stripe_invoice_id: "in_1OqBn55hZvKYlo2COoTx66d4",
    stripe_customer_id: "cus_S56a144dT",
    customer_name: "Liam O'Connor",
    customer_email: "liam@celticcloud.io",
    customer_phone: undefined,
    amount: 149.0,
    currency: "USD",
    status: "PHONE_MISSING",
    failure_reason: "card_velocity_exceeded",
    attempt_count: 1,
    hosted_invoice_url: "https://pay.stripe.com/invoice/mock_liam",
    pay_token: "tok_liam_149",
    current_stage: 1,
    plan_name: "Starter Cloud Node",
    created_at: new Date(Date.now() - 43200000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: "rec_105",
    merchant_id: seedMerchant.id,
    stripe_invoice_id: "in_1OqCo66iZvKYlo2CPpUx55e5",
    stripe_customer_id: "cus_T65b255eU",
    customer_name: "Maya Lin",
    customer_email: "maya@linstudios.co",
    customer_phone: "+1 (555) 440-2381",
    amount: 890.0,
    currency: "USD",
    status: "RECOVERED",
    failure_reason: "card_declined (soft_decline)",
    attempt_count: 1,
    hosted_invoice_url: "https://pay.stripe.com/invoice/mock_maya",
    pay_token: "tok_maya_890",
    current_stage: 1,
    plan_name: "Enterprise Studio Plan",
    recovered_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 90000000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

const initialMessages: DunningMessage[] = [
  {
    id: "msg_201",
    recovery_event_id: "rec_101",
    stage: 1,
    channel: "whatsapp",
    recipient: "+1 (555) 392-8192",
    status: "delivered",
    message_id: "wamid.HBgLMTU1NTM5MjgxOTIVAgARGBI0MTU3MEIz",
    scheduled_for: new Date(Date.now() - 4200000).toISOString(),
    sent_at: new Date(Date.now() - 4180000).toISOString(),
    body: "Hi Elena Rostova, your recent payment of $450.00 for your subscription couldn't be processed. Tap below to securely update your card in 10 seconds.",
    action_url: "https://dunnify.com/pay/tok_elena_450",
    created_at: new Date(Date.now() - 4200000).toISOString(),
  },
  {
    id: "msg_202",
    recovery_event_id: "rec_102",
    stage: 1,
    channel: "whatsapp",
    recipient: "+1 (555) 781-9923",
    status: "delivered",
    message_id: "wamid.HBgLMTU1NTc4MTk5MjMVAgARGBIzNTkxMzkz",
    scheduled_for: new Date(Date.now() - 11400000).toISOString(),
    sent_at: new Date(Date.now() - 11390000).toISOString(),
    body: "Hi Devin Thorne, your recent payment of $199.00 for your subscription couldn't be processed. Tap below to securely update your card in 10 seconds.",
    action_url: "https://dunnify.com/pay/tok_devin_199",
    created_at: new Date(Date.now() - 11400000).toISOString(),
  },
  {
    id: "msg_203",
    recovery_event_id: "rec_103",
    stage: 1,
    channel: "whatsapp",
    recipient: "+1 (555) 912-0044",
    status: "delivered",
    message_id: "wamid.HBgLMTU1NTkxMjAwNDQVAgARGBI5MjI3MTg0",
    scheduled_for: new Date(Date.now() - 172800000).toISOString(),
    sent_at: new Date(Date.now() - 172790000).toISOString(),
    body: "Hi Aria Montgomery, your recent payment of $320.00 for your subscription couldn't be processed.",
    action_url: "https://dunnify.com/pay/tok_aria_320",
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "msg_204",
    recovery_event_id: "rec_103",
    stage: 2,
    channel: "whatsapp",
    recipient: "+1 (555) 912-0044",
    status: "delivered",
    message_id: "wamid.HBgLMTU1NTkxMjAwNDQVAgARGBI0MTU3ODgy",
    scheduled_for: new Date(Date.now() - 86400000).toISOString(),
    sent_at: new Date(Date.now() - 86380000).toISOString(),
    body: "Quick reminder Aria: We're holding your Analytics Cluster Pro subscription open. Update your payment in 1-click.",
    action_url: "https://dunnify.com/pay/tok_aria_320",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "msg_205",
    recovery_event_id: "rec_103",
    stage: 3,
    channel: "whatsapp",
    recipient: "+1 (555) 912-0044",
    status: "scheduled",
    scheduled_for: new Date(Date.now() + 86400000).toISOString(),
    body: "Final Notice: Your subscription will pause in 24 hours. Keep access active with 1-click Apple Pay.",
    action_url: "https://dunnify.com/pay/tok_aria_320",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "msg_206",
    recovery_event_id: "rec_104",
    stage: 1,
    channel: "email",
    recipient: "liam@celticcloud.io",
    status: "delivered",
    message_id: "email_liam_emergency_01",
    scheduled_for: new Date(Date.now() - 43200000).toISOString(),
    sent_at: new Date(Date.now() - 43190000).toISOString(),
    body: "[Emergency Fallback Email] Payment failed for Starter Cloud Node ($149.00). Update your payment method.",
    action_url: "https://dunnify.com/pay/tok_liam_149",
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
];

// -------------------------------------------------------------
// In-Memory Repository (Works standalone & in zero-config dev)
// -------------------------------------------------------------
class InMemoryStore {
  merchants: Map<string, Merchant> = new Map();
  recoveryEvents: Map<string, RecoveryEvent> = new Map();
  dunningMessages: Map<string, DunningMessage> = new Map();

  constructor() {
    this.merchants.set(seedMerchant.id, { ...seedMerchant });
    initialEvents.forEach((e) => this.recoveryEvents.set(e.id, { ...e }));
    initialMessages.forEach((m) => this.dunningMessages.set(m.id, { ...m }));
  }
}

// Global persistent instance across hot reloads in dev
const globalForStore = globalThis as unknown as { dunnifyStore?: InMemoryStore };
export const memoryStore = globalForStore.dunnifyStore || new InMemoryStore();
if (process.env.NODE_ENV !== "production") {
  globalForStore.dunnifyStore = memoryStore;
}

// Check if live Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// -------------------------------------------------------------
// Database Access Layer (Unified API for Supabase / Fallback)
// -------------------------------------------------------------
export const db = {
  // Merchant operations
  async getMerchant(id: string = seedMerchant.id): Promise<Merchant> {
    if (supabase) {
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) return data as Merchant;
    }
    return memoryStore.merchants.get(id) || seedMerchant;
  },

  async updateMerchantSettings(id: string, updates: Partial<Merchant>): Promise<Merchant> {
    const updated = {
      ...(await this.getMerchant(id)),
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (supabase) {
      await supabase.from("merchants").update(updates).eq("id", id);
    }
    memoryStore.merchants.set(id, updated);
    return updated;
  },

  // Recovery events operations
  async listRecoveryEvents(filter?: {
    status?: RecoveryStatus;
    limit?: number;
  }): Promise<RecoveryEvent[]> {
    if (supabase) {
      let query = supabase
        .from("recovery_events")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter?.status) {
        query = query.eq("status", filter.status);
      }
      if (filter?.limit) {
        query = query.limit(filter.limit);
      }
      const { data, error } = await query;
      if (!error && data) return data as RecoveryEvent[];
    }

    let items = Array.from(memoryStore.recoveryEvents.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (filter?.status) {
      items = items.filter((i) => i.status === filter.status);
    }
    if (filter?.limit) {
      items = items.slice(0, filter.limit);
    }
    return items;
  },

  async getRecoveryEventById(id: string): Promise<RecoveryEvent | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("recovery_events")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) return data as RecoveryEvent;
    }
    return memoryStore.recoveryEvents.get(id) || null;
  },

  async getRecoveryEventByInvoiceId(invoiceId: string): Promise<RecoveryEvent | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("recovery_events")
        .select("*")
        .eq("stripe_invoice_id", invoiceId)
        .single();
      if (!error && data) return data as RecoveryEvent;
    }
    for (const ev of memoryStore.recoveryEvents.values()) {
      if (ev.stripe_invoice_id === invoiceId) return ev;
    }
    return null;
  },

  async getRecoveryEventByToken(token: string): Promise<RecoveryEvent | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("recovery_events")
        .select("*")
        .eq("pay_token", token)
        .single();
      if (!error && data) return data as RecoveryEvent;
    }
    for (const ev of memoryStore.recoveryEvents.values()) {
      if (ev.pay_token === token) return ev;
    }
    return null;
  },

  async createRecoveryEvent(
    data: Omit<RecoveryEvent, "id" | "created_at" | "updated_at">
  ): Promise<RecoveryEvent> {
    const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newEvent: RecoveryEvent = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };

    if (supabase) {
      const { data: inserted, error } = await supabase
        .from("recovery_events")
        .insert(newEvent)
        .select()
        .single();
      if (!error && inserted) return inserted as RecoveryEvent;
    }

    memoryStore.recoveryEvents.set(id, newEvent);
    return newEvent;
  },

  async updateRecoveryEvent(
    id: string,
    updates: Partial<RecoveryEvent>
  ): Promise<RecoveryEvent | null> {
    const existing = await this.getRecoveryEventById(id);
    if (!existing) return null;

    const updated: RecoveryEvent = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      await supabase.from("recovery_events").update(updates).eq("id", id);
    }

    memoryStore.recoveryEvents.set(id, updated);
    return updated;
  },

  // Circuit Breaker: Cancels all pending dunning messages for an event
  async cancelPendingDunningMessages(eventId: string): Promise<number> {
    let cancelledCount = 0;
    if (supabase) {
      const { data } = await supabase
        .from("dunning_messages")
        .update({ status: "cancelled" })
        .eq("recovery_event_id", eventId)
        .eq("status", "scheduled")
        .select();
      cancelledCount = data ? data.length : 0;
    }

    for (const msg of memoryStore.dunningMessages.values()) {
      if (msg.recovery_event_id === eventId && msg.status === "scheduled") {
        msg.status = "cancelled";
        cancelledCount++;
      }
    }

    return cancelledCount;
  },

  // Dunning message operations
  async createDunningMessage(
    data: Omit<DunningMessage, "id" | "created_at">
  ): Promise<DunningMessage> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newMsg: DunningMessage = {
      ...data,
      id,
      created_at: now,
    };

    if (supabase) {
      const { data: inserted, error } = await supabase
        .from("dunning_messages")
        .insert(newMsg)
        .select()
        .single();
      if (!error && inserted) return inserted as DunningMessage;
    }

    memoryStore.dunningMessages.set(id, newMsg);
    return newMsg;
  },

  async getDunningMessagesForEvent(eventId: string): Promise<DunningMessage[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("dunning_messages")
        .select("*")
        .eq("recovery_event_id", eventId)
        .order("created_at", { ascending: true });
      if (!error && data) return data as DunningMessage[];
    }

    return Array.from(memoryStore.dunningMessages.values())
      .filter((m) => m.recovery_event_id === eventId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  async listAllMessages(): Promise<DunningMessage[]> {
    if (supabase) {
      const { data } = await supabase
        .from("dunning_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) return data as DunningMessage[];
    }
    return Array.from(memoryStore.dunningMessages.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  // Calculate live Merchant KPIs
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    const events = await this.listRecoveryEvents();
    
    let totalRecoveredCash = 0;
    let totalFailedVolume = 0;
    let recoveredCount = 0;
    let pendingCount = 0;

    for (const ev of events) {
      totalFailedVolume += Number(ev.amount);
      if (ev.status === "RECOVERED") {
        totalRecoveredCash += Number(ev.amount);
        recoveredCount++;
      } else if (ev.status === "PENDING" || ev.status === "PHONE_MISSING") {
        pendingCount++;
      }
    }

    const totalResolved = recoveredCount + (events.length - recoveredCount - pendingCount);
    const recoveryRate = events.length > 0 ? (recoveredCount / events.length) * 100 : 0;
    
    // Retained ARR is annualized recovered monthly cash: totalRecoveredCash * 12
    const retainedARR = totalRecoveredCash * 12;

    return {
      totalRecoveredCash: Math.round(totalRecoveredCash),
      recoveryRate: Number(recoveryRate.toFixed(1)),
      retainedARR: Math.round(retainedARR),
      activePipelines: pendingCount,
      totalFailedVolume: Math.round(totalFailedVolume),
      totalAtRiskCustomers: events.length,
    };
  },
};
