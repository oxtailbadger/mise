import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-side client (used for Realtime subscriptions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Realtime channel names
export const CHANNELS = {
  groceryList: (weekStart: string) => `grocery-list:${weekStart}`,
} as const;
