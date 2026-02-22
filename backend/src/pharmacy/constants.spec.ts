import {
  VALID_PHARMACY_ORDER_TRANSITIONS,
  PHARMACY_ORDER_TIMESTAMP_MAP,
  SLA_HOURS,
  COLD_CHAIN_MEDICATIONS,
  isValidPharmacyOrderTransition,
  requiresColdChain,
} from './constants';

// Spec: Phase 15 Chunk 2 — Status transitions, SLA constants, cold chain detection

describe('Pharmacy Constants', () => {
  // ========================================
  // Status Transition Validation
  // ========================================

  describe('VALID_PHARMACY_ORDER_TRANSITIONS', () => {
    it('should have all 17 PharmacyOrderStatus values', () => {
      const statuses = Object.keys(VALID_PHARMACY_ORDER_TRANSITIONS);
      expect(statuses).toContain('PENDING_ASSIGNMENT');
      expect(statuses).toContain('ASSIGNED');
      expect(statuses).toContain('PHARMACY_ACCEPTED');
      expect(statuses).toContain('PHARMACY_REJECTED');
      expect(statuses).toContain('PREPARING');
      expect(statuses).toContain('STOCK_ISSUE');
      expect(statuses).toContain('AWAITING_SUBSTITUTION_APPROVAL');
      expect(statuses).toContain('READY_FOR_PICKUP');
      expect(statuses).toContain('OUT_FOR_DELIVERY');
      expect(statuses).toContain('DELIVERY_ATTEMPTED');
      expect(statuses).toContain('DELIVERED');
      expect(statuses).toContain('DELIVERY_FAILED');
      expect(statuses).toContain('CANCELLED');
      expect(statuses).toContain('DAMAGE_REPORTED');
      expect(statuses).toContain('DAMAGE_APPROVED');
      expect(statuses).toContain('RETURN_ACCEPTED');
      expect(statuses).toContain('COLD_CHAIN_BREACH');
      expect(statuses.length).toBe(17);
    });

    it('terminal states (CANCELLED, DAMAGE_APPROVED, RETURN_ACCEPTED, COLD_CHAIN_BREACH) should have no valid transitions', () => {
      expect(VALID_PHARMACY_ORDER_TRANSITIONS['CANCELLED']).toEqual([]);
      expect(VALID_PHARMACY_ORDER_TRANSITIONS['DAMAGE_APPROVED']).toEqual([]);
      expect(VALID_PHARMACY_ORDER_TRANSITIONS['RETURN_ACCEPTED']).toEqual([]);
      expect(VALID_PHARMACY_ORDER_TRANSITIONS['COLD_CHAIN_BREACH']).toEqual([]);
    });

    it('DELIVERED can transition to DAMAGE_REPORTED, RETURN_ACCEPTED, or COLD_CHAIN_BREACH', () => {
      expect(VALID_PHARMACY_ORDER_TRANSITIONS['DELIVERED']).toEqual([
        'DAMAGE_REPORTED',
        'RETURN_ACCEPTED',
        'COLD_CHAIN_BREACH',
      ]);
    });

    it('PENDING_ASSIGNMENT can transition to ASSIGNED or CANCELLED', () => {
      expect(VALID_PHARMACY_ORDER_TRANSITIONS['PENDING_ASSIGNMENT']).toEqual(['ASSIGNED', 'CANCELLED']);
    });

    it('ASSIGNED can transition to PHARMACY_ACCEPTED, PHARMACY_REJECTED, or CANCELLED', () => {
      expect(VALID_PHARMACY_ORDER_TRANSITIONS['ASSIGNED']).toEqual([
        'PHARMACY_ACCEPTED',
        'PHARMACY_REJECTED',
        'CANCELLED',
      ]);
    });

    it('READY_FOR_PICKUP can transition to OUT_FOR_DELIVERY or CANCELLED', () => {
      expect(VALID_PHARMACY_ORDER_TRANSITIONS['READY_FOR_PICKUP']).toEqual([
        'OUT_FOR_DELIVERY',
        'CANCELLED',
      ]);
    });
  });

  describe('isValidPharmacyOrderTransition', () => {
    it('should return true for valid transitions', () => {
      expect(isValidPharmacyOrderTransition('PENDING_ASSIGNMENT', 'ASSIGNED')).toBe(true);
      expect(isValidPharmacyOrderTransition('ASSIGNED', 'PHARMACY_ACCEPTED')).toBe(true);
      expect(isValidPharmacyOrderTransition('OUT_FOR_DELIVERY', 'DELIVERED')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(isValidPharmacyOrderTransition('PENDING_ASSIGNMENT', 'DELIVERED')).toBe(false);
      expect(isValidPharmacyOrderTransition('DELIVERED', 'ASSIGNED')).toBe(false);
      expect(isValidPharmacyOrderTransition('CANCELLED', 'ASSIGNED')).toBe(false);
    });

    it('should return false for unknown status', () => {
      expect(isValidPharmacyOrderTransition('UNKNOWN', 'ASSIGNED')).toBe(false);
    });
  });

  // ========================================
  // Timestamp Mapping
  // ========================================

  describe('PHARMACY_ORDER_TIMESTAMP_MAP', () => {
    it('should map ASSIGNED to assignedAt', () => {
      expect(PHARMACY_ORDER_TIMESTAMP_MAP['ASSIGNED']).toBe('assignedAt');
    });

    it('should map DELIVERED to deliveredAt', () => {
      expect(PHARMACY_ORDER_TIMESTAMP_MAP['DELIVERED']).toBe('deliveredAt');
    });

    it('should map PHARMACY_ACCEPTED to acceptedAt', () => {
      expect(PHARMACY_ORDER_TIMESTAMP_MAP['PHARMACY_ACCEPTED']).toBe('acceptedAt');
    });

    it('should map all statuses with timestamp fields', () => {
      const statusesWithTimestamps = Object.keys(PHARMACY_ORDER_TIMESTAMP_MAP);
      // 17 statuses minus PHARMACY_REJECTED (no dedicated timestamp) = 16
      expect(statusesWithTimestamps.length).toBe(16);
    });
  });

  // ========================================
  // SLA Constants
  // ========================================

  describe('SLA_HOURS', () => {
    it('should have pharmacy acceptance SLA of 4 hours', () => {
      expect(SLA_HOURS.PHARMACY_ACCEPTANCE).toBe(4);
    });

    it('should have pharmacy preparation SLA of 4 hours', () => {
      expect(SLA_HOURS.PHARMACY_PREPARATION).toBe(4);
    });

    it('should have delivery SLA of 6 hours', () => {
      expect(SLA_HOURS.DELIVERY).toBe(6);
    });

    it('should have overall standard SLA of 24 hours', () => {
      expect(SLA_HOURS.OVERALL_STANDARD).toBe(24);
    });

    it('should have cold chain delivery SLA of 2 hours', () => {
      expect(SLA_HOURS.COLD_CHAIN_DELIVERY).toBe(2);
    });
  });

  // ========================================
  // Cold Chain Detection
  // ========================================

  describe('COLD_CHAIN_MEDICATIONS', () => {
    it('should include semaglutide, liraglutide, dulaglutide', () => {
      expect(COLD_CHAIN_MEDICATIONS).toContain('semaglutide');
      expect(COLD_CHAIN_MEDICATIONS).toContain('liraglutide');
      expect(COLD_CHAIN_MEDICATIONS).toContain('dulaglutide');
    });

    it('should include insulin', () => {
      expect(COLD_CHAIN_MEDICATIONS).toContain('insulin');
    });
  });

  describe('requiresColdChain', () => {
    it('should return true for semaglutide', () => {
      expect(requiresColdChain([{ name: 'Semaglutide 0.5mg Injection' }])).toBe(true);
    });

    it('should return true for liraglutide (generic name match)', () => {
      expect(requiresColdChain([{ genericName: 'Liraglutide' }])).toBe(true);
    });

    it('should return false for finasteride', () => {
      expect(requiresColdChain([{ name: 'Finasteride 1mg' }])).toBe(false);
    });

    it('should return false for minoxidil', () => {
      expect(requiresColdChain([{ name: 'Minoxidil 5% Solution' }])).toBe(false);
    });

    it('should return true if ANY medication requires cold chain', () => {
      expect(
        requiresColdChain([
          { name: 'Finasteride 1mg' },
          { name: 'Insulin Glargine 100U/ml' },
        ]),
      ).toBe(true);
    });

    it('should handle empty medication list', () => {
      expect(requiresColdChain([])).toBe(false);
    });

    it('should handle medications with missing names', () => {
      expect(requiresColdChain([{}])).toBe(false);
    });
  });
});
