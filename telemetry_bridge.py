import os
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ValidationError
import requests

# Configure secure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TelemetryBridge")

# Define strict schema validation for incoming sensor telemetry to prevent injection/malformed data
class SensorTelemetryPayload(BaseModel):
    station_id: str = Field(..., description="Unique identifier for the utility station or pump house")
    metric_type: str = Field(..., description="Type of metric (e.g., pressure_psi, flow_rate_gpm, chlorine_ppm)")
    reading_value: float = Field(..., description="Numerical sensor measurement")
    status_flag: str = Field(..., description="Operational status flag (NORMAL, WARNING, FAULT)")
    timestamp: Optional[str] = Field(default=None, description="ISO-8601 UTC timestamp")

class TelemetryBridge:
    def __init__(self, target_endpoint: str, api_token: str):
        self.target_endpoint = target_endpoint
        self.api_token = api_token
        self.session = requests.Session()
        # Enforce scoped API tokens and mutual security headers
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
            "X-Data-Channel": "OT-Telemetry-Readonly"
        })

    def sanitize_and_validate(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parses, validates, and sanitizes incoming industrial telemetry records."""
        try:
            # Enforce timestamp generation if missing
            if not raw_data.get("timestamp"):
                raw_data["timestamp"] = datetime.now(timezone.utc).isoformat()

            # Validate against strict Pydantic model
            validated_record = SensorTelemetryPayload(**raw_data)
            logger.info(f"Telemetry validated successfully for station: {validated_record.station_id}")
            return validated_record.model_dump()

        except ValidationError as e:
            logger.error(f"Payload validation failed (quarantined): {e}")
            return None

    def broadcast_telemetry(self, validated_payload: Dict[str, Any]) -> bool:
        """Securely transmits sanitized telemetry to the AI core monitoring loop."""
        try:
            response = self.session.post(
                self.target_endpoint,
                data=json.dumps(validated_payload),
                timeout=5
            )
            if response.status_code == 200:
                logger.info("Telemetry successfully synced with AI monitoring loop.")
                return True
            else:
                logger.error(f"Transmission failed with status code {response.status_code}: {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Network exception during telemetry broadcast: {e}")
            return False

# Example execution hook for local utility sensor polling
if __name__ == "__main__":
    AI_ENDPOINT = os.getenv("AI_TELEMETRY_ENDPOINT", "https://api.rex-trinity-welfare.org/v1/telemetry/ingest")
    BROADCAST_TOKEN = os.getenv("REX_BROADCAST_TOKEN", "secure-token-placeholder")
    bridge = TelemetryBridge(target_endpoint=AI_ENDPOINT, api_token=BROADCAST_TOKEN)

    # Simulated incoming sensor reading from a municipal water system pump station
    sample_sensor_packet = {
        "station_id": "MN-WATER-STATION-04",
        "metric_type": "pressure_psi",
        "reading_value": 65.4,
        "status_flag": "NORMAL"
    }

    sanitized_data = bridge.sanitize_and_validate(sample_sensor_packet)
    if sanitized_data:
        bridge.broadcast_telemetry(sanitized_data)
