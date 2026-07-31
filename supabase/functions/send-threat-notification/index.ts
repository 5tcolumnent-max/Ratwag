import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Data-Channel",
};

interface ThreatAlertPayload {
  id?: string;
  station_id: string;
  threat_level: string;
  metric_type: string;
  anomalous_value?: number | null;
  description: string;
  triggered_at?: string;
  resolved?: boolean;
}

interface DispatchResult {
  channel: string;
  success: boolean;
  message: string;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendSlackWebhook(alert: ThreatAlertPayload): Promise<DispatchResult> {
  const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!webhookUrl) {
    return { channel: "slack", success: false, message: "SLACK_WEBHOOK_URL not configured" };
  }

  const emoji = alert.threat_level === "CRITICAL" ? ":rotating_light:" : ":warning:";
  const valueStr = alert.anomalous_value != null ? String(alert.anomalous_value) : "N/A";
  const ts = alert.triggered_at || new Date().toISOString();

  const payload = {
    text: `${emoji} CRITICAL THREAT ALERT — ${alert.station_id}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `${emoji} Critical Threat Detected` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Station:* ${alert.station_id}` },
          { type: "mrkdwn", text: `*Level:* ${alert.threat_level}` },
          { type: "mrkdwn", text: `*Metric:* ${alert.metric_type}` },
          { type: "mrkdwn", text: `*Value:* ${valueStr}` },
          { type: "mrkdwn", text: `*Time:* ${ts}` },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: alert.description },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: "Municipal Water Infrastructure Monitoring — automated dispatch" }],
      },
    ],
  };

  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return { channel: "slack", success: false, message: `Slack webhook returned ${resp.status}: ${errText}` };
  }

  return { channel: "slack", success: true, message: "Slack notification dispatched" };
}

async function sendTwilioSms(alert: ThreatAlertPayload): Promise<DispatchResult> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
  const toNumber = Deno.env.get("TWILIO_TO_NUMBER");

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    return {
      channel: "twilio_sms",
      success: false,
      message: "Twilio not fully configured (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_TO_NUMBER)",
    };
  }

  const valueStr = alert.anomalous_value != null ? String(alert.anomalous_value) : "N/A";
  const body = `[CRITICAL] ${alert.station_id} — ${alert.metric_type}: ${valueStr}. ${alert.description}`.slice(0, 160);

  const params = new URLSearchParams();
  params.append("To", toNumber);
  params.append("From", fromNumber);
  params.append("Body", body);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return { channel: "twilio_sms", success: false, message: `Twilio API returned ${resp.status}: ${errText}` };
  }

  return { channel: "twilio_sms", success: true, message: "SMS dispatched via Twilio" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed. Use POST." });
  }

  try {
    let payload: ThreatAlertPayload | { record?: ThreatAlertPayload; new?: ThreatAlertPayload; data?: ThreatAlertPayload };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body." });
    }

    const alert: ThreatAlertPayload | undefined =
      (payload as ThreatAlertPayload).station_id ? payload as ThreatAlertPayload
      : (payload as { record?: ThreatAlertPayload }).record
      ?? (payload as { new?: ThreatAlertPayload }).new
      ?? (payload as { data?: ThreatAlertPayload }).data;

    if (!alert || !alert.station_id || !alert.threat_level) {
      return jsonResponse(422, { error: "Payload missing required fields (station_id, threat_level)." });
    }

    if (alert.threat_level !== "CRITICAL") {
      return jsonResponse(200, {
        dispatched: false,
        reason: `threat_level is ${alert.threat_level}, not CRITICAL — skipping dispatch to prevent alert fatigue`,
      });
    }

    const results: DispatchResult[] = [];

    const slackConfigured = !!Deno.env.get("SLACK_WEBHOOK_URL");
    const twilioConfigured = !!(
      Deno.env.get("TWILIO_ACCOUNT_SID") &&
      Deno.env.get("TWILIO_AUTH_TOKEN") &&
      Deno.env.get("TWILIO_FROM_NUMBER") &&
      Deno.env.get("TWILIO_TO_NUMBER")
    );

    if (slackConfigured) {
      results.push(await sendSlackWebhook(alert));
    }

    if (twilioConfigured) {
      results.push(await sendTwilioSms(alert));
    }

    if (results.length === 0) {
      return jsonResponse(200, {
        dispatched: false,
        reason: "CRITICAL alert received but no notification channels are configured. Set SLACK_WEBHOOK_URL and/or TWILIO_* env vars.",
        alert_id: alert.id,
      });
    }

    const allSuccess = results.every(r => r.success);
    return jsonResponse(200, {
      dispatched: allSuccess,
      alert_id: alert.id,
      station_id: alert.station_id,
      channels: results,
    });
  } catch (err) {
    console.error("Unexpected error in send-threat-notification:", err);
    return jsonResponse(500, { error: "Internal server error" });
  }
});
