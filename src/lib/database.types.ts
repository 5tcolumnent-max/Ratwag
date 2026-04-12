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
      }
    }
  }
}

export interface UserPreferences {
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
  updated_at: string
}

export type GrantMilestone = Database['public']['Tables']['grant_milestones']['Row']
export type BudgetItem = Database['public']['Tables']['budget_items']['Row']
export type ComplianceDocument = Database['public']['Tables']['compliance_documents']['Row']
export type InfrastructureReading = Database['public']['Tables']['infrastructure_readings']['Row']

export interface ForensicArtifact {
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

export interface ThreatIntelFeed {
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

export interface IncidentRecord {
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

export interface VulnerabilityFinding {
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
