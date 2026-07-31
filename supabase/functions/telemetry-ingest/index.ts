import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Data-Channel",
};

interface SensorTelemetryPayload {
  station_id: string;
  metric_type: string;
  reading_value: number;
  status_flag: string;
  timestamp?: string;
}

const VALID_STATUS_FLAGS = new Set(["NORMAL", "WARNING", "FAULT"]);

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed. Use POST.");
  }

  try {
    let payload: SensorTelemetryPayload;
    try {
      payload = await req.json();
    } catch {
      return errorResponse(400, "Invalid JSON body.");
    }

    if (
      !payload ||
      typeof payload.station_id !== "string" || !payload.station_id.trim() ||
      typeof payload.metric_type !== "string" || !payload.metric_type.trim() ||
      typeof payload.reading_value !== "number" || Number.isNaN(payload.reading_value) ||
      typeof payload.status_flag !== "string" || !payload.status_flag.trim()
    ) {
      return errorResponse(422, "Payload failed schema validation. Required: station_id, metric_type, reading_value (number), status_flag.");
    }

    if (!VALID_STATUS_FLAGS.has(payload.status_flag.toUpperCase())) {
      return errorResponse(422, `Invalid status_flag. Must be one of: ${[...VALID_STATUS_FLAGS].join(", ")}`);
    }

    const recordedAt = payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString();
    if (payload.timestamp && Number.isNaN(new Date(payload.timestamp).getTime())) {
      return errorResponse(422, "Invalid timestamp. Expected ISO-8601 string.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { data, error } = await supabase
      .from("utility_telemetry")
      .insert({
        station_id: payload.station_id,
        metric_type: payload.metric_type,
        reading_value: payload.reading_value,
        status_flag: payload.status_flag.toUpperCase(),
        recorded_at: recordedAt,
      })
      .select("id, station_id, metric_type, reading_value, status_flag, recorded_at, created_at")
      .single();

    if (error) {
      console.error("Database insert failed:", error.message);
      return errorResponse(500, "Failed to persist telemetry.");
    }

    return new Response(JSON.stringify({ accepted: true, record: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return errorResponse(500, "Internal server error.");
  }
});
