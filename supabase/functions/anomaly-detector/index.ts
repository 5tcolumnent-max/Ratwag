import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Data-Channel",
};

interface TelemetryRecord {
  id: string;
  station_id: string;
  metric_type: string;
  reading_value: number;
  status_flag: string;
  recorded_at: string;
  created_at: string;
}

interface ThreatAlert {
  station_id: string;
  threat_level: "ELEVATED" | "CRITICAL";
  metric_type: string;
  anomalous_value: number;
  description: string;
  triggered_at: string;
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function evaluateThreat(record: TelemetryRecord): ThreatAlert | null {
  const status = (record.status_flag || "").toUpperCase();
  const metric = record.metric_type || "";
  const value = record.reading_value;
  const triggeredAt = record.recorded_at || record.created_at || new Date().toISOString();

  if (status === "FAULT") {
    return {
      station_id: record.station_id,
      threat_level: "CRITICAL",
      metric_type: metric,
      anomalous_value: value,
      description: `Station ${record.station_id} reported a FAULT status on ${metric} (value: ${value}). Immediate inspection required — possible equipment failure or unauthorized intervention.`,
      triggered_at: triggeredAt,
    };
  }

  if (metric === "pressure_psi" && value < 45.0) {
    return {
      station_id: record.station_id,
      threat_level: "CRITICAL",
      metric_type: metric,
      anomalous_value: value,
      description: `Station ${record.station_id} pressure dropped to ${value} psi (below 45.0 threshold). Potential unauthorized pump shutdown or pipe breach detected.`,
      triggered_at: triggeredAt,
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed. Use POST.");
  }

  try {
    let payload: TelemetryRecord | { record?: TelemetryRecord; new?: TelemetryRecord; data?: TelemetryRecord };
    try {
      payload = await req.json();
    } catch {
      return errorResponse(400, "Invalid JSON body.");
    }

    // The webhook sends the new row; normalize a few possible shapes.
    const record: TelemetryRecord | undefined =
      (payload as TelemetryRecord).station_id ? payload as TelemetryRecord
      : (payload as { record?: TelemetryRecord }).record
      ?? (payload as { new?: TelemetryRecord }).new
      ?? (payload as { data?: TelemetryRecord }).data;

    if (!record || !record.station_id || !record.metric_type) {
      return errorResponse(422, "Payload missing required telemetry fields (station_id, metric_type).");
    }

    const alert = evaluateThreat(record);
    if (!alert) {
      return new Response(JSON.stringify({ detected: false, station_id: record.station_id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { data, error } = await supabase
      .from("active_threat_alerts")
      .insert({
        station_id: alert.station_id,
        threat_level: alert.threat_level,
        metric_type: alert.metric_type,
        anomalous_value: alert.anomalous_value,
        description: alert.description,
        triggered_at: alert.triggered_at,
      })
      .select("id, station_id, threat_level, metric_type, anomalous_value, description, triggered_at, created_at")
      .single();

    if (error) {
      console.error("Failed to insert threat alert:", error.message);
      return errorResponse(500, "Failed to persist threat alert.");
    }

    console.log(`Threat alert raised for station ${alert.station_id}: ${alert.threat_level}`);
    return new Response(JSON.stringify({ detected: true, alert: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error in anomaly-detector:", err);
    return errorResponse(500, "Internal server error.");
  }
});
