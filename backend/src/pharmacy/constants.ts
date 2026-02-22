// Spec: Phase 15 — Pharmacy Order Constants

// Valid status transitions for PharmacyOrder
export const VALID_PHARMACY_ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING_ASSIGNMENT: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PHARMACY_ACCEPTED', 'PHARMACY_REJECTED', 'CANCELLED'],
  PHARMACY_ACCEPTED: ['PREPARING', 'STOCK_ISSUE', 'CANCELLED'],
  PHARMACY_REJECTED: ['PENDING_ASSIGNMENT'], // reassignment
  PREPARING: ['READY_FOR_PICKUP', 'STOCK_ISSUE', 'CANCELLED'],
  STOCK_ISSUE: ['AWAITING_SUBSTITUTION_APPROVAL', 'PENDING_ASSIGNMENT', 'CANCELLED'],
  AWAITING_SUBSTITUTION_APPROVAL: ['PREPARING', 'STOCK_ISSUE', 'CANCELLED'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERY_ATTEMPTED', 'DELIVERED', 'DELIVERY_FAILED'],
  DELIVERY_ATTEMPTED: ['OUT_FOR_DELIVERY', 'DELIVERY_FAILED'],
  DELIVERED: ['DAMAGE_REPORTED', 'RETURN_ACCEPTED', 'COLD_CHAIN_BREACH'],
  DELIVERY_FAILED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  CANCELLED: [],
  DAMAGE_REPORTED: ['DAMAGE_APPROVED', 'CANCELLED'],
  DAMAGE_APPROVED: [],
  RETURN_ACCEPTED: [],
  COLD_CHAIN_BREACH: [],
};

// Timestamp field name mapped to each status
export const PHARMACY_ORDER_TIMESTAMP_MAP: Record<string, string> = {
  PENDING_ASSIGNMENT: 'createdAt',
  ASSIGNED: 'assignedAt',
  PHARMACY_ACCEPTED: 'acceptedAt',
  PREPARING: 'preparingAt',
  STOCK_ISSUE: 'stockIssueAt',
  AWAITING_SUBSTITUTION_APPROVAL: 'stockIssueAt',
  READY_FOR_PICKUP: 'readyForPickupAt',
  OUT_FOR_DELIVERY: 'dispatchedAt',
  DELIVERY_ATTEMPTED: 'deliveryAttemptedAt',
  DELIVERED: 'deliveredAt',
  DELIVERY_FAILED: 'deliveryFailedAt',
  CANCELLED: 'cancelledAt',
  DAMAGE_REPORTED: 'damageReportedAt',
  DAMAGE_APPROVED: 'damageApprovedAt',
  RETURN_ACCEPTED: 'returnRequestedAt',
  COLD_CHAIN_BREACH: 'coldChainBreachAt',
};

// SLA windows in hours
export const SLA_HOURS = {
  PHARMACY_ACCEPTANCE: 4,
  PHARMACY_PREPARATION: 4,
  DELIVERY: 6,
  OVERALL_STANDARD: 24,
  OVERALL_MAX: 48,
  COLD_CHAIN_DELIVERY: 2,
} as const;

// Cold chain medications (expandable list)
// Spec: Phase 15 Chunk 3 — semaglutide, liraglutide, dulaglutide = cold chain
export const COLD_CHAIN_MEDICATIONS = [
  'semaglutide',
  'liraglutide',
  'dulaglutide',
  'insulin',
  'tirzepatide',
] as const;

/**
 * Check if a status transition is valid
 */
export function isValidPharmacyOrderTransition(from: string, to: string): boolean {
  const validTargets = VALID_PHARMACY_ORDER_TRANSITIONS[from];
  if (!validTargets) return false;
  return validTargets.includes(to);
}

/**
 * Check if a medication list requires cold chain storage/delivery
 */
export function requiresColdChain(medications: Array<{ name?: string; genericName?: string }>): boolean {
  return medications.some(med => {
    const name = (med.name || '').toLowerCase();
    const generic = (med.genericName || '').toLowerCase();
    return COLD_CHAIN_MEDICATIONS.some(cold =>
      name.includes(cold) || generic.includes(cold),
    );
  });
}
