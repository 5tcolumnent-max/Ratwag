// Fictional case-file generator for training and demo purposes.
// All data is SYNTHETIC. Names, locations, and case numbers are randomly
// generated and do not refer to real people, places, or investigations.

const FIRST_NAMES = [
  'Avery', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Quinn', 'Reese', 'Drew',
  'Sage', 'Finley', 'Emerson', 'Hayden', 'Parker', 'Rowan', 'Skyler', 'Tatum',
];

const LAST_NAMES = [
  'Blackwood', 'Calderon', 'Devereux', 'Fairbanks', 'Garrison', 'Holloway',
  'Kensington', 'Lockhart', 'Marchetti', 'Nightingale', 'Pemberton', 'Rutherford',
  'Sinclair', 'Thornwood', 'Vanderberg', 'Whitcombe',
];

const STREETS = [
  'Maple Ridge Rd', 'Birchwood Ln', 'Cedar Hollow Dr', 'Aspen Grove Way',
  'Willow Creek Blvd', 'Hawthorne St', 'Elderberry Ct', 'Juniper Pass',
];

const CITIES = [
  'Fairhaven', 'Crestview', 'Meadowbrook', 'Riverside', 'Westport',
  'Northgate', 'Silverlake', 'Pinehurst', 'Eastfield', 'Lakeside',
];

const CASE_TYPES = [
  { code: 'FRD', label: 'Financial Records Discrepancy', cat: 'fraud' as const },
  { code: 'WST', label: 'Resource Misallocation', cat: 'waste' as const },
  { code: 'AUS', label: 'Personnel Misconduct', cat: 'abuse' as const },
  { code: 'SAF', label: 'Workplace Safety Violation', cat: 'safety' as const },
  { code: 'COR', label: 'Procurement Irregularity', cat: 'corruption' as const },
];

const EVIDENCE_TYPES = ['document', 'photo', 'video', 'audio', 'physical', 'digital'] as const;
const COLLECTION_METHODS = [
  'Routine audit review',
  'Internal hotline tip',
  'Mandatory records request',
  'Voluntary disclosure',
  'Inventory inspection',
  'Witness interview transcript',
];

const CUSTODY_HOLDERS = [
  'Evidence Clerk J. Marsh',
  'Records Officer D. Calderon',
  'Audit Lead S. Whitfield',
  'Investigator M. Brennan',
  'Compliance Officer R. Ashworth',
];

const STORAGE_LOCATIONS = [
  'Evidence Locker A-12',
  'Records Vault B-04',
  'Secure Cabinet C-7',
  'Digital Archive Tier 2',
  'Audit Room Storage D-3',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinDays(days: number): string {
  const offset = randomInt(0, days);
  return new Date(Date.now() - offset * 86400000 - randomInt(0, 86400000)).toISOString();
}

function fakeHash(): string {
  const chars = '0123456789abcdef';
  let h = '';
  for (let i = 0; i < 64; i++) h += chars[Math.floor(Math.random() * 16)];
  return h;
}

export interface FictionalCase {
  caseNumber: string;
  title: string;
  classification: 'unclassified' | 'restricted' | 'confidential';
  summary: string;
  status: 'open' | 'in_progress' | 'closed' | 'archived';
  openedAt: string;
}

export interface FictionalEvidence {
  itemNumber: string;
  title: string;
  description: string;
  evidenceType: typeof EVIDENCE_TYPES[number];
  collectionMethod: string;
  collectedAt: string;
  collectedBy: string;
  storageLocation: string;
  hashSha256: string;
  chainStatus: 'in_custody' | 'transferred' | 'released' | 'destroyed';
}

export interface FictionalCustodyEntry {
  fromHolder: string;
  toHolder: string;
  action: 'collected' | 'transferred' | 'viewed' | 'released' | 'returned' | 'destroyed';
  reason: string;
  occurredAt: string;
}

export interface FictionalCaseFile {
  case: FictionalCase;
  evidence: Array<{
    item: FictionalEvidence;
    custody: FictionalCustodyEntry[];
  }>;
}

export function generateFictionalCaseFile(): FictionalCaseFile {
  const type = pick(CASE_TYPES);
  const year = 2026;
  const seq = randomInt(100, 999);
  const caseNumber = `${type.code}-${year}-${seq}`;
  const subjectName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const location = `${randomInt(100, 9999)} ${pick(STREETS)}, ${pick(CITIES)}`;

  const caseFile: FictionalCase = {
    caseNumber,
    title: `${type.label} — ${subjectName}`,
    classification: pick(['unclassified', 'restricted', 'confidential'] as const),
    summary: `SYNTHETIC TRAINING DATA. Fictional ${type.label.toLowerCase()} case involving ${subjectName} at ${location}. All names, locations, and details are generated for training and demonstration purposes only and do not refer to any real person, place, or investigation.`,
    status: pick(['open', 'in_progress', 'closed'] as const),
    openedAt: randomDateWithinDays(180),
  };

  const evidenceCount = randomInt(2, 5);
  const evidence: FictionalCaseFile['evidence'] = [];

  for (let i = 0; i < evidenceCount; i++) {
    const itemNumber = `EX-${String(i + 1).padStart(3, '0')}`;
    const evidenceType = pick(EVIDENCE_TYPES);
    const collectedBy = pick(CUSTODY_HOLDERS);
    const collectedAt = randomDateWithinDays(120);

    const item: FictionalEvidence = {
      itemNumber,
      title: `Synthetic ${evidenceType} exhibit — ${pick(['intake form', 'record copy', 'log sheet', 'statement', 'inventory snapshot', 'correspondence'])}`,
      description: `FICTIONAL. Generated ${evidenceType} evidence item for training case ${caseNumber}. This is synthetic data for demonstration of chain-of-custody workflow only.`,
      evidenceType,
      collectionMethod: pick(COLLECTION_METHODS),
      collectedAt,
      collectedBy,
      storageLocation: pick(STORAGE_LOCATIONS),
      hashSha256: evidenceType === 'digital' ? fakeHash() : '',
      chainStatus: pick(['in_custody', 'in_custody', 'transferred'] as const),
    };

    const custodyCount = randomInt(2, 4);
    const custody: FictionalCustodyEntry[] = [];
    let prevHolder = collectedBy;
    let prevDate = collectedAt;

    custody.push({
      fromHolder: '',
      toHolder: collectedBy,
      action: 'collected',
      reason: 'Initial collection from submitting party',
      occurredAt: collectedAt,
    });

    for (let j = 1; j < custodyCount; j++) {
      const nextHolder = pick(CUSTODY_HOLDERS.filter(h => h !== prevHolder));
      const nextDate = new Date(new Date(prevDate).getTime() + randomInt(1, 30) * 86400000).toISOString();
      custody.push({
        fromHolder: prevHolder,
        toHolder: nextHolder,
        action: pick(['transferred', 'viewed'] as const),
        reason: pick(['Routine transfer for review', 'Handoff to audit team', 'Viewing for compliance check', 'Transfer to case file']),
        occurredAt: nextDate,
      });
      prevHolder = nextHolder;
      prevDate = nextDate;
    }

    evidence.push({ item, custody });
  }

  return { case: caseFile, evidence };
}

export const SYNTHETIC_BANNER = 'SYNTHETIC TRAINING DATA — Fictional case file generated for demonstration. No real persons, locations, or investigations are referenced.';
