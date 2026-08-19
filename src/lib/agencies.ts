import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export interface AgencyProfile {
  id: string;
  name: string;
  shortName: string;
  acronym: string;
  grantProgram: string;
  phase: string;
  deadline: string;
  complianceFramework: string;
  portalName: string;
  reportPrefix: string;
  varianceLabel: string;
  costCategories: { key: string; label: string; threshold: number }[];
  accentColor: string;
}

export const AGENCIES: AgencyProfile[] = [
  {
    id: 'doe',
    name: 'Department of Energy',
    shortName: 'DOE',
    acronym: 'DOE',
    grantProgram: 'Genesis Mission',
    phase: 'Phase I',
    deadline: '2026-04-28T23:59:00Z',
    complianceFramework: 'NIST SP 800-53 Rev. 5',
    portalName: 'DOE Genesis Mission Phase I — Grants.gov compliance portal',
    reportPrefix: 'DOE-Genesis',
    varianceLabel: 'DOE Budget Compliance',
    costCategories: [
      { key: 'direct_labor', label: 'Direct Labor', threshold: 10 },
      { key: 'equipment', label: 'Equipment', threshold: 10 },
      { key: 'consumables', label: 'Consumables', threshold: 10 },
    ],
    accentColor: 'sky',
  },
  {
    id: 'nih',
    name: 'National Institutes of Health',
    shortName: 'NIH',
    acronym: 'NIH',
    grantProgram: 'R01 Research Project',
    phase: 'Year 1',
    deadline: '2026-06-05T23:59:00Z',
    complianceFramework: 'NIH Grants Policy Statement',
    portalName: 'NIH R01 Research Project — eRA Commons compliance portal',
    reportPrefix: 'NIH-R01',
    varianceLabel: 'NIH Budget Compliance',
    costCategories: [
      { key: 'personnel', label: 'Personnel', threshold: 10 },
      { key: 'equipment', label: 'Equipment', threshold: 10 },
      { key: 'supplies', label: 'Supplies', threshold: 10 },
    ],
    accentColor: 'emerald',
  },
  {
    id: 'nsf',
    name: 'National Science Foundation',
    shortName: 'NSF',
    acronym: 'NSF',
    grantProgram: 'CAREER Award',
    phase: 'Year 1',
    deadline: '2026-07-22T23:59:00Z',
    complianceFramework: 'NSF PAPPG',
    portalName: 'NSF CAREER Award — Research.gov compliance portal',
    reportPrefix: 'NSF-CAREER',
    varianceLabel: 'NSF Budget Compliance',
    costCategories: [
      { key: 'senior_personnel', label: 'Senior Personnel', threshold: 10 },
      { key: 'equipment', label: 'Equipment', threshold: 10 },
      { key: 'travel', label: 'Travel', threshold: 10 },
    ],
    accentColor: 'sky',
  },
  {
    id: 'dod',
    name: 'Department of Defense',
    shortName: 'DoD',
    acronym: 'DoD',
    grantProgram: 'STTR Phase I',
    phase: 'Phase I',
    deadline: '2026-05-15T23:59:00Z',
    complianceFramework: 'DoD Grant & Agreement Regulations',
    portalName: 'DoD STTR Phase I — Grants.gov compliance portal',
    reportPrefix: 'DoD-STTR',
    varianceLabel: 'DoD Budget Compliance',
    costCategories: [
      { key: 'direct_labor', label: 'Direct Labor', threshold: 10 },
      { key: 'materials', label: 'Materials', threshold: 10 },
      { key: 'subcontract', label: 'Subcontract', threshold: 10 },
    ],
    accentColor: 'amber',
  },
  {
    id: 'dhs',
    name: 'Department of Homeland Security',
    shortName: 'DHS',
    acronym: 'DHS',
    grantProgram: 'S&T Research Initiative',
    phase: 'Phase I',
    deadline: '2026-06-30T23:59:00Z',
    complianceFramework: 'DHS Acquisition Policy',
    portalName: 'DHS S&T Research Initiative — Grants.gov compliance portal',
    reportPrefix: 'DHS-ST',
    varianceLabel: 'DHS Budget Compliance',
    costCategories: [
      { key: 'personnel', label: 'Personnel', threshold: 10 },
      { key: 'equipment', label: 'Equipment', threshold: 10 },
      { key: 'operations', label: 'Operations', threshold: 10 },
    ],
    accentColor: 'red',
  },
  {
    id: 'doj',
    name: 'Department of Justice',
    shortName: 'DOJ',
    acronym: 'DOJ',
    grantProgram: 'OJP Research Grant',
    phase: 'Year 1',
    deadline: '2026-05-28T23:59:00Z',
    complianceFramework: 'OJP Financial Guide',
    portalName: 'DOJ OJP Research Grant — Grants.gov compliance portal',
    reportPrefix: 'DOJ-OJP',
    varianceLabel: 'DOJ Budget Compliance',
    costCategories: [
      { key: 'personnel', label: 'Personnel', threshold: 10 },
      { key: 'travel', label: 'Travel', threshold: 10 },
      { key: 'equipment', label: 'Equipment', threshold: 10 },
    ],
    accentColor: 'sky',
  },
  {
    id: 'epa',
    name: 'Environmental Protection Agency',
    shortName: 'EPA',
    acronym: 'EPA',
    grantProgram: 'STAR Research',
    phase: 'Year 1',
    deadline: '2026-07-10T23:59:00Z',
    complianceFramework: 'EPA Assistance Agreement Manual',
    portalName: 'EPA STAR Research — Grants.gov compliance portal',
    reportPrefix: 'EPA-STAR',
    varianceLabel: 'EPA Budget Compliance',
    costCategories: [
      { key: 'personnel', label: 'Personnel', threshold: 10 },
      { key: 'equipment', label: 'Equipment', threshold: 10 },
      { key: 'sampling', label: 'Sampling & Analysis', threshold: 10 },
    ],
    accentColor: 'emerald',
  },
  {
    id: 'nasa',
    name: 'National Aeronautics and Space Administration',
    shortName: 'NASA',
    acronym: 'NASA',
    grantProgram: 'SBIR Phase I',
    phase: 'Phase I',
    deadline: '2026-06-18T23:59:00Z',
    complianceFramework: 'NASA Grant & Cooperative Agreement Manual',
    portalName: 'NASA SBIR Phase I — NSPIRES compliance portal',
    reportPrefix: 'NASA-SBIR',
    varianceLabel: 'NASA Budget Compliance',
    costCategories: [
      { key: 'direct_labor', label: 'Direct Labor', threshold: 10 },
      { key: 'materials', label: 'Materials', threshold: 10 },
      { key: 'travel', label: 'Travel', threshold: 10 },
    ],
    accentColor: 'sky',
  },
  {
    id: 'usda',
    name: 'U.S. Department of Agriculture',
    shortName: 'USDA',
    acronym: 'USDA',
    grantProgram: 'NIFA Research',
    phase: 'Year 1',
    deadline: '2026-07-31T23:59:00Z',
    complianceFramework: 'USDA NIFA Grants Regulations',
    portalName: 'USDA NIFA Research — Grants.gov compliance portal',
    reportPrefix: 'USDA-NIFA',
    varianceLabel: 'USDA Budget Compliance',
    costCategories: [
      { key: 'personnel', label: 'Personnel', threshold: 10 },
      { key: 'equipment', label: 'Equipment', threshold: 10 },
      { key: 'materials', label: 'Materials', threshold: 10 },
    ],
    accentColor: 'amber',
  },
  {
    id: 'hhs',
    name: 'Department of Health and Human Services',
    shortName: 'HHS',
    acronym: 'HHS',
    grantProgram: 'Research Project Grant',
    phase: 'Year 1',
    deadline: '2026-06-05T23:59:00Z',
    complianceFramework: 'HHS Grants Policy Statement',
    portalName: 'HHS Research Project Grant — Grants.gov compliance portal',
    reportPrefix: 'HHS-RPG',
    varianceLabel: 'HHS Budget Compliance',
    costCategories: [
      { key: 'personnel', label: 'Personnel', threshold: 10 },
      { key: 'equipment', label: 'Equipment', threshold: 10 },
      { key: 'supplies', label: 'Supplies', threshold: 10 },
    ],
    accentColor: 'sky',
  },
  {
    id: 'dot',
    name: 'Department of Transportation',
    shortName: 'DOT',
    acronym: 'DOT',
    grantProgram: 'RDT Research Initiative',
    phase: 'Year 1',
    deadline: '2026-08-14T23:59:00Z',
    complianceFramework: 'DOT Grant Regulations',
    portalName: 'DOT RDT Research Initiative — Grants.gov compliance portal',
    reportPrefix: 'DOT-RDT',
    varianceLabel: 'DOT Budget Compliance',
    costCategories: [
      { key: 'personnel', label: 'Personnel', threshold: 10 },
      { key: 'equipment', label: 'Equipment', threshold: 10 },
      { key: 'travel', label: 'Travel', threshold: 10 },
    ],
    accentColor: 'cyan',
  },
  {
    id: 'va',
    name: 'Department of Veterans Affairs',
    shortName: 'VA',
    acronym: 'VA',
    grantProgram: 'RR&D Research',
    phase: 'Year 1',
    deadline: '2026-07-17T23:59:00Z',
    complianceFramework: 'VA Handbook 1200.05',
    portalName: 'VA RR&D Research — Grants.gov compliance portal',
    reportPrefix: 'VA-RRD',
    varianceLabel: 'VA Budget Compliance',
    costCategories: [
      { key: 'personnel', label: 'Personnel', threshold: 10 },
      { key: 'equipment', label: 'Equipment', threshold: 10 },
      { key: 'supplies', label: 'Supplies', threshold: 10 },
    ],
    accentColor: 'sky',
  },
];

export const DEFAULT_AGENCY_ID = 'doe';

export function getAgency(id: string | null | undefined): AgencyProfile {
  return AGENCIES.find(a => a.id === id) || AGENCIES[0];
}

export function getAgencyByAcronym(acronym: string): AgencyProfile | undefined {
  return AGENCIES.find(a => a.acronym.toLowerCase() === acronym.toLowerCase());
}

interface UseAgencyResult {
  agency: AgencyProfile;
  agencyId: string;
  loading: boolean;
  setAgency: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

let cachedAgency: AgencyProfile | null = null;
let cachedAgencyId: string | null = null;

export function useAgency(): UseAgencyResult {
  const [agencyId, setAgencyId] = useState<string>(cachedAgencyId || DEFAULT_AGENCY_ID);
  const [loading, setLoading] = useState(!cachedAgency);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('user_preferences')
        .select('agency_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      const id = data?.agency_id || DEFAULT_AGENCY_ID;
      cachedAgencyId = id;
      cachedAgency = getAgency(id);
      setAgencyId(id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cachedAgency) {
      setLoading(false);
      return;
    }
    load();
  }, [load]);

  const setAgency = useCallback(async (id: string) => {
    cachedAgencyId = id;
    cachedAgency = getAgency(id);
    setAgencyId(id);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('user_preferences')
        .upsert(
          { user_id: session.user.id, agency_id: id, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    }
  }, []);

  return {
    agency: getAgency(agencyId),
    agencyId,
    loading,
    setAgency,
    refresh: load,
  };
}

export function clearAgencyCache() {
  cachedAgency = null;
  cachedAgencyId = null;
}
