import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STALE_THRESHOLD_SECONDS = 60;
const DEGRADED_THRESHOLD_SECONDS = 30;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: feeds, error: fetchError } = await supabase
      .from("feed_heartbeats")
      .select("id, feed_id, feed_type, feed_label, last_seen_at, status, signal_strength, user_id")
      .in("status", ["online", "degraded"]);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!feeds || feeds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active feeds to monitor.", checked: 0, degraded: 0, offline: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = Date.now();
    const updates: { id: string; status: string; reconnect_attempts: number; last_error: string }[] = [];
    const auditEntries: { user_id: string; module: string; action: string; detail: string; severity: string; entity_id: string; entity_type: string }[] = [];

    for (const feed of feeds) {
      const lastSeen = new Date(feed.last_seen_at).getTime();
      const ageSeconds = (now - lastSeen) / 1000;

      if (ageSeconds >= STALE_THRESHOLD_SECONDS) {
        updates.push({
          id: feed.id,
          status: "offline",
          reconnect_attempts: 0,
          last_error: `Feed stale: no heartbeat for ${Math.round(ageSeconds)}s`,
        });
        auditEntries.push({
          user_id: feed.user_id,
          module: "feed_heartbeat_watchdog",
          action: "feed_offline",
          detail: `Feed ${feed.feed_id} (${feed.feed_label}) marked offline — no heartbeat for ${Math.round(ageSeconds)}s`,
          severity: "critical",
          entity_id: feed.feed_id,
          entity_type: "feed",
        });
      } else if (ageSeconds >= DEGRADED_THRESHOLD_SECONDS) {
        updates.push({
          id: feed.id,
          status: "degraded",
          reconnect_attempts: 0,
          last_error: `Feed degraded: no heartbeat for ${Math.round(ageSeconds)}s`,
        });
        auditEntries.push({
          user_id: feed.user_id,
          module: "feed_heartbeat_watchdog",
          action: "feed_degraded",
          detail: `Feed ${feed.feed_id} (${feed.feed_label}) marked degraded — no heartbeat for ${Math.round(ageSeconds)}s`,
          severity: "warning",
          entity_id: feed.feed_id,
          entity_type: "feed",
        });
      }
    }

    let updatedCount = 0;
    for (const u of updates) {
      const { error } = await supabase
        .from("feed_heartbeats")
        .update({
          status: u.status,
          reconnect_attempts: u.reconnect_attempts,
          last_error: u.last_error,
          updated_at: new Date().toISOString(),
        })
        .eq("id", u.id);

      if (!error) updatedCount++;
    }

    if (auditEntries.length > 0) {
      await supabase.from("audit_log_entries").insert(auditEntries);
    }

    return new Response(
      JSON.stringify({
        checked: feeds.length,
        degraded: updates.filter((u) => u.status === "degraded").length,
        offline: updates.filter((u) => u.status === "offline").length,
        updated: updatedCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
