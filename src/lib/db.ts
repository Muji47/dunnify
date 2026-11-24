import { createClient, SupabaseClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

export type RecoveryStatus = "PENDING" | "RECOVERED" | "CHURNED" | "PHONE_MISSING" | "OPTED_OUT";
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
  stripe_restricted_key?: string;
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
  whatsapp_opted_out?: boolean;
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
// Persistent Disk Storage (dunnify_db.json)
// -------------------------------------------------------------
interface LocalDatabaseFile {
  merchants: Record<string, Merchant>;
  recovery_events: Record<string, RecoveryEvent>;
  dunning_messages: Record<string, DunningMessage>;
}

const defaultMerchant: Merchant = {
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

const DB_FILE_PATH = path.resolve(process.cwd(), "dunnify_db.json");

function readDiskDb(): LocalDatabaseFile {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn("[Dunnify DB] Error reading disk DB, using fresh store:", err);
  }

  const initialDb: LocalDatabaseFile = {
    merchants: { [defaultMerchant.id]: defaultMerchant },
    recovery_events: {},
    dunning_messages: {},
  };
  writeDiskDb(initialDb);
  return initialDb;
}

function writeDiskDb(data: LocalDatabaseFile): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[Dunnify DB] Error persisting disk DB:", err);
  }
}

// Check if live Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// -------------------------------------------------------------
// Database Access Layer (Unified API for Supabase / PostgreSQL / Disk DB)
// -------------------------------------------------------------
export const db = {
  // Merchant operations
  async getMerchant(id: string = defaultMerchant.id): Promise<Merchant> {
    if (supabase) {
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) return data as Merchant;
    }

    const disk = readDiskDb();
    return disk.merchants[id] || defaultMerchant;
  },

  async getMerchantByEmail(email: string): Promise<Merchant | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("email", email.toLowerCase())
        .single();
      if (!error && data) return data as Merchant;
    }

    const disk = readDiskDb();
    for (const m of Object.values(disk.merchants)) {
      if (m.email.toLowerCase() === email.toLowerCase()) return m;
    }
    return null;
  },

  async createMerchant(merchantData: Partial<Merchant> & { email: string; name: string }): Promise<Merchant> {
    const id = merchantData.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : defaultMerchant.id);
    const now = new Date().toISOString();

    const newMerchant: Merchant = {
      id,
      name: merchantData.name,
      email: merchantData.email.toLowerCase(),
      company_name: merchantData.company_name || `${merchantData.name}'s Company`,
      plan_tier: merchantData.plan_tier || "growth",
      quiet_hours_enabled: merchantData.quiet_hours_enabled ?? true,
      quiet_hours_start: merchantData.quiet_hours_start || "22:00",
      quiet_hours_end: merchantData.quiet_hours_end || "08:00",
      stripe_account_id: merchantData.stripe_account_id,
      stripe_webhook_secret: merchantData.stripe_webhook_secret,
      meta_whatsapp_phone_number_id: merchantData.meta_whatsapp_phone_number_id,
      meta_whatsapp_token: merchantData.meta_whatsapp_token,
      created_at: now,
      updated_at: now,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("merchants")
          .upsert(newMerchant, { onConflict: "email" })
          .select()
          .single();
        if (!error && data) return data as Merchant;
        if (error) console.error("[Dunnify DB] Supabase createMerchant error:", error);
      } catch (err) {
        console.warn("[Dunnify DB] Supabase merchant upsert fallback:", err);
      }
    }

    const disk = readDiskDb();
    disk.merchants[id] = newMerchant;
    writeDiskDb(disk);

    return newMerchant;
  },

  async updateMerchantSettings(id: string, updates: Partial<Merchant>): Promise<Merchant> {
    const existing = await this.getMerchant(id);
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      await supabase.from("merchants").update(updates).eq("id", id);
    }

    const disk = readDiskDb();
    disk.merchants[id] = updated;
    writeDiskDb(disk);

    return updated;
  },

  // Recovery events operations
  async listRecoveryEvents(filter?: {
    merchant_id?: string;
    status?: RecoveryStatus;
    limit?: number;
  }): Promise<RecoveryEvent[]> {
    if (supabase) {
      let query = supabase
        .from("recovery_events")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter?.merchant_id) {
        query = query.eq("merchant_id", filter.merchant_id);
      }
      if (filter?.status) {
        query = query.eq("status", filter.status);
      }
      if (filter?.limit) {
        query = query.limit(filter.limit);
      }
      const { data, error } = await query;
      if (!error && data) return data as RecoveryEvent[];
    }

    const disk = readDiskDb();
    let events = Object.values(disk.recovery_events).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (filter?.merchant_id) {
      events = events.filter((e) => e.merchant_id === filter.merchant_id);
    }
    if (filter?.status) {
      events = events.filter((e) => e.status === filter.status);
    }
    if (filter?.limit) {
      events = events.slice(0, filter.limit);
    }

    return events;
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

    const disk = readDiskDb();
    return disk.recovery_events[id] || null;
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

    const disk = readDiskDb();
    for (const ev of Object.values(disk.recovery_events)) {
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

    const disk = readDiskDb();
    for (const ev of Object.values(disk.recovery_events)) {
      if (ev.pay_token === token) return ev;
    }

    return null;
  },

  async createRecoveryEvent(
    data: Omit<RecoveryEvent, "id" | "created_at" | "updated_at">
  ): Promise<RecoveryEvent> {
    const id = (data as any).id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`);
    const now = new Date().toISOString();
    const newEvent: RecoveryEvent = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };

    if (supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from("recovery_events")
          .insert(newEvent)
          .select()
          .single();
        if (!error && inserted) return inserted as RecoveryEvent;
        if (error) console.error("[Dunnify DB] Supabase createRecoveryEvent error:", error);
      } catch (e) {
        console.warn("[Dunnify DB] Supabase insert fallback:", e);
      }
    }

    // Persist to local disk DB
    const disk = readDiskDb();
    disk.recovery_events[id] = newEvent;
    writeDiskDb(disk);

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
      try {
        const { error } = await supabase.from("recovery_events").update(updates).eq("id", id);
        if (error) console.error("[Dunnify DB] updateRecoveryEvent error:", error);
      } catch (e) {
        console.warn("Supabase update error:", e);
      }
    }

    const disk = readDiskDb();
    disk.recovery_events[id] = updated;
    writeDiskDb(disk);

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

    const disk = readDiskDb();
    for (const msg of Object.values(disk.dunning_messages)) {
      if (msg.recovery_event_id === eventId && msg.status === "scheduled") {
        msg.status = "cancelled";
        cancelledCount++;
      }
    }
    writeDiskDb(disk);

    return cancelledCount;
  },

  // WhatsApp Compliance: Opts out customer by phone (e.g. STOP reply)
  async optOutCustomerByPhone(phone: string): Promise<{
    optedOutCount: number;
    cancelledMessagesCount: number;
    events: RecoveryEvent[];
  }> {
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    const allEvents = await this.listRecoveryEvents();
    const matchedEvents = allEvents.filter((ev) => {
      if (!ev.customer_phone) return false;
      const evPhone = ev.customer_phone.replace(/[^0-9+]/g, "");
      return evPhone === cleanPhone || evPhone.endsWith(cleanPhone) || cleanPhone.endsWith(evPhone);
    });

    let cancelledMessagesCount = 0;
    const updatedEvents: RecoveryEvent[] = [];

    for (const ev of matchedEvents) {
      const updated = await this.updateRecoveryEvent(ev.id, {
        whatsapp_opted_out: true,
        status: ev.status === "PENDING" ? "OPTED_OUT" : ev.status,
      });
      if (updated) {
        updatedEvents.push(updated);
      }
      const cancelled = await this.cancelPendingDunningMessages(ev.id);
      cancelledMessagesCount += cancelled;
    }

    return {
      optedOutCount: matchedEvents.length,
      cancelledMessagesCount,
      events: updatedEvents,
    };
  },

  async isCustomerOptedOut(phone: string): Promise<boolean> {
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    const allEvents = await this.listRecoveryEvents();
    return allEvents.some((ev) => {
      if (!ev.customer_phone || !ev.whatsapp_opted_out) return false;
      const evPhone = ev.customer_phone.replace(/[^0-9+]/g, "");
      return evPhone === cleanPhone || evPhone.endsWith(cleanPhone) || cleanPhone.endsWith(evPhone);
    });
  },

  // Dunning message operations
  async createDunningMessage(
    data: Omit<DunningMessage, "id" | "created_at">
  ): Promise<DunningMessage> {
    const id = (data as any).id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`);
    const now = new Date().toISOString();
    const newMsg: DunningMessage = {
      ...data,
      id,
      created_at: now,
    };

    if (supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from("dunning_messages")
          .insert(newMsg)
          .select()
          .single();
        if (!error && inserted) return inserted as DunningMessage;
        if (error) console.error("[Dunnify DB] Supabase createDunningMessage error:", error);
      } catch (e) {
        // fallback
      }
    }

    const disk = readDiskDb();
    disk.dunning_messages[id] = newMsg;
    writeDiskDb(disk);

    return newMsg;
  },

  async updateDunningMessage(
    id: string,
    updates: Partial<DunningMessage>
  ): Promise<DunningMessage | null> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("dunning_messages")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (!error && data) return data as DunningMessage;
      } catch (e) {
        console.warn("[Dunnify DB] Supabase updateDunningMessage error:", e);
      }
    }

    const disk = readDiskDb();
    if (disk.dunning_messages[id]) {
      disk.dunning_messages[id] = {
        ...disk.dunning_messages[id],
        ...updates,
      };
      writeDiskDb(disk);
      return disk.dunning_messages[id];
    }

    return null;
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

    const disk = readDiskDb();
    return Object.values(disk.dunning_messages)
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

    const disk = readDiskDb();
    return Object.values(disk.dunning_messages).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  // Calculate live Merchant KPIs
  async getDashboardKPIs(merchantId?: string): Promise<DashboardKPIs> {
    const events = await this.listRecoveryEvents(merchantId ? { merchant_id: merchantId } : undefined);

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

    const recoveryRate = events.length > 0 ? (recoveredCount / events.length) * 100 : 0;
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
