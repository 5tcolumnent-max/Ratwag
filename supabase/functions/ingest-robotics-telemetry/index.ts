import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TelemetryInput {
  drone_id: string;
  drone_type?: string;
  mission_id?: string;
  status?: string;
  battery_pct?: number;
  latitude?: number;
  longitude?: number;
  altitude_m?: number;
  depth_m?: number;
  heading_deg?: number;
  speed_ms?: number;
  signal_strength?: number;
  lidar_range_m?: number;
  sonar_depth_m?: number;
  obstacle_detected?: boolean;
  obstacle_distance_m?: number | null;
  temperature_c?: number;
  payload_active?: boolean;
  spatial_map_json?: string;
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

    const body: TelemetryInput | TelemetryInput[] = await req.json();

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
        JSON.stringify({ error: "Authentication required for telemetry ingestion." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const packets = Array.isArray(body) ? body : [body];

    if (packets.length === 0) {
      return new Response(
        JSON.stringify({ error: "No telemetry packets provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rows = packets.map((p) => ({
      user_id: userId!,
      drone_id: p.drone_id,
      drone_type: p.drone_type ?? "aerial",
      mission_id: p.mission_id ?? "",
      status: p.status ?? "active",
      battery_pct: p.battery_pct ?? 100,
      latitude: p.latitude ?? 0,
      longitude: p.longitude ?? 0,
      altitude_m: p.altitude_m ?? 0,
      depth_m: p.depth_m ?? 0,
      heading_deg: p.heading_deg ?? 0,
      speed_ms: p.speed_ms ?? 0,
      signal_strength: p.signal_strength ?? 100,
      lidar_range_m: p.lidar_range_m ?? 0,
      sonar_depth_m: p.sonar_depth_m ?? 0,
      obstacle_detected: p.obstacle_detected ?? false,
      obstacle_distance_m: p.obstacle_distance_m ?? null,
      temperature_c: p.temperature_c ?? 20,
      payload_active: p.payload_active ?? false,
      spatial_map_json: p.spatial_map_json ?? "{}",
      recorded_at: p.recorded_at ?? new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("robotics_telemetry")
      .insert(rows)
      .select();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emergencyPackets = packets.filter((p) =>
      p.status === "emergency" || p.obstacle_detected === true
    );

    if (emergencyPackets.length > 0) {
      await supabase.from("audit_log_entries").insert(
        emergencyPackets.map((p) => ({
          user_id: userId!,
          module: "robotics_telemetry",
          action: "emergency_telemetry",
          detail: `Drone ${p.drone_id} reported status=${p.status ?? "active"}, obstacle=${p.obstacle_detected ?? false}`,
          severity: "critical",
          entity_id: p.drone_id,
          entity_type: "drone",
        })),
      );
    }

    return new Response(
      JSON.stringify({ ingested: data?.length ?? 0, telemetry: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
