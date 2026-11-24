import { Client } from "pg";

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  "postgres://postgres.ytleanepebzqmunjpwnt:U8yE5NSF4NmiWqX4@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";

async function migrate() {
  console.log("Connecting to Supabase PostgreSQL at aws-1-us-east-1.pooler.supabase.com:5432...");
  const rawUrl = connectionString.split("?")[0];
  const client = new Client({
    connectionString: rawUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected successfully to Supabase DB!");

  // 1. Add whatsapp_opted_out to recovery_events
  console.log("Adding whatsapp_opted_out column to recovery_events...");
  await client.query(`
    ALTER TABLE IF EXISTS recovery_events 
    ADD COLUMN IF NOT EXISTS whatsapp_opted_out BOOLEAN DEFAULT false;
  `);

  // 2. Add stripe_restricted_key to merchants (for 60-Second Stripe Setup Wizard)
  console.log("Adding stripe_restricted_key column to merchants...");
  await client.query(`
    ALTER TABLE IF EXISTS merchants 
    ADD COLUMN IF NOT EXISTS stripe_restricted_key TEXT;
  `);

  // 3. Ensure custom status OPTED_OUT is allowed if status is varchar/text
  console.log("Checking columns in recovery_events...");
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'recovery_events';
  `);
  console.log("recovery_events columns:", res.rows.map((r) => r.column_name).join(", "));

  await client.end();
  console.log("Migration completed successfully!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
