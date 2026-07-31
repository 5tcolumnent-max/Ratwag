# Ratwag

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-gugk6vvk)

## Threat Notification Dispatch — Environment Variables

The `send-threat-notification` edge function forwards CRITICAL threat alerts to
external channels. To enable dispatch, configure the following secrets in your
Supabase project (Edge Function secrets, not the `.env` file):

### Slack Incoming Webhook

| Variable | Description |
|---|---|
| `SLACK_WEBHOOK_URL` | Full URL of your Slack incoming webhook (e.g. `https://hooks.slack.com/services/T000.../B000.../...`) |

Create one at: Slack Workspace → Settings & Administration → Apps → Incoming Webhooks → Add New Webhook to Workspace.

### Twilio SMS

| Variable | Description |
|---|---|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID (found on the Twilio console dashboard) |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token (found on the Twilio console dashboard) |
| `TWILIO_FROM_NUMBER` | The Twilio phone number that sends the SMS (E.164 format, e.g. `+15551234567`) |
| `TWILIO_TO_NUMBER` | The operator on-call phone number that receives alerts (E.164 format, e.g. `+15559876543`) |

### Behavior

- Only `CRITICAL` alerts trigger external dispatch. `ELEVATED` alerts are
  stored in the dashboard but do not send to Slack or SMS, preventing alert
  fatigue.
- If no channels are configured, the function logs gracefully and returns
  `dispatched: false` without errors.
- Both channels can be enabled simultaneously — the function dispatches to all
  configured channels in parallel.
