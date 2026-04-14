export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      feed_heartbeats: {
        Row: {
          id: string
          user_id: string
          feed_id: string
          feed_type: string
          feed_label: string
          last_seen_at: string
          signal_strength: number
          status: string
          reconnect_attempts: number
          last_error: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feed_id: string
          feed_type?: string
          feed_label?: string
          last_seen_at?: string
          signal_strength?: number
          status?: string
          reconnect_attempts?: number
          last_error?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feed_id?: string
          feed_type?: string
          feed_label?: string
          last_seen_at?: string
          signal_strength?: number
          status?: string
          reconnect_attempts?: number
          last_error?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      grant_milestones: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          due_date: string
          status: string
          phase: string
          priority: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string
          due_date: string
          status?: string
          phase?: string
          priority?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          due_date?: string
          status?: string
          phase?: string
          priority?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          id: string
          user_id: string
          category: string
          item_name: string
          description: string
          allocated_amount: number
          spent_amount: number
          status: string
          acquisition_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          item_name: string
          description?: string
          allocated_amount?: number
          spent_amount?: number
          status?: string
          acquisition_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          item_name?: string
          description?: string
          allocated_amount?: number
          spent_amount?: number
          status?: string
          acquisition_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_documents: {
        Row: {
          id: string
          user_id: string
          title: string
          document_type: string
          version: number
          status: string
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          document_type: string
          version?: number
          status?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          document_type?: string
          version?: number
          status?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      infrastructure_readings: {
        Row: {
          id: string
          user_id: string
          sensor_id: string
          sensor_type: string
          location: string
          value: number
          unit: string
          risk_level: string
          nist_control: string
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sensor_id: string
          sensor_type: string
          location?: string
          value?: number
          unit?: string
          risk_level?: string
          nist_control?: string
          recorded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sensor_id?: string
          sensor_type?: string
          location?: string
          value?: number
          unit?: string
          risk_level?: string
          nist_control?: string
          recorded_at?: string
          created_at?: string
        }
        Relationships: []
      }
      audit_log_entries: {
        Row: {
          id: string
          user_id: string
          timestamp: string
          module: string
          action: string
          detail: string
          severity: string
          entity_id: string
          entity_type: string
          ip_address: string
          session_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timestamp?: string
          module?: string
          action?: string
          detail?: string
          severity?: string
          entity_id?: string
          entity_type?: string
          ip_address?: string
          session_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timestamp?: string
          module?: string
          action?: string
          detail?: string
          severity?: string
          entity_id?: string
          entity_type?: string
          ip_address?: string
          session_id?: string
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          resource_type?: string
          resource_id?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      forensic_artifacts: {
        Row: {
          id: string
          user_id: string
          artifact_id: string
          artifact_type: string
          name: string
          description: string
          source_host: string
          file_path: string
          file_hash: string
          hash_algorithm: string
          size_bytes: number
          collected_at: string
          chain_of_custody: string
          classification: string
          status: string
          nist_control: string
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          artifact_id?: string
          artifact_type?: string
          name?: string
          description?: string
          source_host?: string
          file_path?: string
          file_hash?: string
          hash_algorithm?: string
          size_bytes?: number
          collected_at?: string
          chain_of_custody?: string
          classification?: string
          status?: string
          nist_control?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          artifact_id?: string
          artifact_type?: string
          name?: string
          description?: string
          source_host?: string
          file_path?: string
          file_hash?: string
          hash_algorithm?: string
          size_bytes?: number
          collected_at?: string
          chain_of_custody?: string
          classification?: string
          status?: string
          nist_control?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      threat_intel_feeds: {
        Row: {
          id: string
          user_id: string
          indicator_id: string
          indicator_type: string
          value: string
          threat_actor: string
          campaign: string
          confidence: number
          severity: string
          tlp: string
          mitre_tactics: string[]
          mitre_techniques: string[]
          source: string
          first_seen: string
          last_seen: string
          expiry: string | null
          active: boolean
          description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          indicator_id?: string
          indicator_type?: string
          value?: string
          threat_actor?: string
          campaign?: string
          confidence?: number
          severity?: string
          tlp?: string
          mitre_tactics?: string[]
          mitre_techniques?: string[]
          source?: string
          first_seen?: string
          last_seen?: string
          expiry?: string | null
          active?: boolean
          description?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          indicator_id?: string
          indicator_type?: string
          value?: string
          threat_actor?: string
          campaign?: string
          confidence?: number
          severity?: string
          tlp?: string
          mitre_tactics?: string[]
          mitre_techniques?: string[]
          source?: string
          first_seen?: string
          last_seen?: string
          expiry?: string | null
          active?: boolean
          description?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      incident_records: {
        Row: {
          id: string
          user_id: string
          incident_id: string
          title: string
          description: string
          severity: string
          status: string
          category: string
          affected_systems: string[]
          detected_at: string
          contained_at: string | null
          resolved_at: string | null
          assigned_to: string
          nist_phase: string
          iocs: string[]
          timeline: string
          lessons_learned: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          incident_id?: string
          title?: string
          description?: string
          severity?: string
          status?: string
          category?: string
          affected_systems?: string[]
          detected_at?: string
          contained_at?: string | null
          resolved_at?: string | null
          assigned_to?: string
          nist_phase?: string
          iocs?: string[]
          timeline?: string
          lessons_learned?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          incident_id?: string
          title?: string
          description?: string
          severity?: string
          status?: string
          category?: string
          affected_systems?: string[]
          detected_at?: string
          contained_at?: string | null
          resolved_at?: string | null
          assigned_to?: string
          nist_phase?: string
          iocs?: string[]
          timeline?: string
          lessons_learned?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vulnerability_findings: {
        Row: {
          id: string
          user_id: string
          vuln_id: string
          cve_id: string
          title: string
          description: string
          cvss_score: number
          cvss_vector: string
          severity: string
          asset_host: string
          asset_type: string
          port: number | null
          service: string
          plugin_id: string
          solution: string
          status: string
          exploitable: boolean
          patch_available: boolean
          first_detected: string
          last_seen: string
          remediated_at: string | null
          nist_control: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vuln_id?: string
          cve_id?: string
          title?: string
          description?: string
          cvss_score?: number
          cvss_vector?: string
          severity?: string
          asset_host?: string
          asset_type?: string
          port?: number | null
          service?: string
          plugin_id?: string
          solution?: string
          status?: string
          exploitable?: boolean
          patch_available?: boolean
          first_detected?: string
          last_seen?: string
          remediated_at?: string | null
          nist_control?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vuln_id?: string
          cve_id?: string
          title?: string
          description?: string
          cvss_score?: number
          cvss_vector?: string
          severity?: string
          asset_host?: string
          asset_type?: string
          port?: number | null
          service?: string
          plugin_id?: string
          solution?: string
          status?: string
          exploitable?: boolean
          patch_available?: boolean
          first_detected?: string
          last_seen?: string
          remediated_at?: string | null
          nist_control?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      safety_scan_results: {
        Row: {
          id: string
          user_id: string
          scan_id: string
          sample_label: string
          image_name: string
          image_size_bytes: number
          hazard_level: string
          confidence_pct: number
          pathogen_detected: boolean
          pathogen_class: string
          morphology_signatures: string[]
          gram_stain: string
          motility: string
          shape: string
          notes: string
          analyst: string
          status: string
          scanned_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scan_id?: string
          sample_label?: string
          image_name?: string
          image_size_bytes?: number
          hazard_level?: string
          confidence_pct?: number
          pathogen_detected?: boolean
          pathogen_class?: string
          morphology_signatures?: string[]
          gram_stain?: string
          motility?: string
          shape?: string
          notes?: string
          analyst?: string
          status?: string
          scanned_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scan_id?: string
          sample_label?: string
          image_name?: string
          image_size_bytes?: number
          hazard_level?: string
          confidence_pct?: number
          pathogen_detected?: boolean
          pathogen_class?: string
          morphology_signatures?: string[]
          gram_stain?: string
          motility?: string
          shape?: string
          notes?: string
          analyst?: string
          status?: string
          scanned_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      robotics_telemetry: {
        Row: {
          id: string
          user_id: string
          drone_id: string
          drone_type: string
          mission_id: string
          status: string
          battery_pct: number
          latitude: number
          longitude: number
          altitude_m: number
          depth_m: number
          heading_deg: number
          speed_ms: number
          signal_strength: number
          lidar_range_m: number
          sonar_depth_m: number
          obstacle_detected: boolean
          obstacle_distance_m: number | null
          temperature_c: number
          payload_active: boolean
          spatial_map_json: string
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          drone_id?: string
          drone_type?: string
          mission_id?: string
          status?: string
          battery_pct?: number
          latitude?: number
          longitude?: number
          altitude_m?: number
          depth_m?: number
          heading_deg?: number
          speed_ms?: number
          signal_strength?: number
          lidar_range_m?: number
          sonar_depth_m?: number
          obstacle_detected?: boolean
          obstacle_distance_m?: number | null
          temperature_c?: number
          payload_active?: boolean
          spatial_map_json?: string
          recorded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          drone_id?: string
          drone_type?: string
          mission_id?: string
          status?: string
          battery_pct?: number
          latitude?: number
          longitude?: number
          altitude_m?: number
          depth_m?: number
          heading_deg?: number
          speed_ms?: number
          signal_strength?: number
          lidar_range_m?: number
          sonar_depth_m?: number
          obstacle_detected?: boolean
          obstacle_distance_m?: number | null
          temperature_c?: number
          payload_active?: boolean
          spatial_map_json?: string
          recorded_at?: string
          created_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          display_name: string
          organization: string
          role_designation: string
          notify_critical: boolean
          notify_warning: boolean
          notify_info: boolean
          session_timeout_minutes: number
          require_biometric: boolean
          audit_retention_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string
          organization?: string
          role_designation?: string
          notify_critical?: boolean
          notify_warning?: boolean
          notify_info?: boolean
          session_timeout_minutes?: number
          require_biometric?: boolean
          audit_retention_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string
          organization?: string
          role_designation?: string
          notify_critical?: boolean
          notify_warning?: boolean
          notify_info?: boolean
          session_timeout_minutes?: number
          require_biometric?: boolean
          audit_retention_days?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sensor_readings: {
        Row: {
          id: string
          sensor_type: string
          value: number
          unit: string
          location: string
          recorded_at: string
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          sensor_type: string
          value: number
          unit: string
          location?: string
          recorded_at?: string
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          sensor_type?: string
          value?: number
          unit?: string
          location?: string
          recorded_at?: string
          created_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          id: string
          alert_level: number
          alert_type: string
          trigger_conditions: Json
          sensor_data_snapshot: Json
          external_data_snapshot: Json
          status: string
          evidence_recorded: boolean
          dispatched: boolean
          dispatched_at: string | null
          created_at: string
          resolved_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          alert_level: number
          alert_type: string
          trigger_conditions?: Json
          sensor_data_snapshot?: Json
          external_data_snapshot?: Json
          status?: string
          evidence_recorded?: boolean
          dispatched?: boolean
          dispatched_at?: string | null
          created_at?: string
          resolved_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          alert_level?: number
          alert_type?: string
          trigger_conditions?: Json
          sensor_data_snapshot?: Json
          external_data_snapshot?: Json
          status?: string
          evidence_recorded?: boolean
          dispatched?: boolean
          dispatched_at?: string | null
          created_at?: string
          resolved_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      alert_thresholds: {
        Row: {
          id: string
          rule_name: string
          rule_description: string
          conditions: Json
          alert_level: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rule_name: string
          rule_description: string
          conditions: Json
          alert_level: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rule_name?: string
          rule_description?: string
          conditions?: Json
          alert_level?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      evidence_files: {
        Row: {
          id: string
          alert_id: string | null
          file_type: string
          file_url: string
          duration_seconds: number
          file_size_bytes: number
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          alert_id?: string | null
          file_type: string
          file_url: string
          duration_seconds?: number
          file_size_bytes?: number
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          alert_id?: string | null
          file_type?: string
          file_url?: string
          duration_seconds?: number
          file_size_bytes?: number
          created_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      external_feeds: {
        Row: {
          id: string
          feed_type: string
          status: string
          confidence_score: number
          metadata: Json
          recorded_at: string
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          feed_type: string
          status: string
          confidence_score?: number
          metadata?: Json
          recorded_at?: string
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          feed_type?: string
          status?: string
          confidence_score?: number
          metadata?: Json
          recorded_at?: string
          created_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type GrantMilestone = Database['public']['Tables']['grant_milestones']['Row']
export type BudgetItem = Database['public']['Tables']['budget_items']['Row']
export type ComplianceDocument = Database['public']['Tables']['compliance_documents']['Row']
export type InfrastructureReading = Database['public']['Tables']['infrastructure_readings']['Row']
export type AuditLogEntry = Database['public']['Tables']['audit_log_entries']['Row']
export type ForensicArtifact = Database['public']['Tables']['forensic_artifacts']['Row']
export type ThreatIntelFeed = Database['public']['Tables']['threat_intel_feeds']['Row']
export type IncidentRecord = Database['public']['Tables']['incident_records']['Row']
export type VulnerabilityFinding = Database['public']['Tables']['vulnerability_findings']['Row']
export type SafetyScanResult = Database['public']['Tables']['safety_scan_results']['Row']
export type RoboticsTelemetry = Database['public']['Tables']['robotics_telemetry']['Row']
export type UserPreference = Database['public']['Tables']['user_preferences']['Row']
export type SensorReading = Database['public']['Tables']['sensor_readings']['Row']
export type Alert = Database['public']['Tables']['alerts']['Row']
export type AlertThreshold = Database['public']['Tables']['alert_thresholds']['Row']
export type EvidenceFile = Database['public']['Tables']['evidence_files']['Row']
export type ExternalFeed = Database['public']['Tables']['external_feeds']['Row']
