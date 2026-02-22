// Spec: Phase 16 — Lab Automation Constants

// Valid status transitions for LabOrder (enhanced for Phase 16)
export const VALID_LAB_ORDER_TRANSITIONS: Record<string, string[]> = {
  ORDERED: ['PAYMENT_PENDING', 'SLOT_BOOKED', 'CANCELLED'], // payment required or skip if included
  PAYMENT_PENDING: ['PAYMENT_COMPLETED', 'CANCELLED'],
  PAYMENT_COMPLETED: ['SLOT_BOOKED', 'CANCELLED'],
  SLOT_BOOKED: ['PHLEBOTOMIST_ASSIGNED', 'CANCELLED'],
  PHLEBOTOMIST_ASSIGNED: ['PHLEBOTOMIST_EN_ROUTE', 'CANCELLED'],
  PHLEBOTOMIST_EN_ROUTE: ['SAMPLE_COLLECTED', 'COLLECTION_FAILED'],
  SAMPLE_COLLECTED: ['SAMPLE_IN_TRANSIT', 'DELIVERED_TO_LAB'],
  COLLECTION_FAILED: ['SLOT_BOOKED', 'CANCELLED'], // rebook or cancel
  SAMPLE_IN_TRANSIT: ['DELIVERED_TO_LAB'],
  DELIVERED_TO_LAB: ['SAMPLE_RECEIVED'],
  SAMPLE_RECEIVED: ['PROCESSING', 'SAMPLE_ISSUE'],
  SAMPLE_ISSUE: ['ORDERED'], // free recollection
  PROCESSING: ['RESULTS_PARTIAL', 'RESULTS_READY'],
  RESULTS_PARTIAL: ['RESULTS_READY'],
  RESULTS_READY: ['DOCTOR_REVIEWED'],
  RESULTS_UPLOADED: ['DOCTOR_REVIEWED', 'CANCELLED'], // patient self-upload
  DOCTOR_REVIEWED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
  EXPIRED: [],
};

// Timestamp field name mapped to each status
export const LAB_ORDER_TIMESTAMP_MAP: Record<string, string> = {
  ORDERED: 'orderedAt',
  PAYMENT_PENDING: 'orderedAt',
  PAYMENT_COMPLETED: 'orderedAt',
  SLOT_BOOKED: 'slotBookedAt',
  PHLEBOTOMIST_ASSIGNED: 'phlebotomistAssignedAt',
  PHLEBOTOMIST_EN_ROUTE: 'phlebotomistEnRouteAt',
  SAMPLE_COLLECTED: 'sampleCollectedAt',
  COLLECTION_FAILED: 'collectionFailedAt',
  SAMPLE_IN_TRANSIT: 'sampleInTransitAt',
  DELIVERED_TO_LAB: 'deliveredToLabAt',
  SAMPLE_RECEIVED: 'sampleReceivedAt',
  SAMPLE_ISSUE: 'sampleIssueAt',
  PROCESSING: 'processingStartedAt',
  RESULTS_PARTIAL: 'resultsPartialAt',
  RESULTS_READY: 'resultsUploadedAt',
  RESULTS_UPLOADED: 'resultsUploadedAt',
  DOCTOR_REVIEWED: 'doctorReviewedAt',
  CLOSED: 'closedAt',
  CANCELLED: 'cancelledAt',
  EXPIRED: 'expiredAt',
};

/**
 * Check if a lab order status transition is valid
 */
export function isValidLabOrderTransition(from: string, to: string): boolean {
  const validTargets = VALID_LAB_ORDER_TRANSITIONS[from];
  if (!validTargets) return false;
  return validTargets.includes(to);
}

// Tests that require fasting (patient must not eat 8-12 hours before)
export const FASTING_REQUIRED_TESTS = [
  'fasting_glucose',
  'lipid_panel',
  'HbA1c',
  'insulin',
] as const;

/**
 * Check if a test panel requires fasting
 */
export function requiresFasting(tests: string[]): boolean {
  return tests.some(test =>
    FASTING_REQUIRED_TESTS.includes(test as any),
  );
}

// GLP-1 protocol blood work (Weight Management)
// Spec: Phase 16 Chunk 3 — auto-order for GLP-1 patients
export const GLP1_PROTOCOL_TESTS = [
  'amylase',
  'lipase',
  'metabolic_panel',
  'HbA1c',
  'fasting_glucose',
  'lipid_panel',
  'CBC',
  'TSH',
] as const;

// PCOS protocol blood work
// Spec: Phase 16 Chunk 3 — auto-order for PCOS patients
export const PCOS_PROTOCOL_TESTS = [
  'FSH',
  'LH',
  'DHEA_S',
  'testosterone',
  'TSH',
  'fasting_glucose',
  'insulin',
  'lipid_panel',
] as const;

// SLA windows in hours
export const LAB_SLA_HOURS = {
  RESULTS_STANDARD: 48,        // Default lab turnaround
  RESULTS_ESCALATION: 72,      // Escalation threshold
  CRITICAL_ACKNOWLEDGMENT: 1,  // Doctor must acknowledge critical values within 1 hour
  COLLECTION_BOOKING: 24,      // Time to book after order
  FOLLOW_UP_MONTHS: 3,         // Follow-up monitoring interval
} as const;

// Critical value thresholds per test
// Spec: Phase 16 Chunk 6 — configurable critical value detection
export interface CriticalThreshold {
  criticalLow: number;
  criticalHigh: number;
  normalLow: number;
  normalHigh: number;
}

export const CRITICAL_VALUE_THRESHOLDS: Record<string, CriticalThreshold> = {
  TSH: { criticalLow: 0.1, criticalHigh: 10, normalLow: 0.4, normalHigh: 4.0 },
  fasting_glucose: { criticalLow: 50, criticalHigh: 300, normalLow: 70, normalHigh: 100 },
  lipase: { criticalLow: 0, criticalHigh: 180, normalLow: 0, normalHigh: 60 }, // >3x upper limit
  amylase: { criticalLow: 0, criticalHigh: 300, normalLow: 28, normalHigh: 100 },
  HbA1c: { criticalLow: 0, criticalHigh: 10, normalLow: 4, normalHigh: 5.7 },
  insulin: { criticalLow: 0, criticalHigh: 50, normalLow: 2.6, normalHigh: 24.9 },
  testosterone: { criticalLow: 0, criticalHigh: 1500, normalLow: 270, normalHigh: 1070 }, // ng/dL male
  FSH: { criticalLow: 0, criticalHigh: 40, normalLow: 1.5, normalHigh: 12.4 },
  LH: { criticalLow: 0, criticalHigh: 40, normalLow: 1.7, normalHigh: 8.6 },
};

/**
 * Check if a value is critical for a given test
 */
export function isCriticalValue(testCode: string, value: number): boolean {
  const threshold = CRITICAL_VALUE_THRESHOLDS[testCode];
  if (!threshold) return false;
  return value < threshold.criticalLow || value > threshold.criticalHigh;
}

/**
 * Determine result status based on value and reference ranges
 * Spec: Phase 16 Chunk 6 — NORMAL, LOW, HIGH, CRITICAL_LOW, CRITICAL_HIGH
 */
export function determineResultStatus(
  testCode: string,
  value: number,
  referenceMin: number,
  referenceMax: number,
): string {
  const threshold = CRITICAL_VALUE_THRESHOLDS[testCode];

  // Check critical first (if thresholds defined)
  if (threshold) {
    if (value < threshold.criticalLow) return 'CRITICAL_LOW';
    if (value > threshold.criticalHigh) return 'CRITICAL_HIGH';
  }

  // Check against reference range
  if (value < referenceMin) return 'LOW';
  if (value > referenceMax) return 'HIGH';
  return 'NORMAL';
}
