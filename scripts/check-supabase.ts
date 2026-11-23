import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ytleanepebzqmunjpwnt.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bGVhbmVwZWJ6cW11bmpwd250Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NTQ0ODYzOSwiZXhwIjoyMTExMDI0NjM5fQ.rsjkaKhSq2c07q4BW04Xn6-qCmFaXRYae7b42KNdnb8";

const supabase = createClient(url, key);

async function check() {
  console.log("Checking Supabase tables at:", url);
  const { data, error } = await supabase.from("recovery_events").select("*").limit(1);

  if (error) {
    if (error.code === "PGRST205") {
      console.log("Status: Waiting for SQL migration to be run in Supabase SQL Editor...");
      console.log("Direct link: https://supabase.com/dashboard/project/ytleanepebzqmunjpwnt/sql/new");
    } else {
      console.error("Supabase Error:", error);
    }
    process.exit(1);
  }

  console.log("SUCCESS! recovery_events table is live in Supabase!");
  console.log("Current row count sample:", data?.length);

  // Check merchants table
  const { data: merchants, error: mError } = await supabase.from("merchants").select("*").limit(1);
  console.log("Merchants table check:", { count: merchants?.length, error: mError?.message });

  process.exit(0);
}

check();
