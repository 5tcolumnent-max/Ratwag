export type DroneType = 'aerial' | 'aquatic';
export type DroneStatus = 'standby' | 'active' | 'returning' | 'emergency' | 'offline';

export interface DroneTelemetry {
  droneId: string;
  droneType: DroneType;
  status: DroneStatus;
  battery: number;
  latitude: number;
  longitude: number;
  altitudeM: number;
  depthM: number;
  headingDeg: number;
  speedMs: number;
  signal: number;
  lidarRangeM: number;
  sonarDepthM: number;
  obstacleDetected: boolean;
  obstacleDistanceM: number | null;
  temperatureC: number;
  payloadActive: boolean;
  missionId: string;
  dbId?: string;
}

export interface MissionLog {
  missionId: string;
  droneId: string;
  event: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}
