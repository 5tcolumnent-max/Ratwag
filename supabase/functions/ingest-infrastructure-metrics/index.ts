import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MetricInput {
  sensor_id: string;
  sensor_type: string;
  location?: string;
  value: number;
  unit: string;
  risk_level?: string;
  nist_control?: string;
  user_id?: string;
  recorded_at?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: MetricInput | MetricInput[] = await req.json();

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData.user?.id ?? null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required for infrastructure metrics ingestion." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const metrics = Array.isArray(body) ? body : [body];

    if (metrics.length === 0) {
      return new Response(
        JSON.stringify({ error: "No metrics provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rows = metrics.map((m) => ({
      user_id: userId!,
      sensor_id: m.sensor_id,
      sensor_type: m.sensor_type,
      location: m.location ?? "primary",
      value: m.value,
      unit: m.unit,
      risk_level: m.risk_level ?? "low",
      nist_control: m.nist_control ?? "",
      recorded_at: m.recorded_at ?? new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("infrastructure_readings")
      .insert(rows)
      .select();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const criticalMetrics = metrics.filter((m) =>
      m.risk_level === "critical" || m.risk_level === "high"
    );

    if (criticalMetrics.length > 0) {
      await supabase.from("audit_log_entries").insert(
        criticalMetrics.map((m) => ({
          user_id: userId!,
          module: "infrastructure_monitor",
          action: "threshold_breach",
          detail: `Sensor ${m.sensor_id} (${m.sensor_type}) breached risk_level=${m.risk_level} with value ${m.value} ${m.unit}`,
          severity: m.risk_level === "critical" ? "critical" : "warning",
          entity_id: m.sensor_id,
          entity_type: "infrastructure_sensor",
        })),
      );
    }

    return new Response(
      JSON.stringify({ ingested: data?.length ?? 0, metrics: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
