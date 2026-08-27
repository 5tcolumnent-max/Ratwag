import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MerchantTransactionInput {
  merchant_id: string;
  terminal_id: string;
  transaction_amount: number;
  currency?: string;
  customer_geo_location?: string;
  card_country?: string;
  spending_velocity_count?: number;
}

interface FraudTrigger {
  reason: string;
  score: number;
}

const HIGH_AMOUNT_THRESHOLD = 5000;
const VELOCITY_THRESHOLD = 5;
const BLOCK_SCORE = 90;
const FLAG_SCORE = 75;

function evaluateFraud(input: MerchantTransactionInput): {
  score: number;
  triggers: FraudTrigger[];
} {
  let score = 0;
  const triggers: FraudTrigger[] = [];

  if (input.transaction_amount > HIGH_AMOUNT_THRESHOLD) {
    const amountScore = Math.min(
      35,
      Math.floor((input.transaction_amount / HIGH_AMOUNT_THRESHOLD) * 20)
    );
    score += amountScore;
    triggers.push({
      reason: `High transaction amount: $${input.transaction_amount.toFixed(2)} exceeds $${HIGH_AMOUNT_THRESHOLD} threshold`,
      score: amountScore,
    });
  }

  const velocity = input.spending_velocity_count ?? 0;
  if (velocity > VELOCITY_THRESHOLD) {
    const velocityScore = Math.min(35, (velocity - VELOCITY_THRESHOLD) * 7);
    score += velocityScore;
    triggers.push({
      reason: `Spending velocity: ${velocity} transactions in 10 minutes (threshold: ${VELOCITY_THRESHOLD})`,
      score: velocityScore,
    });
  }

  if (
    input.customer_geo_location &&
    input.card_country &&
    !input.customer_geo_location
      .toLowerCase()
      .includes(input.card_country.toLowerCase())
  ) {
    const geoScore = 30;
    score += geoScore;
    triggers.push({
      reason: `Geo mismatch: customer in ${input.customer_geo_location} vs card country ${input.card_country}`,
      score: geoScore,
    });
  }

  return { score: Math.min(100, score), triggers };
}

function buildStixBundle(
  input: MerchantTransactionInput,
  score: number,
  status: string,
  triggers: FraudTrigger[]
): Record<string, unknown> {
  const indicatorId = `indicator--${crypto.randomUUID()}`;
  const observableId = `observed-data--${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  return {
    type: "bundle",
    id: `bundle--${crypto.randomUUID()}`,
    objects: [
      {
        type: "indicator",
        spec_version: "2.1",
        id: indicatorId,
        created: now,
        modified: now,
        name: `Merchant Fraud Alert — ${input.merchant_id}`,
        description: triggers.map((t) => t.reason).join("; "),
        indicator_types: ["malicious-activity"],
        pattern: `[x-merchant-fraud:merchant_id = '${input.merchant_id}' AND x-merchant-fraud:terminal_id = '${input.terminal_id}']`,
        pattern_type: "stix",
        valid_from: now,
        labels: ["fraud", "merchant", status.toLowerCase()],
        confidence: Math.round((score / 100) * 100),
      },
      {
        type: "observed-data",
        spec_version: "2.1",
        id: observableId,
        created: now,
        modified: now,
        first_observed: now,
        last_observed: now,
        number_observed: 1,
        objects: {
          "x-merchant-fraud--1": {
            type: "x-merchant-fraud",
            merchant_id: input.merchant_id,
            terminal_id: input.terminal_id,
            transaction_amount: input.transaction_amount,
            currency: input.currency ?? "USD",
            customer_geo_location: input.customer_geo_location ?? "",
            card_country: input.card_country ?? "",
            spending_velocity_count: input.spending_velocity_count ?? 0,
            fraud_risk_score: score,
            status,
          },
        },
      },
    ],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const transactions: MerchantTransactionInput[] = Array.isArray(body)
      ? body
      : [body];

    const results: Record<string, unknown>[] = [];

    for (const input of transactions) {
      if (
        !input.merchant_id ||
        !input.terminal_id ||
        typeof input.transaction_amount !== "number"
      ) {
        results.push({
          merchant_id: input.merchant_id,
          error: "Missing required fields: merchant_id, terminal_id, transaction_amount",
        });
        continue;
      }

      const { score, triggers } = evaluateFraud(input);
      let status = "APPROVED";
      if (score >= BLOCK_SCORE) {
        status = "BLOCKED";
      } else if (score >= FLAG_SCORE) {
        status = "FLAGGED";
      }

      const { data: txRow, error: txError } = await supabase
        .from("merchant_transactions")
        .insert({
          merchant_id: input.merchant_id,
          terminal_id: input.terminal_id,
          transaction_amount: input.transaction_amount,
          currency: input.currency ?? "USD",
          customer_geo_location: input.customer_geo_location ?? null,
          card_country: input.card_country ?? null,
          spending_velocity_count: input.spending_velocity_count ?? 0,
          fraud_risk_score: score,
          status,
        })
        .select("id")
        .single();

      if (txError) {
        results.push({
          merchant_id: input.merchant_id,
          error: `Failed to insert transaction: ${txError.message}`,
        });
        continue;
      }

      if (status === "FLAGGED" || status === "BLOCKED") {
        const stixBundle = buildStixBundle(input, score, status, triggers);
        const indicatorId = `indicator--${crypto.randomUUID()}`;

        const { error: stixError } = await supabase
          .from("stix_threat_indicators")
          .insert({
            indicator_id: indicatorId,
            indicator_type: "malicious-transaction",
            value: `${input.merchant_id}:${input.terminal_id}`,
            severity:
              score >= BLOCK_SCORE
                ? "critical"
                : score >= 85
                ? "high"
                : "medium",
            confidence: score,
            source: "merchant-fraud-engine",
            description: triggers.map((t) => t.reason).join("; "),
            stix_bundle: stixBundle,
            active: true,
          });

        if (stixError) {
          results.push({
            merchant_id: input.merchant_id,
            transaction_id: txRow.id,
            status,
            fraud_risk_score: score,
            triggers,
            stix_forward_error: stixError.message,
          });
        } else {
          results.push({
            merchant_id: input.merchant_id,
            transaction_id: txRow.id,
            status,
            fraud_risk_score: score,
            triggers,
            stix_forwarded: true,
            stix_indicator_id: indicatorId,
          });
        }
      } else {
        results.push({
          merchant_id: input.merchant_id,
          transaction_id: txRow.id,
          status,
          fraud_risk_score: score,
          triggers,
          stix_forwarded: false,
        });
      }
    }

    return new Response(
      JSON.stringify({ processed: transactions.length, results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
